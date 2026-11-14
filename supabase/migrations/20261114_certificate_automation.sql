-- TGL certificate automation notification template.
-- Certificate PDFs are generated server-side from verified issuance records.

INSERT INTO public.email_templates (template_key, subject_template, body_template, description, updated_at)
VALUES (
  'enrollment_confirmed',
  'Congratulations! Your TGL Enrollment is Confirmed!',
  'Hello {{studentName}},\n\nYour enrollment in {{programmeName}} is confirmed.\n\nEnrollment ID: {{enrollmentId}}\nJoining date: {{joinedOn}}\nStatus: Active\nDashboard: {{dashboardUrl}}\n\nYour programme, linked internship, project review, and included certificate are now available from your TGL dashboard.\n\n— TGL Learning Portal',
  'Sent once after a programme enrollment payment has been verified and enrollment is activated.',
  now()
)
ON CONFLICT (template_key) DO UPDATE SET
  subject_template = EXCLUDED.subject_template,
  body_template = EXCLUDED.body_template,
  description = EXCLUDED.description,
  updated_at = now();
