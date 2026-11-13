-- TGL Student Journey Rebuild: Courses (skills, quizzes, assignments, announcements),
-- Project Status Lifecycle & Submissions, Real Internship Tasks & Evaluation, Unified RLS.

ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS skills jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS certificate_info text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS announcements_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS assignments_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS quiz_json jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS public.course_assignment_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id text NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  assignment_id text NOT NULL,
  submission_text text NOT NULL,
  artifact_url text,
  status text NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'reviewed')),
  mentor_feedback text,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, course_id, assignment_id)
);

CREATE TABLE IF NOT EXISTS public.course_quiz_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id text NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  quiz_id text NOT NULL,
  score_percent integer NOT NULL CHECK (score_percent >= 0 AND score_percent <= 100),
  passed boolean NOT NULL DEFAULT false,
  answers_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  attempted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, course_id, quiz_id)
);

CREATE TABLE IF NOT EXISTS public.project_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_slug text NOT NULL,
  course_id text REFERENCES public.courses(id) ON DELETE SET NULL,
  github_url text NOT NULL,
  deployment_url text,
  supporting_evidence text,
  summary text NOT NULL,
  reflection text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'submitted' CHECK (
    status IN ('in_progress', 'submitted', 'under_review', 'approved', 'revision_required')
  ),
  mentor_name text NOT NULL,
  mentor_feedback text,
  reviewed_at timestamptz,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.internships
  ADD COLUMN IF NOT EXISTS required_course_slug text,
  ADD COLUMN IF NOT EXISTS required_project_slug text,
  ADD COLUMN IF NOT EXISTS require_project_approval boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS tasks_json jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.internship_applications
  ADD COLUMN IF NOT EXISTS task_submissions_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS final_evaluation_notes text,
  ADD COLUMN IF NOT EXISTS final_score_label text;

ALTER TABLE public.course_assignment_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own assignment submissions" ON public.course_assignment_submissions;
CREATE POLICY "Users manage own assignment submissions"
  ON public.course_assignment_submissions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id AND EXISTS (
      SELECT 1 FROM public.course_enrollments ce
      WHERE ce.user_id = auth.uid()
        AND ce.course_id = course_assignment_submissions.course_id
        AND ce.status = 'active'
    )
  );

DROP POLICY IF EXISTS "Users manage own quiz attempts" ON public.course_quiz_attempts;
CREATE POLICY "Users manage own quiz attempts"
  ON public.course_quiz_attempts FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id AND EXISTS (
      SELECT 1 FROM public.course_enrollments ce
      WHERE ce.user_id = auth.uid()
        AND ce.course_id = course_quiz_attempts.course_id
        AND ce.status = 'active'
    )
  );

DROP POLICY IF EXISTS "Users manage own project submissions" ON public.project_submissions;
CREATE POLICY "Users manage own project submissions"
  ON public.project_submissions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
