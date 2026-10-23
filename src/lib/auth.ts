import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Stellt sicher, dass der Nutzer angemeldet ist, die Zwei-Faktor-Prüfung
// bestanden hat (AAL2) und in kb.zugang steht. Konto und Zwei-Faktor sind
// dieselben wie im Business OS (gleiches Supabase-Projekt).
// Mit cache(): Layout und Seite prüfen im selben Aufruf nur einmal.
export const requireZugang = cache(async () => {
  const supabase = await createClient();

  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims) redirect("/login");

  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal?.currentLevel !== "aal2") {
    // nextLevel "aal2": Faktor eingerichtet, aber noch nicht bestätigt
    if (aal?.nextLevel === "aal2") redirect("/login/zwei-faktor");
    redirect("/gesperrt?grund=zwei-faktor");
  }

  const { data: darf } = await supabase.schema("kb").rpc("darf");
  if (darf !== true) redirect("/gesperrt");

  return { supabase, kb: supabase.schema("kb"), claims: claimsData.claims };
});
