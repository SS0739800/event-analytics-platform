-- ================================================================
-- Add custom categories to profiles
-- Run in: Supabase > SQL Editor > New Query
-- ================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS categories TEXT[] DEFAULT NULL;
