-- ============================================================
-- Racha · esquema de base de datos (Supabase / Postgres)
-- Pegar completo en Supabase → SQL Editor → Run. Se puede correr más de una vez.
-- ============================================================

create extension if not exists pgcrypto;

-- ---------- tablas ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default 'Sin nombre',
  created_at timestamptz not null default now()
);

create table if not exists public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  name text not null,
  icon text not null default '✅',
  color text not null default '#FF5B3A',
  category text not null default 'otro',
  freq text not null default 'Diario',
  archived boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.logs (
  habit_id uuid not null references public.habits(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  day date not null,
  created_at timestamptz not null default now(),
  primary key (habit_id, day)
);
create index if not exists logs_user_day on public.logs(user_id, day);

create table if not exists public.parties (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique,
  prize text not null default '',
  lives int not null default 3 check (lives between 1 and 5),
  weeks int not null default 4 check (weeks between 1 and 12),
  start_date date not null default current_date,
  owner uuid not null references auth.users(id) on delete cascade default auth.uid(),
  created_at timestamptz not null default now()
);

create table if not exists public.party_members (
  party_id uuid not null references public.parties(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  joined_at timestamptz not null default now(),
  primary key (party_id, user_id)
);

create table if not exists public.party_habits (
  party_id uuid not null references public.parties(id) on delete cascade,
  habit_id uuid not null references public.habits(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  primary key (party_id, habit_id)
);

-- feed de la party: log, perfect, nudge, react, join
create table if not exists public.events (
  id bigint generated always as identity primary key,
  party_id uuid not null references public.parties(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  kind text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists events_party on public.events(party_id, created_at desc);

-- ---------- helpers (security definer evita recursión en RLS) ----------
create or replace function public.is_member(p uuid) returns boolean
language sql security definer stable set search_path = public as $$
  select exists(select 1 from party_members where party_id = p and user_id = auth.uid());
$$;

create or replace function public.shares_party(other uuid) returns boolean
language sql security definer stable set search_path = public as $$
  select exists(
    select 1 from party_members a join party_members b on a.party_id = b.party_id
    where a.user_id = auth.uid() and b.user_id = other);
$$;

-- unirse con código: devuelve el id de la party
create or replace function public.join_party(p_code text) returns uuid
language plpgsql security definer set search_path = public as $$
declare pid uuid;
begin
  select id into pid from parties where upper(code) = upper(trim(p_code));
  if pid is null then raise exception 'Código no encontrado'; end if;
  insert into party_members(party_id, user_id) values (pid, auth.uid()) on conflict do nothing;
  return pid;
end $$;

-- perfil automático al registrarse
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles(id, name)
  values (new.id, coalesce(nullif(new.raw_user_meta_data->>'name',''), split_part(new.email,'@',1)))
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- RLS ----------
alter table public.profiles      enable row level security;
alter table public.habits        enable row level security;
alter table public.logs          enable row level security;
alter table public.parties       enable row level security;
alter table public.party_members enable row level security;
alter table public.party_habits  enable row level security;
alter table public.events        enable row level security;

drop policy if exists "profiles read"   on public.profiles;
drop policy if exists "profiles write"  on public.profiles;
drop policy if exists "profiles insert" on public.profiles;
create policy "profiles read"   on public.profiles for select to authenticated using (true);
create policy "profiles insert" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "profiles write"  on public.profiles for update to authenticated using (id = auth.uid());

drop policy if exists "habits read"  on public.habits;
drop policy if exists "habits write" on public.habits;
create policy "habits read" on public.habits for select to authenticated
  using (user_id = auth.uid() or public.shares_party(user_id));
create policy "habits write" on public.habits for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "logs read"  on public.logs;
drop policy if exists "logs write" on public.logs;
create policy "logs read" on public.logs for select to authenticated
  using (user_id = auth.uid() or public.shares_party(user_id));
create policy "logs write" on public.logs for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "parties read"   on public.parties;
drop policy if exists "parties insert" on public.parties;
drop policy if exists "parties update" on public.parties;
create policy "parties read"   on public.parties for select to authenticated using (owner = auth.uid() or public.is_member(id));
create policy "parties insert" on public.parties for insert to authenticated with check (owner = auth.uid());
create policy "parties update" on public.parties for update to authenticated using (owner = auth.uid());

drop policy if exists "members read"   on public.party_members;
drop policy if exists "members insert" on public.party_members;
drop policy if exists "members delete" on public.party_members;
create policy "members read"   on public.party_members for select to authenticated using (public.is_member(party_id));
create policy "members insert" on public.party_members for insert to authenticated with check (user_id = auth.uid());
create policy "members delete" on public.party_members for delete to authenticated using (user_id = auth.uid());

drop policy if exists "ph read"  on public.party_habits;
drop policy if exists "ph write" on public.party_habits;
create policy "ph read"  on public.party_habits for select to authenticated using (public.is_member(party_id));
create policy "ph write" on public.party_habits for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid() and public.is_member(party_id));

drop policy if exists "events read"  on public.events;
drop policy if exists "events write" on public.events;
create policy "events read"  on public.events for select to authenticated using (public.is_member(party_id));
create policy "events write" on public.events for insert to authenticated
  with check (user_id = auth.uid() and public.is_member(party_id));

grant execute on function public.join_party(text) to authenticated;
