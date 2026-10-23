// Erzeugt die App-Icons (public/icons) ohne Zusatzpaket: blaue Fläche (KB OS, zur Unterscheidung vom schwarzen Business OS) mit
// weißem YK-Zeichen (Logo seit 2026-10-18, gleiche Pfade wie
// src/components/marke.tsx). Ausführen: node scripts/icons.mjs
// Optional mit Zielordner und Größen: node scripts/icons.mjs <ordner> name.png:32 ...
import { writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";

const SCHWARZ = [0, 122, 255]; // Grundfarbe (iOS-Blau), Name wie im Business OS
const WEISS = [255, 255, 255];

// Zeichen als Pfade im Raster 0..800 (M, L, C, Z), aus dem Logo-SVG übernommen
const VERSATZ = [-804, 12];
const PFADE = [
  [["M", 924, 175], ["L", 1059, 175], ["C", 1076, 175, 1087, 182, 1098, 195], ["L", 1180, 290], ["C", 1190, 302, 1195, 312, 1194, 329], ["L", 1193, 376], ["C", 1185, 385, 1173, 395, 1160, 406], ["C", 1125, 435, 1101, 455, 1091, 488], ["L", 1092, 382], ["C", 1092, 365, 1087, 353, 1076, 340]],
  [["M", 1343, 173], ["L", 1477, 173], ["L", 1216, 413], ["C", 1200, 428, 1193, 437, 1193, 455], ["L", 1191, 559], ["C", 1191, 588, 1176, 604, 1150, 604], ["L", 1091, 604], ["L", 1091, 517], ["C", 1091, 479, 1108, 452, 1144, 423], ["L", 1196, 380], ["C", 1207, 371, 1212, 358, 1212, 341], ["L", 1212, 321], ["C", 1212, 307, 1217, 296, 1228, 286]],
  [["M", 1222, 425], ["L", 1252, 399], ["C", 1269, 384, 1289, 385, 1305, 404], ["L", 1485, 601], ["L", 1369, 601], ["C", 1351, 601, 1339, 593, 1327, 580], ["L", 1218, 462], ["C", 1207, 450, 1209, 436, 1222, 425]],
];
// Zeichen etwas kleiner, damit es auch als maskierbares Icon im sicheren Bereich liegt
const MASSSTAB = 0.85;

// Pfade in Polygone (0..1) umwandeln, Kurven in Stücke zerlegen
const POLYGONE = PFADE.map((pfad) => {
  const punkte = [];
  let [x, y] = [0, 0];
  const p = (px, py) => {
    const nx = (px + VERSATZ[0]) / 800, ny = (py + VERSATZ[1]) / 800;
    return [0.5 + (nx - 0.5) * MASSSTAB, 0.5 + (ny - 0.5) * MASSSTAB];
  };
  for (const [art, ...w] of pfad) {
    if (art === "C") {
      for (let i = 1; i <= 16; i++) {
        const t = i / 16, u = 1 - t;
        punkte.push(p(
          u * u * u * x + 3 * u * u * t * w[0] + 3 * u * t * t * w[2] + t * t * t * w[4],
          u * u * u * y + 3 * u * u * t * w[1] + 3 * u * t * t * w[3] + t * t * t * w[5],
        ));
      }
      [x, y] = [w[4], w[5]];
    } else {
      [x, y] = w;
      punkte.push(p(x, y));
    }
  }
  return punkte;
});

function innen(px, py) {
  for (const poly of POLYGONE) {
    let drin = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, yi] = poly[i], [xj, yj] = poly[j];
      if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) drin = !drin;
    }
    if (drin) return true;
  }
  return false;
}

function crc32(daten) {
  let c, crc = 0xffffffff;
  for (const b of daten) {
    c = (crc ^ b) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function block(typ, daten) {
  const kopf = Buffer.alloc(8);
  kopf.writeUInt32BE(daten.length, 0);
  kopf.write(typ, 4, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([kopf.subarray(4), daten])), 0);
  return Buffer.concat([kopf, daten, crc]);
}

function png(groesse) {
  const zeilen = Buffer.alloc(groesse * (groesse * 3 + 1));
  const ss = 4; // Unterabtastung für glatte Kanten
  for (let y = 0; y < groesse; y++) {
    zeilen[y * (groesse * 3 + 1)] = 0;
    for (let x = 0; x < groesse; x++) {
      let treffer = 0;
      for (let sy = 0; sy < ss; sy++) {
        for (let sx = 0; sx < ss; sx++) {
          if (innen((x + (sx + 0.5) / ss) / groesse, (y + (sy + 0.5) / ss) / groesse)) treffer++;
        }
      }
      const a = treffer / (ss * ss);
      const pos = y * (groesse * 3 + 1) + 1 + x * 3;
      for (let k = 0; k < 3; k++) zeilen[pos + k] = Math.round(SCHWARZ[k] * (1 - a) + WEISS[k] * a);
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(groesse, 0);
  ihdr.writeUInt32BE(groesse, 4);
  ihdr[8] = 8; // Bittiefe
  ihdr[9] = 2; // RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    block("IHDR", ihdr),
    block("IDAT", deflateSync(zeilen, { level: 9 })),
    block("IEND", Buffer.alloc(0)),
  ]);
}

const [ordner, ...eigene] = process.argv.slice(2);
const ziel = ordner ? new URL(`file://${process.cwd()}/${ordner}/`) : new URL("../public/icons/", import.meta.url);
const icons = eigene.length
  ? eigene.map((e) => [e.split(":")[0], Number(e.split(":")[1])])
  : [["apple-touch-icon.png", 180], ["icon-192.png", 192], ["icon-512.png", 512]];
for (const [name, groesse] of icons) writeFileSync(new URL(name, ziel), png(groesse));
console.log(`Icons in ${ordner ?? "public/icons"} geschrieben`);
