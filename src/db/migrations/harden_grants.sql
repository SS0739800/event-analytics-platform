-- ================================================================
-- Event Analytics Platform — Lock out the anon/authenticated roles
-- Run in: Supabase > SQL Editor > New Query
-- ================================================================
--
-- WHY THIS EXISTS
--
-- Supabase puts two independent gates in front of every table:
--   1. Postgres GRANTs  — may this role touch the table at all?
--   2. RLS policies     — which rows may it see?
-- A request must pass both.
--
-- Every new project ships with gate 1 wide open:
--   ALTER DEFAULT PRIVILEGES IN SCHEMA public
--     GRANT ALL ON TABLES TO anon, authenticated;
-- The model assumes gate 2 does the real work. But custom_auth.sql
-- disables RLS on profiles and events (correctly — Flask authorizes
-- every request itself via JWT), which removes gate 2 entirely.
--
-- Open gate 1 + no gate 2 = no gate. Anyone holding the anon key had
-- full SELECT/INSERT/UPDATE/DELETE on profiles, which stores
-- password_hash and totp_secret — i.e. bcrypt hashes plus the seeds
-- needed to mint valid MFA codes indefinitely.
--
-- This migration closes gate 1 instead of reinstating gate 2, because
-- Flask connects with the service_role key (see src/db/client.py),
-- and service_role is unaffected by these revokes. Nothing in the
-- application uses anon or authenticated at all.
--
-- Safe to re-run.
-- ================================================================


-- ── Existing tables ──────────────────────────────────────────────
REVOKE ALL ON public.profiles FROM anon, authenticated;
REVOKE ALL ON public.events   FROM anon, authenticated;


-- ── SECURITY DEFINER functions ───────────────────────────────────
--
-- These matter as much as the tables. Every CRUD/analytics function
-- is SECURITY DEFINER, so it runs with the definer's privileges and
-- ignores the caller's. Postgres grants EXECUTE to PUBLIC by default
-- and Supabase publishes them at /rest/v1/rpc/<name>, so an anon-key
-- holder could call them directly:
--
--   POST /rest/v1/rpc/get_user_events  {"p_user_id": "<any uuid>"}
--   POST /rest/v1/rpc/delete_event     {"p_event_id": 1, "p_user_id": "<any uuid>"}
--
-- The `AND user_id = p_user_id` guards inside them are no defence:
-- the caller supplies p_user_id.
--
-- Revoking across the whole schema avoids having to list every
-- overloaded signature by hand. Supabase installs its own extensions
-- into the `extensions` schema, so this only touches our functions.

REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM anon, authenticated;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC;


-- ── Future tables and functions ──────────────────────────────────
--
-- Without this, the next CREATE TABLE in public silently picks up the
-- wide-open default grant again and reopens the hole.

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE ALL ON TABLES FROM anon, authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM anon, authenticated;


-- ================================================================
-- VERIFY
--
-- With your anon key (Project Settings > API > `anon` / public):
--
--   curl -i "https://<your-ref>.supabase.co/rest/v1/profiles?select=email" \
--     -H "apikey: <your-anon-key>"
--
-- Before this migration: 200, with real email addresses.
-- After:                 401/403, "permission denied for table profiles".
--
-- Then confirm the app is unaffected: log in, load the dashboard,
-- create and delete an event. All of it runs on service_role.
-- ================================================================
