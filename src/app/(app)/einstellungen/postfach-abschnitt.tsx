"use client";

import { useActionState, useEffect, useRef, useTransition } from "react";
import { regelLoeschen, textbausteinLoeschen, textbausteinSpeichern } from "@/app/(app)/postfach/aktionen";
import { BEREICH_NAME, ORDNER_NAME, type Bereich, type Ordner } from "@/lib/mail-regeln";
import { Abschnitt, Feld, Knopf, Meldung, Zeile } from "@/components/ui";

export type Baustein = { id: string; titel: string; text: string };
export type Regel = { absender: string; bereich: Bereich; ordner: Ordner };

export function TextbausteineAbschnitt({ bausteine }: { bausteine: Baustein[] }) {
  const [antwort, senden, laeuft] = useActionState(textbausteinSpeichern, null);
  const formular = useRef<HTMLFormElement>(null);
  const [loescht, starten] = useTransition();
  useEffect(() => {
    if (antwort?.ok) formular.current?.reset();
  }, [antwort]);
  return (
    <Abschnitt titel="Textbausteine">
      {bausteine.map((b) => (
        <Zeile key={b.id} className="justify-between">
          <div className="flex min-w-0 flex-col">
            <span className="truncate">{b.titel}</span>
            <span className="truncate text-[13px] text-text-2">{b.text}</span>
          </div>
          <button
            type="button"
            disabled={loescht}
            onClick={() => confirm(`"${b.titel}" löschen?`) && starten(() => textbausteinLoeschen(b.id))}
            className="druck shrink-0 text-[15px] text-rot"
          >
            Löschen
          </button>
        </Zeile>
      ))}
      <form ref={formular} action={senden} className={`flex flex-col gap-3 p-4 ${bausteine.length > 0 ? "border-t border-trenner" : ""}`}>
        <Feld name="titel" placeholder="Titel, z. B. Termin bestätigen" maxLength={100} required />
        <textarea
          name="text"
          rows={4}
          maxLength={5000}
          required
          placeholder="Text"
          className="w-full rounded-xl bg-flaeche-2 p-3 text-[17px] outline-none focus:ring-2 focus:ring-akzent"
        />
        {antwort && <Meldung art={antwort.ok ? "info" : "fehler"}>{antwort.meldung}</Meldung>}
        <Knopf type="submit" art="leise" disabled={laeuft}>
          Textbaustein speichern
        </Knopf>
      </form>
    </Abschnitt>
  );
}

export function RegelnAbschnitt({ regeln }: { regeln: Regel[] }) {
  const [laeuft, starten] = useTransition();
  if (regeln.length === 0) return null;
  return (
    <Abschnitt titel="Absender-Regeln">
      {regeln.map((r) => (
        <Zeile key={r.absender} className="justify-between">
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-[15px]">{r.absender}</span>
            <span className="text-[13px] text-text-2">
              {BEREICH_NAME[r.bereich]} / {ORDNER_NAME[r.ordner]}
            </span>
          </div>
          <button
            type="button"
            disabled={laeuft}
            onClick={() => confirm(`Regel für ${r.absender} löschen?`) && starten(() => regelLoeschen(r.absender))}
            className="druck shrink-0 text-[15px] text-rot"
          >
            Löschen
          </button>
        </Zeile>
      ))}
    </Abschnitt>
  );
}
