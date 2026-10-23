import { createAdminClient } from "@/lib/supabase/admin";
import { gleich } from "@/lib/google";
import { mailSortieren } from "@/lib/mail-sortieren";

// Interner Einstieg für den Cloudflare Cron Trigger (worker.ts), alle 15 Minuten.
// Zugang nur mit API_TOKEN als Bearer-Token (mindestens 32 Zeichen), danach
// Admin-Client. Manuell testbar per curl mit demselben Token.
function erlaubt(request: Request): boolean {
  const erwartet = process.env["API_TOKEN"]?.trim();
  const kopf = request.headers.get("authorization") ?? "";
  const token = kopf.startsWith("Bearer ") ? kopf.slice(7) : "";
  return Boolean(erwartet && erwartet.length >= 32 && gleich(token, erwartet));
}

export async function POST(request: Request): Promise<Response> {
  if (!erlaubt(request)) return new Response("Nicht autorisiert", { status: 401 });
  try {
    const mail = await mailSortieren(createAdminClient());
    console.log(`cron mail: ${mail.meldung}`);
    return Response.json({ ok: true, mail });
  } catch (e) {
    const meldung = e instanceof Error ? e.message : String(e);
    console.error(`cron mail: FEHLER ${meldung}`);
    return Response.json({ ok: false, fehler: meldung }, { status: 500 });
  }
}
