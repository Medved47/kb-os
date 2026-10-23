# Plan: KB OS (persönliche Tages-App für Kevin)

Stand: 23.10.2026. Grundlage: Übergabe aus claude.ai (`docs/uebergabe.md`), Repos `Medved47/business-os` und `Medved47/webcodic`, Recherche und Absprachen in dieser Session. Schritt 0 erledigt, Schritt 1 gebaut (siehe `CLAUDE.md`, Abschnitt Stand).

## Entscheidungen (mit Kevin abgestimmt)

| Thema | Entscheidung |
|---|---|
| Repo | `Medved47/kb-os` |
| Hosting | Cloudflare Workers über OpenNext, wie das Business OS. Cron alle 15 Minuten im Free-Tarif. |
| Adresse | `kb.webcodic.de` (Google-Rückruf `https://kb.webcodic.de/google/rueckruf`) |
| Stack | Next.js (App Router, TypeScript), Tailwind, PWA |
| Datenbank | Bestehendes Supabase-Projekt `business-os`, eigenes Schema. Belegt: 33,7 MB von 500 MB (23.10.). |
| Login | Bestehendes Supabase-Konto von Kevin mit Zwei-Faktor, zusätzlich auf Kevins Nutzer-ID beschränkt |
| Business OS | Neuer kleiner JSON-Endpunkt im Business OS, eigenes Token |
| Claude API | Nein. Mail-Einordnung in der App nur über Regeln. Unklare Fälle und Antwortentwürfe übernimmt eine geplante Claude-Aufgabe. |
| Privater Kalender | Die App liest ihn direkt über das private Google-Konto. Keine Freigabe nötig. |
| Drive | Die App legt "Buchhaltung/JJJJ-MM" selbst an (Scope `drive.file` reicht) |
| Belege | Nur nach Drive, sortiert in "Buchhaltung/JJJJ-MM". Kevin übernimmt sie von dort selbst in Finom. Keine Weiterleitung. |
| Mail zurückstellen | Nein |
| Geld: Umsatz und offene Rechnungen | Nein |
| Name | KB OS |
| Morgenbriefing | Werktags 5:00, Samstag und Sonntag 9:00 (Europe/Berlin) |
| Erfassen per Siri | Nein |
| Claude-Connector der App | Ja. Die Claude-Aufgabe trägt darüber Einordnungen, Fristen und Abos direkt ein. |

## Aufbau

Vier Reiter unten wie in einer iOS-App. Systemschrift, abgerundete Karten, Hell- und Dunkelmodus, wenige Akzentfarben. Das Wichtigste groß und oben, Details erst beim Antippen.

### 1. Heute
- Ein Satz als Briefing, aus einer festen Vorlage (z. B. "3 Termine, 2 Fristen, 4 Mails brauchen dich")
- Wetter Stuttgart, klein. Hinweis nur, wenn es zählt (z. B. "ab 16 Uhr Regen")
- Zeitleiste: Business- und Privattermine, freie Zeitfenster
- Warnung bei zu viel Arbeit: geschätzte Dauer der geplanten Aufgaben gegen freie Zeit (Dauer optional)
- Nächste 3 Aufgaben
- Fristen und Countdown, automatisch (siehe "Fristen")
- "Braucht dich": wichtige Mails, Sicherheitsmeldungen immer hier
- Abends: Abschluss. Erledigtes ansehen, Offenes mit einem Tippen auf morgen schieben

### 2. Postfach
- Umschalter Geschäftlich / Privat, darunter die Ordner Wichtig, Rechnungen, Konten, Werbung, Info, dazu "Einordnen"
- Mail öffnen, als Entwurf antworten (geschäftlich mit Absender hello@webstudio-design.de, Anrede aus dem Business OS)
- Textbausteine für wiederkehrende Antworten
- Mail zu Aufgabe machen (Todoist oder Business OS, mit Link zur Mail)
- Knopf "Abbestellen" bei Werbung (List-Unsubscribe, nur auf Tippen)
- Unklare Mail einem Ordner zuordnen, die App merkt sich den Absender als Regel
- Anzeige, wann zuletzt sortiert wurde

### 3. Aufgaben
- Business OS und Todoist in einer Liste, gruppiert nach Überfällig, Heute, Woche
- Abhaken, anlegen (Schnellerfassung über einen Knopf)
- Aufgabe als Zeitblock in den Business-Kalender legen

### 4. Geld
- Abos getrennt von Einmalzahlungen, geschäftlich und privat
- Pro Abo: Betrag, Zyklus, nächste Abbuchung, Kündigungsfrist, Link zum Kündigen
- Warnung vor Verlängerung und vor Ende einer Testphase (mit Preis danach)
- Summe pro Monat in EUR (USD umgerechnet)
- Liste der abgelegten Belege
- Abo oder Einmalzahlung nie raten: Regel, Claude-Aufgabe oder Kevin entscheidet

### Übergreifend
- Push: Morgenbriefing, Wochenrückblick am Freitag, Warnungen (Testphase, Frist)
- Badge am App-Symbol: Anzahl "Braucht dich"
- Push-Abo prüfen. Ist es weg, fordert die App zum erneuten Einschalten auf
- Offline: letzter Stand mit Uhrzeit

## Mail-Sortierung

Regeln wie in der Übergabe (verbindlich, "Geschäftlich nie unter Privat"). Ergänzt 23.10. von Kevin:

