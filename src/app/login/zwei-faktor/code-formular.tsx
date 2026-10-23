"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { SupabaseConfig } from "@/lib/supabase/config";
import { Feld, Knopf, Meldung } from "@/components/ui";

// Abfrage des 6-stelligen Codes aus der Authenticator-App nach dem Login
export function CodeFormular({ config }: { config: SupabaseConfig }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [fehler, setFehler] = useState<string>();
  const [laeuft, setLaeuft] = useState(false);

  async function pruefen(e: React.FormEvent) {
    e.preventDefault();
    setLaeuft(true);
    setFehler(undefined);

    const supabase = createClient(config);
    const { data: faktoren, error: listenFehler } = await supabase.auth.mfa.listFactors();
    const faktor = faktoren?.totp[0];
    if (listenFehler || !faktor) {
      setFehler("Kein Zwei-Faktor-Verfahren gefunden.");
      setLaeuft(false);
      return;
    }

    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: faktor.id, code });
    if (error) {
      setFehler("Code ungültig.");
      setLaeuft(false);
      return;
    }

    router.replace("/");
    router.refresh();
  }

  return (
    <form onSubmit={pruefen} className="flex flex-col gap-3">
      <Feld
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]{6}"
        maxLength={6}
        placeholder="6-stelliger Code"
        aria-label="Code"
        value={code}
        onChange={(e) => setCode(e.target.value.trim())}
        required
        autoFocus
      />
      {fehler && <Meldung>{fehler}</Meldung>}
      <Knopf type="submit" disabled={laeuft}>
        {laeuft ? "Prüfen …" : "Bestätigen"}
      </Knopf>
    </form>
  );
}
