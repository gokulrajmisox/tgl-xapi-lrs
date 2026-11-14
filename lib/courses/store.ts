import { randomUUID } from "node:crypto";
import {
  DEMO_STUDENT_ID,
  isSupabaseConfigured,
  serviceClient,
} from "@/lib/supabase/service";
import {
  DEFAULT_COMPLETION_REQUIREMENTS,
  SEED_COURSES,
  type CourseDefinition,
  type CourseModule,
  type CourseProjectDefinition,
} from "./catalog";
import {
  getCourseExtras,
  type CourseAnnouncement,
  type CourseAssignment,
  type CourseQuiz,
} from "./curriculum-extras";
import { validateCoursePricePaise } from "./pricing";
import { getProjectStatusForUser } from "@/lib/learning-workspace-store";

export type CourseEnrollmentStatus = "active" | "refunded";
export type LessonProgressStatus = "not_started" | "in_progress" | "completed";

export type CourseEnrollmentRecord = {
  id: string;
  userId: string;
  courseId: string;
  paymentId: string | null;
  status: CourseEnrollmentStatus;
  enrolledAt: string;
  updatedAt: string;
};

export type CourseLessonProgressRecord = {
  userId: string;
  courseId: string;
  lessonId: string;
  status: LessonProgressStatus;
  completedAt: string | null;
  updatedAt: string;
};

export type CourseAssignmentSubmissionRecord = {
  id: string;
  userId: string;
  courseId: string;
  assignmentId: string;
  submissionText: string;
  artifactUrl: string | null;
  status: "submitted" | "reviewed";
  mentorFeedback: string | null;
  submittedAt: string;
};

export type CourseQuizAttemptRecord = {
  id: string;
  userId: string;
  courseId: string;
  quizId: string;
  scorePercent: number;
  passed: boolean;
  answers: Record<string, number>;
  attemptedAt: string;
};

export type CourseInternshipEligibilityStatus = {
  eligibleForInternship: boolean;
  linkedInternshipSlug: string;
  linkedInternshipTitle: string;
  lessonsCompleted: boolean;
  quizPassed: boolean;
  projectApproved: boolean;
  projectStatus:
    | "not_started"
    | "in_progress"
    | "submitted"
    | "under_review"
    | "approved"
    | "revision_required";
  missingRequirements: string[];
};

export type PublicCourseSummary = {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  category: CourseDefinition["category"];
  level: string;
  pricePaise: number;
  currency: "INR";
  estimatedHours: number;
  mentorName: string;
  mentorRole: string;
  skills: string[];
  certificateInfo: string;
  outcomes: string[];
  includes: string[];
  linkedInternshipSlug: string;
  linkedInternshipTitle: string;
  internshipDurationWeeks: number;
  completionRequirements: string[];
  includedCertificateTitle: string;
  certificateIncluded: true;
  internshipDisclosure: string;
  isPublished: boolean;
  moduleCount: number;
  lessonCount: number;
  assignmentCount: number;
  projectTitle: string;
  projectSlug: string;
  enrolled: boolean;
  progressPercent: number;
  completedLessonCount: number;
  quizPassed: boolean;
  quizScorePercent: number | null;
};

export type LockedSyllabusModule = {
  id: string;
  sortOrder: number;
  title: string;
  summary: string;
  estimatedMinutes: number;
  lessons: Array<{
    id: string;
    sortOrder: number;
    title: string;
    lessonType: "note" | "video" | "project_milestone";
    durationLabel: string;
  }>;
};

export type LockedCourseDetailResponse = {
  locked: true;
  enrolled: false;
  course: PublicCourseSummary;
  syllabusModules: LockedSyllabusModule[];
  projectPreview: {
    slug: string;
    title: string;
    summary: string;
    estimatedHours: number;
    milestoneCount: number;
    deliverableCount: number;
    mentorName: string;
    mentorRole: string;
  };
};

export type SanitizedQuizForStudent = {
  id: string;
  title: string;
  passingScorePercent: number;
  questions: Array<{
    id: string;
    prompt: string;
    options: string[];
    explanation?: string;
  }>;
};

export type UnlockedCourseDetailResponse = {
  locked: false;
  enrolled: true;
  course: PublicCourseSummary;
  modules: CourseModule[];
  project: CourseProjectDefinition;
  lessonProgress: Record<string, CourseLessonProgressRecord>;
  announcements: CourseAnnouncement[];
  assignments: CourseAssignment[];
  assignmentSubmissions: Record<string, CourseAssignmentSubmissionRecord>;
  quiz: SanitizedQuizForStudent;
  quizAttempt: CourseQuizAttemptRecord | null;
  internshipEligibility: CourseInternshipEligibilityStatus;
};

export type CourseDetailResponse =
  | LockedCourseDetailResponse
  | UnlockedCourseDetailResponse;

