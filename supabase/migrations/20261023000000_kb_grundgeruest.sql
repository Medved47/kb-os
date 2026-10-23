-- KB OS, Schritt 1: eigener Bereich (Schema kb) im Supabase-Projekt business-os.
-- Zugriff nur für eingetragene Nutzer mit Zwei-Faktor. Keine Rechte für anon.

create schema if not exists kb;
grant usage on schema kb to authenticated, service_role;

-- Wer KB OS nutzen darf (nur Kevin)
create table kb.zugang (
  nutzer_id uuid primary key references auth.users (id) on delete cascade,
  erstellt_am timestamptz not null default now()
);
alter table kb.zugang enable row level security;
grant select on kb.zugang to authenticated;
grant all on kb.zugang to service_role;
create policy zugang_eigene_zeile on kb.zugang
  for select to authenticated using (nutzer_id = auth.uid());

-- Angemeldet mit Zwei-Faktor und eingetragen
create or replace function kb.darf()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((auth.jwt() ->> 'aal') = 'aal2', false)
     and exists (select 1 from kb.zugang z where z.nutzer_id = auth.uid())
$$;
revoke execute on function kb.darf() from public, anon;
grant execute on function kb.darf() to authenticated, service_role;

-- Geräte für Web Push
create table kb.push_abos (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  geraet text,
  erstellt_am timestamptz not null default now(),
  zuletzt_ok_am timestamptz
);
alter table kb.push_abos enable row level security;
grant select, insert, update, delete on kb.push_abos to authenticated;
grant all on kb.push_abos to service_role;
create policy push_abos_kb on kb.push_abos
  for all to authenticated using (kb.darf()) with check (kb.darf());

-- Schlüssel, die KB OS selbst erzeugt (z. B. VAPID). Nur der Server.
create table kb.schluessel (
  name text primary key,
  wert text not null,
  erstellt_am timestamptz not null default now()
);
alter table kb.schluessel enable row level security;
grant all on kb.schluessel to service_role;

-- Google-Verbindungen (privates Konto, Workspace). Refresh-Token verschlüsselt. Nur der Server.
create table kb.google_verbindungen (
  konto text primary key check (konto in ('privat', 'business')),
  email text not null,
  scopes text not null,
  refresh_token text not null,
  verbunden_am timestamptz not null default now()
);
alter table kb.google_verbindungen enable row level security;
grant all on kb.google_verbindungen to service_role;
