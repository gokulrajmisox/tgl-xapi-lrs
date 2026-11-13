import { DEFAULT_EMAIL_TEMPLATES, renderTglEmail, type EmailTemplateDefinition, type EmailTemplateKey } from "./templates";

export type EmailProviderName = "resend" | "webhook" | "console";

export type EmailConfig = {
  provider: EmailProviderName;
  configured: boolean;
  from: string;
  testMode: boolean;
  testRecipient: string | null;
};

export type EmailDeliveryRecord = {
  id: string;
  recipient_email: string;
  template_key: EmailTemplateKey;
  subject: string;
  is_test: boolean;
  provider: string;
  delivery_status: "queued" | "sent" | "simulated_test" | "failed";
  provider_message_id: string | null;
  error_message: string | null;
  attempt_count: number;
  metadata: Record<string, unknown>;
  created_at: string;
};

export function getEmailConfig(): EmailConfig {
  const rawProvider = (process.env.EMAIL_PROVIDER?.trim().toLowerCase() || "console") as EmailProviderName;
  const provider: EmailProviderName = rawProvider === "resend" || rawProvider === "webhook" ? rawProvider : "console";
  const hasApiKey = Boolean(process.env.EMAIL_API_KEY?.trim());
  const testMode =
    process.env.EMAIL_TEST_MODE === "true" ||
    process.env.NODE_ENV !== "production";

  return {
    provider,
    configured: provider === "console" ? false : hasApiKey,
    from: process.env.EMAIL_FROM?.trim() || "Touch Grass Later <no-reply@touchgrasslater.org>",
    testMode,
    testRecipient: process.env.EMAIL_TEST_RECIPIENT?.trim() || null,
  };
}

export type DispatchEmailInput = {
  recipientEmail: string;
  templateKey: EmailTemplateKey;
  variables: Record<string, string>;
  templateOverride?: EmailTemplateDefinition;
  isSimulatedTransaction?: boolean;
  forceFailure?: boolean;
  maxRetries?: number;
  transportOverride?: (payload: {
    to: string;
    from: string;
    subject: string;
    html: string;
    text: string;
  }) => Promise<{ messageId: string }>;
};

export type DispatchEmailResult = {
  record: EmailDeliveryRecord;
  rendered: { subject: string; text: string; html: string };
};

export async function dispatchLifecycleEmail(input: DispatchEmailInput): Promise<DispatchEmailResult> {
  const config = getEmailConfig();
  const template =
    input.templateOverride ??
    DEFAULT_EMAIL_TEMPLATES.find((item) => item.template_key === input.templateKey) ??
    DEFAULT_EMAIL_TEMPLATES[0];

  const isTest = config.testMode || Boolean(input.isSimulatedTransaction);
  const effectiveRecipient =
    config.testMode && config.testRecipient && !input.recipientEmail
      ? config.testRecipient
      : input.recipientEmail;

  const rendered = renderTglEmail({
    template,
    variables: input.variables,
    isTestMode: isTest,
    isSimulatedTransaction: input.isSimulatedTransaction,
  });

  // Safety rule: Do NOT send real external payment confirmations for simulated transactions.
  if (input.isSimulatedTransaction && !input.transportOverride && !input.forceFailure) {
    const record: EmailDeliveryRecord = {
      id: `eml_${crypto.randomUUID()}`,
      recipient_email: effectiveRecipient,
      template_key: input.templateKey,
      subject: rendered.subject,
      is_test: true,
      provider: `${config.provider} (simulated-suppressed)`,
      delivery_status: "simulated_test",
      provider_message_id: null,
      error_message: null,
      attempt_count: 1,
      metadata: {
        note: "External email dispatch suppressed for simulated transaction; preview logged.",
      },
      created_at: new Date().toISOString(),
    };
    return { record, rendered };
  }

  const maxAttempts = Math.max(1, input.maxRetries ?? 2);
  let attempt = 0;
  let lastError = "";
  let messageId: string | null = null;
  let status: EmailDeliveryRecord["delivery_status"] = "failed";

  while (attempt < maxAttempts) {
    attempt += 1;
    try {
      if (input.forceFailure) {
        throw new Error("Simulated email provider failure (forced for diagnostics).");
      }

      if (input.transportOverride) {
        const res = await input.transportOverride({
          to: effectiveRecipient,
          from: config.from,
          subject: rendered.subject,
          html: rendered.html,
          text: rendered.text,
        });
        messageId = res.messageId;
        status = "sent";
        break;
      }

      if (config.provider === "resend") {
        const apiKey = process.env.EMAIL_API_KEY?.trim();
        if (!apiKey) {
          throw new Error("EMAIL_API_KEY is required when EMAIL_PROVIDER=resend.");
        }
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: config.from,
            to: [effectiveRecipient],
            subject: rendered.subject,
            html: rendered.html,
            text: rendered.text,
          }),
        });
        if (!response.ok) {
          const detail = await response.text().catch(() => "Resend API error");
          throw new Error(`Resend HTTP ${response.status}: ${detail}`);
        }
        const body = (await response.json()) as { id?: string };
        messageId = body.id ?? `resend_${Date.now()}`;
        status = "sent";
        break;
      }

      if (config.provider === "webhook") {
        const webhookUrl = process.env.EMAIL_WEBHOOK_URL?.trim();
        const apiKey = process.env.EMAIL_API_KEY?.trim();
        if (!webhookUrl) {
          throw new Error("EMAIL_WEBHOOK_URL is required when EMAIL_PROVIDER=webhook.");
        }
        const response = await fetch(webhookUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
          },
          body: JSON.stringify({
            from: config.from,
            to: effectiveRecipient,
            subject: rendered.subject,
            html: rendered.html,
            text: rendered.text,
            isTest,
          }),
        });
        if (!response.ok) {
          throw new Error(`Email webhook HTTP ${response.status}`);
        }
        messageId = `wh_${Date.now()}`;
        status = "sent";
        break;
      }

      // Console / local sandbox transport when no external provider key is configured
      console.info(`[TGL EMAIL TEST LOG] To: ${effectiveRecipient} | Subject: ${rendered.subject}`);
      messageId = `sandbox_${Date.now()}`;
      status = "simulated_test";
      break;
    } catch (error) {
      lastError = error instanceof Error ? error.message : "Unknown email delivery error";
      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 25 * attempt));
      }
    }
  }

  const record: EmailDeliveryRecord = {
    id: `eml_${crypto.randomUUID()}`,
    recipient_email: effectiveRecipient,
    template_key: input.templateKey,
    subject: rendered.subject,
    is_test: isTest,
    provider: config.provider,
    delivery_status: status,
    provider_message_id: messageId,
    error_message: status === "failed" ? lastError : null,
    attempt_count: attempt,
    metadata: { from: config.from },
    created_at: new Date().toISOString(),
  };

  return { record, rendered };
}
