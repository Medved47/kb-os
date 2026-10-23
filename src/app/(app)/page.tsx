import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireZugang } from "@/lib/auth";
import { alleAufgaben, gruppe } from "@/lib/aufgaben";
import { briefing } from "@/lib/briefing";
import { freieFenster, termineAmTag, type Termin } from "@/lib/kalender";
import { wetterHeute, type Wetter } from "@/lib/wetter";
import { berlinDatum, berlinStunde, tagText, uhrzeit } from "@/lib/zeit";
import { Abschnitt, Meldung, Titel, Zeile } from "@/components/ui";
import { SymbolZahnrad } from "@/components/symbole";
import { AufgabeZeile } from "@/components/aufgabe-zeile";

// Farbe je Konto: Business blau, Privat orange
const PUNKT = { business: "bg-akzent", privat: "bg-orange" } as const;

export default async function HeuteSeite() {
  await requireZugang();
  const jetzt = new Date();
  const [kalender, wetter, aufgaben] = await Promise.all([
    termineAmTag(createAdminClient(), jetzt),
    wetterHeute(berlinStunde(jetzt)).catch(() => null),
    alleAufgaben(),
  ]);
  const heute = berlinDatum(jetzt);
  const faellig = aufgaben.aufgaben.filter((a) => gruppe(a, heute) !== "woche");
  const ueberfaellig = faellig.filter((a) => gruppe(a, heute) === "ueberfaellig").length;
  const ganztags = kalender.termine.filter((t) => t.ganztags);
  const mitZeit = kalender.termine.filter((t) => !t.ganztags);
  const offen = mitZeit.filter((t) => t.ende > jetzt);
  const frei = freieFenster(kalender.termine, jetzt, jetzt);

  return (
    <>
      <Titel
        titel="Heute"
        unter={tagText(jetzt)}
        rechts={
          <Link href="/einstellungen" aria-label="Einstellungen" className="druck mb-1.5 text-akzent">
            <SymbolZahnrad className="size-7" />
          </Link>
        }
      />
      <div className="flex flex-col gap-6 px-4">
        <p className="px-1 text-[20px] font-semibold leading-snug">{briefing(offen.length, faellig.length, ueberfaellig)}</p>

        {wetter && <WetterZeile wetter={wetter} />}

        <Abschnitt titel="Termine">
          {ganztags.map((t) => (
            <TerminZeile key={t.id} termin={t} />
          ))}
          {mitZeit.map((t) => (
            <TerminZeile key={t.id} termin={t} vorbei={t.ende <= jetzt} />
          ))}
          {kalender.termine.length === 0 && kalender.fehlend.length < 2 && (
            <Zeile className="text-text-2">Keine Termine heute.</Zeile>
          )}
          {kalender.fehlend.length > 0 && (
            <Zeile className="justify-between text-[15px]">
              <span className="text-text-2">
                {kalender.fehlend.length === 2
                  ? "Google ist noch nicht verbunden."
                  : `${kalender.fehlend[0] === "privat" ? "Privater" : "Business-"} Kalender nicht verbunden.`}
              </span>
              <Link href="/einstellungen" className="druck shrink-0 text-akzent">
                Verbinden
              </Link>
            </Zeile>
          )}
          {kalender.fehler.map((f) => (
            <Zeile key={f}>
              <Meldung>{f}</Meldung>
            </Zeile>
          ))}
        </Abschnitt>

        <Abschnitt titel="Nächste Aufgaben">
          {faellig.slice(0, 3).map((a) => (
            <AufgabeZeile key={`${a.quelle}:${a.id}`} aufgabe={a} />
          ))}
          {faellig.length === 0 && aufgaben.fehler.length === 0 && (
            <Zeile className="text-text-2">Nichts fällig.</Zeile>
          )}
          {faellig.length > 3 && (
            <Zeile>
              <Link href="/aufgaben" className="druck text-[15px] text-akzent">
                Alle {faellig.length} anzeigen
              </Link>
            </Zeile>
          )}
          {aufgaben.fehler.map((f) => (
            <Zeile key={f}>
              <Meldung>{f}</Meldung>
            </Zeile>
          ))}
        </Abschnitt>

        {frei.length > 0 && (
          <Abschnitt titel="Frei">
            {frei.map((f) => (
              <Zeile key={f.beginn.toISOString()} className="justify-between">
                <span>
                  {uhrzeit(f.beginn)} – {uhrzeit(f.ende)}
                </span>
                <span className="text-[15px] text-text-2">{dauerText(f.ende.getTime() - f.beginn.getTime())}</span>
              </Zeile>
            ))}
          </Abschnitt>
        )}
      </div>
    </>
  );
}

function dauerText(ms: number): string {
  const min = Math.round(ms / 60_000);
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m} Min.`;
  return m === 0 ? `${h} Std.` : `${h} Std. ${m} Min.`;
}

function WetterZeile({ wetter }: { wetter: Wetter }) {
  return (
    <div className="flex items-baseline justify-between px-1 text-[15px] text-text-2">
      <span>
        Stuttgart {Math.round(wetter.jetzt)}°, {wetter.text}
      </span>
      <span className={wetter.hinweis ? "font-semibold text-orange" : ""}>
        {wetter.hinweis ?? `${Math.round(wetter.min)}° / ${Math.round(wetter.max)}°`}
      </span>
    </div>
  );
}

function TerminZeile({ termin, vorbei = false }: { termin: Termin; vorbei?: boolean }) {
  const inhalt = (
    <>
      <span className={`size-2.5 shrink-0 rounded-full ${PUNKT[termin.konto]}`} aria-hidden />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate">{termin.titel}</span>
        {termin.ort && <span className="truncate text-[15px] text-text-2">{termin.ort}</span>}
      </div>
      <span className="shrink-0 text-[15px] text-text-2">
        {termin.ganztags ? "ganztags" : `${uhrzeit(termin.beginn)} – ${uhrzeit(termin.ende)}`}
      </span>
    </>
  );
  return (
    <Zeile className={vorbei ? "opacity-40" : ""}>
      {termin.link ? (
        <a href={termin.link} target="_blank" rel="noreferrer" className="druck flex min-w-0 flex-1 items-center gap-3">
          {inhalt}
        </a>
      ) : (
        inhalt
      )}
    </Zeile>
  );
}
