import type { Metadata } from "next";
import { Abschnitt, Titel, Zeile } from "@/components/ui";

export const metadata: Metadata = { title: "Geld" };

export default function GeldSeite() {
  return (
    <>
      <Titel titel="Geld" />
      <div className="flex flex-col gap-6 px-4">
        <Abschnitt>
          <Zeile className="text-text-2">Kommt in einem der nächsten Schritte. Abos, Einmalzahlungen und Belege.</Zeile>
        </Abschnitt>
      </div>
    </>
  );
}
