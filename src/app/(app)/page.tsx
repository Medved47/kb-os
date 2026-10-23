import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireZugang } from "@/lib/auth";
import { alleAufgaben, arbeitslast, erledigtHeute, gruppe, type Aufgabe } from "@/lib/aufgaben";
import { briefing } from "@/lib/briefing";
import { businessDaten } from "@/lib/business-os";
import { countdown, tageBis } from "@/lib/fristen";
import { blockVorschlag, freieFenster, termineAmTag, type Termin } from "@/lib/kalender";
import { dauerText } from "@/lib/dauer";
import { wetterHeute, type Wetter } from "@/lib/wetter";
import { berlinDatum, berlinStunde, tagText, uhrzeit } from "@/lib/zeit";
import { AlleAufMorgen } from "@/components/alle-auf-morgen";
import { Abschnitt, Meldung, Titel, Zeile } from "@/components/ui";
import { SymbolZahnrad } from "@/components/symbole";
import { AufgabeZeile } from "@/components/aufgabe-zeile";
import { AppBadge } from "@/components/app-badge";
import { MailZeile } from "@/components/mail-zeile";
import { NichtVerbunden } from "@/lib/gmail";
import { brauchtDich } from "@/lib/postfach";

// Farbe je Konto: Business blau, Privat orange
const PUNKT = { business: "bg-akzent", privat: "bg-orange" } as const;

export default async function HeuteSeite() {
  await requireZugang();
  const jetzt = new Date();
  // Abendabschluss ab 17 Uhr
  const abends = berlinStunde(jetzt) >= 17;
  const [kalender, wetter, aufgaben, business, erledigt, post] = await Promise.all([
    termineAmTag(createAdminClient(), jetzt),
    wetterHeute(berlinStunde(jetzt)).catch(() => null),
    alleAufgaben(),
    // Fehler zeigt schon die Aufgabenliste
    businessDaten().catch(() => null),
    abends ? erledigtHeute(jetzt) : null,
    // Postfach: ohne Google-Verbindung still weglassen, sonst Fehler zeigen
    brauchtDich(createAdminClient()).catch((e: unknown) => (e instanceof NichtVerbunden ? null : { fehler: e instanceof Error ? e.message : String(e) })),
  ]);
  const mail = post && "mails" in post ? post : null;
  const heute = berlinDatum(jetzt);
  const fristen = (business?.fristen ?? []).slice(0, 5);
  const faellig = aufgaben.aufgaben.filter((a) => gruppe(a, heute) !== "woche");
  const ueberfaellig = faellig.filter((a) => gruppe(a, heute) === "ueberfaellig").length;
  const ganztags = kalender.termine.filter((t) => t.ganztags);
  const mitZeit = kalender.termine.filter((t) => !t.ganztags);
  const offen = mitZeit.filter((t) => t.ende > jetzt);
  const frei = freieFenster(kalender.termine, jetzt, jetzt);
  const freiMinuten = frei.reduce((summe, f) => summe + (f.ende.getTime() - f.beginn.getTime()) / 60_000, 0);
  const last = arbeitslast(aufgaben.aufgaben, heute, freiMinuten);
  // Vorschlag für einen Zeitblock je Aufgabe (eigene Dauer oder 1 Stunde)
  const block = (a: Aufgabe) => {
    const beginn = blockVorschlag(kalender.termine, jetzt, a.dauer ?? 60);
    return { datum: berlinDatum(beginn), uhrzeit: uhrzeit(beginn) };
  };

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
        <p className="px-1 text-[20px] font-semibold leading-snug">{briefing(offen.length, faellig.length, ueberfaellig, mail?.anzahl ?? 0)}</p>

        {last.zuViel && (
          <p className="-mt-3 px-1 text-[15px] font-semibold text-orange">
            Zu viel für heute: {dauerText(last.geplant)} geplant, {dauerText(last.frei)} frei.
          </p>
        )}

        {wetter && <WetterZeile wetter={wetter} />}

        {mail && <AppBadge anzahl={mail.anzahl} />}
        {mail && mail.anzahl > 0 && (
          <Abschnitt titel="Braucht dich">
            {mail.mails.map((m) => (
              <MailZeile key={m.id} mail={m} />
            ))}
            {mail.einordnen > 0 && (
              <Zeile>
                <Link href="/postfach?ordner=einordnen" className="druck flex flex-1 items-center justify-between">
                  <span className="font-semibold text-orange">Einordnen</span>
                  <span className="text-[15px] text-text-2">{mail.einordnen} ›</span>
                </Link>
              </Zeile>
            )}
          </Abschnitt>
        )}
        {post && "fehler" in post && <Meldung>Postfach: {post.fehler}</Meldung>}

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
            <AufgabeZeile key={`${a.quelle}:${a.id}`} aufgabe={a} block={block(a)} />
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

        {fristen.length > 0 && (
          <Abschnitt titel="Fristen">
            {fristen.map((f) => (
              <Zeile key={f.id}>
                <a href={f.link ?? undefined} target="_blank" rel="noreferrer" className="druck flex min-w-0 flex-1 items-center gap-3">
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate">{f.titel}</span>
                    {f.zusatz && <span className="truncate text-[15px] text-text-2">{f.zusatz}</span>}
                  </div>
                  <span className={`shrink-0 text-[15px] ${tageBis(f.datum, heute) <= 7 ? "font-semibold text-orange" : "text-text-2"}`}>
                    {countdown(tageBis(f.datum, heute))}
                  </span>
                </a>
              </Zeile>
            ))}
          </Abschnitt>
        )}

        {abends && erledigt && (
          <Abschnitt titel="Abschluss">
            <Zeile className="justify-between">
              <span>Heute erledigt</span>
              <span className="text-[15px] font-semibold text-gruen">{erledigt.erledigt.length}</span>
            </Zeile>
            {erledigt.erledigt.length > 0 && (
              <Zeile>
                <details className="w-full text-[15px] text-text-2">
                  <summary className="cursor-pointer text-akzent">Ansehen</summary>
                  <ul className="mt-2 flex flex-col gap-1">
                    {erledigt.erledigt.map((e) => (
                      <li key={`${e.quelle}:${e.id}`} className="truncate">
                        {e.titel}
                      </li>
                    ))}
                  </ul>
                </details>
              </Zeile>
            )}
            {faellig.map((a) => (
              <AufgabeZeile key={`abschluss:${a.quelle}:${a.id}`} aufgabe={a} morgen />
            ))}
            {faellig.filter((a) => !a.wiederkehrend).length > 1 && (
              <Zeile>
                <AlleAufMorgen liste={faellig.filter((a) => !a.wiederkehrend).map((a) => ({ quelle: a.quelle, id: a.id, uhrzeit: a.uhrzeit }))} />
              </Zeile>
            )}
            {faellig.length === 0 && <Zeile className="text-text-2">Alles für heute erledigt.</Zeile>}
            {erledigt.fehler.map((f) => (
              <Zeile key={f}>
                <Meldung>{f}</Meldung>
              </Zeile>
            ))}
          </Abschnitt>
        )}

        {frei.length > 0 && (
          <Abschnitt titel="Frei">
            {frei.map((f) => (
              <Zeile key={f.beginn.toISOString()} className="justify-between">
                <span>
                  {uhrzeit(f.beginn)} – {uhrzeit(f.ende)}
                </span>
                <span className="text-[15px] text-text-2">{dauerText((f.ende.getTime() - f.beginn.getTime()) / 60_000)}</span>
              </Zeile>
            ))}
          </Abschnitt>
        )}
      </div>
    </>
  );
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
