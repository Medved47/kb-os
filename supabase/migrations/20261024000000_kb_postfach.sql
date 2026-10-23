-- KB OS, Schritt 4: Postfach. Keine Mailinhalte, nur Stand der Sortierung,
-- Absender-Regeln und Textbausteine.

-- Stand der Sortierung (eine Zeile). Nur der Server (Cron, Seiten nach requireZugang).
create table kb.mail_stand (
  id smallint primary key default 1 check (id = 1),
  history_id text,
  sortiert_am timestamptz,
  sortiert_anzahl integer not null default 0,
  fehler text,
  fehler_am timestamptz
);
alter table kb.mail_stand enable row level security;
grant all on kb.mail_stand to service_role;

-- Absender-Regeln: Absenderadresse (klein geschrieben) -> Bereich und Ordner
create table kb.mail_regeln (
  absender text primary key check (absender = lower(absender) and position('@' in absender) > 1),
  bereich text not null check (bereich in ('geschaeftlich', 'privat')),
  ordner text not null check (ordner in ('wichtig', 'rechnungen', 'konten', 'werbung', 'info')),
  quelle text not null default 'kevin' check (quelle in ('kevin', 'claude')),
  erstellt_am timestamptz not null default now(),
  geaendert_am timestamptz not null default now()
);
alter table kb.mail_regeln enable row level security;
grant select, insert, update, delete on kb.mail_regeln to authenticated;
grant all on kb.mail_regeln to service_role;
create policy mail_regeln_kb on kb.mail_regeln
  for all to authenticated using (kb.darf()) with check (kb.darf());

-- Textbausteine für Antworten
create table kb.textbausteine (
  id uuid primary key default gen_random_uuid(),
  titel text not null check (length(titel) between 1 and 100),
  text text not null check (length(text) between 1 and 5000),
  erstellt_am timestamptz not null default now()
);
alter table kb.textbausteine enable row level security;
grant select, insert, update, delete on kb.textbausteine to authenticated;
grant all on kb.textbausteine to service_role;
create policy textbausteine_kb on kb.textbausteine
  for all to authenticated using (kb.darf()) with check (kb.darf());
