import type { SupabaseClient } from "@supabase/supabase-js";
import { base64urlKodieren, base64urlLesen } from "@/lib/webpush";

// Google-Verbindungen von KB OS (Tabelle kb.google_verbindungen, nur Server).
// Zwei Konten, je einmal unter Einstellungen freigegeben:
// - privat:   Gmail (lesen, Labels, Entwürfe) und Kalender lesen
// - business: Workspace-Kalender (Zeitblöcke) und Drive (nur eigene Dateien)
// Der Refresh-Token liegt nur verschlüsselt in der Datenbank (AES-GCM,
// Schlüssel GOOGLE_TOKEN_KEY, 32 Byte base64, Format wie im Business OS).
// Nur REST per fetch, keine googleapis-Bibliothek.

export type Konto = "privat" | "business";
export const KONTEN: readonly Konto[] = ["privat", "business"];
export const KONTO_NAME: Record<Konto, string> = { privat: "Privat (Gmail)", business: "Business (Workspace)" };

const S = "https://www.googleapis.com/auth/";
export const SCOPES: Record<Konto, string[]> = {
  privat: [`${S}gmail.modify`, `${S}gmail.compose`, `${S}calendar.readonly`],
  business: [`${S}calendar.events`, `${S}drive.file`],
};

export const RUECKRUF_PFAD = "/google/rueckruf";
export const STATE_COOKIE = "google_state";
const TOKEN_URL = "https://oauth2.googleapis.com/token";

type Konfig = { clientId: string; clientSecret: string; schluessel: string };

// Zur Laufzeit lesen, null = noch nicht eingerichtet
export function googleKonfig(): Konfig | null {
  const env = process.env;
  // Leerzeichen und Zeilenumbrüche aus dem Kopieren ins Dashboard entfernen
  const clientId = env["GOOGLE_CLIENT_ID"]?.trim();
  const clientSecret = env["GOOGLE_CLIENT_SECRET"]?.trim();
  const schluessel = env["GOOGLE_TOKEN_KEY"]?.trim();
  if (!clientId || !clientSecret || !schluessel) return null;
  return { clientId, clientSecret, schluessel };
}

function konfig(): Konfig {
  const k = googleKonfig();
  if (!k) throw new Error("Google ist nicht eingerichtet (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_TOKEN_KEY).");
  return k;
}

export function istKonto(wert: unknown): wert is Konto {
  return wert === "privat" || wert === "business";
}

// ---------- Verschlüsselung des Refresh-Tokens ----------

async function aesSchluessel(schluessel: string): Promise<CryptoKey> {
  // base64urlLesen versteht base64 und base64url
  const roh = base64urlLesen(schluessel.trim());
  if (roh.length !== 32) throw new Error("GOOGLE_TOKEN_KEY muss 32 Byte (base64) lang sein.");
  return crypto.subtle.importKey("raw", roh, "AES-GCM", false, ["encrypt", "decrypt"]);
}

// Format: v1.<iv>.<chiffre> (base64url)
export async function verschluesseln(text: string, schluessel: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const chiffre = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    await aesSchluessel(schluessel),
    new TextEncoder().encode(text),
  );
  return `v1.${base64urlKodieren(iv)}.${base64urlKodieren(new Uint8Array(chiffre))}`;
}

export async function entschluesseln(wert: string, schluessel: string): Promise<string> {
  const [version, iv, chiffre] = wert.split(".");
  if (version !== "v1" || !iv || !chiffre) throw new Error("Gespeicherter Google-Token ist ungültig.");
  const klar = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64urlLesen(iv) },
    await aesSchluessel(schluessel),
    base64urlLesen(chiffre),
  );
  return new TextDecoder().decode(klar);
}

// ---------- Freigabe (OAuth mit Google) ----------

