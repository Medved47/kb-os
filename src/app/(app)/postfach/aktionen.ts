"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { requireZugang } from "@/lib/auth";
import { todoistAnlegen } from "@/lib/aufgaben";
import { businessAnlegen } from "@/lib/business-os";
import { eigeneLabels, entwurfAnlegen, gmailLink, gmailToken, labelsAendern, nachrichtKopf, betreff } from "@/lib/gmail";
import {
  BUSINESS_ABSENDER,
  BEREICH_NAME,
  ORDNER_NAME,
  abmeldung,
  adresse,
  bereichErlaubt,
  istBereich,
  istBusiness,
  istOrdner,
  mailtoLesen,
} from "@/lib/mail-regeln";
import { labelsGespeichert } from "@/lib/postfach";
import { createAdminClient } from "@/lib/supabase/admin";

type Antwort = { ok: boolean; meldung: string };

const ID = /^[0-9a-f]{6,32}$/i;
const DATUM = /^\d{4}-\d{2}-\d{2}$/;
const text = (e: unknown) => (e instanceof Error ? e.message : String(e));

// Mail einem Bereich und Ordner zuordnen; optional den Absender als Regel merken
export async function einordnen(_vorher: Antwort | null, form: FormData): Promise<Antwort> {
  const { kb } = await requireZugang();
  const id = String(form.get("id") ?? "");
  const bereich = form.get("bereich");
  const ordner = form.get("ordner");
  const merken = form.get("merken") === "ja";
  if (!ID.test(id) || !istBereich(bereich) || !istOrdner(ordner)) return { ok: false, meldung: "Bitte Bereich und Ordner wählen." };
  try {
    const token = await gmailToken(createAdminClient());
    const ids = await labelsGespeichert(token);
    const kopf = await nachrichtKopf(token, id);
    if (!bereichErlaubt(kopf.k, bereich)) {
      return { ok: false, meldung: "Die Mail ging über eine Business-Adresse und bleibt Geschäftlich." };
    }
    await labelsAendern(token, id, [ids.bereich[bereich], ids.ordner[bereich][ordner]], eigeneLabels(ids));
    const absender = adresse(kopf.k["from"]);
    if (merken && absender) {
      const { error } = await kb
        .from("mail_regeln")
        .upsert({ absender, bereich, ordner, quelle: "kevin", geaendert_am: new Date().toISOString() });
      if (error) return { ok: false, meldung: `Eingeordnet, Regel nicht gespeichert: ${error.message}` };
    }
    revalidatePath("/postfach");
    revalidatePath("/");
    const ziel = `${BEREICH_NAME[bereich]}/${ORDNER_NAME[ordner]}`;
    return { ok: true, meldung: merken && absender ? `${ziel}. Künftig auch für ${absender}.` : `${ziel}.` };
  } catch (e) {
    return { ok: false, meldung: text(e) };
  }
}

// Antwort als Gmail-Entwurf (nie senden). Geschäftlich mit Business-Absender.
export async function entwurfSpeichern(_vorher: Antwort | null, form: FormData): Promise<Antwort> {
  await requireZugang();
  const id = String(form.get("id") ?? "");
  const inhalt = String(form.get("text") ?? "").trim();
  if (!ID.test(id)) return { ok: false, meldung: "Mail unbekannt." };
  if (!inhalt) return { ok: false, meldung: "Bitte einen Text schreiben." };
  if (inhalt.length > 20_000) return { ok: false, meldung: "Text zu lang." };
  try {
    const token = await gmailToken(createAdminClient());
    const kopf = await nachrichtKopf(token, id);
    const an = kopf.k["reply-to"] ?? kopf.k["from"];
    if (!an || !adresse(an)) return { ok: false, meldung: "Kein Empfänger in der Mail gefunden." };
    const ids = await labelsGespeichert(token);
    const geschaeftlich = istBusiness(kopf.k) || kopf.labelIds.includes(ids.bereich.geschaeftlich);
    const alt = betreff(kopf.k);
    await entwurfAnlegen(token, {
      von: geschaeftlich ? BUSINESS_ABSENDER : null,
      an,
      betreff: /^(re|aw):/i.test(alt) ? alt : `Re: ${alt}`,
      text: inhalt,
      antwortAuf: { messageId: kopf.k["message-id"] ?? null, references: kopf.k["references"] ?? null, threadId: kopf.threadId },
    });
    return { ok: true, meldung: `Entwurf in Gmail gespeichert${geschaeftlich ? ` (von ${BUSINESS_ABSENDER})` : ""}.` };
  } catch (e) {
    return { ok: false, meldung: text(e) };
  }
}

