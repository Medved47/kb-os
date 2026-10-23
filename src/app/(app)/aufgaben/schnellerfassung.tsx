"use client";

import { useActionState, useEffect, useRef } from "react";
import { aufgabeAnlegen } from "./aktionen";
import { Feld, Knopf, Meldung } from "@/components/ui";

// Neue Aufgabe mit optionalem Datum (landet in der Todoist-Inbox)
export function Schnellerfassung() {
  const [antwort, senden, laeuft] = useActionState(aufgabeAnlegen, null);
  const formular = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (antwort?.ok) formular.current?.reset();
  }, [antwort]);

  return (
    <form ref={formular} action={senden} className="karte flex flex-col gap-3 p-4">
      <Feld name="titel" placeholder="Neue Aufgabe" autoComplete="off" enterKeyHint="done" required />
      <div className="flex gap-3">
        <Feld name="faellig" type="date" className="flex-1" aria-label="Fällig am" />
        <Knopf type="submit" disabled={laeuft}>
          Anlegen
        </Knopf>
      </div>
      {antwort && <Meldung art={antwort.ok ? "info" : "fehler"}>{antwort.meldung}</Meldung>}
    </form>
  );
}