type CoursesMemoryStore = {
  courses: CourseDefinition[];
  extrasBySlug: Record<
    string,
    {
      skills?: string[];
      certificateInfo?: string;
      announcements?: CourseAnnouncement[];
      assignments?: CourseAssignment[];
      quiz?: CourseQuiz;
    }
  >;
  enrollments: CourseEnrollmentRecord[];
  lessonProgress: CourseLessonProgressRecord[];
  assignmentSubmissions: CourseAssignmentSubmissionRecord[];
  quizAttempts: CourseQuizAttemptRecord[];
};

const globalCourses = globalThis as unknown as {
  __tglCoursesStore?: CoursesMemoryStore;
};

function createSeedCoursesStore(): CoursesMemoryStore {
  const now = "2026-11-11T10:00:00.000Z";
  return {
    courses: structuredClone(SEED_COURSES),
    extrasBySlug: {},
    enrollments: [
      {
        id: "enr-seed-python-1",
        userId: DEMO_STUDENT_ID,
        courseId: "course-python-systems",
        paymentId: "pay-seed-python-001",
        status: "active",
        enrolledAt: now,
        updatedAt: now,
      },
    ],
    lessonProgress: [
      {
        userId: DEMO_STUDENT_ID,
        courseId: "course-python-systems",
        lessonId: "les-py-1-note",
        status: "completed",
        completedAt: now,
        updatedAt: now,
      },
    ],
    assignmentSubmissions: [],
    quizAttempts: [],
  };
}

export function getCoursesMemoryStore(): CoursesMemoryStore {
  if (!globalCourses.__tglCoursesStore) {
    globalCourses.__tglCoursesStore = createSeedCoursesStore();
  }
  return globalCourses.__tglCoursesStore;
}

export function resetCoursesStoreForTest() {
  globalCourses.__tglCoursesStore = createSeedCoursesStore();
}

export function resolveCourseExtras(slug: string) {
  const base = getCourseExtras(slug);
  const override = getCoursesMemoryStore().extrasBySlug[slug];
  if (!override) return base;
  return {
    skills: override.skills ?? base.skills,
    certificateInfo: override.certificateInfo ?? base.certificateInfo,
    announcements: override.announcements ?? base.announcements,
    assignments: override.assignments ?? base.assignments,
    quiz: override.quiz ?? base.quiz,
  };
}

function summarizeCourse(
  course: CourseDefinition,
  enrolled: boolean,
  progressMap: Record<string, CourseLessonProgressRecord>,
  quizAttempt?: CourseQuizAttemptRecord | null,
): PublicCourseSummary {
  const extras = resolveCourseExtras(course.slug);
  const totalLessons = course.modules.reduce((acc, m) => acc + m.lessons.length, 0);
  const completedLessons = enrolled
    ? course.modules.reduce(
        (acc, m) =>
          acc +
          m.lessons.filter((l) => progressMap[l.id]?.status === "completed").length,
        0,
      )
    : 0;

  return {
    id: course.id,
    slug: course.slug,
    title: course.title,
    subtitle: course.subtitle,
    category: course.category,
    level: course.level,
    pricePaise: course.pricePaise,
    currency: course.currency,
    estimatedHours: course.estimatedHours,
    mentorName: course.mentorName,
    mentorRole: course.mentorRole,
    skills: extras.skills,
    certificateInfo: extras.certificateInfo,
    outcomes: course.outcomes,
    includes: course.includes,
    linkedInternshipSlug: course.linkedInternshipSlug,
    linkedInternshipTitle: course.linkedInternshipTitle,
    internshipDurationWeeks: course.internshipDurationWeeks ?? 8,
    completionRequirements:
      course.completionRequirements?.length
        ? course.completionRequirements
        : DEFAULT_COMPLETION_REQUIREMENTS,
    includedCertificateTitle:
      course.includedCertificateTitle ?? `${course.linkedInternshipTitle} Completion Certificate`,
    certificateIncluded: true,
    internshipDisclosure: course.internshipDisclosure,
    isPublished: course.isPublished,
    moduleCount: course.modules.length,
    lessonCount: totalLessons,
    assignmentCount: extras.assignments.length,
    projectTitle: course.project.title,
    projectSlug: course.project.slug,
    enrolled,
    completedLessonCount: completedLessons,
    progressPercent:
      enrolled && totalLessons > 0
        ? Math.round((completedLessons / totalLessons) * 100)
        : 0,
    quizPassed: Boolean(quizAttempt?.passed),
    quizScorePercent: quizAttempt ? quizAttempt.scorePercent : null,
  };
}

