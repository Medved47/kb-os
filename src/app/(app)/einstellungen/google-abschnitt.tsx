import { fehlendeScopes, KONTEN, KONTO_NAME, type Verbindung } from "@/lib/google";
import { standText } from "@/lib/zeit";
import { Abschnitt, Meldung, Zeile } from "@/components/ui";
import { googleTrennen } from "./aktionen";

const STATUS: Record<string, { text: string; art: "fehler" | "info" }> = {
  verbunden: { text: "Google verbunden.", art: "info" },
  teilweise: { text: "Verbunden, aber nicht alle Häkchen gesetzt. Bitte erneut verbinden und alles erlauben.", art: "fehler" },
  abgelehnt: { text: "Freigabe bei Google abgebrochen.", art: "fehler" },
  ungueltig: { text: "Freigabe ungültig oder abgelaufen. Bitte erneut versuchen.", art: "fehler" },
  fehler: { text: "Verbinden fehlgeschlagen. Bitte erneut versuchen.", art: "fehler" },
  "nicht-eingerichtet": { text: "Google ist auf dem Server nicht eingerichtet (Variablen fehlen).", art: "fehler" },
};

// Zwei Google-Konten: Privat (Gmail, Kalender) und Business (Workspace-Kalender, Drive).
// Verbinden über die Route /google/verbinden (normaler Link, kein Prefetch).
export function GoogleAbschnitt({ verbindungen, status, grund }: { verbindungen: Verbindung[]; status?: string; grund?: string }) {
  const meldung = status ? STATUS[status] : undefined;
  return (
    <Abschnitt titel="Google">
      {KONTEN.map((konto) => {
        const v = verbindungen.find((x) => x.konto === konto);
        const fehlt = v ? fehlendeScopes(konto, v.scopes).length > 0 : false;
        return (
          <Zeile key={konto} className="justify-between">
            <div className="flex min-w-0 flex-col">
              <span>{KONTO_NAME[konto]}</span>
              <span className={`truncate text-[15px] ${fehlt ? "text-rot" : "text-text-2"}`}>
                {v
                  ? `${v.email}${fehlt ? ", Rechte fehlen" : ""}, seit ${standText(new Date(v.verbunden_am))}`
                  : "nicht verbunden"}
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              {v && (
                <form action={googleTrennen.bind(null, konto)}>
                  <button type="submit" className="druck text-[17px] text-rot">
                    Trennen
                  </button>
                </form>
              )}
              {(!v || fehlt) && (
                <a href={`/google/verbinden?konto=${konto}`} className="druck text-[17px] text-akzent">
                  Verbinden
                </a>
              )}
            </div>
          </Zeile>
        );
      })}
      {meldung && (
        <Zeile>
          <Meldung art={meldung.art}>
            {meldung.text}
            {grund && <span className="mt-1 block break-words text-[13px]">Grund: {grund}</span>}
          </Meldung>
        </Zeile>
      )}
    </Abschnitt>
  );
}
