-- Migration: add push_subscriptions table for web-push subscriptions
-- Run this in the Supabase SQL editor or include in your migration pipeline.

-- Ensure uuid generation function exists
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Table to store web push subscriptions
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NULL,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth_key text NOT NULL,
  ua text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create a unique index on endpoint to avoid duplicate subscriptions
CREATE UNIQUE INDEX IF NOT EXISTS push_subscriptions_endpoint_idx ON public.push_subscriptions (endpoint);

-- (Optional) Enable RLS and add a simple policy that allows authenticated users
-- to insert their own subscription. The service role bypasses RLS, so this
-- policy is mainly for client-side inserts using anon key (if you ever allow that).
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Create a simple policy that allows authenticated users to insert their own subscription
-- Drop existing policy first to ensure idempotency in environments where it may exist
DROP POLICY IF EXISTS allow_insert_own ON public.push_subscriptions;

CREATE POLICY allow_insert_own
  ON public.push_subscriptions
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id IS NULL OR auth.uid() = user_id);

-- Grant select/insert to authenticated role for convenience
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;
