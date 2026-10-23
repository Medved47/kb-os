import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireZugang } from "@/lib/auth";
import { businessKontakt, type Kontakt } from "@/lib/business-os";
import { betreff, GmailFehler, gmailLink, gmailToken, nachrichtVoll, NichtVerbunden } from "@/lib/gmail";
import {
  abmeldung,
  absenderName,
  adresse,
  BEREICH_NAME,
  BEREICHE,
  festerBereich,
  istBusiness,
  ORDNER,
  ORDNER_NAME,
  type Bereich,
  type Ordner,
} from "@/lib/mail-regeln";
import { hatExterneBilder } from "@/lib/mail-html";
import { labelsGespeichert } from "@/lib/postfach";
import { createAdminClient } from "@/lib/supabase/admin";
import { standText } from "@/lib/zeit";
import { Abschnitt, Meldung, Zeile } from "@/components/ui";
import { MailInhalt } from "./mail-inhalt";
import { Abbestellen, AntwortFormular, AufgabeFormular, EinordnenFormular, GelesenMarkieren } from "./mail-aktionen";

export const metadata: Metadata = { title: "Mail" };

export default async function MailSeite({ params }: PageProps<"/postfach/[id]">) {
  const { kb } = await requireZugang();
  const { id } = await params;
  if (!/^[0-9a-f]{6,32}$/i.test(id)) notFound();
  const db = createAdminClient();

  let token: string;
  try {
    token = await gmailToken(db);
  } catch (e) {
    return <Fehler text={e instanceof NichtVerbunden ? e.message : String(e)} />;
  }
  const [mail, ids, bausteine] = await Promise.all([
    nachrichtVoll(token, id).catch((e: unknown) => (e instanceof GmailFehler && e.status === 404 ? null : Promise.reject(e))),
    labelsGespeichert(token),
    kb.from("textbausteine").select("id, titel, text").order("titel"),
  ]);
  if (!mail) notFound();
  const k = mail.kopf.k;

  // Aktueller Ort und Vorschlag für "Einordnen"
  const namen = mail.kopf.labelIds.map((l) => ids.namen.get(l) ?? l);
  let ort: { bereich: Bereich; ordner: Ordner | null } | null = null;
  for (const b of BEREICHE) {
    if (!mail.kopf.labelIds.includes(ids.bereich[b])) continue;
    ort = { bereich: b, ordner: ORDNER.find((o) => mail.kopf.labelIds.includes(ids.ordner[b][o])) ?? null };
  }
  const einzuordnen = mail.kopf.labelIds.includes(ids.einordnen);
  const business = istBusiness(k);
  const vorschlag = ort?.bereich ?? festerBereich(k, namen);
  const geschaeftlich = business || ort?.bereich === "geschaeftlich";

  // Anrede aus dem Business OS (nur geschäftlich)
  const absender = adresse(k["reply-to"] ?? k["from"]);
  let kontakt: Kontakt | null = null;
  let kontaktFehler: string | null = null;
  if (geschaeftlich && absender) {
    try {
      kontakt = await businessKontakt(absender);
    } catch (e) {
      kontaktFehler = e instanceof Error ? e.message : String(e);
    }
  }

  const abm = abmeldung(k);
  const empfaenger = [k["to"], k["cc"]].filter(Boolean).join(", ");

  return (
    <>
      <GelesenMarkieren id={id} ungelesen={mail.kopf.ungelesen} />
      <div className="flex items-center justify-between px-4 pt-[calc(env(safe-area-inset-top)+12px)]">
        <BackLink ort={ort} einzuordnen={einzuordnen} />
        <a href={gmailLink(id)} target="_blank" rel="noreferrer" className="druck text-[15px] text-akzent">
          In Gmail
        </a>
      </div>
      <div className="flex flex-col gap-6 px-4">
        <header className="flex flex-col gap-1 px-1">
          <h1 className="text-[22px] font-bold leading-snug">{betreff(k)}</h1>
          <p className="text-[15px]">
            <span className="font-semibold">{absenderName(k["from"])}</span>
            {absender && <span className="text-text-2"> {absender}</span>}
          </p>
          {empfaenger && <p className="truncate text-[13px] text-text-2">An {empfaenger}</p>}
          <p className="text-[13px] text-text-2">
            {standText(mail.kopf.datum)}
            {" · "}
            {einzuordnen ? (
              <span className="font-semibold text-orange">Einordnen</span>
            ) : ort ? (
              `${BEREICH_NAME[ort.bereich]}${ort.ordner ? ` / ${ORDNER_NAME[ort.ordner]}` : ""}`
            ) : (
              "nicht sortiert"
            )}
          </p>
        </header>

        <MailInhalt html={mail.html} text={mail.text} externeBilder={mail.html ? hatExterneBilder(mail.html) : false} />
        {mail.anhaenge.length > 0 && (
          <p className="px-1 text-[13px] text-text-2">Anhänge (in Gmail): {mail.anhaenge.join(", ")}</p>
        )}

        <Abschnitt titel="Einordnen">
          <EinordnenFormular id={id} vorschlag={vorschlag} ordner={ort?.ordner ?? null} nurGeschaeftlich={business} />
        </Abschnitt>

        <Abschnitt titel="Antworten (Entwurf)">
          <AntwortFormular
            id={id}
            geschaeftlich={geschaeftlich}
            gruss={gruss(kontakt)}
            hinweis={anredeHinweis(geschaeftlich, kontakt, kontaktFehler)}
            bausteine={(bausteine.data ?? []) as { id: string; titel: string; text: string }[]}
          />
        </Abschnitt>

        <Abschnitt titel="Als Aufgabe">
          <AufgabeFormular id={id} titel={betreff(k)} geschaeftlich={geschaeftlich} />
        </Abschnitt>

        {abm && (
          <Abschnitt titel="Werbung">
            {abm.einKlick || abm.mailto ? (
              <Abbestellen id={id} />
            ) : (
              <Zeile>
                <a href={abm.https ?? undefined} target="_blank" rel="noreferrer" className="druck text-[17px] text-akzent">
                  Abbestellen (öffnet die Seite des Absenders)
                </a>
              </Zeile>
            )}
          </Abschnitt>
        )}
      </div>
    </>
  );
}

