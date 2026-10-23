import type { SupabaseClient } from "@supabase/supabase-js";
import { gmailToken, labelIds, labelZahlen, liste, type Kopf, type LabelIds } from "@/lib/gmail";
import { BEREICHE, ORDNER, type Bereich, type Ordner } from "@/lib/mail-regeln";

// Daten für Postfach und Heute (Server). db: Admin-Client nach requireZugang().

export type Stand = { sortiert_am: string | null; fehler: string | null; fehler_am: string | null };

export async function sortierStand(db: SupabaseClient): Promise<Stand | null> {
  const { data } = await db.schema("kb").from("mail_stand").select("sortiert_am, fehler, fehler_am").eq("id", 1).maybeSingle();
  return (data as Stand | null) ?? null;
}

// Label-IDs pro Worker-Instanz 10 Minuten behalten (spart einen Aufruf je Seite)
let labelSpeicher: { ids: LabelIds; bis: number } | null = null;

export async function labelsGespeichert(token: string): Promise<LabelIds> {
  if (labelSpeicher && labelSpeicher.bis > Date.now()) return labelSpeicher.ids;
  const ids = await labelIds(token);
  labelSpeicher = { ids, bis: Date.now() + 10 * 60_000 };
  return ids;
}

export type Zahlen = { ordner: Record<Ordner, number>; einordnen: number };

// Ungelesene je Ordner eines Bereichs, dazu alle Mails unter "Einordnen"
export async function zahlen(token: string, ids: LabelIds, bereich: Bereich): Promise<Zahlen> {
  const [einordnen, ...werte] = await Promise.all([
    labelZahlen(token, ids.einordnen),
    ...ORDNER.map((o) => labelZahlen(token, ids.ordner[bereich][o])),
  ]);
  const ordner = {} as Record<Ordner, number>;
  ORDNER.forEach((o, i) => (ordner[o] = werte[i]!.ungelesen));
  return { ordner, einordnen: einordnen!.gesamt };
}

export type BrauchtDich = { mails: (Kopf & { bereich: Bereich })[]; einordnen: number; anzahl: number };

// Heute: ungelesene Mails in Wichtig (beide Bereiche) und Zahl unter "Einordnen".
// anzahl = Badge am App-Symbol.
export async function brauchtDich(db: SupabaseClient): Promise<BrauchtDich> {
  const token = await gmailToken(db);
  const ids = await labelsGespeichert(token);
  const [einordnen, ...listen] = await Promise.all([
    labelZahlen(token, ids.einordnen),
    ...BEREICHE.map((b) => liste(token, ids.ordner[b].wichtig, { anzahl: 5, nurUngelesen: true })),
  ]);
  const zahlenWichtig = await Promise.all(BEREICHE.map((b) => labelZahlen(token, ids.ordner[b].wichtig)));
  const mails = BEREICHE.flatMap((b, i) => listen[i]!.mails.map((m) => ({ ...m, bereich: b })))
    .sort((a, b) => b.datum.getTime() - a.datum.getTime())
    .slice(0, 5);
  const ungelesenWichtig = zahlenWichtig.reduce((n, z) => n + z.ungelesen, 0);
  return { mails, einordnen: einordnen!.gesamt, anzahl: ungelesenWichtig + einordnen!.gesamt };
}

// Kurzes Datum für Listen: heute Uhrzeit, sonst Tag
export function mailDatum(d: Date, jetzt = new Date()): string {
  const tag = (x: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin" }).format(x);
  if (tag(d) === tag(jetzt)) {
    return new Intl.DateTimeFormat("de-DE", { timeZone: "Europe/Berlin", hour: "2-digit", minute: "2-digit" }).format(d);
  }
  return new Intl.DateTimeFormat("de-DE", { timeZone: "Europe/Berlin", day: "numeric", month: "numeric" }).format(d);
}
