import { test } from "node:test";
import assert from "node:assert/strict";
import { base64urlKodieren, base64urlLesen, erlaubterEndpunkt, vapidJwt } from "@/lib/webpush";

test("nur bekannte Push-Dienste", () => {
  assert.equal(erlaubterEndpunkt("https://web.push.apple.com/abc"), true);
  assert.equal(erlaubterEndpunkt("https://fcm.googleapis.com/fcm/send/x"), true);
  assert.equal(erlaubterEndpunkt("http://web.push.apple.com/abc"), false);
  assert.equal(erlaubterEndpunkt("https://boese.example.com/"), false);
  assert.equal(erlaubterEndpunkt("kein link"), false);
});

test("base64url hin und zurück", () => {
  const daten = new Uint8Array([0, 1, 250, 251, 252, 253, 254, 255]);
  assert.deepEqual(base64urlLesen(base64urlKodieren(daten)), daten);
});

test("VAPID-JWT mit erzeugtem Schlüssel", async () => {
  const paar = (await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign"])) as CryptoKeyPair;
  const oeffentlich = base64urlKodieren(new Uint8Array(await crypto.subtle.exportKey("raw", paar.publicKey)));
  const { d } = await crypto.subtle.exportKey("jwk", paar.privateKey);
  const jwt = await vapidJwt({ oeffentlich, privat: d!, subjekt: "mailto:test@example.com" }, "https://web.push.apple.com/x", 0);
  const [kopf, inhalt] = jwt.split(".");
  assert.equal(JSON.parse(new TextDecoder().decode(base64urlLesen(kopf))).alg, "ES256");
  assert.equal(JSON.parse(new TextDecoder().decode(base64urlLesen(inhalt))).aud, "https://web.push.apple.com");
});
