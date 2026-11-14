export type EmailTemplateKey =
  | "purchase_initiated"
  | "enrollment_confirmed"
  | "payment_success"
  | "payment_failed"
  | "payment_refunded"
  | "certificate_issued"
  | "certificate_ready"
  | "internship_approved"
  | "internship_eligibility_confirmed";

export type EmailTemplateDefinition = {
  template_key: EmailTemplateKey;
  subject_template: string;
  body_template: string;
  description: string;
  updated_at: string;
};

export const DEFAULT_EMAIL_TEMPLATES: EmailTemplateDefinition[] = [
  {
    template_key: "enrollment_confirmed",
    subject_template: "Congratulations! Your TGL Enrollment is Confirmed!",
    body_template:
      "Hello {{studentName}},\n\nYour enrollment in {{programmeName}} is confirmed.\n\nEnrollment ID: {{enrollmentId}}\nJoining date: {{joinedOn}}\nStatus: Active\nDashboard: {{dashboardUrl}}\n\nYour programme, linked internship, project review, and included certificate are now available from your TGL dashboard.\n\n— TGL Learning Portal",
    description: "Sent once after a programme enrollment payment has been verified and enrollment is activated.",
    updated_at: "2026-11-14T00:00:00.000Z",
  },
  {
    template_key: "purchase_initiated",
    subject_template: "Certification checkout initiated — {{certificateName}}",
    body_template:
      "Hello {{studentName}},\n\nYou initiated checkout for {{certificateName}} ({{amountFormatted}} INR).\nOrder reference: {{orderId}}\n\nNote: Certificate issuance proceeds only after verified payment and confirmed eligibility.\n\n— Touch Grass Later",
    description: "Sent when a student starts Razorpay checkout for an eligible certificate.",
    updated_at: "2026-11-13T00:00:00.000Z",
  },
  {
    template_key: "payment_success",
    subject_template: "Payment confirmed ({{amountFormatted}} INR) — {{certificateName}}",
    body_template:
      "Hello {{studentName}},\n\nYour payment of {{amountFormatted}} INR for {{certificateName}} has been verified.\nPayment ID: {{paymentId}}\nOrder ID: {{orderId}}\n\nYour certificate issuance workflow is now active.\n\n— Touch Grass Later",
    description: "Sent after server-side signature or webhook verification confirms captured payment.",
    updated_at: "2026-11-13T00:00:00.000Z",
  },
  {
    template_key: "payment_failed",
    subject_template: "Payment unsuccessful — {{certificateName}}",
    body_template:
      "Hello {{studentName}},\n\nYour payment attempt for {{certificateName}} ({{amountFormatted}} INR) did not complete.\nReason: {{reason}}\nOrder ID: {{orderId}}\n\nYour internship participation remains unaffected. You can retry checkout anytime from your dashboard.\n\n— Touch Grass Later",
    description: "Sent when a payment fails or is declined.",
    updated_at: "2026-11-13T00:00:00.000Z",
  },
  {
    template_key: "payment_refunded",
    subject_template: "Refund processed ({{amountFormatted}} INR) — {{certificateName}}",
    body_template:
      "Hello {{studentName}},\n\nA refund of {{amountFormatted}} INR for {{certificateName}} has been processed.\nRefund ID: {{refundId}}\nReason: {{reason}}\n\n— Touch Grass Later",
    description: "Sent when an admin refund or Razorpay refund webhook is processed.",
    updated_at: "2026-11-13T00:00:00.000Z",
  },
  {
    template_key: "certificate_issued",
    subject_template: "Your {{certificateName}} has been issued ({{certificateId}})",
    body_template:
      "Hello {{studentName}},\n\nCongratulations! Your {{certificateName}} for {{achievementTitle}} has been officially issued.\n\nJoined On: {{joinedOn}}\nCompleted On: {{completedOn}}\nCertificate ID: {{certificateId}}\nDownload PDF: {{downloadUrl}}\nPublic verification URL: {{verificationUrl}}\n\n— TGL Learning Portal",
    description: "Sent when all eligibility checks, mentor/admin approvals, and payment verification complete.",
    updated_at: "2026-11-13T00:00:00.000Z",
  },
  {
    template_key: "certificate_ready",
    subject_template: "Ready to download: {{certificateName}} ({{certificateId}})",
    body_template:
      "Hello {{studentName}},\n\nYour {{certificateName}} is ready for download.\n\nJoined On: {{joinedOn}}\nCompleted On: {{completedOn}}\nCertificate ID: {{certificateId}}\nDownload PDF: {{downloadUrl}}\nVerify online: {{verificationUrl}}\n\n— TGL Learning Portal",
    description: "Sent when the downloadable certificate and QR verification link are ready.",
    updated_at: "2026-11-13T00:00:00.000Z",
  },
  {
    template_key: "internship_approved",
    subject_template: "Internship completion approved — {{achievementTitle}}",
    body_template:
      "Hello {{studentName}},\n\nYour mentor has approved your internship completion and project submission for {{achievementTitle}}.\n\nInternship participation is complete. You may optionally request an official Internship Certificate from your workspace.\n\n— Touch Grass Later",
    description: "Sent when a mentor or administrator approves internship completion.",
    updated_at: "2026-11-13T00:00:00.000Z",
  },
  {
    template_key: "internship_eligibility_confirmed",
    subject_template: "INTERNSHIP CERTIFICATE eligibility confirmed",
    body_template:
      "Hello {{studentName}},\n\nYour eligibility for the Touch Grass Later INTERNSHIP CERTIFICATE ({{achievementTitle}}) is confirmed.\n\nYou can review the preview and optional certification fee in your TGL dashboard.\n\n— Touch Grass Later",
    description: "Sent when internship certificate eligibility requirements are satisfied.",
    updated_at: "2026-11-13T00:00:00.000Z",
  },
];

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function interpolateTemplate(template: string, variables: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => variables[key] ?? "");
}