export function freigabeUrl(origin: string, konto: Konto, state: string): string {
  const p = new URLSearchParams({
    client_id: konfig().clientId,
    redirect_uri: `${origin}${RUECKRUF_PFAD}`,
    response_type: "code",
    scope: SCOPES[konto].join(" "),
    access_type: "offline",
    // Ohne "consent" gibt Google bei erneuter Freigabe keinen Refresh-Token
    prompt: "consent select_account",
    include_granted_scopes: "false",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${p}`;
}

type TokenAntwort = { access_token: string; expires_in: number; refresh_token?: string; scope?: string };

async function tokenAnfrage(felder: Record<string, string>): Promise<TokenAntwort> {
  const k = konfig();
  const antwort = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: k.clientId, client_secret: k.clientSecret, ...felder }),
    signal: AbortSignal.timeout(8000),
  });
  const daten = (await antwort.json().catch(() => ({}))) as TokenAntwort & { error?: string };
  if (!antwort.ok) {
    if (daten.error === "invalid_grant") {
      throw new Error("Google-Freigabe abgelaufen oder widerrufen. Unter Einstellungen neu verbinden.");
    }
    throw new Error(`Google-Anmeldung fehlgeschlagen (${daten.error ?? antwort.status}).`);
  }
  return daten;
}

// Fehlende Rechte (Google lässt einzelne Häkchen abwählen)
export function fehlendeScopes(konto: Konto, erteilt: string): string[] {
  const liste = erteilt.split(" ");
  return SCOPES[konto].filter((s) => !liste.includes(s));
}

// Mailadresse des freigegebenen Kontos (OpenID-Endpunkt braucht eigenen Scope,
// daher je nach Rechten über Gmail oder den Kalender)
async function kontoAdresse(konto: Konto, token: string): Promise<string> {
  const url =
    konto === "privat"
      ? "https://gmail.googleapis.com/gmail/v1/users/me/profile"
      : "https://www.googleapis.com/calendar/v3/calendars/primary";
  const r = await fetch(url, { headers: { authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(8000) });
  if (!r.ok) throw new Error(`Konto nicht lesbar (HTTP ${r.status}).`);
  const d = (await r.json()) as { emailAddress?: string; id?: string };
  const adresse = d.emailAddress ?? d.id;
  if (!adresse) throw new Error("Mailadresse des Kontos nicht gefunden.");
  return adresse;
}

// Code aus dem Rückruf einlösen und verschlüsselt speichern. db: Admin-Client.
export async function verbindungSpeichern(
  db: SupabaseClient,
  konto: Konto,
  origin: string,
  code: string,
): Promise<{ email: string; scopes: string }> {
  const t = await tokenAnfrage({ grant_type: "authorization_code", code, redirect_uri: `${origin}${RUECKRUF_PFAD}` });
  if (!t.refresh_token) throw new Error("Google hat keinen Refresh-Token geliefert. Bitte erneut verbinden.");
  const scopes = t.scope ?? "";
  const email = await kontoAdresse(konto, t.access_token);
  const { error } = await db.schema("kb").from("google_verbindungen").upsert({
    konto,
    email,
    scopes,
    refresh_token: await verschluesseln(t.refresh_token, konfig().schluessel),
    verbunden_am: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
  zwischenspeicher.set(konto, { token: t.access_token, ablauf: Date.now() + (t.expires_in - 60) * 1000 });
  return { email, scopes };
}

export type Verbindung = { konto: Konto; email: string; scopes: string; verbunden_am: string };

export async function verbindungenLesen(db: SupabaseClient): Promise<Verbindung[]> {
  const { data, error } = await db
    .schema("kb")
    .from("google_verbindungen")
    .select("konto, email, scopes, verbunden_am");
  if (error) throw new Error(error.message);
  return (data ?? []) as Verbindung[];
}

// Freigabe bei Google widerrufen (Fehler egal) und Zeile löschen
export async function verbindungTrennen(db: SupabaseClient, konto: Konto): Promise<void> {
  const { data } = await db.schema("kb").from("google_verbindungen").select("refresh_token").eq("konto", konto).maybeSingle();
  const k = googleKonfig();
  if (data && k) {
    try {
      const token = await entschluesseln((data as { refresh_token: string }).refresh_token, k.schluessel);
      await fetch("https://oauth2.googleapis.com/revoke", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ token }),
        signal: AbortSignal.timeout(5000),
      });
    } catch {
      // Widerruf ist optional, die Zeile wird trotzdem gelöscht
    }
  }
  zwischenspeicher.delete(konto);
  const { error } = await db.schema("kb").from("google_verbindungen").delete().eq("konto", konto);
  if (error) throw new Error(error.message);
}

// ---------- Zugangstoken für API-Aufrufe ----------

// Pro Worker-Instanz zwischengespeichert, bis kurz vor Ablauf
const zwischenspeicher = new Map<Konto, { token: string; ablauf: number }>();

// null = Konto nicht verbunden
export async function zugangsToken(db: SupabaseClient, konto: Konto): Promise<string | null> {
  const vorhanden = zwischenspeicher.get(konto);
  if (vorhanden && vorhanden.ablauf > Date.now()) return vorhanden.token;
  const { data, error } = await db
    .schema("kb")
    .from("google_verbindungen")
    .select("refresh_token")
    .eq("konto", konto)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const refresh = await entschluesseln((data as { refresh_token: string }).refresh_token, konfig().schluessel);
  const t = await tokenAnfrage({ grant_type: "refresh_token", refresh_token: refresh });
  zwischenspeicher.set(konto, { token: t.access_token, ablauf: Date.now() + (t.expires_in - 60) * 1000 });
  return t.access_token;
}

// GET auf eine Google-API mit Zugangstoken, wirft bei Fehlern
export async function googleGet<T>(token: string, url: string): Promise<T> {
  const r = await fetch(url, { headers: { authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(8000) });
  if (!r.ok) {
    const text = await r.text().catch(() => "");
    throw new Error(`Google HTTP ${r.status}${text ? `: ${text.slice(0, 200)}` : ""}`);
  }
  return (await r.json()) as T;
}

// ---------- state für den Rückruf ----------

// Zufälliger, URL-sicherer Wert mit vorangestelltem Konto: "privat.<zufall>"
export function neuerState(konto: Konto): string {
  return `${konto}.${base64urlKodieren(crypto.getRandomValues(new Uint8Array(32)))}`;
}

// Vergleich in konstanter Zeit
export function gleich(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let u = 0;
  for (let i = 0; i < a.length; i++) u |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return u === 0;
}
