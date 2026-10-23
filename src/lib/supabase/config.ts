// Supabase-Zugangsdaten zur Laufzeit lesen (Cloudflare-Variablen).
// Nur auf dem Server aufrufen; Client Components bekommen die Werte als Props.
// Hintergrund: NEXT_PUBLIC_*-Werte werden sonst nur beim Build eingebaut,
// fehlen sie dort, ist der Browser-Code ohne Konfiguration.
const URL_VAR = "NEXT_PUBLIC_SUPABASE_URL";
const KEY_VAR = "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY";

export type SupabaseConfig = { url: string; key: string };

export function getSupabaseConfig(): SupabaseConfig {
  // Zugriff per Variable, damit Next.js den Wert nicht beim Build einsetzt
  const env = process.env;
  const url = env[URL_VAR];
  const key = env[KEY_VAR];
  if (!url || !key) {
    throw new Error(
      "Supabase-Konfiguration fehlt: NEXT_PUBLIC_SUPABASE_URL und NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY setzen.",
    );
  }
  return { url, key };
}
