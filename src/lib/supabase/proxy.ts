import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseConfig } from "./config";

// Seiten, die ohne Anmeldung erreichbar sind. /api/cron prüft sein Token selbst.
const OEFFENTLICH = ["/login", "/api/cron"];

// Frischt die Sitzung bei jeder Anfrage auf und leitet nicht angemeldete
// Nutzer zum Login um. Zwei-Faktor und Zugang prüft requireZugang().
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { url, key } = getSupabaseConfig();

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
        Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
      },
    },
  });

  // Zwischen Client-Erzeugung und getClaims() keinen Code einfügen,
  // sonst kann die Sitzung unbemerkt verloren gehen.
  const { data } = await supabase.auth.getClaims();
  const angemeldet = Boolean(data?.claims);

  const pfad = request.nextUrl.pathname;
  const istOeffentlich = OEFFENTLICH.some((p) => pfad === p || pfad.startsWith(`${p}/`));

  if (!angemeldet && !istOeffentlich) {
    const ziel = request.nextUrl.clone();
    ziel.pathname = "/login";
    ziel.search = "";
    return NextResponse.redirect(ziel);
  }

  return response;
}
