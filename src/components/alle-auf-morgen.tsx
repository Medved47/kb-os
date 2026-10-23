"use client";

import { useState, useTransition } from "react";
import { aufgabenAufMorgen } from "@/app/(app)/aufgaben/aktionen";
import type { Quelle } from "@/lib/aufgaben";
import { Knopf, Meldung } from "@/components/ui";

// Abendabschluss: alle offenen (nicht wiederkehrenden) Aufgaben auf morgen legen
export function AlleAufMorgen({ liste }: { liste: { quelle: Quelle; id: string; uhrzeit: string | null }[] }) {
  const [meldung, setMeldung] = useState<{ ok: boolean; meldung: string } | null>(null);
  const [laeuft, starten] = useTransition();
  return (
    <div className="flex w-full flex-col gap-2">
      <Knopf
        type="button"
        art="leise"
        disabled={laeuft || meldung?.ok === true}
        onClick={() => starten(async () => setMeldung(await aufgabenAufMorgen(liste)))}
      >
        Alle {liste.length} auf morgen
      </Knopf>
      {meldung && <Meldung art={meldung.ok ? "info" : "fehler"}>{meldung.meldung}</Meldung>}
    </div>
  );
}
