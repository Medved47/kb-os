import type { SupabaseClient } from "@supabase/supabase-js";
import { base64urlKodieren, pushSenden, type PushAbo, type PushNachricht, type Vapid } from "@/lib/webpush";

// Push an alle Geräte in kb.push_abos. Die VAPID-Schlüssel erzeugt KB OS beim
// ersten Bedarf selbst und speichert sie in kb.schluessel (nur Server lesbar).
// db: Admin-Client (createAdminClient), erst nach geprüftem Zugang.

const SUBJEKT = "mailto:hello@webcodic.de";
const NAME = "vapid";

type Paar = { oeffentlich: string; privat: string };

async function paarErzeugen(): Promise<Paar> {
  const paar = (await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, [
    "sign",
  ])) as CryptoKeyPair;
  const oeffentlich = base64urlKodieren(new Uint8Array(await crypto.subtle.exportKey("raw", paar.publicKey)));
  const { d } = await crypto.subtle.exportKey("jwk", paar.privateKey);
  if (!d) throw new Error("VAPID-Schlüssel konnte nicht erzeugt werden");
  return { oeffentlich, privat: d };
}

export async function vapid(db: SupabaseClient): Promise<Vapid> {
  const kb = db.schema("kb");
  const lesen = async () => {
    const { data, error } = await kb.from("schluessel").select("wert").eq("name", NAME).maybeSingle();
    if (error) throw new Error(error.message);
    return data ? (JSON.parse(data.wert) as Paar) : null;
  };
  let paar = await lesen();
  if (!paar) {
    // Gleichzeitige Erzeugung: der erste Eintrag gewinnt, danach neu lesen
    const neu = await paarErzeugen();
    const { error } = await kb
      .from("schluessel")
      .upsert({ name: NAME, wert: JSON.stringify(neu) }, { onConflict: "name", ignoreDuplicates: true });
    if (error) throw new Error(error.message);
    paar = await lesen();
    if (!paar) throw new Error("VAPID-Schlüssel fehlt");
  }
  return { ...paar, subjekt: SUBJEKT };
}

type AboZeile = PushAbo & { id: string };

// Sendet an alle Geräte, entfernt vom Dienst gelöschte Abos.
// Gibt eine kurze Meldung zurück; wirft, wenn kein Gerät erreicht wurde.
export async function pushAnAlle(db: SupabaseClient, nachricht: PushNachricht): Promise<string> {
  const kb = db.schema("kb");
  const schluessel = await vapid(db);
  const { data, error } = await kb.from("push_abos").select("id, endpoint, p256dh, auth");
  if (error) throw new Error(error.message);
  const abos = (data ?? []) as AboZeile[];
  if (abos.length === 0) return "Kein Gerät eingetragen";

  let gesendet = 0;
  const fehler: string[] = [];
  const entfernen: string[] = [];
  const erreicht: string[] = [];
  for (const abo of abos) {
    try {
      const e = await pushSenden(abo, nachricht, schluessel);
      if (e.ok) {
        gesendet++;
        erreicht.push(abo.id);
      } else if (e.abgelaufen) entfernen.push(abo.id);
      else fehler.push(`HTTP ${e.status}`);
    } catch (e) {
      fehler.push(e instanceof Error ? e.message : String(e));
    }
  }
  if (entfernen.length > 0) await kb.from("push_abos").delete().in("id", entfernen);
  if (erreicht.length > 0) {
    await kb.from("push_abos").update({ zuletzt_ok_am: new Date().toISOString() }).in("id", erreicht);
  }

  const teile = [`${gesendet} von ${abos.length} Geräten erreicht`];
  if (entfernen.length > 0) teile.push(`${entfernen.length} abgelaufen und entfernt`);
  if (fehler.length > 0) teile.push(`Fehler: ${fehler.join(", ")}`);
  const meldung = teile.join("; ");
  if (gesendet === 0 && fehler.length > 0) throw new Error(meldung);
  return meldung;
}
