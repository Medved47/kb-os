import { test } from "node:test";
import assert from "node:assert/strict";
import { standText, tagText, uhrzeit } from "@/lib/zeit";

test("Berliner Zeit im Sommer und Winter", () => {
  assert.equal(uhrzeit(new Date("2026-07-01T03:00:00Z")), "05:00");
  assert.equal(uhrzeit(new Date("2026-12-01T04:00:00Z")), "05:00");
  assert.equal(standText(new Date("2026-10-23T09:05:00Z")), "23.10., 11:05 Uhr");
  assert.equal(tagText(new Date("2026-10-23T09:05:00Z")), "Freitag, 23. Oktober");
});

test("Berliner Tagesgrenzen, auch bei Zeitumstellung", async () => {
  const { tagesGrenzen, berlinDatum, berlinStunde } = await import("@/lib/zeit");
  const normal = tagesGrenzen(new Date("2026-10-23T09:00:00Z"));
  assert.equal(normal.beginn.toISOString(), "2026-10-22T22:00:00.000Z");
  assert.equal(normal.ende.toISOString(), "2026-10-23T22:00:00.000Z");
  // 25.10.2026: Umstellung auf Winterzeit, Tag hat 25 Stunden
  const umstellung = tagesGrenzen(new Date("2026-10-25T12:00:00Z"));
  assert.equal(umstellung.beginn.toISOString(), "2026-10-24T22:00:00.000Z");
  assert.equal(umstellung.ende.toISOString(), "2026-10-25T23:00:00.000Z");
  assert.equal(berlinDatum(new Date("2026-10-23T22:30:00Z")), "2026-10-24");
  assert.equal(berlinStunde(new Date("2026-10-23T22:30:00Z")), 0);
});
