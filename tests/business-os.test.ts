import { test } from "node:test";
import assert from "node:assert/strict";
import { businessAufgabe } from "@/lib/business-os";
import { countdown, tageBis } from "@/lib/fristen";

test("Business-Aufgaben werden umgewandelt", () => {
  const a = businessAufgabe(
    { id: "0f8fad5b-d9cb-469f-a165-70867728950e", titel: "Texte", faellig_am: "2026-10-24", prioritaet: "hoch", kunde: "Zlata", projekt: "Website" },
    "https://os.webcodic.de",
  );
  assert.equal(a.quelle, "business");
  assert.equal(a.prioritaet, 4);
  assert.equal(a.zusatz, "Zlata · Website");
  assert.equal(a.link, "https://os.webcodic.de/aufgaben");
  const b = businessAufgabe({ id: "x", titel: "Y", faellig_am: null, prioritaet: "?", kunde: null, projekt: null }, "u");
  assert.equal(b.prioritaet, 2);
  assert.equal(b.zusatz, null);
});

test("Countdown für Fristen", () => {
  assert.equal(tageBis("2026-12-12", "2026-10-23"), 50);
  assert.equal(tageBis("2026-10-26", "2026-10-23"), 3); // über die Zeitumstellung
  assert.equal(countdown(0), "heute");
  assert.equal(countdown(1), "morgen");
  assert.equal(countdown(50), "in 50 Tagen");
  assert.equal(countdown(-2), "seit 2 Tagen");
});
