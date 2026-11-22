import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminActor } from "@/lib/certifications/store";
import {
  discardAdminCourseDraft,
  getAdminCourseStudioDetail,
  publishAdminCourseDraft,
  reorderAdminLessons,
  reorderAdminModules,
  updateAdminCourseCurriculumMeta,
  upsertAdminLesson,
  upsertAdminModule,
  upsertAdminQuizOrAssignment,
  deleteAdminLesson,
  deleteAdminModule,
} from "@/lib/courses/admin-content";
import { getCourseDetailForActor } from "@/lib/courses/store";

const QuizQuestionSchema = z.object({
  id: z.string().trim().min(1),
  prompt: z.string().trim().min(5),
  options: z.array(z.string().trim().min(1)).min(2).max(6),
  correctIndex: z.number().int().min(0).max(5),
  explanation: z.string().trim().min(4),
  questionType: z.enum(["conceptual", "code", "scenario"]).optional(),
});

const QuizSchema = z.object({
  id: z.string().trim().min(1),
  title: z.string().trim().min(3),
  passingScorePercent: z.number().int().min(40).max(100),
  questions: z.array(QuizQuestionSchema).min(1),
});

const AdminStudioPostSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("update_meta"),
    courseId: z.string().trim().min(2),
    prerequisites: z.array(z.string()).optional(),
    outcomes: z.array(z.string()).optional(),
    project: z
      .object({
        title: z.string().trim().min(3).optional(),
        summary: z.string().trim().min(5).optional(),
        brief: z.string().trim().min(10).optional(),
        problemStatement: z.string().trim().optional(),
        useCase: z.string().trim().optional(),
        technologies: z.array(z.string()).optional(),
        rubric: z.array(z.string()).optional(),
        structuredRubric: z
          .array(
            z.object({
              criterion: z.string().trim().min(2),
              weightPercent: z.number().int().min(5).max(100),
              expectation: z.string().trim().min(4),
            }),
          )
          .optional(),
        submissionInstructions: z.array(z.string()).optional(),
      })
      .optional(),
  }),
  z.object({
    action: z.literal("upsert_module"),
    courseId: z.string().trim().min(2),
    moduleId: z.string().trim().optional(),
    title: z.string().trim().min(3).max(160),
    summary: z.string().trim().min(5).max(400),
    estimatedMinutes: z.number().int().min(5).max(600).default(45),
    isDraft: z.boolean().optional(),
    skills: z.array(z.string().trim().min(2).max(80)).max(12).optional(),
    learningOutcomes: z.array(z.string()).optional(),
    moduleQuiz: QuizSchema.optional(),
  }),
  z.object({
    action: z.literal("reorder_modules"),
    courseId: z.string().trim().min(2),
    moduleId: z.string().trim().min(2),
    direction: z.enum(["up", "down"]),
  }),
  z.object({
    action: z.literal("delete_module"),
    courseId: z.string().trim().min(2),
    moduleId: z.string().trim().min(2),
  }),
  z.object({
    action: z.literal("upsert_lesson"),
    courseId: z.string().trim().min(2),
    moduleId: z.string().trim().min(2),
    lessonId: z.string().trim().optional(),
    title: z.string().trim().min(3).max(160),
    lessonType: z.enum(["note", "video", "project_milestone"]),
    durationLabel: z.string().trim().min(2).max(40),
    summary: z.string().trim().min(5).max(400),
    isDraft: z.boolean().optional(),
    skills: z.array(z.string().trim().min(2).max(80)).max(12).optional(),
    learningObjectives: z.array(z.string()).optional(),
    realWorldContext: z.string().optional(),
    noteHeading: z.string().optional(),
    noteBody: z.string().optional(),
    codeSnippet: z.string().optional(),
    takeaway: z.string().optional(),
    youtubeUrl: z.string().optional(),
    videoCreator: z.string().optional(),
    practicalExercise: z
      .object({
        title: z.string().trim().min(3),
        difficulty: z.enum(["Guided", "Applied", "Challenge"]).optional(),
        estimatedMinutes: z.number().int().min(5).max(180).default(20),
        objective: z.string().trim().min(5),
        instructions: z.array(z.string().trim().min(3)).min(1),
        starterCode: z.string().optional(),
        sampleData: z.string().optional(),
        expectedOutput: z.string().trim().min(3),
        hints: z.array(z.string()).default([]),
        solutionOutline: z.string().optional(),
      })
      .optional(),
    knowledgeCheck: z
      .object({
        question: z.string().trim().min(5),
        options: z.array(z.string().trim().min(1)).min(2).max(5),
        correctIndex: z.number().int().min(0).max(4),
        explanation: z.string().trim().min(4),
      })
      .optional(),
    resources: z
      .array(
        z.object({
          id: z.string().trim().min(1),
          title: z.string().trim().min(2),
          provider: z.string().trim().min(2),
          url: z.string().trim().url(),
        }),
      )
      .optional(),
    attachments: z
      .array(
        z.object({
          id: z.string().trim().min(1),
          title: z.string().trim().min(2),
          fileType: z.enum(["pdf", "dataset", "starter"]),
          url: z.string().trim().min(1),
          sizeLabel: z.string().optional(),
        }),
      )
      .optional(),
  }),
  z.object({
    action: z.literal("reorder_lessons"),
    courseId: z.string().trim().min(2),
    moduleId: z.string().trim().min(2),
    lessonId: z.string().trim().min(2),
    direction: z.enum(["up", "down"]),
  }),
  z.object({
    action: z.literal("delete_lesson"),
    courseId: z.string().trim().min(2),
    moduleId: z.string().trim().min(2),
    lessonId: z.string().trim().min(2),
  }),
  z.object({
    action: z.literal("upsert_extras"),
    courseId: z.string().trim().min(2),
    finalQuiz: QuizSchema.optional(),
    assignments: z
      .array(
        z.object({
          id: z.string().trim().min(1),
          title: z.string().trim().min(3),
          prompt: z.string().trim().min(10),
          deliverableHint: z.string().trim().min(3),
          estimatedMinutes: z.number().int().min(5).max(240),
        }),
      )
      .optional(),
  }),
  z.object({
    action: z.literal("publish_draft"),
    courseId: z.string().trim().min(2),
  }),
  z.object({
    action: z.literal("discard_draft"),
    courseId: z.string().trim().min(2),
  }),
]);