export async function listAllCoursesRaw(includeUnpublished = false): Promise<CourseDefinition[]> {
  if (isSupabaseConfigured()) {
    try {
      const client = serviceClient();
      let q = client
        .from("courses")
        .select(
          "id,slug,title,subtitle,category,level,price_paise,currency,estimated_hours,mentor_name,mentor_role,outcomes,includes,linked_internship_slug,linked_internship_title,internship_duration_weeks,completion_requirements,included_certificate_title,internship_disclosure,is_published,modules_json,project_json",
        )
        .order("created_at", { ascending: true });
      if (!includeUnpublished) q = q.eq("is_published", true);
      const { data, error } = await q;
      if (!error && data && data.length > 0) {
        return data.map((row) => ({
          id: row.id as string,
          slug: row.slug as string,
          title: row.title as string,
          subtitle: row.subtitle as string,
          category: row.category as CourseDefinition["category"],
          level: row.level as string,
          pricePaise: row.price_paise as number,
          currency: "INR",
          estimatedHours: row.estimated_hours as number,
          mentorName: row.mentor_name as string,
          mentorRole: row.mentor_role as string,
          outcomes: (row.outcomes ?? []) as string[],
          includes: (row.includes ?? []) as string[],
          linkedInternshipSlug: row.linked_internship_slug as string,
          linkedInternshipTitle: row.linked_internship_title as string,
          internshipDurationWeeks: (row.internship_duration_weeks as number | undefined) ?? 8,
          completionRequirements: Array.isArray(row.completion_requirements)
            ? (row.completion_requirements as string[])
            : undefined,
          includedCertificateTitle:
            (row.included_certificate_title as string | undefined) ?? undefined,
          internshipDisclosure: row.internship_disclosure as string,
          isPublished: Boolean(row.is_published),
          modules: (row.modules_json ?? []) as CourseModule[],
          project: row.project_json as CourseProjectDefinition,
        }));
      }
    } catch {
      // Fallback to in-memory seed catalog if migration hasn't run
    }
  }
  const courses = getCoursesMemoryStore().courses;
  return includeUnpublished ? [...courses] : courses.filter((c) => c.isPublished);
}

export async function findCourseByIdOrSlug(idOrSlug: string): Promise<CourseDefinition | null> {
  const courses = await listAllCoursesRaw(true);
  return courses.find((c) => c.id === idOrSlug || c.slug === idOrSlug) ?? null;
}

export async function listUserCourseEnrollments(
  userId?: string | null,
): Promise<CourseEnrollmentRecord[]> {
  if (!userId) return [];
  if (isSupabaseConfigured()) {
    try {
      const client = serviceClient();
      const { data, error } = await client
        .from("course_enrollments")
        .select("*")
        .eq("user_id", userId);
      if (!error && data) {
        return data.map((r) => ({
          id: r.id as string,
          userId: r.user_id as string,
          courseId: r.course_id as string,
          paymentId: (r.payment_id as string | null) ?? null,
          status: r.status as CourseEnrollmentStatus,
          enrolledAt: r.enrolled_at as string,
          updatedAt: r.updated_at as string,
        }));
      }
    } catch {
      // Fallback
    }
  }
  return getCoursesMemoryStore().enrollments.filter((e) => e.userId === userId);
}

export async function hasActiveCourseEnrollment(
  userId: string | null | undefined,
  courseId: string,
): Promise<boolean> {
  if (!userId) return false;
  const enrollments = await listUserCourseEnrollments(userId);
  return enrollments.some((e) => e.courseId === courseId && e.status === "active");
}

export async function getUserCourseProgressMap(
  userId: string | null | undefined,
  courseId: string,
): Promise<Record<string, CourseLessonProgressRecord>> {
  if (!userId) return {};
  if (isSupabaseConfigured()) {
    try {
      const client = serviceClient();
      const { data, error } = await client
        .from("course_lesson_progress")
        .select("*")
        .eq("user_id", userId)
        .eq("course_id", courseId);
      if (!error && data) {
        return Object.fromEntries(
          data.map((r) => [
            r.lesson_id as string,
            {
              userId: r.user_id as string,
              courseId: r.course_id as string,
              lessonId: r.lesson_id as string,
              status: r.status as LessonProgressStatus,
              completedAt: (r.completed_at as string | null) ?? null,
              updatedAt: r.updated_at as string,
            },
          ]),
        );
      }
    } catch {
      // Fallback
    }
  }
  const rows = getCoursesMemoryStore().lessonProgress.filter(
    (p) => p.userId === userId && p.courseId === courseId,
  );
  return Object.fromEntries(rows.map((r) => [r.lessonId, r]));
}

export async function getUserCourseAssignmentsMap(
  userId: string | null | undefined,
  courseId: string,
): Promise<Record<string, CourseAssignmentSubmissionRecord>> {
  if (!userId) return {};
  if (isSupabaseConfigured()) {
    try {
      const client = serviceClient();
      const { data, error } = await client
        .from("course_assignment_submissions")
        .select("*")
        .eq("user_id", userId)
        .eq("course_id", courseId);
      if (!error && data) {
        return Object.fromEntries(
          data.map((r) => [
            r.assignment_id as string,
            {
              id: r.id as string,
              userId: r.user_id as string,
              courseId: r.course_id as string,
              assignmentId: r.assignment_id as string,
              submissionText: r.submission_text as string,
              artifactUrl: (r.artifact_url as string | null) ?? null,
              status: r.status as "submitted" | "reviewed",
              mentorFeedback: (r.mentor_feedback as string | null) ?? null,
              submittedAt: r.submitted_at as string,
            },
          ]),
        );
      }
    } catch {
      // Fallback
    }
  }
  const rows = getCoursesMemoryStore().assignmentSubmissions.filter(
    (a) => a.userId === userId && a.courseId === courseId,
  );
  return Object.fromEntries(rows.map((a) => [a.assignmentId, a]));
}

