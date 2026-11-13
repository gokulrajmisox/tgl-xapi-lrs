import { NextResponse } from "next/server";
import { z } from "zod";
import {
  listEmailTemplates,
  requireAdminActor,
  updateEmailTemplate,
} from "@/lib/certifications/store";

const TemplateSchema = z.object({
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
  subjectTemplate: z.string().trim().min(3).max(200),
  bodyTemplate: z.string().trim().min(10).max(4000),
});

export async function GET() {
  const auth = await requireAdminActor();
  if (auth.error) return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });

  const templates = await listEmailTemplates();
  return NextResponse.json({ templates }, { headers: { "Cache-Control": "no-store" } });
}

export async function PUT(request: Request) {
  const auth = await requireAdminActor();
  if (auth.error) return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });

  const parsed = TemplateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email template payload." }, { status: 400 });
  }

  const template = await updateEmailTemplate(parsed.data);
  return NextResponse.json({ template }, { status: 200 });
}
