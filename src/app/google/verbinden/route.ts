import { NextResponse, type NextRequest } from "next/server";
import { requireZugang } from "@/lib/auth";
import { freigabeUrl, googleKonfig, istKonto, neuerState, STATE_COOKIE } from "@/lib/google";

// Start der Google-Freigabe (Knopf unter Einstellungen), ?konto=privat|business.
// state im Cookie schützt den Rückruf vor untergeschobenen Codes.
export async function GET(request: NextRequest) {
  await requireZugang();
  const konto = request.nextUrl.searchParams.get("konto");
  const einstellungen = (status: string) => new URL(`/einstellungen?google=${status}`, request.url);
  if (!istKonto(konto)) return NextResponse.redirect(einstellungen("ungueltig"));
  if (!googleKonfig()) return NextResponse.redirect(einstellungen("nicht-eingerichtet"));

  const state = neuerState(konto);
  const antwort = NextResponse.redirect(freigabeUrl(request.nextUrl.origin, konto, state));
  antwort.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/google",
    maxAge: 10 * 60,
  });
  return antwort;
}
