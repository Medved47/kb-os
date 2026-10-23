"use server";

import { revalidatePath } from "next/cache";
import { requireZugang } from "@/lib/auth";
import { todoistAnlegen, todoistErledigen, todoistVerschieben, type Quelle } from "@/lib/aufgaben";
import { businessErledigen, businessVerschieben } from "@/lib/business-os";
import { zeitblockAnlegen } from "@/lib/kalender";
import { createAdminClient } from "@/lib/supabase/admin";
import { berlinDatum, berlinZeitpunkt, plusTage } from "@/lib/zeit";

type Antwort = { ok: boolean; meldung: string };

const DATUM = /^\d{4}-\d{2}-\d{2}$/;

export async function aufgabeErledigen(quelle: Quelle, id: string): Promise<Antwort> {
  await requireZugang();
  try {
    if (quelle === "business") await businessErledigen(id);
    else await todoistErledigen(id);
  } catch (e) {
    return { ok: false, meldung: e instanceof Error ? e.message : String(e) };
  }
  revalidatePath("/aufgaben");
  revalidatePath("/");
  return { ok: true, meldung: "Erledigt." };
}

// Schnellerfassung: landet in der Todoist-Inbox
export async function aufgabeAnlegen(_vorher: Antwort | null, form: FormData): Promise<Antwort> {
  await requireZugang();
  const titel = String(form.get("titel") ?? "").trim().slice(0, 500);
  const faellig = String(form.get("faellig") ?? "");
  if (!titel) return { ok: false, meldung: "Bitte einen Titel eingeben." };
  if (faellig && !DATUM.test(faellig)) return { ok: false, meldung: "Datum ungültig." };
  try {
    await todoistAnlegen(titel, faellig || null);
  } catch (e) {
    return { ok: false, meldung: e instanceof Error ? e.message : String(e) };
  }
  revalidatePath("/aufgaben");
  revalidatePath("/");
  return { ok: true, meldung: `Angelegt: ${titel}` };
}

type Verschiebbar = { quelle: Quelle; id: string; uhrzeit: string | null };

async function aufMorgen(a: Verschiebbar, morgen: string): Promise<void> {
  if (a.quelle === "business") await businessVerschieben(a.id, morgen);
  else await todoistVerschieben(a.id, morgen, a.uhrzeit && /^\d{2}:\d{2}$/.test(a.uhrzeit) ? a.uhrzeit : null);
}

// Abendabschluss: eine oder mehrere offene Aufgaben auf morgen legen
export async function aufgabenAufMorgen(liste: Verschiebbar[]): Promise<Antwort> {
  await requireZugang();
  const morgen = plusTage(berlinDatum(new Date()), 1);
  const fehler: string[] = [];
  for (const a of liste.slice(0, 100)) {
    try {
      await aufMorgen(a, morgen);
    } catch (e) {
      fehler.push(e instanceof Error ? e.message : String(e));
    }
  }
  revalidatePath("/aufgaben");
  revalidatePath("/");
  if (fehler.length > 0) return { ok: false, meldung: `${fehler.length} nicht verschoben: ${fehler[0]}` };
  return { ok: true, meldung: liste.length === 1 ? "Auf morgen gelegt." : `${liste.length} auf morgen gelegt.` };
}

// Aufgabe als Zeitblock in den Business-Kalender
export async function zeitblockEintragen(_vorher: Antwort | null, form: FormData): Promise<Antwort> {
  await requireZugang();
  const titel = String(form.get("titel") ?? "").trim().slice(0, 300);
  const link = String(form.get("link") ?? "");
  const datum = String(form.get("datum") ?? "");
  const uhrzeit = String(form.get("uhrzeit") ?? "");
  const minuten = Number(form.get("minuten"));
  if (!titel || !DATUM.test(datum) || !/^\d{2}:\d{2}$/.test(uhrzeit)) return { ok: false, meldung: "Datum oder Uhrzeit fehlt." };
  if (!Number.isInteger(minuten) || minuten < 5 || minuten > 600) return { ok: false, meldung: "Dauer ungültig." };
  const [h, m] = uhrzeit.split(":").map(Number);
  try {
    await zeitblockAnlegen(createAdminClient(), {
      titel,
      beginn: berlinZeitpunkt(datum, h ?? 0, m ?? 0),
      minuten,
      link: link.startsWith("https://") ? link : null,
    });
  } catch (e) {
    return { ok: false, meldung: e instanceof Error ? e.message : String(e) };
  }
  revalidatePath("/");
  return { ok: true, meldung: `Im Kalender: ${uhrzeit} Uhr, ${minuten} Min.` };
}
