"use server";

import { revalidatePath } from "next/cache";
import { requireZugang } from "@/lib/auth";
import { todoistAnlegen, todoistErledigen, type Quelle } from "@/lib/aufgaben";

type Antwort = { ok: boolean; meldung: string };

const DATUM = /^\d{4}-\d{2}-\d{2}$/;

export async function aufgabeErledigen(quelle: Quelle, id: string): Promise<Antwort> {
  await requireZugang();
  try {
    if (quelle !== "todoist") return { ok: false, meldung: "Business OS ist noch nicht angebunden." };
    await todoistErledigen(id);
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
