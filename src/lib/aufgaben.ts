import { businessDaten } from "@/lib/business-os";
import { berlinZeitpunkt, tagesGrenzen } from "@/lib/zeit";

// Aufgaben aus Todoist und Business OS in einer Liste.
// Todoist: API v1 mit persönlichem Token TODOIST_TOKEN.

export type Quelle = "todoist" | "business";

export type Aufgabe = {
  id: string;
  quelle: Quelle;
  titel: string;
  faellig: string | null; // JJJJ-MM-TT
  uhrzeit: string | null; // HH:MM, nur bei Todoist mit Uhrzeit
  prioritaet: 1 | 2 | 3 | 4; // 4 = höchste (wie Todoist-API)
  zusatz: string | null; // Projekt, Kunde
  link: string;
  wiederkehrend: boolean; // Todoist: "Auf morgen" würde die Wiederholung zerstören
  dauer: number | null; // geschätzte Minuten (Todoist-Feld "Dauer"), sonst null
};

// Heute erledigt, für den Abendabschluss
export type Erledigt = { id: string; quelle: Quelle; titel: string };

export type Gruppe = "ueberfaellig" | "heute" | "woche";

export type AufgabenErgebnis = { aufgaben: Aufgabe[]; fehler: string[] };

const TODOIST = "https://api.todoist.com/api/v1";

function todoistToken(): string {
  const t = process.env["TODOIST_TOKEN"];
  if (!t) throw new Error("TODOIST_TOKEN ist nicht gesetzt.");
  return t;
}

async function todoist<T>(pfad: string, init: RequestInit = {}): Promise<T> {
  const r = await fetch(`${TODOIST}${pfad}`, {
    ...init,
    headers: { authorization: `Bearer ${todoistToken()}`, "content-type": "application/json", ...init.headers },
    signal: AbortSignal.timeout(8000),
  });
  if (!r.ok) throw new Error(`Todoist HTTP ${r.status}`);
  const text = await r.text();
  return (text ? JSON.parse(text) : null) as T;
}

type TodoistAufgabe = {
  id: string;
  content: string;
  priority: number;
  project_id: string;
  due: { date: string; is_recurring?: boolean } | null;
  duration?: { amount: number; unit: "minute" | "day" } | null;
};

// due.date ist "JJJJ-MM-TT" oder mit Uhrzeit "JJJJ-MM-TTTHH:MM:SS" (ggf. mit Z)
export function todoistUmwandeln(t: TodoistAufgabe, projekte: Map<string, string>): Aufgabe {
  const datum = t.due?.date ?? null;
  let faellig = datum ? datum.slice(0, 10) : null;
  let uhrzeit: string | null = null;
  if (datum && datum.length > 10) {
    if (datum.endsWith("Z")) {
      // Feste Zeitzone: in Berliner Zeit umrechnen
      const d = new Date(datum);
      faellig = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin" }).format(d);
      uhrzeit = new Intl.DateTimeFormat("de-DE", { timeZone: "Europe/Berlin", hour: "2-digit", minute: "2-digit" }).format(d);
    } else {
      uhrzeit = datum.slice(11, 16);
    }
  }
  const projekt = projekte.get(t.project_id);
  return {
    id: t.id,
    quelle: "todoist",
    titel: t.content,
    faellig,
    uhrzeit,
    prioritaet: Math.min(4, Math.max(1, t.priority)) as Aufgabe["prioritaet"],
    zusatz: projekt && projekt !== "Inbox" ? projekt : null,
    link: `https://app.todoist.com/app/task/${t.id}`,
    wiederkehrend: t.due?.is_recurring === true,
    // Dauer in Tagen passt nicht zur Tagesplanung, daher nur Minuten
    dauer: t.duration?.unit === "minute" && t.duration.amount > 0 ? t.duration.amount : null,
  };
}

async function alleSeiten<T>(pfad: string): Promise<T[]> {
  const ergebnis: T[] = [];
  let cursor: string | null = null;
  for (let i = 0; i < 10; i++) {
    const trenner = pfad.includes("?") ? "&" : "?";
    const seite: { results: T[]; next_cursor: string | null } = await todoist(
      `${pfad}${trenner}limit=200${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`,
    );
    ergebnis.push(...seite.results);
    cursor = seite.next_cursor;
    if (!cursor) break;
  }
  return ergebnis;
}

export async function todoistAufgaben(): Promise<Aufgabe[]> {
  const [aufgaben, projekte] = await Promise.all([
    alleSeiten<TodoistAufgabe>(`/tasks/filter?query=${encodeURIComponent("overdue | 7 days")}`),
    alleSeiten<{ id: string; name: string }>("/projects"),
  ]);
  const namen = new Map(projekte.map((p) => [p.id, p.name]));
  return aufgaben.map((t) => todoistUmwandeln(t, namen));
}

export async function todoistErledigen(id: string): Promise<void> {
  if (!/^[A-Za-z0-9]+$/.test(id)) throw new Error("Ungültige Todoist-ID.");
  await todoist(`/tasks/${id}/close`, { method: "POST" });
}

