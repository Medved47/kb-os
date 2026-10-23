import type { SupabaseClient } from "@supabase/supabase-js";
import { zugangsToken } from "@/lib/google";
import { base64urlKodieren, base64urlLesen } from "@/lib/webpush";
import {
  BEREICHE,
  EINORDNEN,
  ORDNER,
  WEBDE_LABEL,
  kopfzeilen,
  labelName,
  type Bereich,
  type Kopfzeilen,
  type Ordner,
} from "@/lib/mail-regeln";

// Gmail des privaten Kontos (kevin.blecha5@gmail.com), nur REST per fetch.
// Scopes gmail.modify (lesen, Labels) und gmail.compose (Entwürfe).
// Nie senden, löschen oder archivieren.

const API = "https://gmail.googleapis.com/gmail/v1/users/me";

export class NichtVerbunden extends Error {
  constructor() {
    super("Google Privat ist nicht verbunden. Unter Einstellungen verbinden.");
  }
}

export async function gmailToken(db: SupabaseClient): Promise<string> {
  const token = await zugangsToken(db, "privat");
  if (!token) throw new NichtVerbunden();
  return token;
}

export class GmailFehler extends Error {
  constructor(public status: number, text: string) {
    super(`Gmail HTTP ${status}${text ? `: ${text.slice(0, 200)}` : ""}`);
  }
}

export async function gmail<T>(token: string, pfad: string, init: RequestInit = {}): Promise<T> {
  const r = await fetch(`${API}${pfad}`, {
    ...init,
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json", ...init.headers },
    signal: AbortSignal.timeout(10000),
  });
  if (!r.ok) throw new GmailFehler(r.status, await r.text().catch(() => ""));
  const text = await r.text();
  return (text ? JSON.parse(text) : null) as T;
}

// ---------- Labels ----------

export type Label = { id: string; name: string; messagesTotal?: number; messagesUnread?: number };

export type LabelIds = {
  bereich: Record<Bereich, string>;
  ordner: Record<Bereich, Record<Ordner, string>>;
  einordnen: string;
  webde: string | null;
  // Name je ID, für die Auswertung von labelIds
  namen: Map<string, string>;
};

// IDs der Labels über den Namen; fehlende (z. B. "Einordnen") werden angelegt
export async function labelIds(token: string): Promise<LabelIds> {
  const { labels = [] } = await gmail<{ labels?: Label[] }>(token, "/labels");
  const perName = new Map(labels.map((l) => [l.name, l.id]));
  const holen = async (name: string): Promise<string> => {
    const vorhanden = perName.get(name);
    if (vorhanden) return vorhanden;
    const neu = await gmail<Label>(token, "/labels", {
      method: "POST",
      body: JSON.stringify({ name, labelListVisibility: "labelShow", messageListVisibility: "show" }),
    });
    perName.set(name, neu.id);
    return neu.id;
  };
  const bereich = {} as Record<Bereich, string>;
  const ordner = { geschaeftlich: {}, privat: {} } as Record<Bereich, Record<Ordner, string>>;
  for (const b of BEREICHE) {
    bereich[b] = await holen(labelName(b));
    for (const o of ORDNER) ordner[b][o] = await holen(labelName(b, o));
  }
  const einordnen = await holen(EINORDNEN);
  return {
    bereich,
    ordner,
    einordnen,
    webde: perName.get(WEBDE_LABEL) ?? null,
    namen: new Map([...perName].map(([name, id]) => [id, name])),
  };
}

// Alle Labels, die KB OS setzt (zum Entfernen beim Umsortieren)
export function eigeneLabels(ids: LabelIds): string[] {
  return [
    ...BEREICHE.map((b) => ids.bereich[b]),
    ...BEREICHE.flatMap((b) => ORDNER.map((o) => ids.ordner[b][o])),
    ids.einordnen,
  ];
}

export async function labelsAendern(token: string, id: string, hinzu: string[], weg: string[]): Promise<void> {
  await gmail(token, `/messages/${encodeURIComponent(id)}/modify`, {
    method: "POST",
    body: JSON.stringify({ addLabelIds: hinzu, removeLabelIds: weg.filter((l) => !hinzu.includes(l)) }),
  });
}

// ---------- Nachrichten ----------

type Teil = {
  mimeType?: string;
  filename?: string;
  headers?: { name: string; value: string }[];
  body?: { data?: string; size?: number; attachmentId?: string };
  parts?: Teil[];
};

