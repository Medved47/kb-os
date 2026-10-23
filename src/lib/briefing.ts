// Briefing-Satz aus fester Vorlage. Fristen kommen mit einem späteren Schritt dazu.
// mails = "Braucht dich" (ungelesen in Wichtig und zum Einordnen).
export function briefing(termine: number, aufgaben: number, ueberfaellig: number, mails = 0): string {
  const teile: string[] = [];
  if (termine > 0) teile.push(termine === 1 ? "1 Termin" : `${termine} Termine`);
  if (aufgaben > 0) {
    teile.push(
      `${aufgaben === 1 ? "1 Aufgabe" : `${aufgaben} Aufgaben`}${ueberfaellig > 0 ? `, davon ${ueberfaellig} überfällig` : ""}`,
    );
  }
  const post = mails === 1 ? "1 Mail braucht dich." : mails > 1 ? `${mails} Mails brauchen dich.` : "";
  if (teile.length === 0) return post || "Heute ist nichts mehr offen.";
  return `Heute noch ${teile.join(" und ")}.${post ? ` ${post}` : ""}`;
}
