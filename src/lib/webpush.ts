// Web Push ohne Zusatzpaket (Bundle-Größe), nur mit WebCrypto.
// - VAPID (RFC 8292): signiertes JWT (ES256) weist den Absender aus.
// - Verschlüsselung (RFC 8291, aes128gcm): Nachricht nur für das Gerät lesbar.
// Schlüssel erzeugt KB OS selbst (src/lib/push.ts, Tabelle kb.schluessel)

export type PushAbo = { endpoint: string; p256dh: string; auth: string };

// Öffentlicher Schlüssel: 65 Byte (unkomprimierter Punkt), privat: 32 Byte (d),
// beide base64url. subjekt: "mailto:..." oder "https://..." (Pflicht bei Apple).
export type Vapid = { oeffentlich: string; privat: string; subjekt: string };

export type PushNachricht = { titel: string; text: string; url?: string; tag?: string };

// Push-Dienste der Browser. Andere Adressen werden abgelehnt, damit über ein
// gespeichertes Abo keine beliebigen Server angefragt werden können.
const PUSH_DIENSTE = [
  "web.push.apple.com",
  "fcm.googleapis.com",
  "updates.push.services.mozilla.com",
  ".notify.windows.com",
];

export function erlaubterEndpunkt(endpoint: string): boolean {
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    return false;
  }
  if (url.protocol !== "https:") return false;
  return PUSH_DIENSTE.some((d) =>
    d.startsWith(".") ? url.hostname.endsWith(d) : url.hostname === d,
  );
}

const enc = new TextEncoder();

export function base64urlKodieren(daten: Uint8Array): string {
  let s = "";
  for (const b of daten) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function base64urlLesen(text: string): Uint8Array<ArrayBuffer> {
  const b64 = text.replace(/-/g, "+").replace(/_/g, "/");
  const s = atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4));
  const daten = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) daten[i] = s.charCodeAt(i);
  return daten;
}

function verbinden(...teile: Uint8Array[]): Uint8Array<ArrayBuffer> {
  const ergebnis = new Uint8Array(teile.reduce((n, t) => n + t.length, 0));
  let pos = 0;
  for (const t of teile) {
    ergebnis.set(t, pos);
    pos += t.length;
  }
  return ergebnis;
}

async function hkdf(
  salt: Uint8Array<ArrayBuffer>,
  ikm: Uint8Array<ArrayBuffer>,
  info: Uint8Array<ArrayBuffer>,
  laenge: number,
): Promise<Uint8Array<ArrayBuffer>> {
  const schluessel = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt, info },
    schluessel,
    laenge * 8,
  );
  return new Uint8Array(bits);
}

// JWT für den VAPID-Header, gültig 12 Stunden (Höchstwert laut RFC: 24)
export async function vapidJwt(vapid: Vapid, endpoint: string, jetzt = Date.now()): Promise<string> {
  const pub = base64urlLesen(vapid.oeffentlich);
  if (pub.length !== 65 || pub[0] !== 4) throw new Error("VAPID_PUBLIC_KEY ungültig");
  const schluessel = await crypto.subtle.importKey(
    "jwk",
    {
      kty: "EC",
      crv: "P-256",
      x: base64urlKodieren(pub.slice(1, 33)),
      y: base64urlKodieren(pub.slice(33, 65)),
      d: vapid.privat,
    },
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
  const json = (o: object) => base64urlKodieren(enc.encode(JSON.stringify(o)));
  const inhalt = `${json({ typ: "JWT", alg: "ES256" })}.${json({
    aud: new URL(endpoint).origin,
    exp: Math.floor(jetzt / 1000) + 12 * 3600,
    sub: vapid.subjekt,
  })}`;
  // WebCrypto liefert die Signatur bereits im JWS-Format (r || s)
  const signatur = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    schluessel,
    enc.encode(inhalt),
  );
  return `${inhalt}.${base64urlKodieren(new Uint8Array(signatur))}`;
}

// Verschlüsselt die Nachricht für ein Abo (ein Datensatz, aes128gcm)
export async function verschluesseln(abo: PushAbo, nachricht: Uint8Array): Promise<Uint8Array> {
  const uaPublic = base64urlLesen(abo.p256dh);
  const authSecret = base64urlLesen(abo.auth);
  if (uaPublic.length !== 65 || authSecret.length !== 16) throw new Error("Abo-Schlüssel ungültig");

  const as = (await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, [
    "deriveBits",
  ])) as CryptoKeyPair;
  const asPublic = new Uint8Array(await crypto.subtle.exportKey("raw", as.publicKey));
  const uaSchluessel = await crypto.subtle.importKey(
    "raw",
    uaPublic,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    [],
  );
  const ecdh = new Uint8Array(
    await crypto.subtle.deriveBits({ name: "ECDH", public: uaSchluessel }, as.privateKey, 256),
  );

  const ikm = await hkdf(
    authSecret,
    ecdh,
    verbinden(enc.encode("WebPush: info\0"), uaPublic, asPublic),
    32,
  );
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, ikm, enc.encode("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdf(salt, ikm, enc.encode("Content-Encoding: nonce\0"), 12);

  const aes = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  // 0x02 = letzter Datensatz, kein Padding
  const klartext = verbinden(nachricht, new Uint8Array([2]));
  const geheim = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, aes, klartext));

  // Kopf: salt (16) | Datensatzgröße (4) | Länge Schlüssel (1) | Schlüssel (65)
  const rs = klartext.length + 16;
  const kopf = new Uint8Array(21);
  kopf.set(salt, 0);
  new DataView(kopf.buffer).setUint32(16, Math.max(rs, 18));
  kopf[20] = asPublic.length;
  return verbinden(kopf, asPublic, geheim);
}

export type SendeErgebnis = { status: number; ok: boolean; abgelaufen: boolean };

// Sendet eine Nachricht an ein Abo. abgelaufen = Abo vom Dienst gelöscht
// (404/410), dann im OS entfernen.
export async function pushSenden(
  abo: PushAbo,
  nachricht: PushNachricht,
  vapid: Vapid,
): Promise<SendeErgebnis> {
  if (!erlaubterEndpunkt(abo.endpoint)) throw new Error("Push-Adresse nicht erlaubt");
  const body = await verschluesseln(abo, enc.encode(JSON.stringify(nachricht)));
  const antwort = await fetch(abo.endpoint, {
    method: "POST",
    headers: {
      authorization: `vapid t=${await vapidJwt(vapid, abo.endpoint)}, k=${vapid.oeffentlich}`,
      "content-encoding": "aes128gcm",
      "content-type": "application/octet-stream",
      ttl: String(24 * 3600),
      urgency: "normal",
    },
    body: body as Uint8Array<ArrayBuffer>,
    signal: AbortSignal.timeout(10_000),
  });
  // Antwort lesen, damit die Verbindung freigegeben wird
  await antwort.arrayBuffer().catch(() => undefined);
  return {
    status: antwort.status,
    ok: antwort.ok,
    abgelaufen: antwort.status === 404 || antwort.status === 410,
  };
}