export type GmailNachricht = {
  id: string;
  threadId: string;
  labelIds?: string[];
  snippet?: string;
  internalDate?: string;
  payload?: Teil;
};

export type Kopf = {
  id: string;
  threadId: string;
  labelIds: string[];
  k: Kopfzeilen;
  snippet: string;
  datum: Date;
  ungelesen: boolean;
};

const META = ["From", "To", "Cc", "Subject", "Date", "Reply-To", "Delivered-To", "X-Forwarded-To", "X-Forwarded-For", "X-Original-To", "List-Unsubscribe", "List-Unsubscribe-Post", "Message-ID", "References"];

export function kopfVon(n: GmailNachricht): Kopf {
  return {
    id: n.id,
    threadId: n.threadId,
    labelIds: n.labelIds ?? [],
    k: kopfzeilen(n.payload?.headers),
    snippet: htmlEntitaeten(n.snippet ?? ""),
    datum: new Date(Number(n.internalDate ?? 0)),
    ungelesen: (n.labelIds ?? []).includes("UNREAD"),
  };
}

export async function nachrichtKopf(token: string, id: string): Promise<Kopf> {
  const p = new URLSearchParams({ format: "metadata" });
  for (const h of META) p.append("metadataHeaders", h);
  return kopfVon(await gmail<GmailNachricht>(token, `/messages/${encodeURIComponent(id)}?${p}`));
}

// Liste eines Labels (neueste zuerst) mit Kopfzeilen
export async function liste(
  token: string,
  label: string,
  opt: { seite?: string; anzahl?: number; nurUngelesen?: boolean } = {},
): Promise<{ mails: Kopf[]; weiter: string | null }> {
  const p = new URLSearchParams({ labelIds: label, maxResults: String(opt.anzahl ?? 25) });
  if (opt.nurUngelesen) p.append("labelIds", "UNREAD");
  if (opt.seite) p.set("pageToken", opt.seite);
  const d = await gmail<{ messages?: { id: string }[]; nextPageToken?: string }>(token, `/messages?${p}`);
  const mails = await Promise.all((d.messages ?? []).map((m) => nachrichtKopf(token, m.id)));
  return { mails, weiter: d.nextPageToken ?? null };
}

export async function labelZahlen(token: string, id: string): Promise<{ gesamt: number; ungelesen: number }> {
  const l = await gmail<Label>(token, `/labels/${encodeURIComponent(id)}`);
  return { gesamt: l.messagesTotal ?? 0, ungelesen: l.messagesUnread ?? 0 };
}

export type Inhalt = { kopf: Kopf; html: string | null; text: string | null; anhaenge: string[] };

export async function nachrichtVoll(token: string, id: string): Promise<Inhalt> {
  const n = await gmail<GmailNachricht>(token, `/messages/${encodeURIComponent(id)}?format=full`);
  const teile = inhaltTeile(n.payload);
  return { kopf: kopfVon(n), ...teile };
}

// Text- und HTML-Teil suchen (multipart/alternative bevorzugt HTML)
export function inhaltTeile(p: Teil | undefined): { html: string | null; text: string | null; anhaenge: string[] } {
  let html: string | null = null;
  let text: string | null = null;
  const anhaenge: string[] = [];
  const gehen = (t: Teil | undefined) => {
    if (!t) return;
    if (t.filename) {
      anhaenge.push(t.filename);
      return;
    }
    const typ = (t.mimeType ?? "").toLowerCase();
    if (t.body?.data && typ === "text/html" && html === null) html = dekodieren(t.body.data, zeichensatz(t));
    else if (t.body?.data && typ === "text/plain" && text === null) text = dekodieren(t.body.data, zeichensatz(t));
    for (const u of t.parts ?? []) gehen(u);
  };
  gehen(p);
  return { html, text, anhaenge };
}

function zeichensatz(t: Teil): string {
  const typ = t.headers?.find((h) => h.name.toLowerCase() === "content-type")?.value ?? "";
  return /charset="?([\w-]+)"?/i.exec(typ)?.[1]?.toLowerCase() ?? "utf-8";
}

function dekodieren(daten: string, satz: string): string {
  const bytes = base64urlLesen(daten);
  try {
    return new TextDecoder(satz).decode(bytes);
  } catch {
    // Unbekannter Zeichensatz: als UTF-8 lesen
    return new TextDecoder().decode(bytes);
  }
}