// Gruß für den Entwurf: du = Vorname, Sie = voller Name
function gruss(k: Kontakt | null): string {
  if (!k?.anrede) return "";
  if (k.anrede === "du") return `Hallo ${k.name.split(/\s+/)[0]},\n\n`;
  return `Guten Tag ${k.name},\n\n`;
}

function anredeHinweis(geschaeftlich: boolean, k: Kontakt | null, fehler: string | null): string | null {
  if (!geschaeftlich) return null;
  if (fehler) return `Anrede nicht abrufbar: ${fehler}`;
  if (!k) return "Absender ist im Business OS nicht als Kontakt bekannt.";
  if (!k.anrede) return `${k.name} (${k.firma}): Anrede im Business OS noch offen.`;
  return `${k.name} (${k.firma}): ${k.anrede === "du" ? "du" : "Sie"} laut Business OS.`;
}

function BackLink({ ort, einzuordnen }: { ort: { bereich: Bereich; ordner: Ordner | null } | null; einzuordnen: boolean }) {
  const href = einzuordnen
    ? "/postfach?ordner=einordnen"
    : ort?.ordner
      ? `/postfach?bereich=${ort.bereich}&ordner=${ort.ordner}`
      : "/postfach";
  return (
    <Link href={href} className="druck text-[17px] text-akzent">
      Zurück
    </Link>
  );
}

function Fehler({ text }: { text: string }) {
  return (
    <div className="flex flex-col gap-4 px-4 pt-[calc(env(safe-area-inset-top)+12px)]">
      <Link href="/postfach" className="druck text-[17px] text-akzent">
        Postfach
      </Link>
      <Meldung>{text}</Meldung>
    </div>
  );
}
