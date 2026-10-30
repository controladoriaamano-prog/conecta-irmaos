-- ============================================================
-- CONECTA IRMÃOS · estrutura para Supabase
-- Rode este script no SQL Editor do projeto Supabase.
-- Depois preencha config.js com a URL e a chave "anon public".
-- ============================================================

create table if not exists public.ci_users (
  id text primary key,
  updated_at timestamptz not null default now(),
  data jsonb not null
);

create table if not exists public.ci_requests (
  id text primary key,
  updated_at timestamptz not null default now(),
  data jsonb not null
);

create table if not exists public.ci_orders (
  id text primary key,
  updated_at timestamptz not null default now(),
  data jsonb not null
);

create table if not exists public.ci_presence (
  id text primary key,
  updated_at timestamptz not null default now(),
  data jsonb not null
);

create index if not exists ci_users_updated on public.ci_users (updated_at desc);
create index if not exists ci_requests_updated on public.ci_requests (updated_at desc);
create index if not exists ci_orders_updated on public.ci_orders (updated_at desc);

alter table public.ci_users enable row level security;
alter table public.ci_requests enable row level security;
alter table public.ci_orders enable row level security;
alter table public.ci_presence enable row level security;

-- Acesso pela chave anon (app público da igreja).
-- Se quiser mais controle, troque por políticas com login (Supabase Auth).
drop policy if exists ci_users_all on public.ci_users;
create policy ci_users_all on public.ci_users for all using (true) with check (true);

drop policy if exists ci_requests_all on public.ci_requests;
create policy ci_requests_all on public.ci_requests for all using (true) with check (true);

drop policy if exists ci_orders_all on public.ci_orders;
create policy ci_orders_all on public.ci_orders for all using (true) with check (true);

drop policy if exists ci_presence_all on public.ci_presence;
create policy ci_presence_all on public.ci_presence for all using (true) with check (true);
