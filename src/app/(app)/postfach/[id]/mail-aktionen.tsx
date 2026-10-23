"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { abbestellen, alsGelesen, einordnen, entwurfSpeichern, mailZuAufgabe } from "../aktionen";
import { BEREICH_NAME, BEREICHE, ORDNER, ORDNER_NAME, type Bereich, type Ordner } from "@/lib/mail-regeln";
import { Feld, Knopf, Meldung } from "@/components/ui";

const AUSWAHL = "h-11 w-full rounded-xl bg-flaeche-2 px-3 text-[17px]";

// Beim Öffnen als gelesen markieren (wie in Gmail)
export function GelesenMarkieren({ id, ungelesen }: { id: string; ungelesen: boolean }) {
  useEffect(() => {
    if (ungelesen) alsGelesen(id);
  }, [id, ungelesen]);
  return null;
}

export function EinordnenFormular({
  id,
  vorschlag,
  ordner,
  nurGeschaeftlich,
}: {
  id: string;
  vorschlag: Bereich | null;
  ordner: Ordner | null;
  nurGeschaeftlich: boolean;
}) {
  const [antwort, senden, laeuft] = useActionState(einordnen, null);
  return (
    <form action={senden} className="flex flex-col gap-3 p-4">
      <input type="hidden" name="id" value={id} />
      <div className="flex gap-3">
        <select name="bereich" defaultValue={vorschlag ?? ""} required aria-label="Bereich" className={AUSWAHL}>
          {!vorschlag && <option value="">Bereich</option>}
          {BEREICHE.map((b) => (
            <option key={b} value={b} disabled={nurGeschaeftlich && b === "privat"}>
              {BEREICH_NAME[b]}
            </option>
          ))}
        </select>
        <select name="ordner" defaultValue={ordner ?? ""} required aria-label="Ordner" className={AUSWAHL}>
          {!ordner && <option value="">Ordner</option>}
          {ORDNER.map((o) => (
            <option key={o} value={o}>
              {ORDNER_NAME[o]}
            </option>
          ))}
        </select>
      </div>
      <label className="flex items-center gap-3 text-[15px]">
        <input type="checkbox" name="merken" value="ja" defaultChecked className="size-5 accent-[var(--akzent)]" />
        Für diesen Absender merken
      </label>
      {nurGeschaeftlich && <p className="text-[13px] text-text-2">Ging über eine Business-Adresse, daher nur Geschäftlich.</p>}
      {antwort && <Meldung art={antwort.ok ? "info" : "fehler"}>{antwort.meldung}</Meldung>}
      <Knopf type="submit" disabled={laeuft}>
        Einordnen
      </Knopf>
    </form>
  );
}

export function AntwortFormular({
  id,
  geschaeftlich,
  gruss,
  hinweis,
  bausteine,
}: {
  id: string;
  geschaeftlich: boolean;
  gruss: string;
  hinweis: string | null;
  bausteine: { id: string; titel: string; text: string }[];
}) {
  const [antwort, senden, laeuft] = useActionState(entwurfSpeichern, null);
  const [text, setText] = useState(gruss);
  const feld = useRef<HTMLTextAreaElement>(null);

  function einfuegen(bausteinId: string) {
    const b = bausteine.find((x) => x.id === bausteinId);
    if (!b) return;
    const f = feld.current;
    const pos = f ? f.selectionStart : text.length;
    setText(text.slice(0, pos) + b.text + text.slice(pos));
  }

  return (
    <form action={senden} className="flex flex-col gap-3 p-4">
      <input type="hidden" name="id" value={id} />
      {hinweis && <p className="text-[13px] text-text-2">{hinweis}</p>}
      {bausteine.length > 0 && (
        <select
          aria-label="Textbaustein einfügen"
          value=""
          onChange={(e) => einfuegen(e.target.value)}
          className={AUSWAHL}
        >
          <option value="">Textbaustein einfügen</option>
          {bausteine.map((b) => (
            <option key={b.id} value={b.id}>
              {b.titel}
            </option>
          ))}
        </select>
      )}
      <textarea
        ref={feld}
        name="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={7}
        placeholder="Antwort"
        className="w-full rounded-xl bg-flaeche-2 p-3 text-[17px] outline-none focus:ring-2 focus:ring-akzent"
      />
      <p className="text-[13px] text-text-2">
        Wird nur als Entwurf in Gmail gespeichert{geschaeftlich ? ", Absender hello@webcodic.de" : ""}. Senden in Gmail.
      </p>
      {antwort && <Meldung art={antwort.ok ? "info" : "fehler"}>{antwort.meldung}</Meldung>}
      <Knopf type="submit" disabled={laeuft || antwort?.ok}>
        {antwort?.ok ? "Entwurf gespeichert" : "Als Entwurf speichern"}
      </Knopf>
    </form>
  );
}

export function AufgabeFormular({ id, titel, geschaeftlich }: { id: string; titel: string; geschaeftlich: boolean }) {
  const [antwort, senden, laeuft] = useActionState(mailZuAufgabe, null);
  return (
    <form action={senden} className="flex flex-col gap-3 p-4">
      <input type="hidden" name="id" value={id} />
      <Feld name="titel" defaultValue={titel} aria-label="Titel" required />
      <div className="flex gap-3">
        <Feld name="faellig" type="date" className="flex-1" aria-label="Fällig am" />
        <select name="ziel" defaultValue={geschaeftlich ? "business" : "todoist"} aria-label="Wohin" className={`${AUSWAHL} flex-1`}>
          <option value="todoist">Todoist</option>
          <option value="business">Business OS</option>
        </select>
      </div>
      {antwort && <Meldung art={antwort.ok ? "info" : "fehler"}>{antwort.meldung}</Meldung>}
      <Knopf type="submit" art="leise" disabled={laeuft || antwort?.ok}>
        Aufgabe anlegen
      </Knopf>
    </form>
  );
}

export function Abbestellen({ id }: { id: string }) {
  const [laeuft, starten] = useTransition();
  const [meldung, setMeldung] = useState<{ ok: boolean; meldung: string } | null>(null);
  return (
    <div className="flex flex-col gap-2 p-4">
      <Knopf
        type="button"
        art="rot"
        disabled={laeuft || meldung?.ok}
        onClick={() => {
          if (!confirm("Diesen Absender abbestellen?")) return;
          starten(async () => setMeldung(await abbestellen(id)));
        }}
      >
        Abbestellen
      </Knopf>
      {meldung && <Meldung art={meldung.ok ? "info" : "fehler"}>{meldung.meldung}</Meldung>}
    </div>
  );
}
