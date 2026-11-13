import { NextResponse } from "next/server";
import { z } from "zod";
import { getEmailConfig } from "@/lib/email/provider";
import { renderTglEmail } from "@/lib/email/templates";
import {
  listEmailLogs,
  listEmailTemplates,
  requireAdminActor,
  sendAndLogLifecycleEmail,
} from "@/lib/certifications/store";

const TestEmailSchema = z.object({
  recipientEmail: z.string().trim().email(),
  templateKey: z.enum([
    "purchase_initiated",
    "payment_success",
    "payment_failed",
    "payment_refunded",
    "certificate_issued",
    "certificate_ready",
    "internship_approved",
    "internship_eligibility_confirmed",
  ]),
  studentName: z.string().trim().min(1).max(120).default("Aarav Sharma"),
  certificateName: z.string().trim().min(1).max(120).default("Internship Certificate"),
  achievementTitle: z.string().trim().min(1).max(160).default("Full-Stack Product Engineering Internship"),
  amountFormatted: z.string().trim().min(1).max(30).default("₹499"),
  simulateFailure: z.boolean().optional(),
  previewOnly: z.boolean().optional(),
});

export async function GET() {
  const auth = await requireAdminActor();
  if (auth.error) return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });

  const [logs, templates] = await Promise.all([listEmailLogs(), listEmailTemplates()]);
  return NextResponse.json(
    {
      config: getEmailConfig(),
      logs,
      templates,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request) {
  const auth = await requireAdminActor();
  if (auth.error) return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });

  const parsed = TestEmailSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Provide a valid recipient email and template selection." }, { status: 400 });
  }

  const d = parsed.data;
  const origin = new URL(request.url).origin;
  const variables = {
    studentName: d.studentName,
    certificateName: d.certificateName,
    achievementTitle: d.achievementTitle,
    amountFormatted: d.amountFormatted,
    orderId: "order_test_990011",
    paymentId: "pay_test_778899",
    refundId: "rfnd_test_112233",
    reason: "Test notification check",
    certificateId: "TGL-CERT-2026-8419",
    verificationUrl: `${origin}/verify/certificate/TGL-CERT-2026-8419`,
  };

  if (d.previewOnly) {
    const templates = await listEmailTemplates();
    const template = templates.find((t) => t.template_key === d.templateKey) ?? templates[0];
    const rendered = renderTglEmail({
      template,
      variables,
      isTestMode: true,
      isSimulatedTransaction: false,
    });
    return NextResponse.json({ preview: rendered });
  }

  const record = await sendAndLogLifecycleEmail({
    recipientEmail: d.recipientEmail,
    templateKey: d.templateKey,
    variables,
    forceFailure: d.simulateFailure,
  });

  const logs = await listEmailLogs();
  return NextResponse.json({ record, logs }, { status: record.delivery_status === "failed" ? 502 : 200 });
}
