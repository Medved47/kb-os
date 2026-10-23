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
