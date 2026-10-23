"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type LoginState = { fehler?: string };

export async function anmelden(_vorher: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "");
  const passwort = String(formData.get("passwort") ?? "");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password: passwort });
  if (error) return { fehler: "E-Mail oder Passwort falsch." };

  // Die geschützte Startseite leitet zur Zwei-Faktor-Eingabe weiter
  redirect("/");
}

export async function abmelden() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
