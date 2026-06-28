-- USC Cremonese Rehab Area – Schema Supabase
-- Esegui questo script nell'SQL Editor del tuo progetto Supabase

-- ── Atleti ───────────────────────────────────────────────────────────────────
create table if not exists atleti (
  id                  text primary key,
  nome                text not null,
  data_nascita        text default '',
  categoria           text not null,
  posizione           text default '',
  piede_dominante     text default 'Destro',
  tipo_infortunio     text,
  infortunio          text default '',
  inizio_rehab        text default '',
  fine_rehab          text,
  stato               text not null default 'In recupero',
  progresso           integer default 0,
  fisioterapista      text default '',
  preparatore_atletico text default '',
  telefono            text default '',
  email               text default '',
  note                text default '',
  created_at          timestamptz default now()
);

-- ── Programmi ─────────────────────────────────────────────────────────────────
create table if not exists programmi (
  id         text primary key,
  atleta_id  text references atleti(id) on delete cascade,
  nome       text not null,
  fase       text default '',
  data       text not null,
  esercizi      jsonb default '[]'::jsonb,
  esercizicampo jsonb default '[]'::jsonb,
  tests         jsonb default '[]'::jsonb,
  carico        jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- ── Impostazioni (riga singola) ───────────────────────────────────────────────
create table if not exists impostazioni (
  id               integer primary key default 1,
  nome_club        text default 'USC Cremonese',
  nome_struttura   text default 'Rehab Area',
  indirizzo        text default '',
  fisioterapisti   jsonb default '[]'::jsonb,
  preparatori      jsonb default '[]'::jsonb
);

insert into impostazioni (id) values (1) on conflict do nothing;

-- ── Row Level Security (accesso libero – aggiungere auth in futuro) ───────────
alter table atleti enable row level security;
alter table programmi enable row level security;
alter table impostazioni enable row level security;

create policy "Accesso completo atleti"       on atleti       for all using (true) with check (true);
create policy "Accesso completo programmi"    on programmi    for all using (true) with check (true);
create policy "Accesso completo impostazioni" on impostazioni for all using (true) with check (true);
