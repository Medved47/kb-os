# KB OS – Anleitung für Claude

Persönliche Tages-App (PWA) für Kevin: Heute, Postfach, Aufgaben, Geld. Nur ein Nutzer.
Plan und Entscheidungen: [docs/plan.md](docs/plan.md), Übergabe aus claude.ai: [docs/uebergabe.md](docs/uebergabe.md). Aktueller Stand und offene Punkte: [docs/stand.md](docs/stand.md), zuerst lesen. Bei Änderungen am Plan dort nachziehen.

## Regeln

- Antworten, Code-Kommentare, Oberfläche und Doku auf Deutsch. Keine Emojis.
- Klar, knapp, ehrlich. Keine Fakten erfinden, bei Unklarheit nachfragen.
- Vor größeren Schritten (neue Dienste, Datenmodell, teure Dinge) kurz nachfragen.
- Keine Zugangsdaten, Keys oder Mailinhalte committen. Lokale Werte in `.env.local` / `.dev.vars` (ignoriert).
- Nie automatisch Mails senden, löschen oder archivieren. Antworten nur als Entwurf.
- Mail-Regel mit Vorrang: Eine geschäftliche Mail darf nie unter Privat landen (Details `docs/uebergabe.md`).
- Neue Migrationen (SQL) immer zusätzlich vollständig im Chat ausgeben, zum Kopieren in den Supabase SQL Editor.
- Vor jedem Commit: `npm run lint`, `npm run typecheck`, `npm test`.
- Fertige Stände direkt auf `main` mergen und pushen (Erlaubnis Kevin 2026-10-23); Cloudflare baut von `main`.

## Technik

- Next.js 16 (App Router, `src/`), TypeScript, Tailwind 4, keine UI-Bibliothek (Bausteine in `src/components/ui.tsx`).
- Next.js 16: Middleware heißt `proxy` (`src/proxy.ts`). Vor API-Nutzung die Doku in `node_modules/next/dist/docs/` prüfen.
- Hosting: Cloudflare Worker `kb-os` über OpenNext, Adresse `kb.webcodic.de`. Kein `export const runtime = "edge"`.
- Supabase: Projekt `business-os` (gleiches Konto und Zwei-Faktor wie im Business OS), eigenes Schema `kb`. Migrationen in `supabase/migrations/`, nie bestehende ändern.
- Variablen zur Laufzeit (Cloudflare): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_TOKEN_KEY`, `API_TOKEN`, `TODOIST_TOKEN`, `BUSINESS_OS_URL`, `BUSINESS_OS_TOKEN`. Seiten, die sie lesen, rendern dynamisch (`await connection()`).
- Viel Code stammt aus dem Repo `Medved47/business-os` (Supabase-Clients, Login, Web Push). Bei Fragen dort nachsehen.

## Sicherheit

- Alle Seiten außer `/login*` erfordern Anmeldung (Proxy), Zwei-Faktor (AAL2) und einen Eintrag in `kb.zugang`: `requireZugang()` in `src/lib/auth.ts`, im Layout `src/app/(app)/layout.tsx` und in jeder Server Action.
- Jede Tabelle in `kb` hat Row Level Security. Tabellen für die Oberfläche: Policy mit `kb.darf()`. Nur-Server-Tabellen (`schluessel`, `google_verbindungen`): RLS ohne Policy, Rechte nur für `service_role`.
- Admin-Client (`src/lib/supabase/admin.ts`, Secret Key) nur auf dem Server nach `requireZugang()` bzw. Token-Prüfung.
- VAPID-Schlüssel erzeugt KB OS selbst (`src/lib/push.ts`, `kb.schluessel`).
- Service Worker (`public/sw.js`) speichert geladene Seiten für den Offline-Stand; Abmelden leert den Speicher.

## Befehle

- `npm run dev`, `npm run build`, `npm run preview` (Cloudflare-Runtime lokal)
- `npm run lint`, `npm run typecheck`, `npm test` (Node-Test-Runner, `tests/*.test.ts`, nur reine Logik)
- `npm run icons` – App-Icons neu erzeugen

## Stand

- Schritt 0 (Vorbereitung) erledigt: Google-Cloud-Projekt "KB OS" (extern, in Produktion, nicht verifiziert), Todoist-Token.
- Schritt 1 (Grundgerüst) gebaut: Login mit Zwei-Faktor, vier Reiter, Einstellungen mit Push, Offline-Stand. Migration `20261023000000_kb_grundgeruest.sql`.
- Einrichtung 2026-10-23: Supabase-Schema `kb` ausgeführt, Cloudflare-Worker `kb-os` mit Domain `kb.webcodic.de` und Variablen angelegt, mit GitHub (`main`) verbunden.
- Schritt 2 (Heute) teilweise gebaut 2026-10-23: Google-Verbindung Privat/Business unter Einstellungen (`src/lib/google.ts`, `/google/verbinden`, `/google/rueckruf`, keine neue Migration), Termine beider Kalender mit freien Zeitfenstern (`src/lib/kalender.ts`), Wetter Stuttgart (`src/lib/wetter.ts`, Open-Meteo), Todoist-Aufgaben (API v1, `src/lib/aufgaben.ts`) mit Abhaken und Schnellerfassung, Briefing-Satz (`src/lib/briefing.ts`). Business OS angebunden über `src/lib/business-os.ts` (Route `/api/kb` im Business OS, Variablen `BUSINESS_OS_URL`, `BUSINESS_OS_TOKEN`): Aufgaben des Inhabers und Projekt-Fristen mit Countdown. Offen: Steuerfristen, Fristen aus Mails.
- Schritt 3 (Aufgaben) gebaut 2026-10-23: Abendabschluss auf Heute ab 17 Uhr (heute erledigt, einzeln oder alle auf morgen; wiederkehrende Todoist-Aufgaben bleiben), Warnung bei zu viel Arbeit (Todoist-Feld Dauer gegen freie Zeit bis 20 Uhr), Zeitblock im Business-Kalender aus jeder Aufgabe (Kalender-Symbol, Vorschlag nächste freie Zeit). Business OS `/api/kb` liefert dafür heute Erledigtes und kann verschieben.
- Schritt 4 (Postfach) gebaut 2026-10-24: Gmail des Privat-Kontos (`src/lib/gmail.ts`, nur REST), Regeln in `src/lib/mail-regeln.ts` (Business-Adresse > web.de-Label > Absenderregel > "Einordnen"), Sortierung alle 15 Minuten über Cron (`worker.ts` als Einstieg, `triggers` in `wrangler.jsonc`, Route `/api/cron` mit `API_TOKEN`, Job `src/lib/mail-sortieren.ts`, nur neue Mails per `history.list`, erster Lauf merkt sich nur den Stand), Push bei neuer Mail in Wichtig. Postfach mit Umschalter, Ordnern, Einordnen (merkt den Absender als Regel), Mail im abgeschotteten iframe (externe Bilder nur auf Tippen), Antwort als Gmail-Entwurf (geschäftlich von `hello@webcodic.de`, Anrede aus dem Business OS per `/api/kb` Aktion `kontakt`), Textbausteine und Regeln unter Einstellungen, Mail zu Aufgabe (Todoist oder Business OS mit Link), Abbestellen (Ein-Klick nach RFC 8058 oder Entwurf an die Abmeldeadresse). Heute: "Braucht dich" (ungelesen in Wichtig plus Einordnen), Zahl im Briefing und als Badge am App-Symbol. Migration `20261024000000_kb_postfach.sql`.
