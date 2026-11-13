-- TGL Payments, Internship Certificates & Email System Migration
-- Preserves existing learning_paths, learning_modules, learning_resources, and auth tables.

-- 1. Internships & Participation (separate from optional paid certification)
CREATE TABLE IF NOT EXISTS internships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  track text NOT NULL,
  description text NOT NULL,
  duration_weeks integer NOT NULL DEFAULT 8 CHECK (duration_weeks > 0),
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS internship_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  internship_id uuid NOT NULL REFERENCES internships(id) ON DELETE CASCADE,
  applicant_name text NOT NULL,
  applicant_email text NOT NULL,
  motivation text NOT NULL,
  portfolio_url text,
  status text NOT NULL DEFAULT 'applied' CHECK (status IN ('applied', 'accepted', 'in_progress', 'completed', 'withdrawn')),
  submission_url text,
  submission_summary text,
  assessment_passed boolean NOT NULL DEFAULT false,
  mentor_approved boolean NOT NULL DEFAULT false,
  mentor_approved_by uuid REFERENCES auth.users(id),
  mentor_notes text,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, internship_id)
);

-- 2. Certification Products (₹299–₹599 INR stored as integer paise, or 0 for free)
CREATE TABLE IF NOT EXISTS certification_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text NOT NULL,
  certificate_type text NOT NULL CHECK (
    certificate_type IN ('internship', 'course_completion', 'project_completion', 'special_achievement')
  ),
  price_paise integer NOT NULL CHECK (
    price_paise = 0 OR (price_paise >= 29900 AND price_paise <= 59900)
  ),
  currency text NOT NULL DEFAULT 'INR' CHECK (currency = 'INR'),
  enabled boolean NOT NULL DEFAULT true,
  eligibility_rules jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Certification Orders
CREATE TABLE IF NOT EXISTS certification_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES certification_products(id) ON DELETE RESTRICT,
  internship_application_id uuid REFERENCES internship_applications(id) ON DELETE SET NULL,
  razorpay_order_id text NOT NULL UNIQUE,
  amount_paise integer NOT NULL CHECK (amount_paise >= 0),
  currency text NOT NULL DEFAULT 'INR' CHECK (currency = 'INR'),
  order_status text NOT NULL DEFAULT 'created' CHECK (
    order_status IN ('created', 'attempted', 'paid', 'failed', 'cancelled', 'refunded')
  ),
  payment_mode text NOT NULL DEFAULT 'razorpay_test' CHECK (
    payment_mode IN ('razorpay_test', 'razorpay_live', 'simulated_test')
  ),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Certification Payments
CREATE TABLE IF NOT EXISTS certification_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES certification_orders(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  razorpay_payment_id text NOT NULL UNIQUE,
  razorpay_signature text,
  payment_status text NOT NULL DEFAULT 'pending' CHECK (
    payment_status IN ('pending', 'captured', 'failed', 'cancelled', 'refunded')
  ),
  payment_method text,
  failure_reason text,
  verified_at timestamptz,
  refunded_at timestamptz,
  refund_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 5. Idempotent Webhook Event Log
CREATE TABLE IF NOT EXISTS payment_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id text NOT NULL UNIQUE,
  event_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  processing_status text NOT NULL DEFAULT 'received' CHECK (
    processing_status IN ('received', 'processed', 'ignored_duplicate', 'failed')
  ),
  error_message text,
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);

-- 6. Certificate Issuances (never issued by payment alone)
CREATE TABLE IF NOT EXISTS certificate_issuances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES certification_products(id) ON DELETE RESTRICT,
  payment_id uuid REFERENCES certification_payments(id) ON DELETE SET NULL,
  internship_application_id uuid REFERENCES internship_applications(id) ON DELETE SET NULL,
  certificate_id text NOT NULL UNIQUE,
  recipient_name text NOT NULL,
  recipient_email text NOT NULL,
  achievement_title text NOT NULL,
  certificate_type text NOT NULL,
  eligibility_status text NOT NULL DEFAULT 'pending' CHECK (
    eligibility_status IN ('pending', 'eligible', 'ineligible')
  ),
  issuance_status text NOT NULL DEFAULT 'pending_approval' CHECK (
    issuance_status IN ('pending_approval', 'issued', 'revoked')
  ),
  approved_by uuid REFERENCES auth.users(id),
  revocation_reason text,
  issued_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Prevent duplicate active (non-revoked) certificates for the same user + product
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_certificate_user_product
  ON certificate_issuances (user_id, product_id)
  WHERE issuance_status != 'revoked';

