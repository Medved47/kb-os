import { cache } from "react";
import type { Aufgabe, Erledigt } from "@/lib/aufgaben";

// Anbindung an das Business OS (Repo Medved47/business-os, Route /api/kb).
// Variablen: BUSINESS_OS_URL (z. B. https://os.webcodic.de), BUSINESS_OS_TOKEN
// (gleicher Wert wie KB_OS_TOKEN im Business OS).

export type Frist = { id: string; titel: string; datum: string; zusatz: string | null; link: string | null };

type KbAufgabe = {
  id: string;
  titel: string;
  faellig_am: string | null;
  prioritaet: string;
  kunde: string | null;
  projekt: string | null;
};
type KbFrist = { id: string; titel: string; deadline: string; kunde: string | null };

function konfig(): { url: string; token: string } | null {
  const url = process.env["BUSINESS_OS_URL"]?.replace(/\/+$/, "");
  const token = process.env["BUSINESS_OS_TOKEN"];
  return url && token ? { url, token } : null;
}

export const businessEingerichtet = () => konfig() !== null;

const PRIORITAET: Record<string, Aufgabe["prioritaet"]> = { hoch: 4, normal: 2, niedrig: 1 };

export function businessAufgabe(a: KbAufgabe, url: string): Aufgabe {
  return {
    id: a.id,
    quelle: "business",
    titel: a.titel,
    faellig: a.faellig_am,
    uhrzeit: null,
    prioritaet: PRIORITAET[a.prioritaet] ?? 2,
    zusatz: [a.kunde, a.projekt].filter(Boolean).join(" · ") || null,
    link: `${url}/aufgaben`,
    wiederkehrend: false,
    dauer: null,
  };
}

// Einmal pro Anfrage laden (Heute braucht Aufgaben und Fristen)
export const businessDaten = cache(async (): Promise<{
  aufgaben: Aufgabe[];
  fristen: Frist[];
  erledigt: Erledigt[];
} | null> => {
  const k = konfig();
  if (!k) return null;
  const r = await fetch(`${k.url}/api/kb`, {
    headers: { authorization: `Bearer ${k.token}` },
    signal: AbortSignal.timeout(8000),
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`Business OS HTTP ${r.status}`);
  const d = (await r.json()) as { aufgaben: KbAufgabe[]; fristen: KbFrist[]; erledigt?: { id: string; titel: string }[] };
  return {
    aufgaben: d.aufgaben.map((a) => businessAufgabe(a, k.url)),
    fristen: d.fristen.map((f) => ({
      id: `business:${f.id}`,
      titel: f.titel,
      datum: f.deadline,
      zusatz: f.kunde,
      link: `${k.url}/projekte/${f.id}`,
    })),
    erledigt: (d.erledigt ?? []).map((e) => ({ id: e.id, quelle: "business" as const, titel: e.titel })),
  };
});

async function senden(daten: Record<string, unknown>): Promise<void> {
  const k = konfig();
  if (!k) throw new Error("Business OS ist nicht eingerichtet (BUSINESS_OS_URL, BUSINESS_OS_TOKEN).");
  const r = await fetch(`${k.url}/api/kb`, {
    method: "POST",
    headers: { authorization: `Bearer ${k.token}`, "content-type": "application/json" },
    body: JSON.stringify(daten),
    signal: AbortSignal.timeout(8000),
  });
  if (!r.ok) {
    const d = (await r.json().catch(() => null)) as { fehler?: string } | null;
    throw new Error(d?.fehler ?? `Business OS HTTP ${r.status}`);
  }
}

export async function businessVerschieben(id: string, datum: string): Promise<void> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error("Ungültige Aufgaben-ID.");
  await senden({ aktion: "verschieben", id, faellig_am: datum });
}

export async function businessErledigen(id: string): Promise<void> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error("Ungültige Aufgaben-ID.");
  await senden({ aktion: "erledigen", id });
}

// Aufgabe des Inhabers im Business OS anlegen (z. B. aus einer Mail)
export async function businessAnlegen(titel: string, faellig: string | null, beschreibung: string | null): Promise<void> {
  await senden({ aktion: "anlegen", titel, faellig_am: faellig, beschreibung });
}

export type Kontakt = { name: string; firma: string; anrede: "du" | "sie" | null };

// Kontakt im Business OS zu einer Mailadresse (für die Anrede), null = unbekannt
export async function businessKontakt(email: string): Promise<Kontakt | null> {
  const k = konfig();
  if (!k) return null;
  const r = await fetch(`${k.url}/api/kb`, {
    method: "POST",
    headers: { authorization: `Bearer ${k.token}`, "content-type": "application/json" },
    body: JSON.stringify({ aktion: "kontakt", email }),
    signal: AbortSignal.timeout(8000),
  });
  if (!r.ok) throw new Error(`Business OS HTTP ${r.status}`);
  return ((await r.json()) as { kontakt?: Kontakt | null }).kontakt ?? null;
}
