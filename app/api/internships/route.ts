import { NextResponse } from "next/server";
import { z } from "zod";
import {
  applyForInternship,
  listInternships,
  listStudentApplications,
  resolveCurrentActor,
  submitInternshipWork,
} from "@/lib/certifications/store";

const ApplySchema = z.object({
  action: z.literal("apply"),
  internshipId: z.string().uuid(),
  applicantName: z.string().trim().min(2).max(120),
  applicantEmail: z.string().trim().email().max(180),
  motivation: z.string().trim().min(10).max(2000),
  portfolioUrl: z.string().trim().url().optional().or(z.literal("")),
});

const SubmitWorkSchema = z.object({
  action: z.literal("submit"),
  applicationId: z.string().uuid(),
  submissionUrl: z.string().trim().url().max(500),
  submissionSummary: z.string().trim().min(10).max(2000),
});

export async function GET() {
  const [internships, actor] = await Promise.all([
    listInternships(),
    resolveCurrentActor(),
  ]);
  const applications = actor.user ? await listStudentApplications(actor.user.id) : [];
  return NextResponse.json(
    { internships, applications, user: actor.user },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request) {
  const actor = await resolveCurrentActor();
  if (!actor.user) {
    return NextResponse.json({ error: "Sign in required to apply or submit work." }, { status: 401 });
  }

  const raw = await request.json().catch(() => null);
  if (!raw || typeof raw !== "object") {
    return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
  }

  if ((raw as { action?: string }).action === "submit") {
    const parsed = SubmitWorkSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: "Please provide a valid project URL and work summary." }, { status: 400 });
    }
    const result = await submitInternshipWork({
      userId: actor.user.id,
      applicationId: parsed.data.applicationId,
      submissionUrl: parsed.data.submissionUrl,
      submissionSummary: parsed.data.submissionSummary,
    });
    if (result.error) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({ application: result.application }, { status: 200 });
  }

  const parsed = ApplySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Please complete all required application fields." }, { status: 400 });
  }

  const result = await applyForInternship({
    userId: actor.user.id,
    internshipId: parsed.data.internshipId,
    applicantName: parsed.data.applicantName,
    applicantEmail: parsed.data.applicantEmail,
    motivation: parsed.data.motivation,
    portfolioUrl: parsed.data.portfolioUrl || undefined,
  });
  if (result.error) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ application: result.application }, { status: 201 });
}
