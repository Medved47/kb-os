import { test } from "node:test";
import assert from "node:assert/strict";
import { standText, tagText, uhrzeit } from "@/lib/zeit";

test("Berliner Zeit im Sommer und Winter", () => {
  assert.equal(uhrzeit(new Date("2026-07-01T03:00:00Z")), "05:00");
  assert.equal(uhrzeit(new Date("2026-12-01T04:00:00Z")), "05:00");
  assert.equal(standText(new Date("2026-10-23T09:05:00Z")), "23.10., 11:05 Uhr");
  assert.equal(tagText(new Date("2026-10-23T09:05:00Z")), "Freitag, 23. Oktober");
});