export async function GET(request: Request) {
  const auth = await requireAdminActor(request);
  if (auth.error || !auth.user) {
    return NextResponse.json(
      { error: auth.error?.message ?? "Administrator access required." },
      { status: auth.error?.status ?? 403 },
    );
  }
  const actorUser = auth.user;

  const { searchParams } = new URL(request.url);
  const courseId = searchParams.get("courseId");
  const mode = searchParams.get("mode");
  if (!courseId) {
    return NextResponse.json({ error: "courseId query param is required." }, { status: 400 });
  }

  if (mode === "preview_student") {
    const previewDetail = await getCourseDetailForActor({
      slug: courseId,
      userId: actorUser.id,
      bypassLockForAdmin: true,
      previewDraft: true,
    });
    if (!previewDetail) {
      return NextResponse.json({ error: "Programme not found." }, { status: 404 });
    }
    return NextResponse.json({ preview: previewDetail }, { headers: { "Cache-Control": "no-store" } });
  }

  const studio = await getAdminCourseStudioDetail(courseId);
  if (!studio) {
    return NextResponse.json({ error: "Programme not found." }, { status: 404 });
  }
  return NextResponse.json({ studio }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const auth = await requireAdminActor(request);
  if (auth.error || !auth.user) {
    return NextResponse.json(
      { error: auth.error?.message ?? "Administrator access required." },
      { status: auth.error?.status ?? 403 },
    );
  }

  const parsed = AdminStudioPostSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid course studio payload." },
      { status: 400 },
    );
  }

  const body = parsed.data;
  let result: { studio?: unknown; error?: string; moduleId?: string; lessonId?: string };

  switch (body.action) {
    case "update_meta":
      result = await updateAdminCourseCurriculumMeta(body);
      break;
    case "upsert_module":
      result = await upsertAdminModule(body);
      break;
    case "reorder_modules":
      result = await reorderAdminModules(body);
      break;
    case "delete_module":
      result = await deleteAdminModule(body);
      break;
    case "upsert_lesson":
      result = await upsertAdminLesson(body);
      break;
    case "reorder_lessons":
      result = await reorderAdminLessons(body);
      break;
    case "delete_lesson":
      result = await deleteAdminLesson(body);
      break;
    case "upsert_extras":
      result = await upsertAdminQuizOrAssignment(body);
      break;
    case "publish_draft":
      result = await publishAdminCourseDraft(body.courseId);
      break;
    case "discard_draft":
      result = await discardAdminCourseDraft(body.courseId);
      break;
  }

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}
