// Briefing-Satz aus fester Vorlage. Fristen und Mails kommen mit den nächsten Schritten dazu.
export function briefing(termine: number, aufgaben: number, ueberfaellig: number): string {
  const teile: string[] = [];
  if (termine > 0) teile.push(termine === 1 ? "1 Termin" : `${termine} Termine`);
  if (aufgaben > 0) {
    teile.push(
      `${aufgaben === 1 ? "1 Aufgabe" : `${aufgaben} Aufgaben`}${ueberfaellig > 0 ? `, davon ${ueberfaellig} überfällig` : ""}`,
    );
  }
  if (teile.length === 0) return "Heute ist nichts mehr offen.";
  return `Heute noch ${teile.join(" und ")}.`;
}
