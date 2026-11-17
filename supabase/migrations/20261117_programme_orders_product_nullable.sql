-- Programme enrolment orders do not require a separate certificate product.
-- The original certificate-only schema made product_id mandatory; the unified
-- programme model stores the course in course_id instead.
ALTER TABLE public.certification_orders
  ALTER COLUMN product_id DROP NOT NULL;
