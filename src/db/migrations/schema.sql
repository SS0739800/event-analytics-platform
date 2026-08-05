-- ================================================================
-- Event Analytics Platform — Supabase Schema
-- Run this entire file in: Supabase > SQL Editor > New Query
-- ================================================================

-- ── Events table ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.events (
  id               BIGSERIAL    PRIMARY KEY,
  user_id          UUID         NOT NULL,
  title            TEXT         NOT NULL,
  category         TEXT         NOT NULL,
  start_time       TIME         NOT NULL,
  end_time         TIME         NOT NULL,
  duration_minutes INTEGER      NOT NULL,
  date             DATE         NOT NULL,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS events_user_id_idx ON public.events(user_id);
CREATE INDEX IF NOT EXISTS events_date_idx    ON public.events(date);

-- ================================================================
-- CRUD Functions
-- ================================================================

CREATE OR REPLACE FUNCTION public.get_user_events(p_user_id UUID)
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

-- ─────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.create_event(
  p_user_id          UUID,
  p_title            TEXT,
  p_category         TEXT,
  p_start_time       TIME,
  p_end_time         TIME,
  p_duration_minutes INTEGER,
  p_date             DATE
) RETURNS public.events
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_row public.events;
BEGIN
  INSERT INTO public.events (user_id, title, category, start_time, end_time, duration_minutes, date)
  VALUES (p_user_id, p_title, p_category, p_start_time, p_end_time, p_duration_minutes, p_date)
  RETURNING * INTO v_row;
  RETURN v_row;
END;
$$;

-- ─────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.update_event(
  p_event_id         BIGINT,
  p_user_id          UUID,
  p_title            TEXT,
  p_category         TEXT,
  p_start_time       TIME,
  p_end_time         TIME,
  p_duration_minutes INTEGER,
  p_date             DATE
) RETURNS public.events
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_row public.events;
BEGIN
  UPDATE public.events SET
    title            = p_title,
    category         = p_category,
    start_time       = p_start_time,
    end_time         = p_end_time,
    duration_minutes = p_duration_minutes,
    date             = p_date
  WHERE id = p_event_id AND user_id = p_user_id
  RETURNING * INTO v_row;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event not found or access denied';
  END IF;
  RETURN v_row;
END;
$$;

-- ─────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.delete_event(
  p_event_id BIGINT,
  p_user_id  UUID
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  DELETE FROM public.events WHERE id = p_event_id AND user_id = p_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event not found or access denied';
  END IF;
END;
$$;

-- ================================================================
-- Analytics Functions — REMOVED
--
-- Seven aggregate functions were defined here originally:
--   get_summary_stats, get_category_stats, get_hourly_stats,
--   get_daily_stats, get_monthly_trends, get_category_trend,
--   get_top_events
--
-- Nothing ever called them. The application computes all of these
-- figures in pandas instead, from the DataFrame that
-- src/db/events.py builds out of get_user_events() — see
-- src/analytics/ and the /api/stats route in src/web/app.py.
--
-- Removed here so a fresh install never creates them.
-- drop_dead_analytics.sql removes them from databases that already
-- ran an earlier version of this file. Recoverable from git history
-- if aggregation is ever moved back into Postgres.
-- ================================================================
