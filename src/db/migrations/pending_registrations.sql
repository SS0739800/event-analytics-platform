-- ================================================================
-- Event Analytics Platform — Durable pending-registration store
-- Run in: Supabase > SQL Editor > New Query
-- Run AFTER harden_grants.sql.
-- ================================================================
--
-- WHY THIS EXISTS
--
-- Registration is a two-request flow:
--   POST /auth/register         → issue TOTP secret + QR, remember it
--   POST /auth/register/verify  → check the code, create the profile
--
-- The interim state used to live in a module-level Python dict in
-- src/web/app.py. That works for exactly one process, which is why
-- run_web.py had to pass use_reloader=False — the reloader's restart
-- wiped the dict mid-flow.
--
-- It breaks outright under any real WSGI server. Gunicorn defaults to
-- several worker processes, each with its own memory, so the verify
-- request routinely lands on a worker that never saw the register
-- request and registration fails with "session not found" at random.
--
-- Moving the state here makes it shared across workers and durable
-- across restarts and redeploys.
--
-- SENSITIVITY: rows hold password_hash and totp_secret, exactly like
-- public.profiles. Treat this table with the same care — never expose
-- it to the anon or authenticated roles. The revokes below are
-- belt-and-braces on top of the schema-wide defaults already removed
-- by harden_grants.sql, in case this table is ever created first.
--
-- Safe to re-run.
-- ================================================================

CREATE TABLE IF NOT EXISTS public.pending_registrations (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT        NOT NULL,
  full_name     TEXT,
  password_hash TEXT        NOT NULL,
  totp_secret   TEXT        NOT NULL,
  expires_at    TIMESTAMPTZ NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Supports the sweep of expired rows on each registration attempt.
CREATE INDEX IF NOT EXISTS pending_registrations_expires_at_idx
  ON public.pending_registrations(expires_at);


-- ── Lock it down ─────────────────────────────────────────────────
-- Flask reaches this table with the service_role key, which bypasses
-- both grants and RLS. Nothing else should reach it at all.

REVOKE ALL ON public.pending_registrations FROM anon, authenticated;

ALTER TABLE public.pending_registrations ENABLE ROW LEVEL SECURITY;
-- Deliberately no policies: RLS with zero policies denies every role
-- that does not bypass it.


-- ================================================================
-- VERIFY
--
-- Expect "permission denied for table pending_registrations":
--
--   curl -i "https://<your-ref>.supabase.co/rest/v1/pending_registrations?select=email" \
--     -H "apikey: <your-anon-key>"
--
-- Then register a brand-new account through the UI end to end. That
-- exercises both halves of the flow and is the real test.
-- ================================================================