- Alles mit dem Label "kevin.blecha@web.de" (Export und Weiterleitung von web.de) ist **immer Privat**. Ausnahme mit Vorrang: Absender, Empfänger oder Weiterleitung über hello@webstudio-design.de oder hello@webcodic.de ist immer Geschäftlich.
- Der Altbestand aus dem Workspace-Postfach (hello@webstudio-design.de) wird noch ins Haupt-Postfach importiert (Kevin). Die Weiterleitung für neue Mails steht.
- "Im Zweifel Geschäftlich" gilt nur noch, wenn die Mail an eine Business-Adresse ging oder der Absender als geschäftlich bekannt ist. Sonst "Einordnen".

Arbeitsteilung:

1. **App, alle 15 Minuten:** neue Mails über Gmail `history.list` holen, nach festen Regeln sortieren (Empfänger, Delivered-To, Weiterleitungs-Kopfzeilen, bekannte Absender). Nicht Zuordenbares bekommt das Label "Einordnen". Haupt- und Unterlabel immer zusammen.
2. **Claude-Aufgabe in claude.ai, 7, 12 und 17 Uhr:** sortiert die Mails unter "Einordnen", schreibt Antwortentwürfe, erkennt Fristen und Abos und trägt sie über den Connector von KB OS ein. Die bestehenden geplanten Läufe gehen darin auf.
3. **Lernen:** Setzt Claude oder Kevin für einen Absender zweimal dasselbe Label, schlägt die App eine feste Regel vor.

Nie automatisch senden, löschen oder archivieren.

## Fristen (automatisch)

- Projekt-Deadlines aus dem Business OS (z. B. Zlata, Eröffnung 12.12.2026)
- Steuerfristen nach Kevins Lage: Kleinunternehmer (§ 19 UStG), EÜR, Einkommensteuer. Keine Umsatzsteuer-Voranmeldung, solange § 13b (Reverse Charge bei ausländischen Anbietern) nicht anders geklärt ist; offen laut `04-verwaltung/finanzen.md`.
- Fristen aus Mails (z. B. Finanzamt), erkannt durch die Claude-Aufgabe
- Aktuell offen laut `04-verwaltung/gruendung.md`: Fragebogen zur steuerlichen Erfassung (ELSTER), Richtwert etwa 28.10.2026

## Datenquellen und Zugriff

| Quelle | Zugriff |
|---|---|
| Gmail privat (kevin.blecha5@gmail.com) | Eigener externer OAuth-Client, Status "In Produktion", ohne Verifizierung (persönlicher Gebrauch, unter 100 Nutzer). Scopes `gmail.modify`, `gmail.compose`, `calendar.readonly`. |
| Workspace (hello@webstudio-design.de) | Gleicher Client. Scopes `calendar.events` (Zeitblöcke), `drive.file`. |
| Todoist | Persönliches API-Token |
| Business OS | Neuer JSON-Endpunkt (Aufgaben lesen, abhaken, anlegen; Projekt-Deadlines; Anrede je Kunde per Mailadresse) |
| Wetter | Open-Meteo, ohne Schlüssel |

Claude-Connector: eigener MCP-Endpunkt mit OAuth, Umsetzung nach Vorbild Business OS (`src/lib/api/`, `src/lib/oauth/`). Nur Werkzeuge für Einordnung, Fristen und Abos, kein Senden oder Löschen.

Refresh-Tokens verschlüsselt in der Datenbank (AES-GCM), wie im Business OS. Web Push über VAPID, Code aus dem Business OS übernehmen.

Sicherheit: Zugriff nur für Kevin. Keine Daten an Dritte außer den nötigen APIs. Mailinhalte werden nicht gespeichert, nur IDs, Labels und Einordnungsregeln.

## Reihenfolge

0. **Vorbereitung (Kevin, mit Anleitung):** Google-Cloud-Projekt und OAuth-Client, Cloudflare-Worker und Secrets, Todoist-Token, VAPID-Schlüssel.
1. **Grundgerüst:** PWA, Login, vier Reiter, Hell/Dunkel, Push einschalten, Offline-Stand.
2. **Heute:** Kalender (beide), Wetter, Aufgaben (Business OS und Todoist), Fristen. Erster nutzbarer Stand.
3. **Aufgaben:** Liste, Abhaken, Schnellerfassung, Abendabschluss, Arbeitslast-Warnung, Zeitblöcke.
4. **Postfach:** Lesen, Ordner, Regel-Sortierung, Einordnen, Entwürfe, Textbausteine, Mail zu Aufgabe, Abbestellen, Badge.
5. **Claude-Connector und Claude-Aufgabe:** Connector bauen, neue Aufgabe 7/12/17 Uhr, alte Läufe nach Rücksprache abschalten.
6. **Geld:** Abos und Einmalzahlungen, Warnungen, Monatssumme, Belege nach Drive.
7. **Push-Berichte:** Morgenbriefing (werktags 5:00, Wochenende 9:00), Wochenrückblick (erledigt, Ausgaben, nächste Woche, 3 feste Fragen).
8. **Ablösen:** Claude-Dashboard (Artifact) und alte Läufe abschalten, nach Rücksprache.

## Offen

- Nichts für den Plan. Vor dem Bauen: Google-, Supabase- und Cloudflare-Details in der aktuellen Doku prüfen.
