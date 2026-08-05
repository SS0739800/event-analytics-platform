-- ================================================================
-- Event Analytics Platform — Keep-alive ping target
-- Run in: Supabase > SQL Editor > New Query
-- MUST run after harden_grants.sql (see note on GRANT below).
-- ================================================================
--
-- WHY THIS EXISTS
--
-- Supabase pauses free-tier projects after 7 days of inactivity, and
-- activity is measured by requests reaching the project. A pg_cron job
-- is internal to the database and does not reliably count, so the ping
-- has to arrive over HTTP from outside. That job lives in
-- .github/workflows/keepalive.yml and hits this table once a day.
--
-- This table exists so the ping has a target that is safe to expose.
-- Pointing it at `events` or `profiles` would mean granting the anon
-- role read access to real user data; instead the anon key unlocks
-- exactly one meaningless timestamp and nothing else.
--
-- Read-only on purpose: proving liveness needs a SELECT, and a write
-- would mean granting anon UPDATE. Ping history lives in the Actions
-- run log, not in this table.
--
-- Safe to re-run.
-- ================================================================

CREATE TABLE IF NOT EXISTS public.keepalive (
  id        INT         PRIMARY KEY DEFAULT 1,
  pinged_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.keepalive (id) VALUES (1) ON CONFLICT (id) DO NOTHING;


-- ── Gate 2: RLS policy ───────────────────────────────────────────
ALTER TABLE public.keepalive ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon can read keepalive" ON public.keepalive;

CREATE POLICY "anon can read keepalive"
  ON public.keepalive FOR SELECT TO anon USING (true);


-- ── Gate 1: explicit GRANT ───────────────────────────────────────
--
-- Required. harden_grants.sql revoked the schema-wide default, so this
-- table gets no automatic grant — and an RLS policy alone grants
-- nothing. Both gates must be opened for the ping to return 200.

GRANT SELECT ON public.keepalive TO anon;


-- ================================================================
-- VERIFY
--
--   curl -i "https://<your-ref>.supabase.co/rest/v1/keepalive?select=pinged_at&limit=1" \
--     -H "apikey: <your-anon-key>"
--
-- Expect 200 and a single row. If you get "permission denied", the
-- GRANT above did not run.
-- ================================================================
