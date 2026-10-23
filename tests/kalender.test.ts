import { test } from "node:test";
import assert from "node:assert/strict";
import { freieFenster, terminUmwandeln, type Termin } from "@/lib/kalender";

const t = (von: string, bis: string, ganztags = false): Termin => ({
  id: von,
  titel: "x",
  beginn: new Date(von),
  ende: new Date(bis),
  ganztags,
  konto: "privat",
  ort: null,
  link: null,
});

const TAG = new Date("2026-10-23T10:00:00Z");

test("Freie Fenster zwischen Terminen, ab jetzt, mindestens 30 Minuten", () => {
  const termine = [
    t("2026-10-23T07:00:00Z", "2026-10-23T08:00:00Z"), // 9-10 Uhr
    t("2026-10-23T08:15:00Z", "2026-10-23T09:00:00Z"), // 10:15-11
    t("2026-10-22T22:00:00Z", "2026-10-23T22:00:00Z", true),
    t("2026-10-23T12:00:00Z", "2026-10-23T13:00:00Z"), // 14-15
  ];
  const f = freieFenster(termine, TAG, new Date("2026-10-23T05:00:00Z"));
  assert.deepEqual(
    f.map((x) => [x.beginn.toISOString(), x.ende.toISOString()]),
    [
      ["2026-10-23T06:00:00.000Z", "2026-10-23T07:00:00.000Z"], // 8-9
      ["2026-10-23T09:00:00.000Z", "2026-10-23T12:00:00.000Z"], // 11-14
      ["2026-10-23T13:00:00.000Z", "2026-10-23T18:00:00.000Z"], // 15-20
    ],
  );
  // ab 16 Uhr
  const spaet = freieFenster(termine, TAG, new Date("2026-10-23T14:00:00Z"));
  assert.equal(spaet.length, 1);
  assert.equal(spaet[0]?.beginn.toISOString(), "2026-10-23T14:00:00.000Z");
});

test("Abgesagte und abgelehnte Termine fallen weg, ganztägig erkannt", () => {
  assert.equal(terminUmwandeln({ id: "a", status: "cancelled", start: {}, end: {} }, "privat"), null);
  assert.equal(
    terminUmwandeln(
      { id: "b", start: { dateTime: "2026-10-23T10:00:00+02:00" }, end: { dateTime: "2026-10-23T11:00:00+02:00" }, attendees: [{ self: true, responseStatus: "declined" }] },
      "business",
    ),
    null,
  );
  const g = terminUmwandeln({ id: "c", summary: " Urlaub ", start: { date: "2026-10-23" }, end: { date: "2026-10-24" } }, "privat");
  assert.equal(g?.ganztags, true);
  assert.equal(g?.titel, "Urlaub");
  assert.equal(g?.beginn.toISOString(), "2026-10-22T22:00:00.000Z");
});

test("Vorschlag für einen Zeitblock", async () => {
  const { blockVorschlag } = await import("@/lib/kalender");
  const termine = [t("2026-10-23T08:00:00Z", "2026-10-23T09:00:00Z")]; // 10-11 Uhr
  // jetzt 9:50 Uhr, 60 Minuten: 10-11 belegt, also 11:00
  assert.equal(blockVorschlag(termine, new Date("2026-10-23T07:50:00Z"), 60).toISOString(), "2026-10-23T09:00:00.000Z");
  // jetzt 9:05 Uhr, 30 Minuten: auf Viertelstunde aufgerundet 9:15
  assert.equal(blockVorschlag(termine, new Date("2026-10-23T07:05:00Z"), 30).toISOString(), "2026-10-23T07:15:00.000Z");
  // abends 19:40: nichts mehr frei, morgen 9 Uhr
  assert.equal(blockVorschlag(termine, new Date("2026-10-23T17:40:00Z"), 60).toISOString(), "2026-10-24T07:00:00.000Z");
});
