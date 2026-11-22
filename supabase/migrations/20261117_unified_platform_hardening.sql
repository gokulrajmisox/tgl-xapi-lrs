-- Unified Platform Hardening Migration
-- Adds certificate lifecycle timestamps, regeneration audit counters,
-- project supporting files JSON, cohorts & mentor messages persistence with RLS.
-- Strictly non-destructive: preserves all existing courses, enrollments, payments, and certificates.

ALTER TABLE public.certificate_issuances
  ADD COLUMN IF NOT EXISTS claimed_at timestamptz,
  ADD COLUMN IF NOT EXISTS joined_at timestamptz,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS regeneration_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS regenerated_at timestamptz,
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.project_submissions
  ADD COLUMN IF NOT EXISTS supporting_files_json jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE TABLE IF NOT EXISTS public.cohorts (
  id text PRIMARY KEY,
  name text NOT NULL,
  pathway_slug text NOT NULL,
  mentor_name text NOT NULL,
  mentor_email text NOT NULL,
  learner_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'upcoming', 'archived')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.mentor_messages (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  learner_name text NOT NULL,
  project_slug text,
  node_id text,
  topic text NOT NULL,
  author_role text NOT NULL CHECK (author_role IN ('student', 'mentor')),
  author_name text NOT NULL,
  body text NOT NULL,
  resolved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cohorts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentor_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view active cohorts" ON public.cohorts;
CREATE POLICY "Public can view active cohorts"
  ON public.cohorts FOR SELECT
  USING (status = 'active');

DROP POLICY IF EXISTS "Learners view own mentor messages" ON public.mentor_messages;
CREATE POLICY "Learners view own mentor messages"
  ON public.mentor_messages FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Learners create own mentor messages" ON public.mentor_messages;
CREATE POLICY "Learners create own mentor messages"
  ON public.mentor_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id AND author_role = 'student');
