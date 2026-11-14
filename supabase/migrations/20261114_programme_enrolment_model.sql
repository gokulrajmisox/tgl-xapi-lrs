-- Unified Programme Enrolment Model Migration
-- Retires separate certificate checkout fees (₹299-₹599) and bundles
-- Course + Practical Project + Internship Track + Included Certificate (₹0 extra)
-- under one single Programme enrolment INR price.

ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS included_certificate_title text,
  ADD COLUMN IF NOT EXISTS certificate_included boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS completion_requirements jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS internship_duration_weeks integer NOT NULL DEFAULT 8,
  ADD COLUMN IF NOT EXISTS internship_tasks_json jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.internship_applications
  ADD COLUMN IF NOT EXISTS course_id text REFERENCES public.courses(id) ON DELETE SET NULL;

ALTER TABLE public.certification_orders
  DROP CONSTRAINT IF EXISTS certification_orders_order_kind_check;

ALTER TABLE public.certification_orders
  ADD CONSTRAINT certification_orders_order_kind_check
  CHECK (order_kind IN ('certificate', 'course_enrollment', 'programme_enrollment'));

-- Retire separate certificate fees: certificates are included at ₹0 extra after approval.
UPDATE public.certification_products
SET price_paise = 0,
    description = CONCAT(
      regexp_replace(description, '\s*\(₹[0-9,\-–]+\s*INR\)\s*', ' ', 'gi'),
      ' Included with programme enrolment at ₹0 extra upon verified completion and mentor approval.'
    ),
    updated_at = now()
WHERE price_paise <> 0;
