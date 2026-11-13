import { NextResponse } from "next/server";
import { z } from "zod";
import { isSupabaseConfigured, resolveCurrentActor } from "@/lib/certifications/store";
import {
  getMentorConsoleData,
  postMentorMessage,
  reviewLearnerSubmission,
} from "@/lib/learning-workspace-store";

const MentorActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("review_submission"),
    submissionId: z.string().min(1),
    decision: z.enum(["under_review", "approved", "revision_required", "needs_revision"]),
    mentorFeedback: z.string().trim().min(5, "Provide constructive mentor feedback").max(1500),
    mentorName: z.string().trim().min(2).max(80).default("Kabir Malhotra"),
  }),
  z.object({
    action: z.literal("reply_thread"),
    userId: z.string().min(1),
    learnerName: z.string().min(1),
    projectSlug: z.string().nullable().optional(),
    nodeId: z.string().nullable().optional(),
    topic: z.string().trim().min(2).max(160),
    body: z.string().trim().min(3, "Reply cannot be empty").max(1500),
    mentorName: z.string().trim().min(2).max(80).default("Kabir Malhotra"),
  }),
]);

async function checkMentorAccess() {
  const configured = isSupabaseConfigured();
  const { user } = await resolveCurrentActor({ allowSandboxAdmin: !configured });
  if (configured && !user) {
    return { allowed: false, status: 401, error: "Sign in required." };
  }
  if (configured && user?.role !== "admin") {
    return { allowed: false, status: 403, error: "Mentor or administrator claim required." };
  }
  return { allowed: true, user };
}

export async function GET() {
  const access = await checkMentorAccess();
  if (!access.allowed) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  return NextResponse.json(getMentorConsoleData());
}

export async function POST(request: Request) {
  const access = await checkMentorAccess();
  if (!access.allowed) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const parsed = MentorActionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid mentor request." },
      { status: 400 },
    );
  }

  const input = parsed.data;
  if (input.action === "review_submission") {
    const result = reviewLearnerSubmission({
      submissionId: input.submissionId,
      decision: input.decision,
      mentorFeedback: input.mentorFeedback,
      mentorName: input.mentorName,
    });
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }
    return NextResponse.json({
      submission: result.submission,
      ...getMentorConsoleData(),
    });
  }

  const message = postMentorMessage({
    userId: input.userId,
    learnerName: input.learnerName,
    projectSlug: input.projectSlug ?? null,
    nodeId: input.nodeId ?? null,
    topic: input.topic,
    authorRole: "mentor",
    authorName: input.mentorName,
    body: input.body,
  });

  return NextResponse.json({
    message,
    ...getMentorConsoleData(),
  });
}
