import { NextResponse } from "next/server";
import { z } from "zod";
import { resolveCurrentActor } from "@/lib/certifications/store";
import {
  completeLessonPracticalExercise,
  recordLastVisitedLesson,
  submitCourseAssignment,
  submitCourseQuiz,
  submitLessonKnowledgeCheck,
  submitModuleQuiz,
  updateCourseLessonProgress,
} from "@/lib/courses/store";

const ProgressBodySchema = z.union([
  z.object({
    action: z.literal("lesson").optional(),
    lessonId: z.string().trim().min(2).max(120),
    status: z.enum(["not_started", "in_progress", "completed"]),
    readingProgressPercent: z.number().int().min(0).max(100).optional(),
  }),
  z.object({
    action: z.literal("visit_lesson"),
    lessonId: z.string().trim().min(2).max(120),
  }),
  z.object({
    action: z.literal("mark_exercise"),
    lessonId: z.string().trim().min(2).max(120),
    completed: z.boolean().default(true),
  }),
  z.object({
    action: z.literal("submit_knowledge_check"),
    lessonId: z.string().trim().min(2).max(120),
    selectedIndex: z.number().int().min(0).max(10),
  }),
  z.object({
    action: z.literal("submit_module_quiz"),
    moduleId: z.string().trim().min(2).max(120),
    answers: z.record(z.string(), z.number().int().min(0).max(10)),
  }),
  z.object({
    action: z.literal("submit_assignment"),
    assignmentId: z.string().trim().min(2).max(120),
    submissionText: z
      .string()
      .trim()
      .min(10, "Write at least 10 characters for your assignment")
      .max(4000),
    artifactUrl: z
      .string()
      .trim()
      .url("Provide a valid URL")
      .optional()
      .or(z.literal("")),
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
  const actor = await resolveCurrentActor({ request });
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

  if ("action" in body && body.action === "visit_lesson") {
    const res = await recordLastVisitedLesson({
      userId: actor.user.id,
      courseSlug: slug,
      lessonId: body.lessonId,
    });
    if (res.error) {
      return NextResponse.json({ error: res.error }, { status: res.statusCode ?? 400 });
    }
    return NextResponse.json(res, { headers: { "Cache-Control": "no-store" } });
  }

  if ("action" in body && body.action === "mark_exercise") {
    const res = await completeLessonPracticalExercise({
      userId: actor.user.id,
      courseSlug: slug,
      lessonId: body.lessonId,
      completed: body.completed,
    });
    if (res.error) {
      return NextResponse.json({ error: res.error }, { status: res.statusCode ?? 400 });
    }
    return NextResponse.json(res, { headers: { "Cache-Control": "no-store" } });
  }

  if ("action" in body && body.action === "submit_knowledge_check") {
    const res = await submitLessonKnowledgeCheck({
      userId: actor.user.id,
      courseSlug: slug,
      lessonId: body.lessonId,
      selectedIndex: body.selectedIndex,
    });
    if (res.error) {
      return NextResponse.json({ error: res.error }, { status: res.statusCode ?? 400 });
    }
    return NextResponse.json(res, { headers: { "Cache-Control": "no-store" } });
  }

  if ("action" in body && body.action === "submit_module_quiz") {
    const res = await submitModuleQuiz({
      userId: actor.user.id,
      courseSlug: slug,
      moduleId: body.moduleId,
      answers: body.answers,
    });
    if (res.error) {
      return NextResponse.json({ error: res.error }, { status: res.statusCode ?? 400 });
    }
    return NextResponse.json(res, { headers: { "Cache-Control": "no-store" } });
  }

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
    readingProgressPercent: body.readingProgressPercent,
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
