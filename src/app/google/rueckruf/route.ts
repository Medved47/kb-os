import { NextResponse, type NextRequest } from "next/server";
import { requireZugang } from "@/lib/auth";
import { fehlendeScopes, gleich, istKonto, STATE_COOKIE, verbindungSpeichern } from "@/lib/google";
import { createAdminClient } from "@/lib/supabase/admin";

// Rücksprung von Google nach der Freigabe. Prüft Zugang und state,
// löst den Code ein und speichert den Refresh-Token verschlüsselt.
export async function GET(request: NextRequest) {
  await requireZugang();
  const ziel = (status: string) => {
    const antwort = NextResponse.redirect(new URL(`/einstellungen?google=${status}`, request.url));
    antwort.cookies.delete({ name: STATE_COOKIE, path: "/google" });
    return antwort;
  };

  const params = request.nextUrl.searchParams;
  const state = params.get("state") ?? "";
  const erwartet = request.cookies.get(STATE_COOKIE)?.value ?? "";
  if (!erwartet || !gleich(state, erwartet)) return ziel("ungueltig");
  if (params.get("error")) return ziel("abgelehnt");
  const code = params.get("code");
  const konto = state.split(".")[0];
  if (!code || !istKonto(konto)) return ziel("ungueltig");

  try {
    const { scopes } = await verbindungSpeichern(createAdminClient(), konto, request.nextUrl.origin, code);
    return ziel(fehlendeScopes(konto, scopes).length > 0 ? "teilweise" : "verbunden");
  } catch (e) {
    console.error("Google-Rückruf:", e);
    return ziel("fehler");
  }
}
