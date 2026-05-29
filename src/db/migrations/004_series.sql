-- ================================================================
-- Add series_id to events for bulk/recurring event grouping
-- Run in: Supabase > SQL Editor > New Query
-- ================================================================

ALTER TABLE public.events ADD COLUMN IF NOT EXISTS series_id UUID;
CREATE INDEX IF NOT EXISTS events_series_id_idx ON public.events(series_id);

-- ── Replace create_event to accept optional series_id ─────────────
DROP FUNCTION IF EXISTS public.create_event(UUID, TEXT, TEXT, TIME, TIME, INTEGER, DATE);

CREATE FUNCTION public.create_event(
  p_user_id          UUID,
  p_title            TEXT,
  p_category         TEXT,
  p_start_time       TIME,
  p_end_time         TIME,
  p_duration_minutes INTEGER,
  p_date             DATE,
  p_series_id        UUID DEFAULT NULL
) RETURNS public.events
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_row public.events;
BEGIN
  INSERT INTO public.events (user_id, title, category, start_time, end_time, duration_minutes, date, series_id)
  VALUES (p_user_id, p_title, p_category, p_start_time, p_end_time, p_duration_minutes, p_date, p_series_id)
  RETURNING * INTO v_row;
  RETURN v_row;
END;
$$;

-- ── Replace get_user_events to include series_id ──────────────────
DROP FUNCTION IF EXISTS public.get_user_events(UUID);

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
  series_id        UUID,
  user_email       TEXT,
  user_full_name   TEXT
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
    SELECT
      e.id, e.user_id, e.title, e.category,
      e.start_time, e.end_time, e.duration_minutes,
      e.date, e.created_at, e.series_id,
      p.email     AS user_email,
      p.full_name AS user_full_name
    FROM public.events e
    LEFT JOIN public.profiles p ON p.id = e.user_id
    WHERE e.user_id = p_user_id
    ORDER BY e.date DESC, e.start_time ASC;
END;
$$;

-- ── Delete all events belonging to a series ───────────────────────
CREATE OR REPLACE FUNCTION public.delete_event_series(
  p_series_id UUID,
  p_user_id   UUID
) RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_count INTEGER;
BEGIN
  DELETE FROM public.events
  WHERE series_id = p_series_id AND user_id = p_user_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;
