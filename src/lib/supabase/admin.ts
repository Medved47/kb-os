import { createClient } from "@supabase/supabase-js";
import { getSupabaseConfig } from "./config";

// Supabase-Client mit Secret Key: umgeht Row Level Security.
// Nur auf dem Server und erst nach geprüftem Zugang (requireZugang, Cron-Token)
// verwenden. Nie an den Browser geben.
export function createAdminClient() {
  const { url } = getSupabaseConfig();
  const env = process.env;
  const key = env["SUPABASE_SECRET_KEY"];
  if (!key) throw new Error("SUPABASE_SECRET_KEY ist nicht gesetzt.");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: mitWiederholung },
  });
}

// Supabase meldet gelegentlich "JWT issued at future" (kurzer Zeitversatz
// zwischen Gateway und Datenbank). Dann nach kurzer Pause einmal wiederholen.
async function mitWiederholung(
  eingabe: RequestInfo | URL,
  optionen?: RequestInit,
): Promise<Response> {
  const antwort = await fetch(eingabe, optionen);
  if (antwort.status !== 401) return antwort;
  const text = await antwort.clone().text();
  if (!text.includes("issued at future")) return antwort;
  await new Promise((r) => setTimeout(r, 1500));
  return fetch(eingabe, optionen);
}
