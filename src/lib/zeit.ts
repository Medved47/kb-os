// Datum und Uhrzeit immer in Berliner Zeit (Worker laufen in UTC)
export const ZONE = "Europe/Berlin";

export function uhrzeit(d: Date): string {
  return new Intl.DateTimeFormat("de-DE", { timeZone: ZONE, hour: "2-digit", minute: "2-digit" }).format(d);
}

export function standText(d: Date): string {
  const tag = new Intl.DateTimeFormat("de-DE", { timeZone: ZONE, day: "numeric", month: "numeric" }).format(d);
  return `${tag}, ${uhrzeit(d)} Uhr`;
}

// z. B. "Freitag, 23. Oktober"
export function tagText(d: Date): string {
  return new Intl.DateTimeFormat("de-DE", { timeZone: ZONE, weekday: "long", day: "numeric", month: "long" }).format(d);
}

// Datum in Berliner Zeit als JJJJ-MM-TT
export function berlinDatum(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

// Stunde (0-23) in Berliner Zeit
export function berlinStunde(d: Date): number {
  return Number(new Intl.DateTimeFormat("en-GB", { timeZone: ZONE, hour: "2-digit", hourCycle: "h23" }).format(d));
}

// Abstand Berlin zu UTC zum Zeitpunkt d, z. B. "+02:00"
function berlinOffset(d: Date): string {
  const teil = new Intl.DateTimeFormat("en-US", { timeZone: ZONE, timeZoneName: "longOffset" })
    .formatToParts(d)
    .find((t) => t.type === "timeZoneName")?.value;
  const m = /GMT([+-]\d{2}:\d{2})/.exec(teil ?? "");
  return m?.[1] ?? "+00:00";
}

// Zeitpunkt für eine Berliner Uhrzeit an einem Tag (JJJJ-MM-TT)
export function berlinZeitpunkt(datum: string, stunde: number, minute = 0): Date {
  const hh = String(stunde).padStart(2, "0");
  const mm = String(minute).padStart(2, "0");
  // Offset der Uhrzeit selbst, sonst stimmt es an Tagen mit Zeitumstellung nicht
  const ungefaehr = new Date(`${datum}T${hh}:${mm}:00Z`);
  return new Date(`${datum}T${hh}:${mm}:00${berlinOffset(ungefaehr)}`);
}

// Beginn und Ende des Berliner Tages von d
export function tagesGrenzen(d: Date): { beginn: Date; ende: Date } {
  const datum = berlinDatum(d);
  const morgen = new Date(berlinZeitpunkt(datum, 12).getTime() + 24 * 3600 * 1000);
  return { beginn: berlinZeitpunkt(datum, 0), ende: berlinZeitpunkt(berlinDatum(morgen), 0) };
}

// Datum (JJJJ-MM-TT) plus n Tage
export function plusTage(datum: string, tage: number): string {
  const d = new Date(`${datum}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + tage);
  return d.toISOString().slice(0, 10);
}
