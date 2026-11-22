import { randomUUID } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import {
  DEMO_STUDENT_ID,
  getAdminFirestore,
  isFirestoreConfigured,
} from "@/lib/firebase/server";
import {
  DEFAULT_COMPLETION_REQUIREMENTS,
  SEED_COURSES,
  type CourseDefinition,
  type CourseLesson,
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

export type ModuleQuizAttemptRecord = {
  moduleId: string;
  quizId: string;
  scorePercent: number;
  passed: boolean;
  answers: Record<string, number>;
  attemptedAt: string;
};

export type LessonExerciseCompletionRecord = {
  lessonId: string;
  completedAt: string;
};

export type KnowledgeCheckResultRecord = {
  lessonId: string;
  selectedIndex: number;
  passed: boolean;
  attemptedAt: string;
  explanation?: string;
};

export type CourseEnrollmentRecord = {
  id: string;
  userId: string;
  courseId: string;
  paymentId: string | null;
  status: CourseEnrollmentStatus;
  enrolledAt: string;
  updatedAt: string;
  lastVisitedLessonId?: string | null;
  exerciseCompletions?: Record<string, LessonExerciseCompletionRecord>;
  knowledgeCheckResults?: Record<string, KnowledgeCheckResultRecord>;
  moduleQuizAttempts?: Record<string, ModuleQuizAttemptRecord>;
};

export type CourseLessonProgressRecord = {
  userId: string;
  courseId: string;
  lessonId: string;
  status: LessonProgressStatus;
  readingProgressPercent?: number;
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
  prerequisites: string[];
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
  contentStatus: "draft" | "published";
  hasDraftChanges: boolean;
  moduleCount: number;
  lessonCount: number;
  assignmentCount: number;
  projectTitle: string;
  projectSlug: string;
  enrolled: boolean;
  progressPercent: number;
  completedLessonCount: number;
  completedExerciseCount: number;
  totalExerciseCount: number;
  passedModuleQuizCount: number;
  totalModuleQuizCount: number;
  lastVisitedLessonId: string | null;
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
    questionType?: "conceptual" | "code" | "scenario";
    explanation?: string;
  }>;
};

export type SanitizedCourseLesson = Omit<CourseLesson, "knowledgeCheck"> & {
  knowledgeCheck?: {
    question: string;
    options: string[];
    explanation?: string;
  };
};

export type SanitizedCourseModule = Omit<CourseModule, "lessons" | "moduleQuiz"> & {
  lessons: SanitizedCourseLesson[];
  moduleQuiz?: SanitizedQuizForStudent;
};

