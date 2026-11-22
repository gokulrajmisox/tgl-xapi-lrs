import { NextResponse } from "next/server";
import { z } from "zod";
import {
  applyForInternship,
  listInternships,
  listStudentApplications,
  resolveCurrentActor,
  submitInternshipTaskWork,
  submitInternshipWork,
} from "@/lib/certifications/store";
import { listCoursesCatalog } from "@/lib/courses/store";
import { findProjectBySlug } from "@/lib/learning-graph";
import { getProjectStatusForUser } from "@/lib/learning-workspace-store";
import { evaluateInternshipEligibility } from "@/lib/internships/eligibility";

const ApplySchema = z.object({
  action: z.literal("apply"),
  internshipId: z.string().uuid(),
  applicantName: z.string().trim().min(2).max(120).optional(),
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

const SubmitTaskSchema = z.object({
  action: z.literal("submit_task"),
  applicationId: z.string().uuid(),
  taskId: z.string().trim().min(2).max(120),
  submissionUrl: z.string().trim().url("Provide a valid repository or deliverable URL").max(500),
  summary: z.string().trim().min(8, "Include a clear summary of your task deliverable").max(2000),
});

export async function GET(request: Request) {
  const [internships, actor] = await Promise.all([
    listInternships(),
    resolveCurrentActor({ request }),
  ]);
  const [applications, courses] = await Promise.all([
    actor.user ? listStudentApplications(actor.user.id) : Promise.resolve([]),
    listCoursesCatalog(actor.user?.id ?? null),
  ]);

  const eligibilityByInternshipId: Record<string, ReturnType<typeof evaluateInternshipEligibility>> = {};
  for (const track of internships) {
    const course = track.required_course_slug
      ? courses.find((c) => c.slug === track.required_course_slug)
      : undefined;
    const projectBrief = track.required_project_slug
      ? findProjectBySlug(track.required_project_slug)
      : undefined;
    const projectStatus =
      actor.user && track.required_project_slug
        ? getProjectStatusForUser(actor.user.id, track.required_project_slug)
        : "not_started";
    eligibilityByInternshipId[track.id] = evaluateInternshipEligibility({
      requiredCourseSlug: track.required_course_slug ?? null,
      requiredProjectSlug: track.required_project_slug ?? null,
      requiredCourseTitle: course?.title ?? null,
      requiredProjectTitle: projectBrief?.title ?? course?.projectTitle ?? null,
      requiredSkills: course?.skills ?? [],
      requireProjectApproval: Boolean(track.require_project_approval),
      courseEnrolled: Boolean(course?.enrolled),
      quizPassed: Boolean(course?.quizPassed),
      projectApproved: projectStatus === "approved",
    });
  }

  return NextResponse.json(
    { internships, applications, eligibilityByInternshipId, user: actor.user },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request) {
  const actor = await resolveCurrentActor({ request });
  if (!actor.user) {
    return NextResponse.json({ error: "Sign in required to apply or submit work." }, { status: 401 });
  }

  const raw = await request.json().catch(() => null);
  if (!raw || typeof raw !== "object") {
    return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
  }

  const action = (raw as { action?: string }).action;

  if (action === "submit_task") {
    const parsed = SubmitTaskSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Provide a valid task URL and summary." },
        { status: 400 },
      );
    }

    if (actor.user.role !== "admin") {
      const [internships, applications, courses] = await Promise.all([
        listInternships(),
        listStudentApplications(actor.user.id),
        listCoursesCatalog(actor.user.id),
      ]);
      const app = applications.find((a) => a.id === parsed.data.applicationId);
      const track = app ? internships.find((i) => i.id === app.internship_id) : null;
      if (track && track.required_course_slug) {
        const matchedCourse = courses.find((c) => c.slug === track.required_course_slug);
        const lessonsDone = matchedCourse
          ? matchedCourse.lessonCount > 0 &&
            matchedCourse.completedLessonCount >= matchedCourse.lessonCount
          : true;
        const quizPassed = Boolean(matchedCourse?.quizPassed);
        const projectStatus = track.required_project_slug
          ? getProjectStatusForUser(actor.user.id, track.required_project_slug)
          : "not_started";
        const projectApproved = !track.require_project_approval || projectStatus === "approved";
        if (!matchedCourse?.enrolled || !lessonsDone || !quizPassed || !projectApproved) {
          return NextResponse.json(
            {
              error:
                "Complete your linked programme modules, graded quiz, and receive mentor project approval before submitting internship tasks.",
            },
            { status: 403 },
          );
        }
      }
    }

    const result = await submitInternshipTaskWork({
      userId: actor.user.id,
      applicationId: parsed.data.applicationId,
      taskId: parsed.data.taskId,
      submissionUrl: parsed.data.submissionUrl,
      summary: parsed.data.summary,
    });
    if (result.error) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({ application: result.application }, { status: 200 });
  }

  if (action === "submit") {
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

  const [internships, courses] = await Promise.all([
    listInternships(),
    listCoursesCatalog(actor.user.id),
  ]);
  const targetTrack = internships.find((t) => t.id === parsed.data.internshipId);
  if (!targetTrack) {
    return NextResponse.json({ error: "Internship track not found." }, { status: 404 });
  }

  const matchedCourse = targetTrack.required_course_slug
    ? courses.find((c) => c.slug === targetTrack.required_course_slug)
    : undefined;
  const matchedProject = targetTrack.required_project_slug
    ? findProjectBySlug(targetTrack.required_project_slug)
    : undefined;
  const projectStatus = targetTrack.required_project_slug
    ? getProjectStatusForUser(actor.user.id, targetTrack.required_project_slug)
    : "not_started";
  const eligibility = evaluateInternshipEligibility({
    requiredCourseSlug: targetTrack.required_course_slug ?? null,
    requiredProjectSlug: targetTrack.required_project_slug ?? null,
    requiredCourseTitle: matchedCourse?.title ?? null,
    requiredProjectTitle: matchedProject?.title ?? matchedCourse?.projectTitle ?? null,
    requiredSkills: matchedCourse?.skills ?? [],
    requireProjectApproval: Boolean(targetTrack.require_project_approval),
    courseEnrolled: Boolean(matchedCourse?.enrolled),
    quizPassed: Boolean(matchedCourse?.quizPassed),
    projectApproved: projectStatus === "approved",
  });

  if (!eligibility.eligible) {
    return NextResponse.json(
      {
        error: `Prerequisites not yet met: ${eligibility.missingRequirements.join("; ")}.`,
        eligibility,
      },
      { status: 403 },
    );
  }

  const applicantName = parsed.data.applicantName?.trim() || actor.user.name.trim();
  if (!applicantName) {
    return NextResponse.json(
      { error: "Please provide your full name before applying so it can appear on your learner record." },
      { status: 422 },
    );
  }

  const result = await applyForInternship({
    userId: actor.user.id,
    internshipId: parsed.data.internshipId,
    applicantName,
    applicantEmail: parsed.data.applicantEmail,
    motivation: parsed.data.motivation,
    portfolioUrl: parsed.data.portfolioUrl || undefined,
  });
  if (result.error) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ application: result.application }, { status: 201 });
}