export async function getUserCourseQuizAttempt(
  userId: string | null | undefined,
  courseId: string,
): Promise<CourseQuizAttemptRecord | null> {
  if (!userId) return null;
  if (isSupabaseConfigured()) {
    try {
      const client = serviceClient();
      const { data } = await client
        .from("course_quiz_attempts")
        .select("*")
        .eq("user_id", userId)
        .eq("course_id", courseId)
        .maybeSingle();
      if (data) {
        return {
          id: data.id as string,
          userId: data.user_id as string,
          courseId: data.course_id as string,
          quizId: data.quiz_id as string,
          scorePercent: data.score_percent as number,
          passed: Boolean(data.passed),
          answers: (data.answers_json ?? {}) as Record<string, number>,
          attemptedAt: data.attempted_at as string,
        };
      }
    } catch {
      // Fallback
    }
  }
  return (
    getCoursesMemoryStore().quizAttempts.find(
      (q) => q.userId === userId && q.courseId === courseId,
    ) ?? null
  );
}

export function computeCourseInternshipEligibility(params: {
  course: CourseDefinition;
  summary: PublicCourseSummary;
  quizAttempt: CourseQuizAttemptRecord | null;
  userId: string;
}): CourseInternshipEligibilityStatus {
  const projectStatus = getProjectStatusForUser(params.userId, params.course.project.slug);
  const lessonsCompleted =
    params.summary.lessonCount > 0 &&
    params.summary.completedLessonCount >= params.summary.lessonCount;
  const quizPassed = Boolean(params.quizAttempt?.passed);
  const projectApproved = projectStatus === "approved";

  const missing: string[] = [];
  if (!lessonsCompleted) {
    missing.push(
      `Complete remaining course lessons (${params.summary.completedLessonCount}/${params.summary.lessonCount})`,
    );
  }
  if (!quizPassed) {
    missing.push("Pass the graded course quiz");
  }
  if (!projectApproved) {
    missing.push(`Earn mentor approval on "${params.course.project.title}"`);
  }

  return {
    eligibleForInternship: lessonsCompleted && quizPassed && projectApproved,
    linkedInternshipSlug: params.course.linkedInternshipSlug,
    linkedInternshipTitle: params.course.linkedInternshipTitle,
    lessonsCompleted,
    quizPassed,
    projectApproved,
    projectStatus,
    missingRequirements: missing,
  };
}

export async function listCoursesCatalog(
  userId?: string | null,
  includeUnpublished = false,
): Promise<PublicCourseSummary[]> {
  const [courses, enrollments] = await Promise.all([
    listAllCoursesRaw(includeUnpublished),
    listUserCourseEnrollments(userId),
  ]);

  const activeCourseIds = new Set(
    enrollments.filter((e) => e.status === "active").map((e) => e.courseId),
  );

  const results: PublicCourseSummary[] = [];
  for (const course of courses) {
    const enrolled = activeCourseIds.has(course.id);
    const [progressMap, quizAttempt] = enrolled
      ? await Promise.all([
          getUserCourseProgressMap(userId, course.id),
          getUserCourseQuizAttempt(userId, course.id),
        ])
      : [{}, null];
    results.push(summarizeCourse(course, enrolled, progressMap, quizAttempt));
  }
  return results;
}

export async function getCourseDetailForActor(params: {
  slug: string;
  userId?: string | null;
  bypassLockForAdmin?: boolean;
}): Promise<CourseDetailResponse | null> {
  const course = await findCourseByIdOrSlug(params.slug);
  if (!course || (!course.isPublished && !params.bypassLockForAdmin)) {
    return null;
  }

  const enrolled = await hasActiveCourseEnrollment(params.userId, course.id);
  const canAccess = enrolled || Boolean(params.bypassLockForAdmin);

  if (!canAccess) {
    return {
      locked: true,
      enrolled: false,
      course: summarizeCourse(course, false, {}),
      syllabusModules: course.modules.map((mod) => ({
        id: mod.id,
        sortOrder: mod.sortOrder,
        title: mod.title,
        summary: mod.summary,
        estimatedMinutes: mod.estimatedMinutes,
        lessons: mod.lessons.map((l) => ({
          id: l.id,
          sortOrder: l.sortOrder,
          title: l.title,
          lessonType: l.lessonType,
          durationLabel: l.durationLabel,
        })),
      })),
      projectPreview: {
        slug: course.project.slug,
        title: course.project.title,
        summary: course.project.summary,
        estimatedHours: course.project.estimatedHours,
        milestoneCount: course.project.milestones.length,
        deliverableCount: course.project.deliverables.length,
        mentorName: course.project.mentorName,
        mentorRole: course.project.mentorRole,
      },
    };
  }

  const [progressMap, assignmentMap, quizAttempt] = await Promise.all([
    getUserCourseProgressMap(params.userId, course.id),
    getUserCourseAssignmentsMap(params.userId, course.id),
    getUserCourseQuizAttempt(params.userId, course.id),
  ]);

  const extras = resolveCourseExtras(course.slug);
  const summary = summarizeCourse(course, true, progressMap, quizAttempt);

  const sanitizedQuiz: SanitizedQuizForStudent = {
    id: extras.quiz.id,
    title: extras.quiz.title,
    passingScorePercent: extras.quiz.passingScorePercent,
    questions: extras.quiz.questions.map((q) => ({
      id: q.id,
      prompt: q.prompt,
      options: q.options,
      ...(quizAttempt ? { explanation: q.explanation } : {}),
    })),
  };

  return {
    locked: false,
    enrolled: true,
    course: summary,
    modules: course.modules,
    project: course.project,
    lessonProgress: progressMap,
    announcements: extras.announcements,
    assignments: extras.assignments,
    assignmentSubmissions: assignmentMap,
    quiz: sanitizedQuiz,
    quizAttempt,
    internshipEligibility: computeCourseInternshipEligibility({
      course,
      summary,
      quizAttempt,
      userId: params.userId ?? DEMO_STUDENT_ID,
    }),
  };
}

