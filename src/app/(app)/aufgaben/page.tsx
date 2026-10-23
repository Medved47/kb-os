import type { Metadata } from "next";
import { Abschnitt, Titel, Zeile } from "@/components/ui";

export const metadata: Metadata = { title: "Aufgaben" };

export default function AufgabenSeite() {
  return (
    <>
      <Titel titel="Aufgaben" />
      <div className="flex flex-col gap-6 px-4">
        <Abschnitt>
          <Zeile className="text-text-2">Kommt in einem der nächsten Schritte. Business OS und Todoist in einer Liste, zum Abhaken.</Zeile>
        </Abschnitt>
      </div>
    </>
  );
}
