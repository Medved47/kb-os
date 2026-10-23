import type { Metadata } from "next";
import { connection } from "next/server";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { CodeFormular } from "./code-formular";

export const metadata: Metadata = { title: "Zwei-Faktor" };

export default async function ZweiFaktorSeite() {
  // Zur Laufzeit rendern, damit die Supabase-Werte aus Cloudflare gelesen werden
  await connection();
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-6 px-4">
      <div>
        <h1 className="text-[34px] font-bold tracking-tight">Code eingeben</h1>
        <p className="text-text-2">Aus deiner Authenticator-App, wie im Business OS.</p>
      </div>
      <CodeFormular config={getSupabaseConfig()} />
    </main>
  );
}