export async function activateCourseEnrollment(params: {
  userId: string;
  courseId: string;
  paymentId: string | null;
}): Promise<CourseEnrollmentRecord> {
  const now = new Date().toISOString();
  if (isSupabaseConfigured()) {
    try {
      const client = serviceClient();
      const { data } = await client
        .from("course_enrollments")
        .upsert(
          {
            user_id: params.userId,
            course_id: params.courseId,
            payment_id: params.paymentId,
            status: "active",
            enrolled_at: now,
            updated_at: now,
          },
          { onConflict: "user_id,course_id" },
        )
        .select("*")
        .single();
      if (data) {
        return {
          id: data.id as string,
          userId: data.user_id as string,
          courseId: data.course_id as string,
          paymentId: (data.payment_id as string | null) ?? null,
          status: data.status as CourseEnrollmentStatus,
          enrolledAt: data.enrolled_at as string,
          updatedAt: data.updated_at as string,
        };
      }
    } catch {
      // Fallback
    }
  }

  const store = getCoursesMemoryStore();
  const existing = store.enrollments.find(
    (e) => e.userId === params.userId && e.courseId === params.courseId,
  );
  if (existing) {
    existing.status = "active";
    existing.paymentId = params.paymentId;
    existing.updatedAt = now;
    return existing;
  }

  const record: CourseEnrollmentRecord = {
    id: randomUUID(),
    userId: params.userId,
    courseId: params.courseId,
    paymentId: params.paymentId,
    status: "active",
    enrolledAt: now,
    updatedAt: now,
  };
  store.enrollments.unshift(record);
  return record;
}

export async function revokeCourseEnrollment(params: {
  userId: string;
  courseId: string;
}): Promise<void> {
  const now = new Date().toISOString();
  if (isSupabaseConfigured()) {
    try {
      const client = serviceClient();
      await client
        .from("course_enrollments")
        .update({ status: "refunded", updated_at: now })
        .eq("user_id", params.userId)
        .eq("course_id", params.courseId);
    } catch {
      // Fallback
    }
  }
  const store = getCoursesMemoryStore();
  const existing = store.enrollments.find(
    (e) => e.userId === params.userId && e.courseId === params.courseId,
  );
  if (existing) {
    existing.status = "refunded";
    existing.updatedAt = now;
  }
}

export async function updateCourseLessonProgress(params: {
  userId: string;
  courseSlug: string;
  lessonId: string;
  status: LessonProgressStatus;
}) {
  const course = await findCourseByIdOrSlug(params.courseSlug);
  if (!course) return { error: "Course not found.", statusCode: 404 };

  const enrolled = await hasActiveCourseEnrollment(params.userId, course.id);
  if (!enrolled) {
    return {
      error: "Course enrollment required before recording lesson progress.",
      statusCode: 403,
    };
  }

  const lessonExists = course.modules.some((m) =>
    m.lessons.some((l) => l.id === params.lessonId),
  );
  if (!lessonExists) {
    return { error: "Lesson not found in this course.", statusCode: 404 };
  }

  const now = new Date().toISOString();
  const completedAt = params.status === "completed" ? now : null;

  if (isSupabaseConfigured()) {
    try {
      const client = serviceClient();
      await client.from("course_lesson_progress").upsert(
        {
          user_id: params.userId,
          course_id: course.id,
          lesson_id: params.lessonId,
          status: params.status,
          completed_at: completedAt,
          updated_at: now,
        },
        { onConflict: "user_id,course_id,lesson_id" },
      );
    } catch {
      // Fallback
    }
  } else {
    const store = getCoursesMemoryStore();
    const existing = store.lessonProgress.find(
      (p) =>
        p.userId === params.userId &&
        p.courseId === course.id &&
        p.lessonId === params.lessonId,
    );
    if (existing) {
      existing.status = params.status;
      existing.completedAt = completedAt;
      existing.updatedAt = now;
    } else {
      store.lessonProgress.push({
        userId: params.userId,
        courseId: course.id,
        lessonId: params.lessonId,
        status: params.status,
        completedAt,
        updatedAt: now,
      });
    }
  }

  const [progressMap, quizAttempt] = await Promise.all([
    getUserCourseProgressMap(params.userId, course.id),
    getUserCourseQuizAttempt(params.userId, course.id),
  ]);
  const summary = summarizeCourse(course, true, progressMap, quizAttempt);
  return {
    progress: progressMap,
    summary,
    internshipEligibility: computeCourseInternshipEligibility({
      course,
      summary,
      quizAttempt,
      userId: params.userId,
    }),
  };
}

