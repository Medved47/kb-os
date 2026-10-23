# Übergabe: Persönliche Tages-App für Kevin (Webstudio / Webcodic)

Stand: 23.10.2026. Diese Datei fasst alles zusammen, was in einer Claude-Session (claude.ai) eingerichtet und entschieden wurde. Ziel: eine eigene Web-App (PWA) in einem eigenen Repo bauen. Entscheidungen danach stehen in `docs/plan.md` und haben Vorrang.

Korrektur 23.10.: Das Business OS läuft auf Cloudflare Workers, nicht auf Vercel.

## Arbeitsweise mit Kevin

- Deutsch, kurz, klar, ehrlich. Keine Emojis. Nichts beschönigen.
- Keine Fakten erfinden. Fehlt etwas: nachfragen.
- Vor großen oder teuren Schritten kurz fragen, dann bauen.
- Kevin nutzt iOS und mag dessen Gestaltung: intuitiv, aufgeräumt, alles Wichtige auf einen Blick.
- Namen in der App einfach und verständlich halten.

## Ziel der App

Eine App, die Kevin Routinearbeit abnimmt und ihm jeden Tag zeigt, was ansteht. Sie soll als Web-App auf dem iPhone-Home-Bildschirm liegen (PWA) und sich automatisch aktualisieren.

Muss interaktiv sein:
- Mail antippen öffnet sie in der App. Antworten oder Entwurf von dort aus.
- Aufgaben abhaken (Todoist und Business OS).
- Kein reines Anzeige-Dashboard.

## Aufbau (mit Kevin abgestimmt)

Tabs unten, wie eine iOS-App:

1. **Heute**: ein Satz als Briefing; kleines Wetter für Stuttgart; Zeitleiste des Tages (Business- und Privattermine) mit freien Zeitfenstern; nächste 3 Aufgaben; Countdown und Fristen, z. B. "Zlata-Eröffnung in X Tagen"; "Braucht dich": wichtige Mails.
2. **Postfach**: Umschalter Geschäftlich / Privat, darunter die Ordner; Mail öffnen, antworten, Entwurf.
3. **Aufgaben**: Business OS und Todoist zusammen, gruppiert nach Überfällig, Heute und Woche; abhaken.
4. **Geld**: Abos getrennt von Einmalzahlungen, geschäftlich und privat; pro Abo Abrechnungszyklus, nächste Abbuchung; Warnung vor Verlängerung und vor Testphasen, die bald kosten; Summe pro Monat.

Ausdrücklich NICHT gewünscht: eigenes Widget "Belege des Monats", Zeiterfassungs-Widget, Gmail-Filter, Terminvorbereitung am Vorabend, Nachfass-Wächter, Website-Wächter, automatisches Archivieren.

Gewünscht: Morgenbriefing als Push; Wochenrückblick am Freitag; Rechnungs-PDFs automatisch in Google Drive ablegen.

## Gestaltungsgrundsätze aus der Recherche

- Klare Rangordnung. Zuerst nur das, was jetzt zählt; Details erst beim Antippen.
- Tagesritual nach dem Vorbild von Sunsama und Akiflow: morgens planen, abends abschließen, Wochenrückblick. Ein gemeinsamer Eingang für Aufgaben aus allen Quellen. Aufgaben optional als Zeitblöcke im Kalender.
- Abo-Tracker trennen wiederkehrende Kosten von Einmalzahlungen und erinnern vor der Verlängerung.
- iOS-Anmutung: Systemschrift, abgerundete Karten, große Zahlen, Hell- und Dunkelmodus, ruhige Farben mit wenigen Akzenten.

## Konten und Datenquellen

