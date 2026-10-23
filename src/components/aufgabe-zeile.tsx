"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { aufgabeErledigen, aufgabenAufMorgen, zeitblockEintragen } from "@/app/(app)/aufgaben/aktionen";
import type { Aufgabe } from "@/lib/aufgaben";
import { dauerAuswahl, dauerText } from "@/lib/dauer";
import { Feld, Knopf, Meldung } from "@/components/ui";

const PUNKT = { business: "bg-akzent", todoist: "bg-orange" } as const;
const RING = { 4: "border-rot", 3: "border-orange", 2: "border-akzent", 1: "border-text-3" } as const;

export type BlockVorschlag = { datum: string; uhrzeit: string };

// Eine Aufgabe zum Abhaken. Nach dem Tippen sofort durchgestrichen, bei Fehler zurück.
// Optional: "Morgen" (Abendabschluss) und Zeitblock im Business-Kalender.
export function AufgabeZeile({
  aufgabe,
  datum,
  morgen = false,
  block,
}: {
  aufgabe: Aufgabe;
  datum?: string;
  morgen?: boolean;
  block?: BlockVorschlag;
}) {
  const [zustand, setZustand] = useState<"offen" | "erledigt" | "verschoben">("offen");
  const [fehler, setFehler] = useState<string | null>(null);
  const [laeuft, starten] = useTransition();
  const dialog = useRef<HTMLDialogElement>(null);

  function ausfuehren(neu: "erledigt" | "verschoben", aktion: () => Promise<{ ok: boolean; meldung: string }>) {
    setZustand(neu);
    setFehler(null);
    starten(async () => {
      const r = await aktion();
      if (!r.ok) {
        setZustand("offen");
        setFehler(r.meldung);
      }
    });
  }

  const fertig = zustand !== "offen";
  return (
    <div className="flex min-h-11 items-center gap-3 px-4 py-3 text-[17px] [&+&]:border-t [&+&]:border-trenner">
      <button
        type="button"
        onClick={() => ausfuehren("erledigt", () => aufgabeErledigen(aufgabe.quelle, aufgabe.id))}
        disabled={fertig || laeuft}
        aria-label={`${aufgabe.titel} erledigen`}
        className={`druck flex size-6 shrink-0 items-center justify-center rounded-full border-2 ${
          zustand === "erledigt" ? "border-gruen bg-gruen" : RING[aufgabe.prioritaet]
        }`}
      >
        {zustand === "erledigt" && (
          <svg viewBox="0 0 24 24" className="size-4 text-white" fill="none" stroke="currentColor" strokeWidth={3} aria-hidden>
            <path d="m6 12.5 4 4 8-9" />
          </svg>
        )}
      </button>
      <a href={aufgabe.link} target="_blank" rel="noreferrer" className="flex min-w-0 flex-1 flex-col">
        <span className={`truncate ${fertig ? "text-text-3 line-through" : ""}`}>{aufgabe.titel}</span>
        {(aufgabe.zusatz || fehler || zustand === "verschoben") && (
          <span className={`truncate text-[15px] ${fehler ? "text-rot" : "text-text-2"}`}>
            {fehler ?? (zustand === "verschoben" ? "auf morgen gelegt" : aufgabe.zusatz)}
          </span>
        )}
      </a>
      <span className="flex shrink-0 items-center gap-2 text-[15px] text-text-2">
        {datum ?? aufgabe.uhrzeit}
        {aufgabe.dauer !== null && <span>{dauerText(aufgabe.dauer)}</span>}
        {morgen && !fertig && !aufgabe.wiederkehrend && (
          <button
            type="button"
            disabled={laeuft}
            onClick={() => ausfuehren("verschoben", () => aufgabenAufMorgen([aufgabe]))}
            className="druck rounded-full bg-flaeche-2 px-2.5 py-1 text-[13px] font-semibold text-akzent"
          >
            Morgen
          </button>
        )}
        {block && !fertig && (
          <button
            type="button"
            onClick={() => dialog.current?.showModal()}
            aria-label="Als Zeitblock in den Kalender"
            className="druck text-akzent"
          >
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden>
              <rect x="3.5" y="5" width="17" height="15" rx="3" />
              <path d="M3.5 9.5h17M8 3v4M16 3v4M12 12.5v4M10 14.5h4" />
            </svg>
          </button>
        )}
        <span className={`size-2 rounded-full ${PUNKT[aufgabe.quelle]}`} aria-hidden />
      </span>
      {block && (
        <dialog
          ref={dialog}
          className="m-auto w-[min(92vw,420px)] rounded-2xl bg-grund p-0 text-text backdrop:bg-black/40"
          onClick={(e) => e.target === dialog.current && dialog.current?.close()}
        >
          <ZeitblockFormular aufgabe={aufgabe} block={block} schliessen={() => dialog.current?.close()} />
        </dialog>
      )}
    </div>
  );
}

function ZeitblockFormular({
  aufgabe,
  block,
  schliessen,
}: {
  aufgabe: Aufgabe;
  block: BlockVorschlag;
  schliessen: () => void;
}) {
  const [antwort, senden, laeuft] = useActionState(zeitblockEintragen, null);
  return (
    <form action={senden} className="flex flex-col gap-3 p-4">
      <p className="text-[17px] font-semibold">Zeitblock im Business-Kalender</p>
      <p className="truncate text-[15px] text-text-2">{aufgabe.titel}</p>
      <input type="hidden" name="titel" value={aufgabe.titel} />
      <input type="hidden" name="link" value={aufgabe.link} />
      <div className="flex gap-3">
        <Feld name="datum" type="date" defaultValue={block.datum} className="flex-1" aria-label="Datum" required />
        <Feld name="uhrzeit" type="time" defaultValue={block.uhrzeit} step={900} className="w-28" aria-label="Beginn" required />
      </div>
      <select
        name="minuten"
        defaultValue={String(aufgabe.dauer ?? 60)}
        aria-label="Dauer"
        className="h-11 rounded-xl bg-flaeche-2 px-3 text-[17px]"
      >
        {dauerAuswahl(aufgabe.dauer).map((m) => (
          <option key={m} value={m}>
            {dauerText(m)}
          </option>
        ))}
      </select>
      {antwort && <Meldung art={antwort.ok ? "info" : "fehler"}>{antwort.meldung}</Meldung>}
      <div className="flex gap-3">
        <Knopf type="button" art="leise" className="flex-1" onClick={schliessen}>
          {antwort?.ok ? "Fertig" : "Abbrechen"}
        </Knopf>
        {!antwort?.ok && (
          <Knopf type="submit" className="flex-1" disabled={laeuft}>
            Eintragen
          </Knopf>
        )}
      </div>
    </form>
  );
}