export async function submitCourseAssignment(params: {
  userId: string;
  courseSlug: string;
  assignmentId: string;
  submissionText: string;
  artifactUrl?: string | null;
}): Promise<{
  submissions?: Record<string, CourseAssignmentSubmissionRecord>;
  error?: string;
  statusCode?: number;
}> {
  const course = await findCourseByIdOrSlug(params.courseSlug);
  if (!course) return { error: "Course not found.", statusCode: 404 };

  const enrolled = await hasActiveCourseEnrollment(params.userId, course.id);
  if (!enrolled) {
    return { error: "Course enrollment required before submitting assignments.", statusCode: 403 };
  }

  const extras = resolveCourseExtras(course.slug);
  if (!extras.assignments.some((a) => a.id === params.assignmentId)) {
    return { error: "Assignment not found in this course.", statusCode: 404 };
  }

  const now = new Date().toISOString();
  const record: CourseAssignmentSubmissionRecord = {
    id: `asgn-sub-${randomUUID().slice(0, 8)}`,
    userId: params.userId,
    courseId: course.id,
    assignmentId: params.assignmentId,
    submissionText: params.submissionText.trim(),
    artifactUrl: params.artifactUrl?.trim() || null,
    status: "submitted",
    mentorFeedback: null,
    submittedAt: now,
  };

  if (isSupabaseConfigured()) {
    try {
      await serviceClient()
        .from("course_assignment_submissions")
        .upsert(
          {
            user_id: params.userId,
            course_id: course.id,
            assignment_id: params.assignmentId,
            submission_text: record.submissionText,
            artifact_url: record.artifactUrl,
            status: "submitted",
            submitted_at: now,
            updated_at: now,
          },
          { onConflict: "user_id,course_id,assignment_id" },
        );
    } catch {
      // Fallback
    }
  } else {
    const store = getCoursesMemoryStore();
    const idx = store.assignmentSubmissions.findIndex(
      (s) =>
        s.userId === params.userId &&
        s.courseId === course.id &&
        s.assignmentId === params.assignmentId,
    );
    if (idx >= 0) {
      store.assignmentSubmissions[idx] = record;
    } else {
      store.assignmentSubmissions.unshift(record);
    }
  }

  const submissions = await getUserCourseAssignmentsMap(params.userId, course.id);
  return { submissions };
}

export async function submitCourseQuiz(params: {
  userId: string;
  courseSlug: string;
  answers: Record<string, number>;
}): Promise<{
  attempt?: CourseQuizAttemptRecord;
  summary?: PublicCourseSummary;
  internshipEligibility?: CourseInternshipEligibilityStatus;
  explanations?: Record<string, string>;
  error?: string;
  statusCode?: number;
}> {
  const course = await findCourseByIdOrSlug(params.courseSlug);
  if (!course) return { error: "Course not found.", statusCode: 404 };

  const enrolled = await hasActiveCourseEnrollment(params.userId, course.id);
  if (!enrolled) {
    return { error: "Course enrollment required before taking the quiz.", statusCode: 403 };
  }

  const extras = resolveCourseExtras(course.slug);
  const quiz = extras.quiz;
  if (!quiz.questions.length) {
    return { error: "Quiz not configured for this course.", statusCode: 400 };
  }

  let correctCount = 0;
  for (const q of quiz.questions) {
    if (params.answers[q.id] === q.correctIndex) {
      correctCount += 1;
    }
  }
  const scorePercent = Math.round((correctCount / quiz.questions.length) * 100);
  const passed = scorePercent >= quiz.passingScorePercent;
  const now = new Date().toISOString();

  const attempt: CourseQuizAttemptRecord = {
    id: `quiz-${randomUUID().slice(0, 8)}`,
    userId: params.userId,
    courseId: course.id,
    quizId: quiz.id,
    scorePercent,
    passed,
    answers: params.answers,
    attemptedAt: now,
  };

  if (isSupabaseConfigured()) {
    try {
      await serviceClient().from("course_quiz_attempts").upsert(
        {
          user_id: params.userId,
          course_id: course.id,
          quiz_id: quiz.id,
          score_percent: scorePercent,
          passed,
          answers_json: params.answers,
          attempted_at: now,
        },
        { onConflict: "user_id,course_id,quiz_id" },
      );
    } catch {
      // Fallback
    }
  } else {
    const store = getCoursesMemoryStore();
    const idx = store.quizAttempts.findIndex(
      (a) => a.userId === params.userId && a.courseId === course.id,
    );
    if (idx >= 0) {
      store.quizAttempts[idx] = attempt;
    } else {
      store.quizAttempts.unshift(attempt);
    }
  }

  const progressMap = await getUserCourseProgressMap(params.userId, course.id);
  const summary = summarizeCourse(course, true, progressMap, attempt);
  const explanations = Object.fromEntries(
    quiz.questions.map((q) => [q.id, q.explanation]),
  );

  return {
    attempt,
    summary,
    explanations,
    internshipEligibility: computeCourseInternshipEligibility({
      course,
      summary,
      quizAttempt: attempt,
      userId: params.userId,
    }),
  };
}