// Auf ein anderes Datum legen, Uhrzeit (Berliner Zeit) bleibt erhalten
export async function todoistVerschieben(id: string, datum: string, uhrzeit: string | null): Promise<void> {
  if (!/^[A-Za-z0-9]+$/.test(id)) throw new Error("Ungültige Todoist-ID.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datum)) throw new Error("Datum ungültig.");
  const [h, m] = (uhrzeit ?? "").split(":").map(Number);
  // due_datetime erwartet RFC 3339 in UTC
  const ziel = uhrzeit
    ? { due_datetime: berlinZeitpunkt(datum, h ?? 0, m ?? 0).toISOString().replace(/\.\d{3}Z$/, "Z") }
    : { due_date: datum };
  await todoist(`/tasks/${id}`, { method: "POST", body: JSON.stringify(ziel) });
}

// Heute (Berliner Tag) erledigte Todoist-Aufgaben
export async function todoistErledigtHeute(jetzt: Date): Promise<Erledigt[]> {
  const { beginn, ende } = tagesGrenzen(jetzt);
  const p = new URLSearchParams({ since: beginn.toISOString(), until: ende.toISOString(), limit: "200" });
  const d = await todoist<{ items: { id?: string; task_id?: string; content: string }[] }>(
    `/tasks/completed/by_completion_date?${p}`,
  );
  return (d.items ?? []).map((t) => ({ id: t.id ?? t.task_id ?? t.content, quelle: "todoist", titel: t.content }));
}

export async function todoistAnlegen(titel: string, faellig: string | null): Promise<void> {
  await todoist("/tasks", {
    method: "POST",
    body: JSON.stringify({ content: titel, ...(faellig ? { due_date: faellig } : {}) }),
  });
}

// Alle Quellen laden; Fehler je Quelle sammeln statt werfen
export async function alleAufgaben(): Promise<AufgabenErgebnis> {
  const ergebnis: AufgabenErgebnis = { aufgaben: [], fehler: [] };
  const text = (e: unknown) => (e instanceof Error ? e.message : String(e));
  const [todoist, business] = await Promise.allSettled([todoistAufgaben(), businessDaten()]);
  if (todoist.status === "fulfilled") ergebnis.aufgaben.push(...todoist.value);
  else ergebnis.fehler.push(`Todoist: ${text(todoist.reason)}`);
  if (business.status === "rejected") ergebnis.fehler.push(`Business OS: ${text(business.reason)}`);
  else if (business.value) ergebnis.aufgaben.push(...business.value.aufgaben);
  else ergebnis.fehler.push("Business OS ist noch nicht angebunden (BUSINESS_OS_URL, BUSINESS_OS_TOKEN).");
  ergebnis.aufgaben.sort(vergleich);
  return ergebnis;
}

// Nach Datum, dann Uhrzeit, dann Priorität (hoch zuerst)
export function vergleich(a: Aufgabe, b: Aufgabe): number {
  return (
    (a.faellig ?? "9999").localeCompare(b.faellig ?? "9999") ||
    (a.uhrzeit ?? "99").localeCompare(b.uhrzeit ?? "99") ||
    b.prioritaet - a.prioritaet ||
    a.titel.localeCompare(b.titel, "de")
  );
}

export function gruppe(a: Aufgabe, heute: string): Gruppe {
  if (!a.faellig || a.faellig > heute) return "woche";
  return a.faellig < heute ? "ueberfaellig" : "heute";
}

// Heute erledigt aus allen Quellen; Fehler je Quelle sammeln
export async function erledigtHeute(jetzt: Date): Promise<{ erledigt: Erledigt[]; fehler: string[] }> {
  const text = (e: unknown) => (e instanceof Error ? e.message : String(e));
  const [todoist, business] = await Promise.allSettled([todoistErledigtHeute(jetzt), businessDaten()]);
  const erledigt: Erledigt[] = [];
  const fehler: string[] = [];
  if (todoist.status === "fulfilled") erledigt.push(...todoist.value);
  else fehler.push(`Todoist: ${text(todoist.reason)}`);
  if (business.status === "fulfilled") erledigt.push(...(business.value?.erledigt ?? []));
  return { erledigt, fehler };
}

export type Arbeitslast = { geplant: number; frei: number; ohneDauer: number; zuViel: boolean };

// Geschätzte Dauer der heute fälligen (und überfälligen) Aufgaben gegen die
// restliche freie Zeit. Aufgaben ohne Dauer zählen nicht, werden aber gemeldet.
export function arbeitslast(aufgaben: Aufgabe[], heute: string, freiMinuten: number): Arbeitslast {
  const faellig = aufgaben.filter((a) => gruppe(a, heute) !== "woche");
  const geplant = faellig.reduce((summe, a) => summe + (a.dauer ?? 0), 0);
  return {
    geplant,
    frei: freiMinuten,
    ohneDauer: faellig.filter((a) => a.dauer === null).length,
    zuViel: geplant > freiMinuten,
  };
}
