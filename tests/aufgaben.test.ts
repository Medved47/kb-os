import { test } from "node:test";
import assert from "node:assert/strict";
import { gruppe, todoistUmwandeln, vergleich, type Aufgabe } from "@/lib/aufgaben";
import { briefing } from "@/lib/briefing";

const projekte = new Map([["p1", "Inbox"], ["p2", "Haushalt"]]);

test("Todoist-Aufgaben werden umgewandelt", () => {
  const a = todoistUmwandeln({ id: "6X", content: "Miete", priority: 4, project_id: "p2", due: { date: "2026-10-23" } }, projekte);
  assert.equal(a.faellig, "2026-10-23");
  assert.equal(a.uhrzeit, null);
  assert.equal(a.zusatz, "Haushalt");
  assert.equal(a.link, "https://app.todoist.com/app/task/6X");
  const b = todoistUmwandeln({ id: "7", content: "Arzt", priority: 1, project_id: "p1", due: { date: "2026-10-23T09:30:00" } }, projekte);
  assert.equal(b.uhrzeit, "09:30");
  assert.equal(b.zusatz, null);
  // Feste Zeitzone (UTC) nach Berliner Zeit, hier schon der nächste Tag
  const c = todoistUmwandeln({ id: "8", content: "Spät", priority: 2, project_id: "p1", due: { date: "2026-10-23T22:30:00Z" } }, projekte);
  assert.equal(c.faellig, "2026-10-24");
  assert.equal(c.uhrzeit, "00:30");
  assert.equal(todoistUmwandeln({ id: "9", content: "X", priority: 1, project_id: "p1", due: null }, projekte).faellig, null);
});

const auf = (titel: string, faellig: string | null, prioritaet: Aufgabe["prioritaet"] = 1, uhrzeit: string | null = null): Aufgabe => ({
  id: titel,
  quelle: "todoist",
  titel,
  faellig,
  uhrzeit,
  prioritaet,
  zusatz: null,
  link: "",
});

test("Gruppen und Reihenfolge", () => {
  assert.equal(gruppe(auf("a", "2026-10-20"), "2026-10-23"), "ueberfaellig");
  assert.equal(gruppe(auf("a", "2026-10-23"), "2026-10-23"), "heute");
  assert.equal(gruppe(auf("a", "2026-10-25"), "2026-10-23"), "woche");
  const liste = [auf("c", "2026-10-23"), auf("b", "2026-10-23", 4), auf("a", "2026-10-22"), auf("d", "2026-10-23", 1, "08:00")];
  assert.deepEqual(liste.sort(vergleich).map((x) => x.titel), ["a", "d", "b", "c"]);
});

test("Briefing-Satz", () => {
  assert.equal(briefing(0, 0, 0), "Heute ist nichts mehr offen.");
  assert.equal(briefing(1, 0, 0), "Heute noch 1 Termin.");
  assert.equal(briefing(3, 4, 2), "Heute noch 3 Termine und 4 Aufgaben, davon 2 überfällig.");
  assert.equal(briefing(0, 1, 0), "Heute noch 1 Aufgabe.");
});
