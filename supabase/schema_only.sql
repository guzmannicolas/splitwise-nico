-- SCHEMA ONLY (no drops, no auth inserts). Run once on a fresh Supabase project.
-- This creates tables, functions, triggers, grants, RLS policies.

create extension if not exists pgcrypto;
create extension if not exists "uuid-ossp";

-- ==========
-- TABLES
-- ==========
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  created_at timestamptz default now()
);

create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  created_at timestamptz default now(),
  created_by uuid not null references auth.users(id) on delete cascade
);

create table if not exists public.group_members (
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz default now(),
  primary key (group_id, user_id)
);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  description text not null,
  amount numeric(12,2) not null check (amount > 0),
  paid_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz default now()
);

create table if not exists public.expense_splits (
  expense_id uuid not null references public.expenses(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric(12,2) not null check (amount >= 0),
  primary key (expense_id, user_id)
);

create table if not exists public.settlements (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  from_user_id uuid not null references public.profiles(id) on delete cascade,
  to_user_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  created_at timestamptz default now(),
  created_by uuid references auth.users(id)
);

-- ==============
-- FUNCTIONS (create or replace)
-- ==============
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

create or replace function public.invite_member(p_group_id uuid, p_email text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid;
begin
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

-- ==============
-- TRIGGERS
-- ==============
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

drop trigger if exists trg_groups_set_created_by on public.groups;
create trigger trg_groups_set_created_by
before insert on public.groups
for each row execute function public.set_created_by();

drop trigger if exists on_group_created on public.groups;
create trigger on_group_created
after insert on public.groups
for each row execute function public.handle_new_group();

drop trigger if exists trg_settlements_created_by on public.settlements;
create trigger trg_settlements_created_by
before insert on public.settlements
for each row execute function public.set_created_by();

-- ==============
-- GRANTS
-- ==============
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to anon, authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;

-- ==============
-- ENABLE RLS & POLICIES
-- ==============
-- PROFILES
alter table public.profiles enable row level security;
create policy profiles_select_self on public.profiles
for select to authenticated
using (id = auth.uid());

create policy profiles_select_shared on public.profiles
for select to authenticated
using (id = auth.uid() or public.share_group(id, auth.uid()));

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
    select 1 from public.groups g2
    where g2.id = group_members.group_id and g2.created_by = auth.uid()
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
  select 1 from public.expenses e2
  where e2.id = expense_splits.expense_id
  and public.user_is_member_of_group(e2.group_id, auth.uid())
));

create policy splits_mutate on public.expense_splits
for all to authenticated
using (exists (
  select 1 from public.expenses e2
  where e2.id = expense_splits.expense_id
  and public.user_is_member_of_group(e2.group_id, auth.uid())
))
with check (exists (
  select 1 from public.expenses e2
  where e2.id = expense_splits.expense_id
  and public.user_is_member_of_group(e2.group_id, auth.uid())
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

-- Reload PostgREST schema cache
notify pgrst, 'reload schema';