-- 7. Email Templates & Delivery Logs
CREATE TABLE IF NOT EXISTS email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key text NOT NULL UNIQUE,
  subject_template text NOT NULL,
  body_template text NOT NULL,
  description text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS email_delivery_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_email text NOT NULL,
  template_key text NOT NULL,
  subject text NOT NULL,
  is_test boolean NOT NULL DEFAULT true,
  provider text NOT NULL,
  delivery_status text NOT NULL CHECK (
    delivery_status IN ('queued', 'sent', 'simulated_test', 'failed')
  ),
  provider_message_id text,
  error_message text,
  attempt_count integer NOT NULL DEFAULT 1,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE internships ENABLE ROW LEVEL SECURITY;
ALTER TABLE internship_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE certification_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE certification_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE certification_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificate_issuances ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_delivery_logs ENABLE ROW LEVEL SECURITY;

-- Policies: public catalog read
CREATE POLICY "Public can view published internships"
  ON internships FOR SELECT USING (is_published = true);

CREATE POLICY "Public can view enabled certification products"
  ON certification_products FOR SELECT USING (enabled = true);

-- Students can view and submit their own internship applications (status/approval updated by mentor/admin)
CREATE POLICY "Students view own internship applications"
  ON internship_applications FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Students create own internship applications"
  ON internship_applications FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Students update own submission fields"
  ON internship_applications FOR UPDATE USING (auth.uid() = user_id);

-- Students can view own orders, payments, and certificates (writes are backend service-role only)
CREATE POLICY "Students view own certification orders"
  ON certification_orders FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Students view own certification payments"
  ON certification_payments FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Students view own certificate issuances"
  ON certificate_issuances FOR SELECT USING (auth.uid() = user_id);

-- Public verification lookup is served via backend route / server component using service role
-- (returning only non-sensitive verification fields: recipient_name, certificate_id, title, dates, status).

-- Seed default certification products (₹299–₹599 INR in integer paise)
INSERT INTO certification_products (slug, name, description, certificate_type, price_paise, currency, enabled, eligibility_rules)
VALUES
  (
    'internship-certificate',
    'Internship Certificate',
    'Official verified Internship Certificate confirming internship completion, project submission, and mentor approval.',
    'internship',
    49900,
    'INR',
    true,
    '{"requiresInternshipCompletion": true, "requiresSubmission": true, "requiresMentorApproval": true}'::jsonb
  ),
  (
    'course-completion-certificate',
    'Course Completion Certificate',
    'Official Course Completion Certificate recognizing verified completion of a structured TGL learning pathway.',
    'course_completion',
    29900,
    'INR',
    true,
    '{"requiresPathwayCompletion": true, "requiresAssessmentPass": true, "requiresMentorApproval": true}'::jsonb
  ),
  (
    'project-completion-certificate',
    'Project Completion Certificate',
    'Official Project Completion Certificate documenting an approved capstone build and technical review.',
    'project_completion',
    39900,
    'INR',
    true,
    '{"requiresSubmission": true, "requiresAssessmentPass": true, "requiresMentorApproval": true}'::jsonb
  ),
  (
    'special-achievement-certificate',
    'Special Achievement Certificate',
    'Distinction credential awarded for exceptional technical craftsmanship, mentorship, or open-source impact.',
    'special_achievement',
    59900,
    'INR',
    true,
    '{"requiresSubmission": true, "requiresMentorApproval": true, "requiresAdminDistinction": true}'::jsonb
  )
ON CONFLICT (slug) DO NOTHING;

-- Seed default free internships
INSERT INTO internships (slug, title, track, description, duration_weeks, is_published)
VALUES
  (
    'full-stack-product-engineering',
    'Full-Stack Product Engineering Internship',
    'Engineering',
    'Build production web modules, API workflows, and accessible user interfaces with mentor code reviews. Participation is 100% free.',
    8,
    true
  ),
  (
    'applied-ai-data-systems',
    'Applied AI & Data Systems Internship',
    'Data & AI',
    'Design evaluation pipelines, structured prompts, and measurable data workflows on real datasets. Participation is 100% free.',
    8,
    true
  ),
  (
    'cloud-security-engineering',
    'Cloud & Security Engineering Internship',
    'Infrastructure',
    'Implement authentication boundaries, webhook verification, and resilient telemetry instrumentation. Participation is 100% free.',
    6,
    true
  )
ON CONFLICT (slug) DO NOTHING;
