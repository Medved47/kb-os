# Stand und Übergabe (23.10.2026, abends)

Für die nächste Claude-Session. Plan: `docs/plan.md`, Regeln: `CLAUDE.md`, Herkunft: `docs/uebergabe.md`.

## Was läuft

- Live unter `kb.webcodic.de` (Cloudflare Worker `kb-os`, baut von `main`; Build-Branch war falsch eingestellt, am 23.10. von Kevin korrigiert). Push funktioniert auf dem iPhone.
- Schritte 0 bis 3 gebaut:
  - Google-Verbindung Privat/Business (`src/lib/google.ts`, Einstellungen). Ob Kevin beide Konten schon verbunden hat: nachfragen.
  - Heute: Briefing, Wetter, Termine beider Kalender, freie Fenster, nächste Aufgaben, Fristen (Projekt-Deadlines aus dem Business OS), Arbeitslast-Warnung, Abendabschluss ab 17 Uhr.
  - Aufgaben: Todoist (API v1) und Business OS in einer Liste, abhaken, Schnellerfassung (Todoist-Inbox), auf morgen, Zeitblock im Business-Kalender.
- Business OS: Route `/api/kb` (Repo `Medved47/business-os`, `src/lib/kb-schnittstelle.ts`), Token `KB_OS_TOKEN` dort, `BUSINESS_OS_URL`/`BUSINESS_OS_TOKEN` in KB OS. Von Kevin gesetzt.
- Live noch nicht von Claude geprüft (kein Login möglich): Google, Todoist, Business-Aufgaben, Zeitblock. Bei Fehlern zuerst Supabase-Logs (MCP `query_logs`) und Kevin nach der Meldung fragen.

## Bekannte Stolpersteine

- `SUPABASE_SECRET_KEY` war in Cloudflare falsch kopiert (`bad_checksum`), am 23.10. korrigiert. Fehler in Supabase-Edge-Logs prüfen (`request.sb.apikey.apikey.error`).
- Live-Stand prüfen: einen Chunk aus dem lokalen Build (`.next/static/chunks/...`) per `curl` auf `kb.webcodic.de` abfragen; 404 = neuer Stand nicht ausgeliefert.
- Am 23.10. hat parallel eine zweite Session auf `main` gepusht. Vor dem Push immer `git fetch origin main` und zusammenführen.
- Die automatische Berechtigungsprüfung (Auto-Modus) blockiert Änderungen am Business OS, die Routen ohne Login freischalten. Dann Kevin bitten, auf "Accept edits" umzustellen.

## Offen (Reihenfolge mit Kevin abgestimmt: als Nächstes Schritt 4)

1. **Schritt 4 Postfach: gebaut 24.10.** (Details `CLAUDE.md`, Stand). Offen bei Kevin: Migration `20261024000000_kb_postfach.sql` ausführen, Google Privat verbinden (lief am 24.10. auf "401 invalid_client"; Variablen werden jetzt getrimmt, sonst `GOOGLE_CLIENT_ID` in Cloudflare prüfen), in Gmail `hello@webcodic.de` unter "Senden als" einrichten (sonst kommen Entwürfe von der Gmail-Adresse). Der erste Cron-Lauf merkt sich nur den Stand, Altbestand bleibt. Nicht live geprüft.
2. **App-Icon:** Kevin entwirft selbst ein Logo und lädt es hoch (PNG ≥ 1024 px, quadratisch, ohne Transparenz, ~10 % Rand). Daraus `public/icons/` (180, 192, 512) erzeugen; `scripts/icons.mjs` zeichnet bisher das YK-Zeichen auf Blau. Danach App auf dem iPhone neu zum Home-Bildschirm hinzufügen.
3. **Steuerfristen** und Fristen aus Mails (Schritt 2 Rest, `src/lib/fristen.ts`).
4. **Schritte 5 bis 8** laut Plan; Erweiterungen (Bank über Enable Banking, Ablaufdaten, Wiederkehrendes, Berater über Claude-Connector) unter "Erweiterungen" im Plan.

## Gmail-Aufräumen (23.10.)

- Unter "Geschäftlich" lag viel Privates (alte Regel "im Zweifel Geschäftlich"). Bereinigt: alles nach Privat verschoben außer Mails über hello@webstudio-design.de/hello@webcodic.de und der Weiterleitungsbestätigung von Google. formaxx (Jevgeni Strojenko) ist laut Kevin privat.
- Nicht fertig: web.de-Mails ohne Bereich (`label:kevin.blecha@web.de -label:Privat -label:Geschäftlich`). Kevin hat die Hintergrund-Session dafür gestoppt; nur nach Rückfrage fortsetzen.
- Kevin hat einige Mails selbst gelöscht (InStaff u. a.); nichts wiederherstellen.

## Mail-Regeln (verbindlich, auch für die geplanten claude.ai-Aufgaben)

Reihenfolge = Vorrang:
1. Von, an oder über hello@webstudio-design.de oder hello@webcodic.de: immer Geschäftlich.
2. Label "kevin.blecha@web.de": immer Privat.
3. Sonst Geschäftlich nur, wenn eindeutig zum Unternehmen gehörig; Newsletter, Inspiration, Tools ohne klaren Business-Bezug: Privat.
4. Unklar: Label "Einordnen" (existiert in Gmail noch nicht, wird bei Bedarf angelegt).
Immer Haupt- und Unterlabel zusammen. Nie senden, löschen oder archivieren.

Kevin hat die Regel für die geplanten Aufgaben in claude.ai als Text bekommen; ob er sie dort eingesetzt hat, nachfragen.
