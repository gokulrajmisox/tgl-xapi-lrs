-- Courses, Enrollments, Progress, Unified Payment Orders, and Complete xAPI/LRS Cleanup
-- Preserves auth, learning_paths, certification_products, internships, and email tables.

DROP TABLE IF EXISTS public.xapi_statements CASCADE;
DROP TABLE IF EXISTS public.lrs_registrations CASCADE;
DROP TABLE IF EXISTS public.lrs_credentials CASCADE;
DROP TABLE IF EXISTS public.activity_mappings CASCADE;
DROP TABLE IF EXISTS public.lrs_rate_limits CASCADE;
DROP TABLE IF EXISTS public.browser_extension_devices CASCADE;
DROP TABLE IF EXISTS public.provider_connections CASCADE;
DROP TABLE IF EXISTS public.learning_sessions CASCADE;

CREATE TABLE IF NOT EXISTS public.courses (
  id text PRIMARY KEY,
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  subtitle text NOT NULL,
  category text NOT NULL,
  level text NOT NULL,
  price_paise integer NOT NULL CHECK (price_paise >= 49900 AND price_paise <= 199900),
  currency text NOT NULL DEFAULT 'INR' CHECK (currency = 'INR'),
  estimated_hours integer NOT NULL DEFAULT 10,
  mentor_name text NOT NULL,
  mentor_role text NOT NULL,
  outcomes jsonb NOT NULL DEFAULT '[]'::jsonb,
  includes jsonb NOT NULL DEFAULT '[]'::jsonb,
  linked_internship_slug text NOT NULL,
  linked_internship_title text NOT NULL,
  internship_disclosure text NOT NULL,
  is_published boolean NOT NULL DEFAULT true,
  modules_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  project_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.course_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id text NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  payment_id text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'refunded')),
  enrolled_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, course_id)
);

CREATE TABLE IF NOT EXISTS public.course_lesson_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id text NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  lesson_id text NOT NULL,
  status text NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed')),
  completed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, course_id, lesson_id)
);

ALTER TABLE public.certification_orders
  ADD COLUMN IF NOT EXISTS order_kind text NOT NULL DEFAULT 'certificate' CHECK (order_kind IN ('certificate', 'course_enrollment')),
  ADD COLUMN IF NOT EXISTS course_id text REFERENCES public.courses(id) ON DELETE SET NULL;

ALTER TABLE public.certification_orders
  ALTER COLUMN product_id DROP NOT NULL;

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_lesson_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Published courses are readable" ON public.courses;
CREATE POLICY "Published courses are readable"
  ON public.courses FOR SELECT
  USING (is_published = true);

DROP POLICY IF EXISTS "Users read own course enrollments" ON public.course_enrollments;
CREATE POLICY "Users read own course enrollments"
  ON public.course_enrollments FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own course lesson progress" ON public.course_lesson_progress;
CREATE POLICY "Users manage own course lesson progress"
  ON public.course_lesson_progress FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id AND EXISTS (
      SELECT 1 FROM public.course_enrollments ce
      WHERE ce.user_id = auth.uid()
        AND ce.course_id = course_lesson_progress.course_id
        AND ce.status = 'active'
    )
  );
