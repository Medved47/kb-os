import type { Metadata } from "next";
import { requireZugang } from "@/lib/auth";
import { alleAufgaben, gruppe, type Aufgabe, type Gruppe } from "@/lib/aufgaben";
import { blockVorschlag, termineAmTag } from "@/lib/kalender";
import { createAdminClient } from "@/lib/supabase/admin";
import { berlinDatum, uhrzeit } from "@/lib/zeit";
import { Abschnitt, Meldung, Titel, Zeile } from "@/components/ui";
import { AufgabeZeile } from "@/components/aufgabe-zeile";
import { Schnellerfassung } from "./schnellerfassung";

export const metadata: Metadata = { title: "Aufgaben" };

const GRUPPEN: { schluessel: Gruppe; titel: string }[] = [
  { schluessel: "ueberfaellig", titel: "Überfällig" },
  { schluessel: "heute", titel: "Heute" },
  { schluessel: "woche", titel: "Diese Woche" },
];

// "Mo., 26.10."
function kurzDatum(datum: string): string {
  return new Intl.DateTimeFormat("de-DE", { timeZone: "UTC", weekday: "short", day: "2-digit", month: "2-digit" }).format(
    new Date(`${datum}T12:00:00Z`),
  );
}

export default async function AufgabenSeite() {
  await requireZugang();
  const jetzt = new Date();
  const heute = berlinDatum(jetzt);
  const [{ aufgaben, fehler }, kalender] = await Promise.all([alleAufgaben(), termineAmTag(createAdminClient(), jetzt)]);
  // Vorschlag für einen Zeitblock (nächste freie Zeit, eigene Dauer oder 1 Stunde)
  const block = (a: Aufgabe) => {
    const beginn = blockVorschlag(kalender.termine, jetzt, a.dauer ?? 60);
    return { datum: berlinDatum(beginn), uhrzeit: uhrzeit(beginn) };
  };
  const nach = (g: Gruppe) => aufgaben.filter((a) => gruppe(a, heute) === g);
  const datumFuer = (a: Aufgabe, g: Gruppe) =>
    g === "heute" ? undefined : a.faellig ? kurzDatum(a.faellig) + (a.uhrzeit ? ` ${a.uhrzeit}` : "") : undefined;

  return (
    <>
      <Titel titel="Aufgaben" />
      <div className="flex flex-col gap-6 px-4">
        <Schnellerfassung />
        {fehler.map((f) => (
          <Meldung key={f}>{f}</Meldung>
        ))}
        {GRUPPEN.map(({ schluessel, titel }) => {
          const liste = nach(schluessel);
          if (liste.length === 0 && schluessel !== "heute") return null;
          return (
            <Abschnitt key={schluessel} titel={`${titel} (${liste.length})`}>
              {liste.length === 0 && <Zeile className="text-text-2">Nichts mehr für heute.</Zeile>}
              {liste.map((a) => (
                <AufgabeZeile key={`${a.quelle}:${a.id}`} aufgabe={a} datum={datumFuer(a, schluessel)} block={block(a)} />
              ))}
            </Abschnitt>
          );
        })}
      </div>
    </>
  );
}
