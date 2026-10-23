import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseConfig } from "./config";

// Supabase-Client für Server Components, Server Actions und Route Handler.
// Pro Anfrage neu erzeugen, nie global wiederverwenden.
export async function createClient() {
  const cookieStore = await cookies();
  const { url, key } = getSupabaseConfig();

  return createServerClient(
    url,
    key,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Aus Server Components heraus nicht erlaubt; der Proxy
            // übernimmt dort das Auffrischen der Sitzung.
          }
        },
      },
    },
  );
}
