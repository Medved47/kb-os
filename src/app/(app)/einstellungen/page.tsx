import type { Metadata } from "next";
import Link from "next/link";
import { requireZugang } from "@/lib/auth";
import { verbindungenLesen } from "@/lib/google";
import { vapid } from "@/lib/push";
import { createAdminClient } from "@/lib/supabase/admin";
import { standText } from "@/lib/zeit";
import { Abschnitt, Titel, Zeile } from "@/components/ui";
import { PushSchalter } from "./push-schalter";
import { AbmeldenKnopf } from "./abmelden-knopf";
import { GoogleAbschnitt } from "./google-abschnitt";
import { RegelnAbschnitt, TextbausteineAbschnitt, type Baustein, type Regel } from "./postfach-abschnitt";

export const metadata: Metadata = { title: "Einstellungen" };

export default async function EinstellungenSeite({ searchParams }: PageProps<"/einstellungen">) {
  const { kb } = await requireZugang();
  const { google } = await searchParams;
  const admin = createAdminClient();
  const [schluessel, verbindungen] = await Promise.all([vapid(admin), verbindungenLesen(admin)]);
  const { data: geraete } = await kb
    .from("push_abos")
    .select("endpoint, geraet, zuletzt_ok_am")
    .order("erstellt_am");
  const [{ data: bausteine }, { data: regeln }] = await Promise.all([
    kb.from("textbausteine").select("id, titel, text").order("titel"),
    kb.from("mail_regeln").select("absender, bereich, ordner").order("absender"),
  ]);
  const liste = (geraete ?? []) as { endpoint: string; geraet: string | null; zuletzt_ok_am: string | null }[];

  return (
    <>
      <div className="px-4 pt-[calc(env(safe-area-inset-top)+12px)]">
        <Link href="/" className="druck text-[17px] text-akzent">
          Heute
        </Link>
      </div>
      <Titel titel="Einstellungen" />
      <div className="flex flex-col gap-6 px-4">
        <GoogleAbschnitt verbindungen={verbindungen} status={typeof google === "string" ? google : undefined} />
        <Abschnitt titel="Dieses Gerät">
          <PushSchalter vapidPublicKey={schluessel.oeffentlich} endpunkte={liste.map((g) => g.endpoint)} />
        </Abschnitt>
        {liste.length > 0 && (
          <Abschnitt titel="Geräte mit Mitteilungen">
            {liste.map((g) => (
              <Zeile key={g.endpoint} className="justify-between">
                <span>{g.geraet ?? "Gerät"}</span>
                <span className="text-[15px] text-text-2">
                  {g.zuletzt_ok_am ? `zuletzt ${standText(new Date(g.zuletzt_ok_am))}` : "noch nichts gesendet"}
                </span>
              </Zeile>
            ))}
          </Abschnitt>
        )}
        <TextbausteineAbschnitt bausteine={(bausteine ?? []) as Baustein[]} />
        <RegelnAbschnitt regeln={(regeln ?? []) as Regel[]} />
        <Abschnitt>
          <AbmeldenKnopf />
        </Abschnitt>
      </div>
    </>
  );
}
