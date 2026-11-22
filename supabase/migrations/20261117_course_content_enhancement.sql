-- Course Content Enhancement Migration
-- Adds prerequisites, draft/published versioning, module quizzes,
-- practical exercises tracking, reading progress, and last visited lesson resume.
-- Strictly non-destructive: preserves all existing courses, enrollments, submissions, and progress.

ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS prerequisites jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS content_status text NOT NULL DEFAULT 'published' CHECK (content_status IN ('draft', 'published')),
  ADD COLUMN IF NOT EXISTS draft_modules_json jsonb,
  ADD COLUMN IF NOT EXISTS draft_project_json jsonb,
  ADD COLUMN IF NOT EXISTS draft_extras_json jsonb,
  ADD COLUMN IF NOT EXISTS updated_by_admin_at timestamptz;

ALTER TABLE public.course_enrollments
  ADD COLUMN IF NOT EXISTS last_visited_lesson_id text,
  ADD COLUMN IF NOT EXISTS exercise_completions_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS knowledge_checks_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS module_quiz_attempts_json jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.course_lesson_progress
  ADD COLUMN IF NOT EXISTS reading_progress_percent integer NOT NULL DEFAULT 0 CHECK (reading_progress_percent >= 0 AND reading_progress_percent <= 100);

-- Ensure learners can update their own resume state & module/exercise completions on active enrollments
DROP POLICY IF EXISTS "Users update own course enrollment progress" ON public.course_enrollments;
CREATE POLICY "Users update own course enrollment progress"
  ON public.course_enrollments FOR UPDATE
  USING (auth.uid() = user_id AND status = 'active')
  WITH CHECK (auth.uid() = user_id AND status = 'active');
