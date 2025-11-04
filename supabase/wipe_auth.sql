-- DANGER: This script deletes users from Supabase Auth.
-- Run in Supabase SQL Editor. Use with caution.
-- Effects:
-- - Deletes rows from auth.users
-- - Due to FK ON DELETE CASCADE in reset_schema.sql, related rows in
--   public.profiles, public.group_members, public.expenses, public.expense_splits,
--   public.settlements will also be removed.

-- OPTION A) Delete ALL users (including you). You'll need to sign up again.
-- Uncomment to use:
-- delete from auth.users;

-- OPTION B) Keep specific accounts and delete the rest.
-- Replace the emails with the ones you want to KEEP.
-- Example:
-- delete from auth.users
-- where email not in (
--   'you@example.com'
-- );

-- OPTION C) Delete only certain accounts by email
-- Example:
-- delete from auth.users where email in ('old@example.com');

-- Optional: reload PostgREST schema cache (not strictly required for auth changes)
-- notify pgrst, 'reload schema';
