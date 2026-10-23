// Feste Regeln der Mail-Sortierung (reine Logik, getestet in tests/mail.test.ts).
// Reihenfolge = Vorrang (docs/stand.md, "Mail-Regeln"):
// 1. Von, an oder über eine Business-Adresse: immer Geschäftlich.
// 2. Label "kevin.blecha@web.de": immer Privat.
// 3. Gespeicherte Absenderregel (Bereich und Ordner).
// 4. Sonst "Einordnen". Haupt- und Unterlabel immer zusammen, nie nur eins.

export type Bereich = "geschaeftlich" | "privat";
export type Ordner = "wichtig" | "rechnungen" | "konten" | "werbung" | "info";

export const BEREICHE: readonly Bereich[] = ["geschaeftlich", "privat"];
export const ORDNER: readonly Ordner[] = ["wichtig", "rechnungen", "konten", "werbung", "info"];

export const BEREICH_NAME: Record<Bereich, string> = { geschaeftlich: "Geschäftlich", privat: "Privat" };
export const ORDNER_NAME: Record<Ordner, string> = {
  wichtig: "Wichtig",
  rechnungen: "Rechnungen",
  konten: "Konten",
  werbung: "Werbung",
  info: "Info",
};

// Gmail-Labelnamen
export const EINORDNEN = "Einordnen";
export const WEBDE_LABEL = "kevin.blecha@web.de";
export const labelName = (b: Bereich, o?: Ordner) => (o ? `${BEREICH_NAME[b]}/${ORDNER_NAME[o]}` : BEREICH_NAME[b]);

// Absender geschäftlicher Entwürfe (in Gmail unter "Senden als" einzurichten)
export const BUSINESS_ABSENDER = "hello@webcodic.de";

// Adressen dieser Domains gehören zum Unternehmen
const BUSINESS_ADRESSE = /[a-z0-9._%+-]+@(?:webcodic\.de|webstudio-design\.de)(?![a-z0-9.-])/i;

// Kopfzeilen, in denen Absender, Empfänger oder Weiterleitung stehen
const ADRESS_KOPFZEILEN = ["from", "to", "cc", "delivered-to", "x-forwarded-to", "x-forwarded-for", "x-original-to"];

export type Kopfzeilen = Record<string, string>;

// Gmail liefert [{ name, value }]; Namen klein, mehrfache Kopfzeilen zusammen
export function kopfzeilen(liste: { name: string; value: string }[] | undefined): Kopfzeilen {
  const k: Kopfzeilen = {};
  for (const { name, value } of liste ?? []) {
    const n = name.toLowerCase();
    k[n] = k[n] ? `${k[n]}, ${value}` : value;
  }
  return k;
}

export function istBusiness(k: Kopfzeilen): boolean {
  return ADRESS_KOPFZEILEN.some((n) => BUSINESS_ADRESSE.test(k[n] ?? ""));
}

// Reine Adresse aus "Name <adresse>" bzw. "adresse"
export function adresse(wert: string | undefined): string | null {
  if (!wert) return null;
  const m = /<([^<>\s]+@[^<>\s]+)>/.exec(wert) ?? /([^\s<>",;]+@[^\s<>",;]+)/.exec(wert);
  return m?.[1] ? m[1].toLowerCase() : null;
}

// Anzeigename aus "Name <adresse>", sonst die Adresse
export function absenderName(wert: string | undefined): string {
  if (!wert) return "Unbekannt";
  const m = /^\s*"?([^"<]*?)"?\s*<[^>]+>\s*$/.exec(wert);
  const name = m?.[1]?.trim();
  return name || adresse(wert) || wert.trim();
}

// Bereich aus den festen Regeln 1 und 2, null = offen
export function festerBereich(k: Kopfzeilen, labelNamen: string[]): Bereich | null {
  if (istBusiness(k)) return "geschaeftlich";
  if (labelNamen.includes(WEBDE_LABEL)) return "privat";
  return null;
}

export type Regel = { bereich: Bereich; ordner: Ordner };
export type Ziel = { art: "sortiert"; bereich: Bereich; ordner: Ordner } | { art: "einordnen"; bereich: Bereich | null };

// Ziel einer neuen Mail. Ein fester Bereich hat Vorrang vor dem Bereich einer Regel,
// den Ordner liefert nur die Regel.
export function ziel(fest: Bereich | null, regel: Regel | null): Ziel {
  if (regel) return { art: "sortiert", bereich: fest ?? regel.bereich, ordner: regel.ordner };
  return { art: "einordnen", bereich: fest };
}

// Darf Kevin diese Mail dem Bereich zuordnen? Geschäftlich nie unter Privat.
export function bereichErlaubt(k: Kopfzeilen, bereich: Bereich): boolean {
  return !(bereich === "privat" && istBusiness(k));
}

export function istBereich(w: unknown): w is Bereich {
  return w === "geschaeftlich" || w === "privat";
}

export function istOrdner(w: unknown): w is Ordner {
  return typeof w === "string" && (ORDNER as readonly string[]).includes(w);
}

// ---------- Abbestellen (List-Unsubscribe, RFC 2369 und RFC 8058) ----------

export type Abmeldung = { https: string | null; mailto: string | null; einKlick: boolean };

export function abmeldung(k: Kopfzeilen): Abmeldung | null {
  const wert = k["list-unsubscribe"];
  if (!wert) return null;
  const teile = [...wert.matchAll(/<([^>]+)>/g)].map((m) => m[1]!.trim());
  const https = teile.find((t) => /^https:\/\//i.test(t)) ?? null;
  const mailto = teile.find((t) => /^mailto:/i.test(t)) ?? null;
  if (!https && !mailto) return null;
  const einKlick = /List-Unsubscribe=One-Click/i.test(k["list-unsubscribe-post"] ?? "");
  return { https, mailto, einKlick: einKlick && https !== null };
}

// mailto:adresse?subject=...&body=...
export function mailtoLesen(url: string): { an: string; betreff: string; text: string } | null {
  if (!/^mailto:/i.test(url)) return null;
  const [ziel, abfrage = ""] = url.slice(7).split("?");
  const an = decodeURIComponent(ziel ?? "").trim();
  if (!/^[^\s@]+@[^\s@]+$/.test(an)) return null;
  const p = new URLSearchParams(abfrage);
  return { an, betreff: p.get("subject") ?? "Abmelden", text: p.get("body") ?? "Bitte abmelden." };
}
