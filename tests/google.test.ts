import { test } from "node:test";
import assert from "node:assert/strict";
import { entschluesseln, fehlendeScopes, gleich, neuerState, SCOPES, verschluesseln } from "@/lib/google";

const SCHLUESSEL = Buffer.alloc(32, 7).toString("base64");

test("Refresh-Token wird verschlüsselt und wieder gelesen", async () => {
  const wert = await verschluesseln("1//geheim", SCHLUESSEL);
  assert.match(wert, /^v1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
  assert.notEqual(wert, await verschluesseln("1//geheim", SCHLUESSEL));
  assert.equal(await entschluesseln(wert, SCHLUESSEL), "1//geheim");
  await assert.rejects(entschluesseln(wert, Buffer.alloc(32, 8).toString("base64")));
  await assert.rejects(verschluesseln("x", Buffer.alloc(16).toString("base64")), /32 Byte/);
});

test("Fehlende Rechte werden erkannt", () => {
  assert.deepEqual(fehlendeScopes("business", SCOPES.business.join(" ")), []);
  assert.deepEqual(fehlendeScopes("privat", SCOPES.privat[0] ?? ""), SCOPES.privat.slice(1));
});

test("state enthält das Konto und ist zufällig", () => {
  const a = neuerState("privat");
  assert.equal(a.split(".")[0], "privat");
  assert.notEqual(a, neuerState("privat"));
  assert.equal(gleich(a, a), true);
  assert.equal(gleich(a, neuerState("privat")), false);
});
