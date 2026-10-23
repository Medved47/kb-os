"use server";

import { revalidatePath } from "next/cache";
import { requireZugang } from "@/lib/auth";
import { istKonto, verbindungTrennen, type Konto } from "@/lib/google";
import { pushAnAlle } from "@/lib/push";
import { createAdminClient } from "@/lib/supabase/admin";
import { base64urlLesen, erlaubterEndpunkt } from "@/lib/webpush";

type Antwort = { ok: boolean; meldung: string };

// Abo des aktuellen Geräts speichern (vom Browser nach der Freigabe)
export async function aboSpeichern(abo: {
  endpoint: string;
  p256dh: string;
  auth: string;
  geraet: string;
}): Promise<Antwort> {
  const { kb } = await requireZugang();
  if (!erlaubterEndpunkt(abo.endpoint)) return { ok: false, meldung: "Dieser Push-Dienst ist nicht erlaubt." };
  try {
    if (base64urlLesen(abo.p256dh).length !== 65 || base64urlLesen(abo.auth).length !== 16) {
      return { ok: false, meldung: "Schlüssel des Geräts ungültig." };
    }
  } catch {
    return { ok: false, meldung: "Schlüssel des Geräts ungültig." };
  }
  const { error } = await kb.from("push_abos").upsert(
    {
      endpoint: abo.endpoint,
      p256dh: abo.p256dh,
      auth: abo.auth,
      geraet: abo.geraet.slice(0, 200) || null,
    },
    { onConflict: "endpoint" },
  );
  if (error) return { ok: false, meldung: error.message };
  revalidatePath("/einstellungen");
  return { ok: true, meldung: "Mitteilungen auf diesem Gerät an." };
}

export async function aboEntfernen(endpoint: string): Promise<Antwort> {
  const { kb } = await requireZugang();
  const { error } = await kb.from("push_abos").delete().eq("endpoint", endpoint);
  if (error) return { ok: false, meldung: error.message };
  revalidatePath("/einstellungen");
  return { ok: true, meldung: "Mitteilungen auf diesem Gerät aus." };
}

export async function testSenden(): Promise<Antwort> {
  await requireZugang();
  try {
    const meldung = await pushAnAlle(createAdminClient(), {
      titel: "KB OS",
      text: "Test: Mitteilungen kommen an.",
      url: "/einstellungen",
      tag: "test",
    });
    revalidatePath("/einstellungen");
    return { ok: true, meldung };
  } catch (e) {
    return { ok: false, meldung: e instanceof Error ? e.message : String(e) };
  }
}

// Google-Konto trennen: Freigabe widerrufen und Token löschen
export async function googleTrennen(konto: Konto): Promise<void> {
  await requireZugang();
  if (!istKonto(konto)) return;
  await verbindungTrennen(createAdminClient(), konto);
  revalidatePath("/einstellungen");
}
