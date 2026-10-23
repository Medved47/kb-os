import type { SupabaseClient } from "@supabase/supabase-js";
import { googleGet, zugangsToken, type Konto } from "@/lib/google";
import { berlinZeitpunkt, berlinDatum, tagesGrenzen } from "@/lib/zeit";

// Termine des Tages aus beiden Google-Konten:
// - privat: alle Kalender, die in Google Kalender eingeblendet sind
// - business: Hauptkalender des Workspace-Kontos

export type Termin = {
  id: string;
  titel: string;
  beginn: Date;
  ende: Date;
  ganztags: boolean;
  konto: Konto;
  ort: string | null;
  link: string | null;
};

export type KalenderErgebnis = { termine: Termin[]; fehler: string[]; fehlend: Konto[] };

type GoogleZeit = { dateTime?: string; date?: string };
type GoogleTermin = {
  id: string;
  status?: string;
  summary?: string;
  location?: string;
  htmlLink?: string;
  start: GoogleZeit;
  end: GoogleZeit;
  transparency?: string;
  attendees?: { self?: boolean; responseStatus?: string }[];
};

const API = "https://www.googleapis.com/calendar/v3";

function zeitLesen(z: GoogleZeit): Date {
  if (z.dateTime) return new Date(z.dateTime);
  // Ganztägig: Datum ohne Uhrzeit, Beginn in Berliner Zeit
  return berlinZeitpunkt(z.date ?? "1970-01-01", 0);
}

// Abgesagte und von mir abgelehnte Termine weglassen
export function terminUmwandeln(t: GoogleTermin, konto: Konto): Termin | null {
  if (t.status === "cancelled") return null;
  if (t.attendees?.some((a) => a.self && a.responseStatus === "declined")) return null;
  return {
    id: `${konto}:${t.id}`,
    titel: t.summary?.trim() || "(ohne Titel)",
    beginn: zeitLesen(t.start),
    ende: zeitLesen(t.end),
    ganztags: !t.start.dateTime,
    konto,
    ort: t.location ?? null,
    link: t.htmlLink ?? null,
  };
}

async function kalenderIds(token: string, konto: Konto): Promise<string[]> {
  if (konto === "business") return ["primary"];
  const liste = await googleGet<{ items?: { id: string; selected?: boolean; hidden?: boolean }[] }>(
    token,
    `${API}/users/me/calendarList?minAccessRole=reader`,
  );
  const ids = (liste.items ?? []).filter((k) => k.selected && !k.hidden).map((k) => k.id);
  return ids.length > 0 ? ids : ["primary"];
}

async function termineEinesKontos(db: SupabaseClient, konto: Konto, von: Date, bis: Date): Promise<Termin[] | null> {
  const token = await zugangsToken(db, konto);
  if (!token) return null;
  const ids = await kalenderIds(token, konto);
  const p = new URLSearchParams({
    timeMin: von.toISOString(),
    timeMax: bis.toISOString(),
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "100",
  });
  const listen = await Promise.all(
    ids.map((id) => googleGet<{ items?: GoogleTermin[] }>(token, `${API}/calendars/${encodeURIComponent(id)}/events?${p}`)),
  );
  return listen.flatMap((l) => (l.items ?? []).map((t) => terminUmwandeln(t, konto)).filter((t): t is Termin => t !== null));
}

// Termine eines Berliner Tages, sortiert. Fehler je Konto werden gesammelt, nicht geworfen.
export async function termineAmTag(db: SupabaseClient, tag: Date): Promise<KalenderErgebnis> {
  const { beginn, ende } = tagesGrenzen(tag);
  const ergebnis: KalenderErgebnis = { termine: [], fehler: [], fehlend: [] };
  await Promise.all(
    (["privat", "business"] as const).map(async (konto) => {
      try {
        const t = await termineEinesKontos(db, konto, beginn, ende);
        if (t === null) ergebnis.fehlend.push(konto);
        else ergebnis.termine.push(...t);
      } catch (e) {
        ergebnis.fehler.push(`${konto === "privat" ? "Privat" : "Business"}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }),
  );
  ergebnis.termine.sort((a, b) => Number(b.ganztags) - Number(a.ganztags) || a.beginn.getTime() - b.beginn.getTime());
  return ergebnis;
}

// Freie Zeitfenster zwischen den Terminen eines Tages (nur mit Uhrzeit),
// im Rahmen von - bis (Berliner Stunden), ab "ab" (z. B. jetzt), mindestens 30 Minuten
export function freieFenster(
  termine: Termin[],
  tag: Date,
  ab: Date,
  rahmen = { von: 8, bis: 20 },
  mindestMinuten = 30,
): { beginn: Date; ende: Date }[] {
  const datum = berlinDatum(tag);
  const start = Math.max(berlinZeitpunkt(datum, rahmen.von).getTime(), ab.getTime());
  const schluss = berlinZeitpunkt(datum, rahmen.bis).getTime();
  const belegt = termine
    .filter((t) => !t.ganztags)
    .map((t) => [t.beginn.getTime(), t.ende.getTime()] as const)
    .sort((a, b) => a[0] - b[0]);
  const fenster: { beginn: Date; ende: Date }[] = [];
  let zeiger = start;
  for (const [b, e] of belegt) {
    if (b > zeiger) fenster.push({ beginn: new Date(zeiger), ende: new Date(Math.min(b, schluss)) });
    zeiger = Math.max(zeiger, e);
    if (zeiger >= schluss) break;
  }
  if (zeiger < schluss) fenster.push({ beginn: new Date(zeiger), ende: new Date(schluss) });
  return fenster.filter((f) => f.ende.getTime() - f.beginn.getTime() >= mindestMinuten * 60_000);
}
