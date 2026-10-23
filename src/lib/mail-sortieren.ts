import type { SupabaseClient } from "@supabase/supabase-js";
import {
  aktuelleHistoryId,
  betreff,
  eigeneLabels,
  gmailToken,
  labelIds,
  labelsAendern,
  nachrichtKopf,
  NichtVerbunden,
  neueNachrichten,
} from "@/lib/gmail";
import { absenderName, adresse, festerBereich, ziel, type Regel } from "@/lib/mail-regeln";
import { pushAnAlle } from "@/lib/push";

// Job "Mail sortieren" (Cron alle 15 Minuten, siehe worker.ts und /api/cron).
// Holt neue Mails seit dem letzten Lauf (Gmail history.list), setzt Bereich und
// Ordner nach den festen Regeln (src/lib/mail-regeln.ts), sonst "Einordnen".
// Wichtige Mails melden sich per Push. Nie senden, löschen oder archivieren.
// db: Admin-Client.

// Nicht anfassen: eigene Mails, Entwürfe, Spam, Papierkorb, Chats
const UEBERSPRINGEN = ["SENT", "DRAFT", "SPAM", "TRASH", "CHAT"];

export type Ergebnis = { meldung: string; sortiert: number; einordnen: number };

export async function mailSortieren(db: SupabaseClient): Promise<Ergebnis> {
  const kb = db.schema("kb");
  try {
    const ergebnis = await sortieren(db);
    await kb.from("mail_stand").upsert({ id: 1, fehler: null, fehler_am: null });
    return ergebnis;
  } catch (e) {
    if (e instanceof NichtVerbunden) return { meldung: e.message, sortiert: 0, einordnen: 0 };
    const text = e instanceof Error ? e.message : String(e);
    await kb.from("mail_stand").upsert({ id: 1, fehler: text.slice(0, 500), fehler_am: new Date().toISOString() });
    throw e;
  }
}

async function sortieren(db: SupabaseClient): Promise<Ergebnis> {
  const kb = db.schema("kb");
  const token = await gmailToken(db);
  const { data: stand, error } = await kb.from("mail_stand").select("history_id").eq("id", 1).maybeSingle();
  if (error) throw new Error(error.message);

  const jetzt = new Date().toISOString();
  const start = (stand as { history_id: string | null } | null)?.history_id;
  // Erster Lauf: nur den Stand merken, der Altbestand bleibt wie er ist
  if (!start) {
    await kb.from("mail_stand").upsert({ id: 1, history_id: await aktuelleHistoryId(token), sortiert_am: jetzt, sortiert_anzahl: 0 });
    return { meldung: "Start: ab jetzt werden neue Mails sortiert.", sortiert: 0, einordnen: 0 };
  }

  const neu = await neueNachrichten(token, start);
  if (!neu) {
    // Stand älter als etwa eine Woche (Gmail hält den Verlauf nicht länger)
    await kb.from("mail_stand").upsert({ id: 1, history_id: await aktuelleHistoryId(token), sortiert_am: jetzt, sortiert_anzahl: 0 });
    return { meldung: "Stand zu alt, neu begonnen. Dazwischen eingegangene Mails nicht sortiert.", sortiert: 0, einordnen: 0 };
  }

  let sortiert = 0;
  let einordnen = 0;
  const wichtig: { id: string; text: string }[] = [];
  if (neu.ids.length > 0) {
    const ids = await labelIds(token);
    const eigene = new Set(eigeneLabels(ids));
    const { data: regelZeilen, error: e2 } = await kb.from("mail_regeln").select("absender, bereich, ordner");
    if (e2) throw new Error(e2.message);
    const regeln = new Map((regelZeilen ?? []).map((r) => [r.absender as string, { bereich: r.bereich, ordner: r.ordner } as Regel]));

    for (const id of neu.ids) {
      let kopf;
      try {
        kopf = await nachrichtKopf(token, id);
      } catch {
        // Inzwischen gelöscht o. Ä.
        continue;
      }
      if (kopf.labelIds.some((l) => UEBERSPRINGEN.includes(l) || eigene.has(l))) continue;
      const namen = kopf.labelIds.map((l) => ids.namen.get(l) ?? l);
      const absender = adresse(kopf.k["from"]);
      const z = ziel(festerBereich(kopf.k, namen), absender ? (regeln.get(absender) ?? null) : null);
      if (z.art === "sortiert") {
        await labelsAendern(token, id, [ids.bereich[z.bereich], ids.ordner[z.bereich][z.ordner]], [ids.einordnen]);
        sortiert++;
        if (z.ordner === "wichtig") wichtig.push({ id, text: `${absenderName(kopf.k["from"])}: ${betreff(kopf.k)}` });
      } else {
        await labelsAendern(token, id, [ids.einordnen], []);
        einordnen++;
      }
    }
  }

  await kb.from("mail_stand").upsert({ id: 1, history_id: neu.historyId, sortiert_am: jetzt, sortiert_anzahl: sortiert + einordnen });

  // Push je wichtiger Mail (bei vielen eine Sammelmeldung)
  if (wichtig.length > 0) {
    try {
      if (wichtig.length <= 3) {
        for (const w of wichtig) {
          await pushAnAlle(db, { titel: "Wichtige Mail", text: w.text.slice(0, 180), url: `/postfach/${w.id}`, tag: `mail-${w.id}` });
        }
      } else {
        await pushAnAlle(db, { titel: "Wichtige Mails", text: `${wichtig.length} neue wichtige Mails`, url: "/postfach?ordner=wichtig", tag: "mail-wichtig" });
      }
    } catch (e) {
      console.error("Push wichtige Mail:", e instanceof Error ? e.message : e);
    }
  }

  const meldung = sortiert + einordnen === 0 ? "Keine neuen Mails." : `${sortiert} sortiert, ${einordnen} zum Einordnen, ${wichtig.length} wichtig.`;
  return { meldung, sortiert, einordnen };
}
