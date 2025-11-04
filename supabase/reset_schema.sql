-- RESET AND REBUILD SPLITWISE SCHEMA (Supabase)
-- Idempotent: safe to run multiple times
-- This script DROPS existing objects, recreates tables, functions, triggers,
-- foreign keys, RLS policies, and basic grants.

-- Extensions (usually present in Supabase)
create extension if not exists pgcrypto;
create extension if not exists "uuid-ossp";

-- OPTIONAL: also wipe Supabase Auth users (uncomment to enable)
-- WARNING: this logs everyone out and deletes all users; you'll need to sign up again.
-- delete from auth.users;

-- =====================
-- DROP OLD OBJECTS
-- =====================
-- Drop triggers first (if exist)
drop trigger if exists on_auth_user_created on auth.users;
drop trigger if exists on_group_created on public.groups;

-- Drop functions
drop function if exists public.handle_new_user cascade;
drop function if exists public.handle_new_group cascade;
drop function if exists public.user_is_member_of_group(uuid, uuid) cascade;
drop function if exists public.share_group(uuid, uuid) cascade;
drop function if exists public.invite_member(uuid, text) cascade;

-- Drop tables (CASCADE cleans dependent objects like policies)
drop table if exists public.expense_splits cascade;
drop table if exists public.expenses cascade;
drop table if exists public.settlements cascade;
drop table if exists public.group_members cascade;
drop table if exists public.groups cascade;
drop table if exists public.profiles cascade;

-- =====================
-- TABLES
-- =====================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  created_at timestamptz default now()
);

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  created_at timestamptz default now(),
  created_by uuid not null references auth.users(id) on delete cascade
);

create table public.group_members (
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz default now(),
  primary key (group_id, user_id)
);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  description text not null,
  amount numeric(12,2) not null check (amount > 0),
  paid_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz default now()
);

create table public.expense_splits (
  expense_id uuid not null references public.expenses(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric(12,2) not null check (amount >= 0),
  primary key (expense_id, user_id)
);

create table public.settlements (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  from_user_id uuid not null references public.profiles(id) on delete cascade,
  to_user_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  created_at timestamptz default now(),
  created_by uuid references auth.users(id)
);

-- =====================
-- FUNCTIONS (helpers)
-- =====================
-- Create profile on new auth user
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', new.email))
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

-- Auto-add creator as member when a group is created
create or replace function public.handle_new_group()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.group_members (group_id, user_id)
  values (new.id, new.created_by)
  on conflict do nothing;
  return new;
end;
$$;

-- Helper: is user a member of a group
create or replace function public.user_is_member_of_group(p_group_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists(
    select 1 from public.group_members gm
    where gm.group_id = p_group_id and gm.user_id = p_user_id
  );
$$;

-- Helper: do two users share a group?
create or replace function public.share_group(u1 uuid, u2 uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.group_members a
    join public.group_members b on a.group_id = b.group_id
    where a.user_id = u1 and b.user_id = u2
  );
$$;

-- RPC: invite member by email into a group (caller must be a member)
create or replace function public.invite_member(p_group_id uuid, p_email text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid;
begin
  -- ensure caller is a member
  if not public.user_is_member_of_group(p_group_id, auth.uid()) then
    raise exception 'not a member of this group';
  end if;

  select id into v_user from public.profiles where lower(email) = lower(p_email);
  if v_user is null then
    raise exception 'no profile for email %', p_email;
  end if;

  insert into public.group_members (group_id, user_id)
  values (p_group_id, v_user)
  on conflict do nothing;
end;
$$;

-- =====================
-- TRIGGERS
-- =====================
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create trigger on_group_created
after insert on public.groups
for each row execute function public.handle_new_group();

-- =====================
-- GRANTS (broad; RLS will still apply)
-- =====================
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to anon, authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;

-- =====================
-- RLS POLICIES
-- =====================
-- PROFILES
alter table public.profiles enable row level security;
create policy profiles_select_self on public.profiles
for select to authenticated
using (id = auth.uid());

create policy profiles_select_shared on public.profiles
for select to authenticated
using (
  id = auth.uid() or public.share_group(id, auth.uid())
);

-- GROUPS
alter table public.groups enable row level security;
create policy groups_insert_policy on public.groups
for insert to authenticated
with check (created_by = auth.uid());

create policy groups_select_policy on public.groups
for select to authenticated
using (public.user_is_member_of_group(id, auth.uid()));

create policy groups_update_policy on public.groups
for update to authenticated
using (created_by = auth.uid())
with check (created_by = auth.uid());

create policy groups_delete_policy on public.groups
for delete to authenticated
using (created_by = auth.uid());

-- GROUP_MEMBERS
alter table public.group_members enable row level security;
create policy gm_select on public.group_members
for select to authenticated
using (public.user_is_member_of_group(group_id, auth.uid()));

create policy gm_insert on public.group_members
for insert to authenticated
with check (
  user_id = auth.uid() or public.user_is_member_of_group(group_id, auth.uid())
);

create policy gm_delete on public.group_members
for delete to authenticated
using (
  user_id = auth.uid() or
  exists (
    select 1 from public.groups g
    where g.id = group_members.group_id and g.created_by = auth.uid()
  )
);

-- EXPENSES
alter table public.expenses enable row level security;
create policy expenses_select on public.expenses
for select to authenticated
using (public.user_is_member_of_group(group_id, auth.uid()));

create policy expenses_insert on public.expenses
for insert to authenticated
with check (public.user_is_member_of_group(group_id, auth.uid()));

create policy expenses_update on public.expenses
for update to authenticated
using (public.user_is_member_of_group(group_id, auth.uid()))
with check (public.user_is_member_of_group(group_id, auth.uid()));

create policy expenses_delete on public.expenses
for delete to authenticated
using (public.user_is_member_of_group(group_id, auth.uid()));

-- EXPENSE_SPLITS
alter table public.expense_splits enable row level security;
create policy splits_select on public.expense_splits
for select to authenticated
using (exists (
  select 1 from public.expenses e
  where e.id = expense_splits.expense_id
  and public.user_is_member_of_group(e.group_id, auth.uid())
));

create policy splits_mutate on public.expense_splits
for all to authenticated
using (exists (
  select 1 from public.expenses e
  where e.id = expense_splits.expense_id
  and public.user_is_member_of_group(e.group_id, auth.uid())
))
with check (exists (
  select 1 from public.expenses e
  where e.id = expense_splits.expense_id
  and public.user_is_member_of_group(e.group_id, auth.uid())
));

-- SETTLEMENTS
alter table public.settlements enable row level security;
create policy settlements_select on public.settlements
for select to authenticated
using (public.user_is_member_of_group(group_id, auth.uid()));

create policy settlements_insert on public.settlements
for insert to authenticated
with check (public.user_is_member_of_group(group_id, auth.uid()));

create policy settlements_delete on public.settlements
for delete to authenticated
using (
  public.user_is_member_of_group(group_id, auth.uid()) and
  (created_by = auth.uid() or from_user_id = auth.uid() or to_user_id = auth.uid())
);

-- Trigger to set created_by on settlements
create or replace function public.set_created_by()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.created_by is null then
    new.created_by := auth.uid();
  end if;
  return new;
end;
$$;

create trigger trg_settlements_created_by
before insert on public.settlements
for each row execute function public.set_created_by();

-- =====================
-- FINAL: reload PostgREST schema cache
-- =====================
notify pgrst, 'reload schema';
