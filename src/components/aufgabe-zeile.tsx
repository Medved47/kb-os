"use client";

import { useState, useTransition } from "react";
import { aufgabeErledigen } from "@/app/(app)/aufgaben/aktionen";
import type { Aufgabe } from "@/lib/aufgaben";

const PUNKT = { business: "bg-akzent", todoist: "bg-orange" } as const;
const RING = { 4: "border-rot", 3: "border-orange", 2: "border-akzent", 1: "border-text-3" } as const;

// Eine Aufgabe zum Abhaken. Nach dem Tippen sofort durchgestrichen, bei Fehler zurück.
export function AufgabeZeile({ aufgabe, datum }: { aufgabe: Aufgabe; datum?: string }) {
  const [erledigt, setErledigt] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);
  const [laeuft, starten] = useTransition();

  function abhaken() {
    setErledigt(true);
    setFehler(null);
    starten(async () => {
      const r = await aufgabeErledigen(aufgabe.quelle, aufgabe.id);
      if (!r.ok) {
        setErledigt(false);
        setFehler(r.meldung);
      }
    });
  }

  return (
    <div className="flex min-h-11 items-center gap-3 px-4 py-3 text-[17px] [&+&]:border-t [&+&]:border-trenner">
      <button
        type="button"
        onClick={abhaken}
        disabled={erledigt || laeuft}
        aria-label={`${aufgabe.titel} erledigen`}
        className={`druck flex size-6 shrink-0 items-center justify-center rounded-full border-2 ${
          erledigt ? "border-gruen bg-gruen" : RING[aufgabe.prioritaet]
        }`}
      >
        {erledigt && (
          <svg viewBox="0 0 24 24" className="size-4 text-white" fill="none" stroke="currentColor" strokeWidth={3} aria-hidden>
            <path d="m6 12.5 4 4 8-9" />
          </svg>
        )}
      </button>
      <a href={aufgabe.link} target="_blank" rel="noreferrer" className="flex min-w-0 flex-1 flex-col">
        <span className={`truncate ${erledigt ? "text-text-3 line-through" : ""}`}>{aufgabe.titel}</span>
        {(aufgabe.zusatz || fehler) && (
          <span className={`truncate text-[15px] ${fehler ? "text-rot" : "text-text-2"}`}>{fehler ?? aufgabe.zusatz}</span>
        )}
      </a>
      <span className="flex shrink-0 items-center gap-2 text-[15px] text-text-2">
        {datum ?? aufgabe.uhrzeit}
        <span className={`size-2 rounded-full ${PUNKT[aufgabe.quelle]}`} aria-hidden />
      </span>
    </div>
  );
}
