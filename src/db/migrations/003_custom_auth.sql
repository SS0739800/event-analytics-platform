-- ================================================================
-- Event Analytics Platform — Custom Auth (drop Supabase Auth)
-- Run in: Supabase > SQL Editor > New Query
-- ================================================================

-- Drop events → auth.users foreign key
ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_user_id_fkey;

-- Drop old profiles and trigger
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- ── New profiles table (no auth.users dependency) ─────────────────
CREATE TABLE public.profiles (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT         NOT NULL UNIQUE,
  full_name     TEXT,
  password_hash TEXT         NOT NULL,
  totp_secret   TEXT         NOT NULL,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- events.user_id now references profiles
ALTER TABLE public.events
  ADD CONSTRAINT events_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Disable RLS — Flask handles authorization via JWT
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.events   DISABLE ROW LEVEL SECURITY;

-- ── Update get_user_events to join profiles ───────────────────────
DROP FUNCTION IF EXISTS public.get_user_events(uuid);

CREATE FUNCTION public.get_user_events(p_user_id UUID)
RETURNS TABLE (
  id               BIGINT,
  user_id          UUID,
  title            TEXT,
  category         TEXT,
  start_time       TIME,
  end_time         TIME,
  duration_minutes INTEGER,
  date             DATE,
  created_at       TIMESTAMPTZ,
  user_email       TEXT,
  user_full_name   TEXT
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
    SELECT
      e.id, e.user_id, e.title, e.category,
      e.start_time, e.end_time, e.duration_minutes,
      e.date, e.created_at,
      p.email     AS user_email,
      p.full_name AS user_full_name
    FROM public.events e
    LEFT JOIN public.profiles p ON p.id = e.user_id
    WHERE e.user_id = p_user_id
    ORDER BY e.date DESC, e.start_time ASC;
END;
$$;