| Was | Details |
|---|---|
| Haupt-Postfach | Gmail kevin.blecha5@gmail.com (früher thd217762@gmail.com, umbenannt). Alles läuft hier zusammen. |
| Business-Mail | hello@webstudio-design.de (Google Workspace, Kevin ist Admin). Leitet automatisch ins Haupt-Postfach weiter, das Original wird dort archiviert. Auch hello@webcodic.de gehört dazu. |
| web.de | kevin.blecha@web.de leitet ins Haupt-Postfach weiter. Altbestand per Thunderbird importiert, Labels "kevin.blecha@web.de" und "kevin.blecha@web.de/Gesendet". |
| Kalender Business | hello@webstudio-design.de (Workspace) |
| Kalender privat | "Mein Kalender", ID n93ufc9nn6mmpln1ohbvpgkdig@group.calendar.google.com |
| Drive | Business-Konto. Ziel für Rechnungen: Ordner "Buchhaltung/JJJJ-MM". |
| Aufgaben privat | Todoist, Konto per "Mit Apple anmelden" (Free-Plan) |
| Aufgaben Business | Business OS (Repo Medved47/business-os) |
| Second Brain | Repo Medved47/Webcodic |
| Wetter | Stuttgart (48.7758, 9.1829) |

## Mail-Sortierung (verbindlich)

Labels im Haupt-Postfach, jeweils Hauptlabel UND Unterlabel setzen:

- Geschäftlich: Wichtig, Rechnungen, Konten, Werbung, Info
- Privat: Wichtig, Rechnungen, Konten, Werbung, Info

Label-IDs (Stand 23.10., vor Verwendung per API prüfen): Geschäftlich = Label_3, Privat = Label_4, Geschäftlich/Wichtig bis Info = Label_5 bis Label_9, Privat/Wichtig bis Info = Label_10 bis Label_14 (jeweils in obiger Reihenfolge).

Feste Regeln:
- Jede Mail an hello@webstudio-design.de oder hello@webcodic.de ist IMMER Geschäftlich. Prüfen über Empfänger, Delivered-To und Weiterleitungs-Kopfzeilen.
- Alles, was zum Unternehmen gehören könnte, ist Geschäftlich: Kunden, Anfragen, Finom, Finanzamt zum Gewerbe, Domains, Hosting, fürs Business genutzte Werkzeuge.
- Eine geschäftliche Mail darf nie unter Privat landen. Im Zweifel Geschäftlich.

Ordner: Wichtig (antworten, erledigen, prüfen); Rechnungen (Rechnungen, Quittungen, Zahlungen, Kontoauszüge); Konten (Anmeldungen, Codes, Willkommensmails); Werbung (alles Abbestellbare); Info (lesen genügt). Mails älter als 3 Monate nur dann Wichtig, wenn sie noch offen sind.

Nie automatisch senden oder löschen. Antworten nur als Entwurf. Geschäftliche Antworten mit Absender hello@webstudio-design.de. Bei Kunden die im Business OS gespeicherte Anrede (du oder Sie).

Im Workspace-Postfach liegen alte Labels (Belege/..., Sortiert/..., Konten/Zugänge), werden nicht mehr gebraucht.

## Bekannte Daten

Kosten aus Belegen (Business-Postfach, Oktober 2026): DataForSEO 59,50 USD am 17.10. (API-Guthaben); Cloudflare 5 USD am 02.10. (Rechnung IN-81803436); Kie.ai 3 × 5 USD am 14.10. (Guthaben). Im privaten Postfach: mehrere Kie.ai-Käufe am 01.10., ein Google-AI-Plus-Abo, ein Kling-AI-Abo. Ob Abo oder Einmalzahlung, aus den Mails bestimmen, nicht raten.

Fristen: Zlata (Kunde, Referenz-Website), offizielle Eröffnung 12.12.2026, bis dahin muss die Website stehen (Business-OS-Verlauf vom 21.10.).

Offene Prüfpunkte aus dem ersten Mail-Durchlauf: Google-Sicherheitswarnung zu einer iPhone-Anmeldung am 22.10.; Higgsfield neues Gerät am 18.10.; Apple-Business-Bestätigung offen; HighLevel-Testphase angelegt.

## Was in Claude bereits läuft

- Dashboard (Claude-Artifact): https://claude.ai/artifact/WSorkfCvExkEn9N9hyP5LD, wird durch die App ersetzt.
- Geplante Aufgaben in claude.ai: "Morgen-Update" werktags 4:47; "Wochenend-Update" Sa und So 8:46; "Wochenrückblick" Fr 15:44; "Postfach einmalig sortieren" 23.10., 12:00.
- Die Läufe sortieren Mails, legen Antwortentwürfe an und schicken eine Push-Nachricht. Wenn die App das übernimmt, Kevin fragen, welche Läufe abgeschaltet werden.
