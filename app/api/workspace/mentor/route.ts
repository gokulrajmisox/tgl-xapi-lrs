import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminActor } from "@/lib/certifications/store";
import {
  getMentorConsoleData,
  getMentorConsoleDataAsync,
  postMentorMessage,
  reviewLearnerSubmission,
  syncMentorMessageToFirestore,
  syncWorkspaceSubmissionToFirestore,
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

export async function GET(request: Request) {
  const auth = await requireAdminActor(request);
  if (auth.error) {
    return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });
  }
  return NextResponse.json(await getMentorConsoleDataAsync(), {
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(request: Request) {
  const auth = await requireAdminActor(request);
  if (auth.error) {
    return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });
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
    await getMentorConsoleDataAsync();
    const result = reviewLearnerSubmission({
      submissionId: input.submissionId,
      decision: input.decision,
      mentorFeedback: input.mentorFeedback,
      mentorName: input.mentorName,
    });
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }
    if (result.submission) {
      await syncWorkspaceSubmissionToFirestore(result.submission);
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
  await syncMentorMessageToFirestore(message);

  return NextResponse.json({
    message,
    ...getMentorConsoleData(),
  });
}
