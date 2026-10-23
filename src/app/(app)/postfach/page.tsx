import type { Metadata } from "next";
import { Abschnitt, Titel, Zeile } from "@/components/ui";

export const metadata: Metadata = { title: "Postfach" };

export default function PostfachSeite() {
  return (
    <>
      <Titel titel="Postfach" />
      <div className="flex flex-col gap-6 px-4">
        <Abschnitt>
          <Zeile className="text-text-2">Kommt in einem der nächsten Schritte. Mails nach Geschäftlich und Privat, mit Ordnern und Entwürfen.</Zeile>
        </Abschnitt>
      </div>
    </>
  );
}