// Mail als Aufgabe in Todoist oder im Business OS, mit Link zur Mail
export async function mailZuAufgabe(_vorher: Antwort | null, form: FormData): Promise<Antwort> {
  await requireZugang();
  const id = String(form.get("id") ?? "");
  const titel = String(form.get("titel") ?? "").trim().slice(0, 300);
  const faellig = String(form.get("faellig") ?? "");
  const ziel = form.get("ziel");
  if (!ID.test(id) || !titel) return { ok: false, meldung: "Bitte einen Titel eingeben." };
  if (faellig && !DATUM.test(faellig)) return { ok: false, meldung: "Datum ungültig." };
  const host = (await headers()).get("host") ?? "";
  const app = /^[a-z0-9.-]+$/i.test(host) && !host.startsWith("localhost") ? `https://${host}/postfach/${id}` : null;
  const beschreibung = [app ? `Mail in KB OS: ${app}` : null, `Mail in Gmail: ${gmailLink(id)}`].filter(Boolean).join("\n");
  try {
    if (ziel === "business") await businessAnlegen(titel, faellig || null, beschreibung);
    else await todoistAnlegen(titel, faellig || null, beschreibung);
  } catch (e) {
    return { ok: false, meldung: text(e) };
  }
  revalidatePath("/aufgaben");
  revalidatePath("/");
  return { ok: true, meldung: `Aufgabe angelegt (${ziel === "business" ? "Business OS" : "Todoist"}).` };
}

// Abbestellen nur auf Tippen: Ein-Klick-Abmeldung (RFC 8058) oder Entwurf an die
// Abmeldeadresse. Ein reiner Link öffnet sich im Browser (siehe Seite).
export async function abbestellen(id: string): Promise<Antwort> {
  await requireZugang();
  if (!ID.test(id)) return { ok: false, meldung: "Mail unbekannt." };
  try {
    const token = await gmailToken(createAdminClient());
    const kopf = await nachrichtKopf(token, id);
    const a = abmeldung(kopf.k);
    if (!a) return { ok: false, meldung: "Diese Mail bietet kein Abbestellen an." };
    if (a.einKlick && a.https) {
      const r = await fetch(a.https, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: "List-Unsubscribe=One-Click",
        redirect: "follow",
        signal: AbortSignal.timeout(10000),
      });
      if (!r.ok) return { ok: false, meldung: `Abbestellen fehlgeschlagen (HTTP ${r.status}).` };
      return { ok: true, meldung: "Abbestellt. Es kann einige Tage dauern, bis keine Mails mehr kommen." };
    }
    const m = a.mailto ? mailtoLesen(a.mailto) : null;
    if (m) {
      await entwurfAnlegen(token, { von: null, an: m.an, betreff: m.betreff, text: m.text });
      return { ok: true, meldung: `Entwurf an ${m.an} in Gmail gespeichert. Zum Abbestellen dort senden.` };
    }
    return { ok: false, meldung: "Nur per Link möglich." };
  } catch (e) {
    return { ok: false, meldung: text(e) };
  }
}

// Gelesen-Markierung (beim Öffnen einer Mail)
export async function alsGelesen(id: string): Promise<void> {
  await requireZugang();
  if (!ID.test(id)) return;
  try {
    const token = await gmailToken(createAdminClient());
    await labelsAendern(token, id, [], ["UNREAD"]);
    revalidatePath("/postfach");
    revalidatePath("/");
  } catch {
    // Nicht kritisch
  }
}

// ---------- Textbausteine und Regeln (Einstellungen) ----------

export async function textbausteinSpeichern(_vorher: Antwort | null, form: FormData): Promise<Antwort> {
  const { kb } = await requireZugang();
  const titel = String(form.get("titel") ?? "").trim().slice(0, 100);
  const inhalt = String(form.get("text") ?? "").trim().slice(0, 5000);
  if (!titel || !inhalt) return { ok: false, meldung: "Titel und Text ausfüllen." };
  const { error } = await kb.from("textbausteine").insert({ titel, text: inhalt });
  if (error) return { ok: false, meldung: error.message };
  revalidatePath("/einstellungen");
  return { ok: true, meldung: `Gespeichert: ${titel}` };
}

export async function textbausteinLoeschen(id: string): Promise<void> {
  const { kb } = await requireZugang();
  if (!/^[0-9a-f-]{36}$/i.test(id)) return;
  await kb.from("textbausteine").delete().eq("id", id);
  revalidatePath("/einstellungen");
}

export async function regelLoeschen(absender: string): Promise<void> {
  const { kb } = await requireZugang();
  await kb.from("mail_regeln").delete().eq("absender", absender.toLowerCase());
  revalidatePath("/einstellungen");
}
