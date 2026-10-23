// Fristen: Projekt-Deadlines aus dem Business OS (src/lib/business-os.ts).
// Steuerfristen und Fristen aus Mails kommen später dazu.

// Ganze Tage von heute bis datum (beides JJJJ-MM-TT)
export function tageBis(datum: string, heute: string): number {
  return Math.round((Date.parse(`${datum}T12:00:00Z`) - Date.parse(`${heute}T12:00:00Z`)) / 86_400_000);
}

export function countdown(tage: number): string {
  if (tage < 0) return tage === -1 ? "seit gestern" : `seit ${-tage} Tagen`;
  if (tage === 0) return "heute";
  if (tage === 1) return "morgen";
  return `in ${tage} Tagen`;
}
