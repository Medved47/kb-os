import type { Metadata } from "next";
import Link from "next/link";
import { requireZugang } from "@/lib/auth";
import { BEREICH_NAME, BEREICHE, istBereich, istOrdner, ORDNER, ORDNER_NAME, type Bereich, type Ordner } from "@/lib/mail-regeln";
import { gmailToken, liste, NichtVerbunden, type Kopf } from "@/lib/gmail";
import { labelsGespeichert, sortierStand, zahlen, type Stand, type Zahlen } from "@/lib/postfach";
import { createAdminClient } from "@/lib/supabase/admin";
import { standText } from "@/lib/zeit";
import { Abschnitt, Meldung, Titel, Zeile } from "@/components/ui";
import { MailZeile } from "@/components/mail-zeile";

export const metadata: Metadata = { title: "Postfach" };

// /postfach?bereich=geschaeftlich|privat           Ordnerübersicht
// /postfach?bereich=...&ordner=wichtig|...         Mails eines Ordners
// /postfach?ordner=einordnen                       Mails zum Einordnen (beide Bereiche)
export default async function PostfachSeite({ searchParams }: PageProps<"/postfach">) {
  await requireZugang();
  const p = await searchParams;
  const bereich: Bereich = istBereich(p.bereich) ? p.bereich : "geschaeftlich";
  const ordner: Ordner | "einordnen" | null = p.ordner === "einordnen" ? "einordnen" : istOrdner(p.ordner) ? p.ordner : null;
  const seite = typeof p.seite === "string" && /^[\w-]{1,200}$/.test(p.seite) ? p.seite : undefined;
  const db = createAdminClient();

  // Erst laden, dann darstellen (Fehler als Text)
  type Liste = { art: "liste"; label: string; mails: Kopf[]; weiter: string | null };
  type Uebersicht = { art: "uebersicht"; z: Zahlen; stand: Stand | null };
  let daten: Liste | Uebersicht | { art: "fehler"; text: string; verbinden: boolean };
  try {
    const token = await gmailToken(db);
    const ids = await labelsGespeichert(token);
    if (ordner) {
      const label = ordner === "einordnen" ? ids.einordnen : ids.ordner[bereich][ordner];
      daten = { art: "liste", label, ...(await liste(token, label, { seite })) };
    } else {
      const [z, stand] = await Promise.all([zahlen(token, ids, bereich), sortierStand(db)]);
      daten = { art: "uebersicht", z, stand };
    }
  } catch (e) {
    daten = { art: "fehler", text: e instanceof Error ? e.message : String(e), verbinden: e instanceof NichtVerbunden };
  }

  let inhalt: React.ReactNode;
  if (daten.art === "fehler") {
    inhalt = daten.verbinden ? (
      <Abschnitt>
        <Zeile className="justify-between text-[15px]">
          <span className="text-text-2">Google Privat ist noch nicht verbunden.</span>
          <Link href="/einstellungen" className="druck shrink-0 text-akzent">
            Verbinden
          </Link>
        </Zeile>
      </Abschnitt>
    ) : (
      <Meldung>{daten.text}</Meldung>
    );
  } else if (daten.art === "liste" && ordner) {
    const zurueck = ordner === "einordnen" ? "/postfach" : `/postfach?bereich=${bereich}`;
    const weiter = daten.weiter;
    inhalt = (
      <>
        <Link href={zurueck} className="druck px-1 text-[17px] text-akzent">
          Ordner
        </Link>
        <Abschnitt titel={ordner === "einordnen" ? "Einordnen" : `${BEREICH_NAME[bereich]} · ${ORDNER_NAME[ordner]}`}>
          {daten.mails.map((m) => (
            <MailZeile key={m.id} mail={m} />
          ))}
          {daten.mails.length === 0 && <Zeile className="text-text-2">Keine Mails.</Zeile>}
          {weiter && (
            <Zeile>
              <Link
                href={`/postfach?${new URLSearchParams({ ...(ordner === "einordnen" ? {} : { bereich }), ordner, seite: weiter })}`}
                className="druck text-[15px] text-akzent"
              >
                Weitere laden
              </Link>
            </Zeile>
          )}
        </Abschnitt>
      </>
    );
  } else if (daten.art === "uebersicht") {
    const { z, stand } = daten;
    inhalt = (
      <>
        <Umschalter bereich={bereich} />
        {z.einordnen > 0 && (
          <Abschnitt>
            <OrdnerZeile href="/postfach?ordner=einordnen" titel="Einordnen" zahl={z.einordnen} hervor />
          </Abschnitt>
        )}
        <Abschnitt titel={BEREICH_NAME[bereich]}>
          {ORDNER.map((o) => (
            <OrdnerZeile key={o} href={`/postfach?bereich=${bereich}&ordner=${o}`} titel={ORDNER_NAME[o]} zahl={z.ordner[o]} />
          ))}
        </Abschnitt>
        <p className="px-1 text-[13px] text-text-2">
          {stand?.sortiert_am
            ? `Zuletzt sortiert ${standText(new Date(stand.sortiert_am))}`
            : "Noch nicht sortiert. Der erste Lauf merkt sich nur den Stand, danach wird alle 15 Minuten sortiert."}
        </p>
        {stand?.fehler && stand.fehler_am && (
          <Meldung>
            Fehler beim Sortieren ({standText(new Date(stand.fehler_am))}): {stand.fehler}
          </Meldung>
        )}
      </>
    );
  }

  return (
    <>
      <Titel titel="Postfach" />
      <div className="flex flex-col gap-6 px-4">{inhalt}</div>
    </>
  );
}

function Umschalter({ bereich }: { bereich: Bereich }) {
  return (
    <div className="flex rounded-xl bg-flaeche-2 p-0.5" role="tablist">
      {BEREICHE.map((b) => (
        <Link
          key={b}
          href={`/postfach?bereich=${b}`}
          role="tab"
          aria-selected={b === bereich}
          className={`flex-1 rounded-[10px] py-1.5 text-center text-[15px] font-semibold ${b === bereich ? "bg-flaeche shadow-sm" : "text-text-2"}`}
        >
          {BEREICH_NAME[b]}
        </Link>
      ))}
    </div>
  );
}

function OrdnerZeile({ href, titel, zahl, hervor = false }: { href: string; titel: string; zahl: number; hervor?: boolean }) {
  return (
    <Zeile>
      <Link href={href} className="druck flex flex-1 items-center justify-between">
        <span className={hervor ? "font-semibold text-orange" : ""}>{titel}</span>
        <span className="text-[15px] text-text-2">{zahl > 0 ? zahl : ""} ›</span>
      </Link>
    </Zeile>
  );
}
