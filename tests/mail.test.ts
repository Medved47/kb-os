import { test } from "node:test";
import assert from "node:assert/strict";
import {
  abmeldung,
  absenderName,
  adresse,
  bereichErlaubt,
  festerBereich,
  kopfzeilen,
  mailtoLesen,
  ziel,
} from "@/lib/mail-regeln";
import { htmlEntitaeten, inhaltTeile, kopfKodieren, mimeBauen } from "@/lib/gmail";
import { hatExterneBilder, mailDokument } from "@/lib/mail-html";
import { base64urlKodieren, base64urlLesen } from "@/lib/webpush";

const k = (h: Record<string, string>) => kopfzeilen(Object.entries(h).map(([name, value]) => ({ name, value })));

test("Business-Adressen machen eine Mail immer Geschäftlich", () => {
  assert.equal(festerBereich(k({ To: "Kevin <hello@webcodic.de>" }), []), "geschaeftlich");
  assert.equal(festerBereich(k({ "X-Forwarded-For": "kevin.blecha5@gmail.com hello@webstudio-design.de" }), []), "geschaeftlich");
  assert.equal(festerBereich(k({ From: "kunde@firma.de", "Delivered-To": "hello@webstudio-design.de" }), []), "geschaeftlich");
  // Vorrang vor dem web.de-Label
  assert.equal(festerBereich(k({ Cc: "hello@webcodic.de" }), ["kevin.blecha@web.de"]), "geschaeftlich");
  assert.equal(festerBereich(k({ To: "kevin.blecha@web.de" }), ["kevin.blecha@web.de"]), "privat");
  assert.equal(festerBereich(k({ To: "kevin.blecha5@gmail.com" }), []), null);
  // Ähnliche Domains zählen nicht
  assert.equal(festerBereich(k({ To: "info@webcodic.de.example.com" }), []), null);
  assert.equal(festerBereich(k({ To: "x@notwebcodic.de" }), []), null);
});

test("Ziel: fester Bereich vor Regel, Ordner nur aus der Regel", () => {
  assert.deepEqual(ziel(null, null), { art: "einordnen", bereich: null });
  assert.deepEqual(ziel("geschaeftlich", null), { art: "einordnen", bereich: "geschaeftlich" });
  assert.deepEqual(ziel(null, { bereich: "privat", ordner: "werbung" }), { art: "sortiert", bereich: "privat", ordner: "werbung" });
  assert.deepEqual(ziel("geschaeftlich", { bereich: "privat", ordner: "rechnungen" }), {
    art: "sortiert",
    bereich: "geschaeftlich",
    ordner: "rechnungen",
  });
});

test("Geschäftliche Mail darf nie nach Privat", () => {
  assert.equal(bereichErlaubt(k({ To: "hello@webcodic.de" }), "privat"), false);
  assert.equal(bereichErlaubt(k({ To: "hello@webcodic.de" }), "geschaeftlich"), true);
  assert.equal(bereichErlaubt(k({ To: "kevin.blecha5@gmail.com" }), "privat"), true);
});

test("Adressen und Namen", () => {
  assert.equal(adresse('"Max Muster" <Max@Firma.DE>'), "max@firma.de");
  assert.equal(adresse("info@shop.de"), "info@shop.de");
  assert.equal(adresse(undefined), null);
  assert.equal(absenderName('"Max Muster" <max@firma.de>'), "Max Muster");
  assert.equal(absenderName("<max@firma.de>"), "max@firma.de");
  assert.equal(absenderName("max@firma.de"), "max@firma.de");
});

test("Abbestellen nach RFC 2369/8058", () => {
  const a = abmeldung(k({ "List-Unsubscribe": "<mailto:ab@x.de?subject=stop>, <https://x.de/ab?id=1>", "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" }));
  assert.deepEqual(a, { https: "https://x.de/ab?id=1", mailto: "mailto:ab@x.de?subject=stop", einKlick: true });
  assert.deepEqual(abmeldung(k({ "List-Unsubscribe": "<http://x.de/ab>" })), null);
  assert.equal(abmeldung(k({ "List-Unsubscribe": "<https://x.de/ab>" }))?.einKlick, false);
  assert.equal(abmeldung(k({})), null);
  assert.deepEqual(mailtoLesen("mailto:ab@x.de?subject=stop"), { an: "ab@x.de", betreff: "stop", text: "Bitte abmelden." });
  assert.equal(mailtoLesen("mailto:kaputt"), null);
});

test("Inhalt einer Mail: HTML bevorzugt, Anhänge nur als Name", () => {
  const b64 = (s: string) => base64urlKodieren(new TextEncoder().encode(s));
  const teile = inhaltTeile({
    mimeType: "multipart/mixed",
    parts: [
      {
        mimeType: "multipart/alternative",
        parts: [
          { mimeType: "text/plain", body: { data: b64("Grüße") } },
          { mimeType: "text/html", body: { data: b64("<p>Grüße</p>") } },
        ],
      },
      { mimeType: "application/pdf", filename: "rechnung.pdf", body: { attachmentId: "a1" } },
    ],
  });
  assert.equal(teile.text, "Grüße");
  assert.equal(teile.html, "<p>Grüße</p>");
  assert.deepEqual(teile.anhaenge, ["rechnung.pdf"]);
  assert.equal(htmlEntitaeten("A &amp; B &#39;x&#39; &lt;3"), "A & B 'x' <3");
});

test("Entwurf als MIME mit Antwort-Kopfzeilen", () => {
  assert.equal(kopfKodieren("Re: Angebot"), "Re: Angebot");
  assert.match(kopfKodieren("Re: Übergabe"), /^=\?UTF-8\?B\?.+\?=$/);
  const mime = mimeBauen({
    von: "hello@webcodic.de",
    an: "Max <max@firma.de>",
    betreff: "Re: Übergabe",
    text: "Hallo Max,\nbis morgen.",
    antwortAuf: { messageId: "<a@b>", references: "<x@y>", threadId: "t1" },
  });
  assert.match(mime, /^From: hello@webcodic\.de\r\n/);
  assert.match(mime, /\r\nIn-Reply-To: <a@b>\r\n/);
  assert.match(mime, /\r\nReferences: <x@y> <a@b>\r\n/);
  const koerper = mime.split("\r\n\r\n")[1]!.replace(/\r\n/g, "");
  assert.equal(new TextDecoder().decode(base64urlLesen(koerper)), "Hallo Max,\r\nbis morgen.");
  // Kein Kopfzeilen-Einschleusen über den Empfänger
  assert.doesNotMatch(mimeBauen({ von: null, an: "a@b.de\r\nBcc: c@d.de", betreff: "x", text: "y" }), /\r\nBcc:/);
});

test("Mail-HTML: externe Bilder nur auf Wunsch", () => {
  assert.match(mailDokument("<p>x</p>", false), /img-src data: cid:;/);
  assert.match(mailDokument("<p>x</p>", true), /img-src https: data: cid:/);
  assert.match(mailDokument("<p>x</p>", false), /default-src 'none'/);
  assert.equal(hatExterneBilder('<img src="https://t.example/p.gif">'), true);
  assert.equal(hatExterneBilder("<img src=\"data:image/png;base64,AA\">"), false);
});
