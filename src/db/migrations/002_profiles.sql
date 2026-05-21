-- ================================================================
-- Event Analytics Platform — Profiles table (Supabase Auth version)
-- NOTE: Superseded by 003_custom_auth.sql
-- Kept for reference only
-- ================================================================

-- ── Profiles table ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID         PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT         NOT NULL,
  full_name   TEXT,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── Row Level Security ────────────────────────────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_own_profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "users_update_own_profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- ── Auto-create profile on signup ─────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── Upsert profile ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.upsert_profile(
  p_user_id   UUID,
  p_email     TEXT,
  p_full_name TEXT
) RETURNS public.profiles
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_row public.profiles;
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (p_user_id, p_email, p_full_name)
  ON CONFLICT (id) DO UPDATE SET
    email     = EXCLUDED.email,
    full_name = EXCLUDED.full_name
  RETURNING * INTO v_row;
  RETURN v_row;
END;
$$;