export async function updateCourseAdminConfig(params: {
  courseId: string;
  pricePaise: number;
  isPublished?: boolean;
  subtitle?: string;
  projectTitle?: string;
  projectSummary?: string;
  internshipDurationWeeks?: number;
  completionRequirements?: string[];
  newModuleTitle?: string;
  newModuleSummary?: string;
  newAnnouncementTitle?: string;
  newAnnouncementBody?: string;
  mentorAuthorName?: string;
}): Promise<{ course?: CourseDefinition; error?: string }> {
  const check = validateCoursePricePaise(params.pricePaise);
  if (!check.valid) return { error: check.error };

  const store = getCoursesMemoryStore();
  const existing = store.courses.find((c) => c.id === params.courseId);
  if (!existing) return { error: "Programme not found." };

  existing.pricePaise = params.pricePaise;
  if (typeof params.isPublished === "boolean") {
    existing.isPublished = params.isPublished;
  }
  if (typeof params.subtitle === "string" && params.subtitle.trim()) {
    existing.subtitle = params.subtitle.trim();
  }
  if (typeof params.projectTitle === "string" && params.projectTitle.trim()) {
    existing.project = {
      ...existing.project,
      title: params.projectTitle.trim(),
    };
  }
  if (typeof params.projectSummary === "string" && params.projectSummary.trim()) {
    existing.project = {
      ...existing.project,
      summary: params.projectSummary.trim(),
    };
  }
  if (typeof params.internshipDurationWeeks === "number" && params.internshipDurationWeeks >= 1) {
    existing.internshipDurationWeeks = params.internshipDurationWeeks;
  }
  if (Array.isArray(params.completionRequirements) && params.completionRequirements.length > 0) {
    existing.completionRequirements = params.completionRequirements
      .map((s) => s.trim())
      .filter(Boolean);
  }

  if (params.newModuleTitle?.trim()) {
    const nextOrder = existing.modules.length + 1;
    existing.modules.push({
      id: `mod-${existing.id}-${nextOrder}-${Date.now().toString(36)}`,
      sortOrder: nextOrder,
      title: params.newModuleTitle.trim(),
      summary:
        params.newModuleSummary?.trim() ||
        "Practical walkthrough and implementation checkpoint.",
      estimatedMinutes: 45,
      lessons: [
        {
          id: `les-${existing.id}-${nextOrder}-1-${Date.now().toString(36)}`,
          sortOrder: 1,
          title: `${params.newModuleTitle.trim()} — Study Guide`,
          lessonType: "note",
          durationLabel: "25 min read",
          summary: "Core architecture notes and implementation checklist.",
          noteSections: [
            {
              heading: "Implementation Focus",
              body:
                params.newModuleSummary?.trim() ||
                "Apply clean boundary validation and write focused unit tests covering failure paths.",
              takeaway: "Ship small, verifiable iterations with explicit error states.",
            },
          ],
          resources: [],
        },
      ],
    });
  }

  if (params.newAnnouncementTitle?.trim() && params.newAnnouncementBody?.trim()) {
    const extras = resolveCourseExtras(existing.slug);
    const updatedList: CourseAnnouncement[] = [
      {
        id: `ann-${Date.now().toString(36)}`,
        title: params.newAnnouncementTitle.trim(),
        body: params.newAnnouncementBody.trim(),
        authorName: params.mentorAuthorName?.trim() || existing.mentorName,
        publishedAt: new Date().toISOString(),
        pinned: true,
      },
      ...extras.announcements,
    ];
    store.extrasBySlug[existing.slug] = {
      ...store.extrasBySlug[existing.slug],
      announcements: updatedList,
    };
  }

  if (isSupabaseConfigured()) {
    try {
      await serviceClient()
        .from("courses")
        .update({
          price_paise: existing.pricePaise,
          is_published: existing.isPublished,
          subtitle: existing.subtitle,
          modules_json: existing.modules,
          project_json: existing.project,
          internship_duration_weeks: existing.internshipDurationWeeks ?? 8,
          completion_requirements:
            existing.completionRequirements ?? DEFAULT_COMPLETION_REQUIREMENTS,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
    } catch {
      // Ignore if migration hasn't run
    }
  }

  return { course: existing };
}

export async function createAdminCourse(params: {
  title: string;
  subtitle: string;
  category: CourseDefinition["category"];
  level: string;
  pricePaise: number;
  estimatedHours: number;
  mentorName: string;
  mentorRole: string;
  skills: string[];
  linkedInternshipSlug: string;
  linkedInternshipTitle: string;
  projectTitle: string;
  projectSummary: string;
}): Promise<{ course?: CourseDefinition; error?: string }> {
  const check = validateCoursePricePaise(params.pricePaise);
  if (!check.valid) return { error: check.error };

  const slug = params.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  const id = `course-${slug.slice(0, 24)}-${Date.now().toString(36)}`;
  const projectSlug = "accessible-learning-portfolio";

  const created: CourseDefinition = {
    id,
    slug: `${slug}-${Date.now().toString(36)}`,
    title: params.title.trim(),
    subtitle: params.subtitle.trim(),
    category: params.category,
    level: params.level.trim() || "Applied",
    pricePaise: params.pricePaise,
    currency: "INR",
    estimatedHours: params.estimatedHours,
    mentorName: params.mentorName.trim(),
    mentorRole: params.mentorRole.trim(),
    outcomes: [
      `Master ${params.skills.slice(0, 3).join(", ") || "production engineering"}`,
      "Complete guided notes, quiz checks, and real-world project deliverables",
      `Prepare directly for ${params.linkedInternshipTitle}`,
    ],
    includes: [
      "Structured written study notes and reference documentation",
      "Interactive graded programme quiz and practical assignments",
      `Linked capstone project (${params.projectTitle}) with mentor feedback`,
      `Included ${params.linkedInternshipTitle} track & official completion certificate (₹0 extra)`,
    ],
    linkedInternshipSlug: params.linkedInternshipSlug,
    linkedInternshipTitle: params.linkedInternshipTitle,
    internshipDurationWeeks: 8,
    includedCertificateTitle: `${params.title.trim()} Completion Certificate`,
    completionRequirements: [...DEFAULT_COMPLETION_REQUIREMENTS],
    internshipDisclosure:
      "One single Programme Enrolment covers learning modules, assignments, practical project review, linked internship participation, and your official completion certificate at ₹0 extra once approved.",
    isPublished: true,
    modules: [
      {
        id: `mod-${id}-1`,
        sortOrder: 1,
        title: "Foundations & Architecture",
        summary: "Core concepts, boundaries, and hands-on setup.",
        estimatedMinutes: 60,
        lessons: [
          {
            id: `les-${id}-1-note`,
            sortOrder: 1,
            title: `${params.title.trim()} — Core Mental Model`,
            lessonType: "note",
            durationLabel: "25 min read",
            summary: params.subtitle.trim(),
            noteSections: [
              {
                heading: "System Overview",
                body: params.subtitle.trim(),
                takeaway: "Validate inputs server-side and document architectural trade-offs.",
              },
            ],
            resources: [],
          },
        ],
      },
    ],
    project: {
      slug: projectSlug,
      title: params.projectTitle.trim(),
      summary: params.projectSummary.trim(),
      brief: params.projectSummary.trim(),
      estimatedHours: 8,
      milestones: [
        "Set up typed backend contract and client UI",
        "Verify error, loading, and edge-case tests",
        "Submit repository, deployment link, and architecture notes",
      ],
      deliverables: [
        "Public GitHub repository URL",
        "Deployment URL or reproducible run guide",
        "Supporting test evidence",
      ],
      rubric: [
        "Server-authoritative validation",
        "Clean accessible UX",
        "Complete test documentation",
      ],
      mentorName: params.mentorName.trim(),
      mentorRole: params.mentorRole.trim(),
    },
  };

  const store = getCoursesMemoryStore();
  store.courses.unshift(created);
  store.extrasBySlug[created.slug] = {
    skills: params.skills,
    certificateInfo: created.internshipDisclosure,
  };

  if (isSupabaseConfigured()) {
    try {
      await serviceClient().from("courses").insert({
        id: created.id,
        slug: created.slug,
        title: created.title,
        subtitle: created.subtitle,
        category: created.category,
        level: created.level,
        price_paise: created.pricePaise,
        currency: "INR",
        estimated_hours: created.estimatedHours,
        mentor_name: created.mentorName,
        mentor_role: created.mentorRole,
        outcomes: created.outcomes,
        includes: created.includes,
        linked_internship_slug: created.linkedInternshipSlug,
        linked_internship_title: created.linkedInternshipTitle,
        internship_disclosure: created.internshipDisclosure,
        is_published: true,
        modules_json: created.modules,
        project_json: created.project,
        skills: params.skills,
        certificate_info: created.internshipDisclosure,
      });
    } catch {
      // Ignore if migration hasn't run
    }
  }

  return { course: created };
}
