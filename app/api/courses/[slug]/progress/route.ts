import { NextResponse } from "next/server";
import { z } from "zod";
import { resolveCurrentActor } from "@/lib/certifications/store";
import {
  submitCourseAssignment,
  submitCourseQuiz,
  updateCourseLessonProgress,
} from "@/lib/courses/store";

const ProgressBodySchema = z.union([
  z.object({
    action: z.literal("lesson").optional(),
    lessonId: z.string().trim().min(2).max(120),
    status: z.enum(["not_started", "in_progress", "completed"]),
  }),
  z.object({
    action: z.literal("submit_assignment"),
    assignmentId: z.string().trim().min(2).max(120),
    submissionText: z.string().trim().min(10, "Write at least 10 characters for your assignment").max(4000),
    artifactUrl: z.string().trim().url("Provide a valid URL").optional().or(z.literal("")),
  }),
  z.object({
    action: z.literal("submit_quiz"),
    answers: z.record(z.string(), z.number().int().min(0).max(10)),
  }),
]);

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const actor = await resolveCurrentActor();
  if (!actor.user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const parsed = ProgressBodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid course activity payload." },
      { status: 400 },
    );
  }

  const { slug } = await params;
  const body = parsed.data;

  if ("action" in body && body.action === "submit_assignment") {
    const result = await submitCourseAssignment({
      userId: actor.user.id,
      courseSlug: slug,
      assignmentId: body.assignmentId,
      submissionText: body.submissionText,
      artifactUrl: body.artifactUrl || null,
    });
    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: result.statusCode ?? 400 },
      );
    }
    return NextResponse.json(
      { assignmentSubmissions: result.submissions },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  if ("action" in body && body.action === "submit_quiz") {
    const result = await submitCourseQuiz({
      userId: actor.user.id,
      courseSlug: slug,
      answers: body.answers,
    });
    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: result.statusCode ?? 400 },
      );
    }
    return NextResponse.json(
      {
        attempt: result.attempt,
        summary: result.summary,
        explanations: result.explanations,
        internshipEligibility: result.internshipEligibility,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  const result = await updateCourseLessonProgress({
    userId: actor.user.id,
    courseSlug: slug,
    lessonId: body.lessonId,
    status: body.status,
  });

  if (result.error) {
    return NextResponse.json(
      { error: result.error },
      { status: result.statusCode ?? 400 },
    );
  }

  return NextResponse.json(
    {
      progress: result.progress,
      summary: result.summary,
      internshipEligibility: result.internshipEligibility,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
