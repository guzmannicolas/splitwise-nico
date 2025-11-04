-- OPTIONAL DEV SEED (no drops). Run AFTER schema_only.sql.
-- Uses auth.sign_up to create users safely (no direct inserts into auth.users).
-- Then inserts a demo group, expense, splits, and a settlement.

-- Create two dev users (may send confirmation depending on your project settings)
select auth.sign_up(
  email => 'admin@example.com',
  password => 'Password1!',
  data => jsonb_build_object('full_name','Admin')
);

select auth.sign_up(
  email => 'user1@example.com',
  password => 'Password1!',
  data => jsonb_build_object('full_name','Usuario 1')
);

-- Ensure profiles trigger populates
-- If users already existed, profiles row should already be there; otherwise trigger created it on sign_up.

with
u1 as (
  select id from auth.users where email = 'admin@example.com'
),
u2 as (
  select id from auth.users where email = 'user1@example.com'
),
g as (
  insert into public.groups (name, description, created_by)
  select 'Grupo Demo', 'Semilla inicial', id from u1
  returning id, created_by
),
add_member as (
  insert into public.group_members (group_id, user_id)
  select g.id, u2.id from g, u2
  on conflict do nothing
  returning group_id
),
e as (
  insert into public.expenses (group_id, description, amount, paid_by)
  select g.id, 'Pizza', 100.00, g.created_by from g
  returning id, group_id, paid_by
)
insert into public.expense_splits (expense_id, user_id, amount)
select e.id, (select id from u1), 50.00 from e
union all
select e.id, (select id from u2), 50.00 from e;

-- Example settlement: user1 pays 20 to Admin
insert into public.settlements (group_id, from_user_id, to_user_id, amount, created_by)
select e.group_id, (select id from auth.users where email='user1@example.com'), (select id from auth.users where email='admin@example.com'), 20.00,
       (select id from auth.users where email='user1@example.com')
from public.expenses e
where e.description = 'Pizza'
order by e.created_at desc
limit 1;

-- Reload PostgREST schema cache
notify pgrst, 'reload schema';
