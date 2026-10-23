// Dauer in Minuten lesbar, z. B. "45 Min.", "2 Std.", "1 Std. 30 Min."
export function dauerText(minuten: number): string {
  const min = Math.round(minuten);
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m} Min.`;
  return m === 0 ? `${h} Std.` : `${h} Std. ${m} Min.`;
}

const STANDARD = [15, 30, 45, 60, 90, 120, 180, 240];

// Auswahl für Zeitblöcke, eigene Dauer der Aufgabe einsortiert
export function dauerAuswahl(eigene: number | null): number[] {
  if (!eigene || STANDARD.includes(eigene)) return STANDARD;
  return [...STANDARD, eigene].sort((a, b) => a - b);
}