export function renderTglEmail(params: {
  template: EmailTemplateDefinition;
  variables: Record<string, string>;
  isTestMode: boolean;
  isSimulatedTransaction?: boolean;
}): { subject: string; text: string; html: string } {
  const rawSubject = interpolateTemplate(params.template.subject_template, params.variables);
  const rawBody = interpolateTemplate(params.template.body_template, params.variables);

  const testPrefix = params.isTestMode ? "[TEST] " : "";
  const subject = rawSubject.startsWith("[TEST]") ? rawSubject : `${testPrefix}${rawSubject}`;

  const testBannerText = params.isTestMode
    ? "=== TEST MODE EMAIL — NOT A LIVE PRODUCTION TRANSACTION ===\n\n"
    : "";
  const simNoticeText = params.isSimulatedTransaction
    ? "\n[SIMULATED SANDBOX TRANSACTION — NO REAL MONEY WAS CHARGED]\n"
    : "";

  const text = `${testBannerText}${rawBody}${simNoticeText}`;

  const testBannerHtml = params.isTestMode
    ? `<div style="margin-bottom:20px;padding:10px 14px;border:1px solid #b9a9d6;border-radius:8px;background:#1b1824;color:#d9cdee;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;">TEST MODE EMAIL — DEVELOPMENT / SANDBOX PREVIEW</div>`
    : "";
  const simNoticeHtml = params.isSimulatedTransaction
    ? `<p style="margin-top:16px;padding:10px 12px;border:1px solid #333;border-radius:8px;color:#b9a9d6;font-size:12px;">Simulated sandbox transaction: no real payment was processed.</p>`
    : "";

  const paragraphs = rawBody
    .split("\n\n")
    .map((block) => `<p style="margin:0 0 14px;line-height:1.65;color:#d6d4ce;font-size:14px;">${escapeHtml(block).replaceAll("\n", "<br />")}</p>`)
    .join("");

  const html = `<!doctype html>
<html lang="en">
<body style="margin:0;padding:32px 16px;background:#090909;color:#f4f3ef;font-family:Inter,system-ui,-apple-system,sans-serif;">
  <div style="max-width:580px;margin:0 auto;border:1px solid rgba(255,255,255,0.12);border-radius:20px;background:#111111;padding:32px;">
    <p style="margin:0 0 20px;font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:#b9a9d6;">TOUCH GRASS LATER · LEARN. BUILD. GROW.</p>
    ${testBannerHtml}
    <h1 style="margin:0 0 20px;font-size:22px;font-weight:500;letter-spacing:-0.03em;color:#f4f3ef;">${escapeHtml(subject)}</h1>
    ${paragraphs}
    ${simNoticeHtml}
    <hr style="border:none;border-top:1px solid rgba(255,255,255,0.1);margin:24px 0 16px;" />
    <p style="margin:0;font-size:11px;color:rgba(244,243,239,0.45);">Touch Grass Later Certification & Learning Platform</p>
  </div>
</body>
</html>`;

  return { subject, text, html };
}