// Gmail liefert snippet mit HTML-Entitäten
export function htmlEntitaeten(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;|&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

// Betreff, Absender usw. können MIME-kodiert sein (=?UTF-8?B?...?=); Gmail
// liefert sie bereits dekodiert, daher nur noch Leerraum glätten.
export const betreff = (k: Kopfzeilen) => (k["subject"] ?? "").replace(/\s+/g, " ").trim() || "(ohne Betreff)";

// ---------- Entwürfe ----------

// Normales base64 (mit + und /, aufgefüllt)
function base64(daten: Uint8Array): string {
  let s = "";
  for (const b of daten) s += String.fromCharCode(b);
  return btoa(s);
}

// Kopfzeilenwert mit Nicht-ASCII-Zeichen als encoded-word (RFC 2047)
export function kopfKodieren(wert: string): string {
  const sauber = wert.replace(/[\r\n]+/g, " ");
  if (/^[\x20-\x7e]*$/.test(sauber)) return sauber;
  return `=?UTF-8?B?${base64(new TextEncoder().encode(sauber))}?=`;
}

export type Entwurf = {
  von: string | null; // null = Standardabsender des Kontos
  an: string;
  betreff: string;
  text: string;
  antwortAuf?: { messageId: string | null; references: string | null; threadId: string };
};

// RFC-2822-Nachricht (nur Text, UTF-8, base64)
export function mimeBauen(e: Entwurf): string {
  const zeilen: string[] = [];
  if (e.von) zeilen.push(`From: ${e.von}`);
  zeilen.push(`To: ${e.an.replace(/[\r\n]+/g, " ")}`);
  zeilen.push(`Subject: ${kopfKodieren(e.betreff)}`);
  if (e.antwortAuf?.messageId) {
    zeilen.push(`In-Reply-To: ${e.antwortAuf.messageId}`);
    zeilen.push(`References: ${[e.antwortAuf.references, e.antwortAuf.messageId].filter(Boolean).join(" ")}`);
  }
  zeilen.push("MIME-Version: 1.0", "Content-Type: text/plain; charset=UTF-8", "Content-Transfer-Encoding: base64", "");
  const b64 = base64(new TextEncoder().encode(e.text.replace(/\r?\n/g, "\r\n")));
  zeilen.push(b64.replace(/.{1,76}/g, "$&\r\n"));
  return zeilen.join("\r\n");
}

export async function entwurfAnlegen(token: string, e: Entwurf): Promise<string> {
  const raw = base64urlKodieren(new TextEncoder().encode(mimeBauen(e)));
  const d = await gmail<{ id: string }>(token, "/drafts", {
    method: "POST",
    body: JSON.stringify({ message: { raw, ...(e.antwortAuf ? { threadId: e.antwortAuf.threadId } : {}) } }),
  });
  return d.id;
}

// ---------- Verlauf (neue Mails seit dem letzten Lauf) ----------

export async function aktuelleHistoryId(token: string): Promise<string> {
  const p = await gmail<{ historyId: string; emailAddress: string }>(token, "/profile");
  return p.historyId;
}

// Neue Nachrichten seit startHistoryId. null = Stand zu alt (Gmail: 404), neu beginnen.
export async function neueNachrichten(
  token: string,
  start: string,
  hoechstens = 500,
): Promise<{ ids: string[]; historyId: string } | null> {
  const ids = new Set<string>();
  let seite: string | undefined;
  let letzte = start;
  do {
    const p = new URLSearchParams({ startHistoryId: start, historyTypes: "messageAdded", maxResults: "500" });
    if (seite) p.set("pageToken", seite);
    let d: { history?: { messagesAdded?: { message: { id: string; labelIds?: string[] } }[] }[]; historyId: string; nextPageToken?: string };
    try {
      d = await gmail(token, `/history?${p}`);
    } catch (e) {
      if (e instanceof GmailFehler && e.status === 404) return null;
      throw e;
    }
    for (const h of d.history ?? []) {
      for (const m of h.messagesAdded ?? []) ids.add(m.message.id);
    }
    letzte = d.historyId;
    seite = d.nextPageToken;
  } while (seite && ids.size < hoechstens);
  return { ids: [...ids].slice(0, hoechstens), historyId: letzte };
}

// Link zur Mail im Gmail-Web (gleiches Konto)
export const gmailLink = (id: string) => `https://mail.google.com/mail/u/0/#all/${id}`;
