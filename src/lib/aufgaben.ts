// Aufgaben aus Todoist (und später Business OS) in einer Liste.
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
};

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

export async function todoistAnlegen(titel: string, faellig: string | null): Promise<void> {
  await todoist("/tasks", {
    method: "POST",
    body: JSON.stringify({ content: titel, ...(faellig ? { due_date: faellig } : {}) }),
  });
}

// Alle Quellen laden; Fehler je Quelle sammeln statt werfen
export async function alleAufgaben(): Promise<AufgabenErgebnis> {
  const ergebnis: AufgabenErgebnis = { aufgaben: [], fehler: [] };
  try {
    ergebnis.aufgaben.push(...(await todoistAufgaben()));
  } catch (e) {
    ergebnis.fehler.push(`Todoist: ${e instanceof Error ? e.message : String(e)}`);
  }
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