export type UnlockedCourseDetailResponse = {
  locked: false;
  enrolled: true;
  isPreviewMode?: boolean;
  course: PublicCourseSummary;
  modules: SanitizedCourseModule[];
  project: CourseProjectDefinition;
  lessonProgress: Record<string, CourseLessonProgressRecord>;
  lastVisitedLessonId: string | null;
  exerciseCompletions: Record<string, LessonExerciseCompletionRecord>;
  knowledgeCheckResults: Record<string, KnowledgeCheckResultRecord>;
  moduleQuizAttempts: Record<string, ModuleQuizAttemptRecord>;
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

export type CoursesMemoryStore = {
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
        lastVisitedLessonId: "les-py-1-video",
        exerciseCompletions: {},
        knowledgeCheckResults: {},
        moduleQuizAttempts: {},
      },
    ],
    lessonProgress: [
      {
        userId: DEMO_STUDENT_ID,
        courseId: "course-python-systems",
        lessonId: "les-py-1-note",
        status: "completed",
        readingProgressPercent: 100,
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

function getPublishedModules(course: CourseDefinition, includeDrafts = false): CourseModule[] {
  const source =
    includeDrafts && course.draftModules && course.draftModules.length > 0
      ? course.draftModules
      : course.modules;
  if (includeDrafts) return source;
  return source
    .filter((mod) => !mod.isDraft)
    .map((mod) => ({
      ...mod,
      lessons: mod.lessons.filter((l) => !l.isDraft),
    }));
}

export function summarizeCourse(
  course: CourseDefinition,
  enrolled: boolean,
  progressMap: Record<string, CourseLessonProgressRecord>,
  quizAttempt?: CourseQuizAttemptRecord | null,
  enrollmentRecord?: CourseEnrollmentRecord | null,
): PublicCourseSummary {
  const extras = resolveCourseExtras(course.slug);
  const activeModules = getPublishedModules(course, false);
  const totalLessons = activeModules.reduce((acc, m) => acc + m.lessons.length, 0);
  const completedLessons = enrolled
    ? activeModules.reduce(
        (acc, m) =>
          acc +
          m.lessons.filter((l) => progressMap[l.id]?.status === "completed").length,
        0,
      )
    : 0;

  const totalExerciseCount = activeModules.reduce(
    (acc, m) => acc + m.lessons.filter((l) => Boolean(l.practicalExercise)).length,
    0,
  );
  const exerciseCompletions = enrollmentRecord?.exerciseCompletions ?? {};
  const completedExerciseCount = enrolled
    ? activeModules.reduce(
        (acc, m) =>
          acc +
          m.lessons.filter(
            (l) => Boolean(l.practicalExercise) && Boolean(exerciseCompletions[l.id]),
          ).length,
        0,
      )
    : 0;

  const totalModuleQuizCount = activeModules.filter(
    (m) => Boolean(m.moduleQuiz && m.moduleQuiz.questions.length > 0),
  ).length;
  const moduleAttempts = enrollmentRecord?.moduleQuizAttempts ?? {};
  const passedModuleQuizCount = enrolled
    ? activeModules.filter((m) => Boolean(moduleAttempts[m.id]?.passed)).length
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
    prerequisites: course.prerequisites ?? [],
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
    contentStatus: course.contentStatus ?? "published",
    hasDraftChanges: Boolean(course.draftModules && course.draftModules.length > 0),
    moduleCount: activeModules.length,
    lessonCount: totalLessons,
    assignmentCount: extras.assignments.length,
    projectTitle: course.project.title,
    projectSlug: course.project.slug,
    enrolled,
    completedLessonCount: completedLessons,
    completedExerciseCount,
    totalExerciseCount,
    passedModuleQuizCount,
    totalModuleQuizCount,
    lastVisitedLessonId: enrolled ? enrollmentRecord?.lastVisitedLessonId ?? null : null,
    progressPercent:
      enrolled && totalLessons > 0
        ? Math.round((completedLessons / totalLessons) * 100)
        : 0,
    quizPassed: Boolean(quizAttempt?.passed),
    quizScorePercent: quizAttempt ? quizAttempt.scorePercent : null,
  };
}

function cleanFirestoreData<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export async function listAllCoursesRaw(includeUnpublished = false): Promise<CourseDefinition[]> {
  if (isFirestoreConfigured()) {
    try {
      const db = getAdminFirestore();
      if (db) {
        const snap = await db.collection("courses").get();
        if (!snap.empty) {
          const rows = snap.docs
            .map((docSnap) => docSnap.data() as Record<string, unknown>)
            .filter((row) => includeUnpublished || Boolean(row.isPublished))
            .map((row) => ({
              id: String(row.id ?? ""),
              slug: String(row.slug ?? ""),
              title: String(row.title ?? ""),
              subtitle: String(row.subtitle ?? ""),
              category: (row.category as CourseDefinition["category"]) ?? "Web Development",
              level: String(row.level ?? "Applied"),
              pricePaise: Number(row.pricePaise ?? 49900),
              currency: "INR" as const,
              estimatedHours: Number(row.estimatedHours ?? 12),
              mentorName: String(row.mentorName ?? "Mentor"),
              mentorRole: String(row.mentorRole ?? "Instructor"),
              prerequisites: Array.isArray(row.prerequisites) ? (row.prerequisites as string[]) : [],
              outcomes: Array.isArray(row.outcomes) ? (row.outcomes as string[]) : [],
              includes: Array.isArray(row.includes) ? (row.includes as string[]) : [],
              linkedInternshipSlug: String(row.linkedInternshipSlug ?? ""),
              linkedInternshipTitle: String(row.linkedInternshipTitle ?? ""),
              internshipDurationWeeks: Number(row.internshipDurationWeeks ?? 8),
              completionRequirements: Array.isArray(row.completionRequirements)
                ? (row.completionRequirements as string[])
                : undefined,
              includedCertificateTitle:
                typeof row.includedCertificateTitle === "string"
                  ? row.includedCertificateTitle
                  : undefined,
              internshipDisclosure: String(row.internshipDisclosure ?? ""),
              isPublished: Boolean(row.isPublished),
              contentStatus:
                (row.contentStatus as "draft" | "published" | undefined) ?? "published",
              modules: Array.isArray(row.modules) ? (row.modules as CourseModule[]) : [],
              draftModules: Array.isArray(row.draftModules)
                ? (row.draftModules as CourseModule[])
                : undefined,
              project: row.project as CourseProjectDefinition,
            }));
          if (rows.length > 0) {
            return rows;
          }
        }
      }
    } catch {
      // Fallback to in-memory seed catalog when Firestore collection is not seeded yet
    }
  }
  const courses = getCoursesMemoryStore().courses;
  return includeUnpublished ? [...courses] : courses.filter((c) => c.isPublished);
}

export async function findCourseByIdOrSlug(idOrSlug: string): Promise<CourseDefinition | null> {
  const courses = await listAllCoursesRaw(true);
  return courses.find((c) => c.id === idOrSlug || c.slug === idOrSlug) ?? null;
}

export async function syncCourseToFirestore(course: CourseDefinition): Promise<void> {
  if (!isFirestoreConfigured()) return;
  try {
    const db = getAdminFirestore();
    if (!db) return;
    await db
      .collection("courses")
      .doc(course.id)
      .set(
        {
          ...cleanFirestoreData(course),
          completionRequirements:
            course.completionRequirements ?? DEFAULT_COMPLETION_REQUIREMENTS,
          updatedByAdminAt: new Date().toISOString(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
  } catch {
    // Non-fatal fallback
  }
}

export async function listUserCourseEnrollments(
  userId?: string | null,
): Promise<CourseEnrollmentRecord[]> {
  if (!userId) return [];
  if (isFirestoreConfigured()) {
    try {
      const db = getAdminFirestore();
      if (db) {
        const snap = await db
          .collection("enrollments")
          .where("userId", "==", userId)
          .get();
        if (!snap.empty) {
          return snap.docs.map((d) => {
            const r = d.data() as Record<string, unknown>;
            return {
              id: String(r.id ?? d.id),
              userId: String(r.userId ?? userId),
              courseId: String(r.courseId ?? ""),
              paymentId: (r.paymentId as string | null) ?? null,
              status: (r.status as CourseEnrollmentStatus) ?? "active",
              enrolledAt: String(r.enrolledAt ?? new Date().toISOString()),
              updatedAt: String(r.updatedAt ?? new Date().toISOString()),
              lastVisitedLessonId: (r.lastVisitedLessonId as string | null) ?? null,
              exerciseCompletions:
                (r.exerciseCompletions as Record<string, LessonExerciseCompletionRecord> | undefined) ??
                {},
              knowledgeCheckResults:
                (r.knowledgeCheckResults as Record<string, KnowledgeCheckResultRecord> | undefined) ??
                {},
              moduleQuizAttempts:
                (r.moduleQuizAttempts as Record<string, ModuleQuizAttemptRecord> | undefined) ??
                {},
            };
          });
        }
      }
    } catch {
      // Fallback
    }
  }
  return getCoursesMemoryStore().enrollments.filter((e) => e.userId === userId);
}

async function getActiveEnrollmentRecord(
  userId: string | null | undefined,
  courseId: string,
): Promise<CourseEnrollmentRecord | null> {
  if (!userId) return null;
  const enrollments = await listUserCourseEnrollments(userId);
  return enrollments.find((e) => e.courseId === courseId && e.status === "active") ?? null;
}

export async function hasActiveCourseEnrollment(
  userId: string | null | undefined,
  courseId: string,
): Promise<boolean> {
  const rec = await getActiveEnrollmentRecord(userId, courseId);
  return Boolean(rec);
}

export async function getUserCourseProgressMap(
  userId: string | null | undefined,
  courseId: string,
): Promise<Record<string, CourseLessonProgressRecord>> {
  if (!userId) return {};
  if (isFirestoreConfigured()) {
    try {
      const db = getAdminFirestore();
      if (db) {
        const snap = await db
          .collection("progress")
          .where("userId", "==", userId)
          .get();
        const filtered = snap.docs
          .map((d) => d.data() as Record<string, unknown>)
          .filter((r) => r.courseId === courseId);
        if (filtered.length > 0) {
          return Object.fromEntries(
            filtered.map((r) => [
              String(r.lessonId),
              {
                userId: String(r.userId),
                courseId: String(r.courseId),
                lessonId: String(r.lessonId),
                status: (r.status as LessonProgressStatus) ?? "not_started",
                readingProgressPercent: Number(r.readingProgressPercent ?? 0),
                completedAt:
                  typeof r.completedAt === "string" ? r.completedAt : null,
                updatedAt:
                  typeof r.updatedAtIso === "string"
                    ? r.updatedAtIso
                    : new Date().toISOString(),
              },
            ]),
          );
        }
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
  if (isFirestoreConfigured()) {
    try {
      const db = getAdminFirestore();
      if (db) {
        const snap = await db
          .collection("assignments")
          .where("userId", "==", userId)
          .get();
        const filtered = snap.docs
          .map((d) => d.data() as Record<string, unknown>)
          .filter((r) => r.courseId === courseId);
        if (filtered.length > 0) {
          return Object.fromEntries(
            filtered.map((r) => [
              String(r.assignmentId),
              {
                id: String(r.id),
                userId: String(r.userId),
                courseId: String(r.courseId),
                assignmentId: String(r.assignmentId),
                submissionText: String(r.submissionText ?? ""),
                artifactUrl: (r.artifactUrl as string | null) ?? null,
                status: (r.status as "submitted" | "reviewed") ?? "submitted",
                mentorFeedback: (r.mentorFeedback as string | null) ?? null,
                submittedAt: String(r.submittedAt ?? new Date().toISOString()),
              },
            ]),
          );
        }
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
  if (isFirestoreConfigured()) {
    try {
      const db = getAdminFirestore();
      if (db) {
        const docSnap = await db
          .collection("settings")
          .doc(`quiz_${userId}_${courseId}`)
          .get();
        if (docSnap.exists) {
          const data = docSnap.data() as Record<string, unknown>;
          return {
            id: String(data.id ?? docSnap.id),
            userId: String(data.userId ?? userId),
            courseId: String(data.courseId ?? courseId),
            quizId: String(data.quizId ?? ""),
            scorePercent: Number(data.scorePercent ?? 0),
            passed: Boolean(data.passed),
            answers: (data.answers ?? {}) as Record<string, number>,
            attemptedAt: String(data.attemptedAt ?? new Date().toISOString()),
          };
        }
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

  const activeByCourseId = new Map<string, CourseEnrollmentRecord>();
  for (const e of enrollments) {
    if (e.status === "active") activeByCourseId.set(e.courseId, e);
  }

  const results: PublicCourseSummary[] = [];
  for (const course of courses) {
    const enrollmentRecord = activeByCourseId.get(course.id) ?? null;
    const enrolled = Boolean(enrollmentRecord);
    const [progressMap, quizAttempt] = enrolled
      ? await Promise.all([
          getUserCourseProgressMap(userId, course.id),
          getUserCourseQuizAttempt(userId, course.id),
        ])
      : [{}, null];
    results.push(
      summarizeCourse(course, enrolled, progressMap, quizAttempt, enrollmentRecord),
    );
  }
  return results;
}

function sanitizeModulesForStudent(
  modules: CourseModule[],
  knowledgeResults: Record<string, KnowledgeCheckResultRecord>,
  moduleAttempts: Record<string, ModuleQuizAttemptRecord>,
): SanitizedCourseModule[] {
  return modules.map((mod) => {
    const attemptedMod = moduleAttempts[mod.id];
    const sanitizedModuleQuiz: SanitizedQuizForStudent | undefined = mod.moduleQuiz
      ? {
          id: mod.moduleQuiz.id,
          title: mod.moduleQuiz.title,
          passingScorePercent: mod.moduleQuiz.passingScorePercent,
          questions: mod.moduleQuiz.questions.map((q) => ({
            id: q.id,
            prompt: q.prompt,
            options: q.options,
            questionType: q.questionType,
            ...(attemptedMod ? { explanation: q.explanation } : {}),
          })),
        }
      : undefined;

    const lessons: SanitizedCourseLesson[] = mod.lessons.map((lesson) => {
      const { knowledgeCheck, ...restLesson } = lesson;
      const attemptedCheck = knowledgeResults[lesson.id];
      return {
        ...restLesson,
        ...(knowledgeCheck
          ? {
              knowledgeCheck: {
                question: knowledgeCheck.question,
                options: knowledgeCheck.options,
                ...(attemptedCheck ? { explanation: knowledgeCheck.explanation } : {}),
              },
            }
          : {}),
      };
    });

    return {
      ...mod,
      lessons,
      moduleQuiz: sanitizedModuleQuiz,
    };
  });
}

export async function getCourseDetailForActor(params: {
  slug: string;
  userId?: string | null;
  bypassLockForAdmin?: boolean;
  previewDraft?: boolean;
}): Promise<CourseDetailResponse | null> {
  const course = await findCourseByIdOrSlug(params.slug);
  if (!course || (!course.isPublished && !params.bypassLockForAdmin)) {
    return null;
  }

  const enrollmentRecord = await getActiveEnrollmentRecord(params.userId, course.id);
  const enrolled = Boolean(enrollmentRecord);
  const canAccess = enrolled || Boolean(params.bypassLockForAdmin);

  if (!canAccess) {
    const visibleModules = getPublishedModules(course, false);
    return {
      locked: true,
      enrolled: false,
      course: summarizeCourse(course, false, {}),
      syllabusModules: visibleModules.map((mod) => ({
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
  const summary = summarizeCourse(
    course,
    true,
    progressMap,
    quizAttempt,
    enrollmentRecord,
  );

  const sanitizedQuiz: SanitizedQuizForStudent = {
    id: extras.quiz.id,
    title: extras.quiz.title,
    passingScorePercent: extras.quiz.passingScorePercent,
    questions: extras.quiz.questions.map((q) => ({
      id: q.id,
      prompt: q.prompt,
      options: q.options,
      questionType: q.questionType,
      ...(quizAttempt ? { explanation: q.explanation } : {}),
    })),
  };

  const includeDrafts = Boolean(params.bypassLockForAdmin && params.previewDraft);
  const rawModules = getPublishedModules(course, includeDrafts);
  const knowledgeResults = enrollmentRecord?.knowledgeCheckResults ?? {};
  const moduleAttempts = enrollmentRecord?.moduleQuizAttempts ?? {};

  return {
    locked: false,
    enrolled: true,
    isPreviewMode: includeDrafts,
    course: summary,
    modules: sanitizeModulesForStudent(rawModules, knowledgeResults, moduleAttempts),
    project: course.project,
    lessonProgress: progressMap,
    lastVisitedLessonId: enrollmentRecord?.lastVisitedLessonId ?? null,
    exerciseCompletions: enrollmentRecord?.exerciseCompletions ?? {},
    knowledgeCheckResults: knowledgeResults,
    moduleQuizAttempts: moduleAttempts,
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
  const docId = `${params.userId}__${params.courseId}`;
  const record: CourseEnrollmentRecord = {
    id: docId,
    userId: params.userId,
    courseId: params.courseId,
    paymentId: params.paymentId,
    status: "active",
    enrolledAt: now,
    updatedAt: now,
    lastVisitedLessonId: null,
    exerciseCompletions: {},
    knowledgeCheckResults: {},
    moduleQuizAttempts: {},
  };

  if (isFirestoreConfigured()) {
    try {
      const db = getAdminFirestore();
      if (db) {
        await db.collection("enrollments").doc(docId).set(record, { merge: true });
      }
    } catch {
      // Fallback cleanly to memory store mirror
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

  store.enrollments.unshift(record);
  return record;
}

export async function revokeCourseEnrollment(params: {
  userId: string;
  courseId: string;
}): Promise<void> {
  const now = new Date().toISOString();
  if (isFirestoreConfigured()) {
    try {
      const db = getAdminFirestore();
      if (db) {
        await db
          .collection("enrollments")
          .doc(`${params.userId}__${params.courseId}`)
          .set({ status: "refunded", updatedAt: now }, { merge: true });
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
    existing.status = "refunded";
    existing.updatedAt = now;
  }
}

async function persistEnrollmentActivityPatch(
  userId: string,
  courseId: string,
  patch: Partial<{
    lastVisitedLessonId: string;
    exerciseCompletions: Record<string, LessonExerciseCompletionRecord>;
    knowledgeCheckResults: Record<string, KnowledgeCheckResultRecord>;
    moduleQuizAttempts: Record<string, ModuleQuizAttemptRecord>;
  }>,
) {
  const now = new Date().toISOString();
  const store = getCoursesMemoryStore();
  const mem = store.enrollments.find(
    (e) => e.userId === userId && e.courseId === courseId && e.status === "active",
  );
  if (mem) {
    if (patch.lastVisitedLessonId !== undefined) mem.lastVisitedLessonId = patch.lastVisitedLessonId;
    if (patch.exerciseCompletions) mem.exerciseCompletions = patch.exerciseCompletions;
    if (patch.knowledgeCheckResults) mem.knowledgeCheckResults = patch.knowledgeCheckResults;
    if (patch.moduleQuizAttempts) mem.moduleQuizAttempts = patch.moduleQuizAttempts;
    mem.updatedAt = now;
  }

  if (isFirestoreConfigured()) {
    try {
      const db = getAdminFirestore();
      if (db) {
        await db
          .collection("enrollments")
          .doc(`${userId}__${courseId}`)
          .set(cleanFirestoreData({ ...patch, updatedAt: now }), { merge: true });
      }
    } catch {
      // Non-fatal fallback
    }
  }
}

export async function recordLastVisitedLesson(params: {
  userId: string;
  courseSlug: string;
  lessonId: string;
}): Promise<{ lastVisitedLessonId?: string; error?: string; statusCode?: number }> {
  const course = await findCourseByIdOrSlug(params.courseSlug);
  if (!course) return { error: "Course not found.", statusCode: 404 };
  const active = await getActiveEnrollmentRecord(params.userId, course.id);
  if (!active) return { error: "Course enrollment required.", statusCode: 403 };

  const exists = course.modules.some((m) => m.lessons.some((l) => l.id === params.lessonId));
  if (!exists) return { error: "Lesson not found in this course.", statusCode: 404 };

  await persistEnrollmentActivityPatch(params.userId, course.id, {
    lastVisitedLessonId: params.lessonId,
  });
  return { lastVisitedLessonId: params.lessonId };
}

export async function updateCourseLessonProgress(params: {
  userId: string;
  courseSlug: string;
  lessonId: string;
  status: LessonProgressStatus;
  readingProgressPercent?: number;
}) {
  const course = await findCourseByIdOrSlug(params.courseSlug);
  if (!course) return { error: "Course not found.", statusCode: 404 };

  const enrollmentRecord = await getActiveEnrollmentRecord(params.userId, course.id);
  if (!enrollmentRecord) {
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
  const readingPercent =
    params.status === "completed"
      ? 100
      : Math.max(0, Math.min(100, params.readingProgressPercent ?? 0));

  if (isFirestoreConfigured()) {
    try {
      const db = getAdminFirestore();
      if (db) {
        const progressDocId = `${params.userId}__${course.id}__${params.lessonId}`;
        await db.collection("progress").doc(progressDocId).set(
          {
            userId: params.userId,
            enrollmentId: enrollmentRecord.id,
            courseId: course.id,
            lessonId: params.lessonId,
            status: params.status,
            readingProgressPercent: readingPercent,
            completedAt,
            updatedAtIso: now,
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
      }
    } catch {
      // Fallback
    }
  }

  const store = getCoursesMemoryStore();
  const existing = store.lessonProgress.find(
    (p) =>
      p.userId === params.userId &&
      p.courseId === course.id &&
      p.lessonId === params.lessonId,
  );
  if (existing) {
    existing.status = params.status;
    existing.readingProgressPercent = readingPercent;
    existing.completedAt = completedAt;
    existing.updatedAt = now;
  } else {
    store.lessonProgress.push({
      userId: params.userId,
      courseId: course.id,
      lessonId: params.lessonId,
      status: params.status,
      readingProgressPercent: readingPercent,
      completedAt,
      updatedAt: now,
    });
  }

  await persistEnrollmentActivityPatch(params.userId, course.id, {
    lastVisitedLessonId: params.lessonId,
  });

  const [progressMap, quizAttempt, refreshedEnrollment] = await Promise.all([
    getUserCourseProgressMap(params.userId, course.id),
    getUserCourseQuizAttempt(params.userId, course.id),
    getActiveEnrollmentRecord(params.userId, course.id),
  ]);
  const summary = summarizeCourse(
    course,
    true,
    progressMap,
    quizAttempt,
    refreshedEnrollment,
  );
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

export async function completeLessonPracticalExercise(params: {
  userId: string;
  courseSlug: string;
  lessonId: string;
  completed: boolean;
}) {
  const course = await findCourseByIdOrSlug(params.courseSlug);
  if (!course) return { error: "Course not found.", statusCode: 404 };
  const enrollmentRecord = await getActiveEnrollmentRecord(params.userId, course.id);
  if (!enrollmentRecord) {
    return { error: "Course enrollment required.", statusCode: 403 };
  }

  const lesson = course.modules.flatMap((m) => m.lessons).find((l) => l.id === params.lessonId);
  if (!lesson || !lesson.practicalExercise) {
    return { error: "Practical exercise not found for this lesson.", statusCode: 404 };
  }

  const next = { ...(enrollmentRecord.exerciseCompletions ?? {}) };
  if (params.completed) {
    next[params.lessonId] = { lessonId: params.lessonId, completedAt: new Date().toISOString() };
  } else {
    delete next[params.lessonId];
  }

  await persistEnrollmentActivityPatch(params.userId, course.id, {
    exerciseCompletions: next,
    lastVisitedLessonId: params.lessonId,
  });

  const [progressMap, quizAttempt, updatedEnrollment] = await Promise.all([
    getUserCourseProgressMap(params.userId, course.id),
    getUserCourseQuizAttempt(params.userId, course.id),
    getActiveEnrollmentRecord(params.userId, course.id),
  ]);
  return {
    exerciseCompletions: next,
    summary: summarizeCourse(course, true, progressMap, quizAttempt, updatedEnrollment),
  };
}

export async function submitLessonKnowledgeCheck(params: {
  userId: string;
  courseSlug: string;
  lessonId: string;
  selectedIndex: number;
}) {
  const course = await findCourseByIdOrSlug(params.courseSlug);
  if (!course) return { error: "Course not found.", statusCode: 404 };
  const enrollmentRecord = await getActiveEnrollmentRecord(params.userId, course.id);
  if (!enrollmentRecord) {
    return { error: "Course enrollment required.", statusCode: 403 };
  }

  const lesson = course.modules.flatMap((m) => m.lessons).find((l) => l.id === params.lessonId);
  if (!lesson || !lesson.knowledgeCheck) {
    return { error: "Knowledge check not configured for this lesson.", statusCode: 404 };
  }

  const passed = params.selectedIndex === lesson.knowledgeCheck.correctIndex;
  const result: KnowledgeCheckResultRecord = {
    lessonId: params.lessonId,
    selectedIndex: params.selectedIndex,
    passed,
    attemptedAt: new Date().toISOString(),
    explanation: lesson.knowledgeCheck.explanation,
  };
  const next = {
    ...(enrollmentRecord.knowledgeCheckResults ?? {}),
    [params.lessonId]: result,
  };

  await persistEnrollmentActivityPatch(params.userId, course.id, {
    knowledgeCheckResults: next,
    lastVisitedLessonId: params.lessonId,
  });

  return {
    result,
    knowledgeCheckResults: next,
  };
}

export async function submitModuleQuiz(params: {
  userId: string;
  courseSlug: string;
  moduleId: string;
  answers: Record<string, number>;
}) {
  const course = await findCourseByIdOrSlug(params.courseSlug);
  if (!course) return { error: "Course not found.", statusCode: 404 };
  const enrollmentRecord = await getActiveEnrollmentRecord(params.userId, course.id);
  if (!enrollmentRecord) {
    return { error: "Course enrollment required before taking module quizzes.", statusCode: 403 };
  }

  const targetModule = course.modules.find((m) => m.id === params.moduleId);
  if (!targetModule || !targetModule.moduleQuiz || targetModule.moduleQuiz.questions.length === 0) {
    return { error: "Module quiz not found.", statusCode: 404 };
  }

  const quiz = targetModule.moduleQuiz;
  let correct = 0;
  for (const q of quiz.questions) {
    if (params.answers[q.id] === q.correctIndex) correct += 1;
  }
  const scorePercent = Math.round((correct / quiz.questions.length) * 100);
  const passed = scorePercent >= quiz.passingScorePercent;

  const attempt: ModuleQuizAttemptRecord = {
    moduleId: targetModule.id,
    quizId: quiz.id,
    scorePercent,
    passed,
    answers: params.answers,
    attemptedAt: new Date().toISOString(),
  };
  const nextAttempts = {
    ...(enrollmentRecord.moduleQuizAttempts ?? {}),
    [targetModule.id]: attempt,
  };

  await persistEnrollmentActivityPatch(params.userId, course.id, {
    moduleQuizAttempts: nextAttempts,
  });

  const [progressMap, finalQuizAttempt, updatedEnrollment] = await Promise.all([
    getUserCourseProgressMap(params.userId, course.id),
    getUserCourseQuizAttempt(params.userId, course.id),
    getActiveEnrollmentRecord(params.userId, course.id),
  ]);

  return {
    attempt,
    moduleQuizAttempts: nextAttempts,
    explanations: Object.fromEntries(quiz.questions.map((q) => [q.id, q.explanation])),
    summary: summarizeCourse(course, true, progressMap, finalQuizAttempt, updatedEnrollment),
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

  if (isFirestoreConfigured()) {
    try {
      const db = getAdminFirestore();
      if (db) {
        const docId = `${params.userId}__${course.id}__${params.assignmentId}`;
        await db.collection("assignments").doc(docId).set(record, { merge: true });
      }
    } catch {
      // Fallback
    }
  }

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

  const enrollmentRecord = await getActiveEnrollmentRecord(params.userId, course.id);
  if (!enrollmentRecord) {
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

  if (isFirestoreConfigured()) {
    try {
      const db = getAdminFirestore();
      if (db) {
        await db
          .collection("settings")
          .doc(`quiz_${params.userId}_${course.id}`)
          .set({ type: "quiz_attempt", ...attempt }, { merge: true });
      }
    } catch {
      // Fallback
    }
  }

  const store = getCoursesMemoryStore();
  const idx = store.quizAttempts.findIndex(
    (a) => a.userId === params.userId && a.courseId === course.id,
  );
  if (idx >= 0) {
    store.quizAttempts[idx] = attempt;
  } else {
    store.quizAttempts.unshift(attempt);
  }

  const progressMap = await getUserCourseProgressMap(params.userId, course.id);
  const summary = summarizeCourse(course, true, progressMap, attempt, enrollmentRecord);
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

  await listAllCoursesRaw(true);
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

  await syncCourseToFirestore(existing);
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
    prerequisites: [
      "Basic programming familiarity and ability to clone and run a Git repository locally",
    ],
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
    contentStatus: "published",
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
            learningObjectives: ["Understand system invariants and server validation contracts"],
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

  await syncCourseToFirestore(created);

  return { course: created };
}
