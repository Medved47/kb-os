import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseConfig } from "./config";

// Supabase-Client für Client Components (Browser).
// Die Konfiguration kommt vom Server (siehe config.ts).
export function createClient({ url, key }: SupabaseConfig) {
  return createBrowserClient(url, key);
}
