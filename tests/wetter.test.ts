import { test } from "node:test";
import assert from "node:assert/strict";
import { wetterHinweis, wetterText } from "@/lib/wetter";

const s = (stunde: number, regen: number, code: number) => ({ stunde, regen, code });

test("Wetterhinweis nur, wenn es zählt", () => {
  const tag = [s(8, 10, 1), s(12, 20, 3), s(16, 70, 61), s(18, 80, 63)];
  assert.equal(wetterHinweis(tag, 9, 8, 15), "ab 16 Uhr Regen");
  assert.equal(wetterHinweis(tag, 17, 8, 15), "ab 18 Uhr Regen");
  assert.equal(wetterHinweis(tag, 16, 8, 15), "jetzt Regen");
  assert.equal(wetterHinweis([s(10, 30, 61)], 9, 8, 15), null);
  assert.equal(wetterHinweis([s(10, 0, 95)], 9, 8, 15), "ab 10 Uhr Gewitter");
  assert.equal(wetterHinweis([s(10, 0, 0)], 9, -3.4, 4), "Frost bis -3°");
  assert.equal(wetterHinweis([s(10, 0, 0)], 9, 18, 31), "heiß bis 31°");
  assert.equal(wetterText(2), "heiter");
});
