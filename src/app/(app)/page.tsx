import Link from "next/link";
import { tagText } from "@/lib/zeit";
import { Abschnitt, Titel, Zeile } from "@/components/ui";
import { SymbolZahnrad } from "@/components/symbole";

export default function HeuteSeite() {
  return (
    <>
      <Titel
        titel="Heute"
        unter={tagText(new Date())}
        rechts={
          <Link href="/einstellungen" aria-label="Einstellungen" className="druck mb-1.5 text-akzent">
            <SymbolZahnrad className="size-7" />
          </Link>
        }
      />
      <div className="flex flex-col gap-6 px-4">
        <Abschnitt>
          <Zeile className="text-text-2">
            Hier steht ab dem nächsten Schritt dein Tag: Briefing, Wetter, Termine, Aufgaben, Fristen und Mails, die dich brauchen.
          </Zeile>
        </Abschnitt>
      </div>
    </>
  );
}
