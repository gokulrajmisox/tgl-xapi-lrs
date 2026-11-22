import {
  findCourseByIdOrSlug,
  getCoursesMemoryStore,
  resolveCourseExtras,
  syncCourseToFirestore,
} from "./store";
import type {
  CourseAssignment,
  CourseDefinition,
  CourseLesson,
  CourseModule,
  CourseProjectDefinition,
  CourseQuiz,
} from "./catalog";

export type AdminCourseStudioPayload = {
  course: CourseDefinition;
  editableModules: CourseModule[];
  assignments: CourseAssignment[];
  finalQuiz: CourseQuiz;
  skills: string[];
};

function ensureDraftModules(course: CourseDefinition): CourseModule[] {
  if (!course.draftModules || course.draftModules.length === 0) {
    course.draftModules = structuredClone(course.modules);
  }
  course.contentStatus = "draft";
  return course.draftModules;
}

export function extractYoutubeVideoId(input?: string | null): string | undefined {
  if (!input) return undefined;
  const trimmed = input.trim();
  if (!trimmed) return undefined;
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
  try {
    const parsed = new URL(trimmed);
    const vParam = parsed.searchParams.get("v");
    if (vParam && /^[a-zA-Z0-9_-]{11}$/.test(vParam)) return vParam;
    const segments = parsed.pathname.split("/").filter(Boolean);
    const tail = segments[segments.length - 1];
    if (tail && /^[a-zA-Z0-9_-]{11}$/.test(tail)) return tail;
  } catch {
    return undefined;
  }
  return undefined;
}

export async function getAdminCourseStudioDetail(
  courseIdOrSlug: string,
): Promise<AdminCourseStudioPayload | null> {
  const course = await findCourseByIdOrSlug(courseIdOrSlug);
  if (!course) return null;
  const extras = resolveCourseExtras(course.slug);
  const editableModules =
    course.draftModules && course.draftModules.length > 0
      ? structuredClone(course.draftModules)
      : structuredClone(course.modules);
  return {
    course: structuredClone(course),
    editableModules,
    assignments: structuredClone(extras.assignments),
    finalQuiz: structuredClone(extras.quiz),
    skills: [...extras.skills],
  };
}

export async function updateAdminCourseCurriculumMeta(params: {
  courseId: string;
  prerequisites?: string[];
  outcomes?: string[];
  project?: Partial<CourseProjectDefinition>;
}): Promise<{ studio?: AdminCourseStudioPayload; error?: string }> {
  const store = getCoursesMemoryStore();
  const course = store.courses.find((c) => c.id === params.courseId);
  if (!course) return { error: "Course not found." };

  if (Array.isArray(params.prerequisites)) {
    course.prerequisites = params.prerequisites.map((s) => s.trim()).filter(Boolean);
  }
  if (Array.isArray(params.outcomes) && params.outcomes.length > 0) {
    course.outcomes = params.outcomes.map((s) => s.trim()).filter(Boolean);
  }
  if (params.project) {
    course.project = {
      ...course.project,
      ...params.project,
    };
  }

  await syncCourseToFirestore(course);
  const studio = await getAdminCourseStudioDetail(course.id);
  return { studio: studio ?? undefined };
}

export async function upsertAdminModule(params: {
  courseId: string;
  moduleId?: string;
  title: string;
  summary: string;
  estimatedMinutes: number;
  isDraft?: boolean;
  skills?: string[];
  learningOutcomes?: string[];
  moduleQuiz?: CourseQuiz;
}): Promise<{ studio?: AdminCourseStudioPayload; moduleId?: string; error?: string }> {
  const store = getCoursesMemoryStore();
  const course = store.courses.find((c) => c.id === params.courseId);
  if (!course) return { error: "Course not found." };

  const draft = ensureDraftModules(course);
  const targetIdx = params.moduleId
    ? draft.findIndex((m) => m.id === params.moduleId)
    : -1;

  const normalizedSkills = params.skills
    ?.map((s) => s.trim())
    .filter(Boolean);

  if (targetIdx >= 0) {
    const existing = draft[targetIdx];
    draft[targetIdx] = {
      ...existing,
      title: params.title.trim(),
      summary: params.summary.trim(),
      estimatedMinutes: Math.max(5, Math.round(params.estimatedMinutes)),
      isDraft: Boolean(params.isDraft),
      skills: normalizedSkills !== undefined ? normalizedSkills : existing.skills,
      learningOutcomes: params.learningOutcomes?.map((s) => s.trim()).filter(Boolean) ?? existing.learningOutcomes,
      moduleQuiz: params.moduleQuiz ?? existing.moduleQuiz,
    };
    await syncCourseToFirestore(course);
    return {
      studio: (await getAdminCourseStudioDetail(course.id)) ?? undefined,
      moduleId: existing.id,
    };
  }

  const newId = `mod-${course.id.slice(0, 12)}-${Date.now().toString(36)}`;
  draft.push({
    id: newId,
    sortOrder: draft.length + 1,
    title: params.title.trim(),
    summary: params.summary.trim(),
    estimatedMinutes: Math.max(5, Math.round(params.estimatedMinutes)),
    isDraft: Boolean(params.isDraft),
    ...(normalizedSkills?.length ? { skills: normalizedSkills } : {}),
    learningOutcomes: params.learningOutcomes?.map((s) => s.trim()).filter(Boolean) ?? [],
    lessons: [],
    moduleQuiz: params.moduleQuiz,
  });

  await syncCourseToFirestore(course);
  return {
    studio: (await getAdminCourseStudioDetail(course.id)) ?? undefined,
    moduleId: newId,
  };
}

export async function reorderAdminModules(params: {
  courseId: string;
  moduleId: string;
  direction: "up" | "down";
}): Promise<{ studio?: AdminCourseStudioPayload; error?: string }> {
  const store = getCoursesMemoryStore();
  const course = store.courses.find((c) => c.id === params.courseId);
  if (!course) return { error: "Course not found." };

  const draft = ensureDraftModules(course);
  const idx = draft.findIndex((m) => m.id === params.moduleId);
  if (idx < 0) return { error: "Module not found." };

  const swapIdx = params.direction === "up" ? idx - 1 : idx + 1;
  if (swapIdx >= 0 && swapIdx < draft.length) {
    const temp = draft[idx];
    draft[idx] = draft[swapIdx];
    draft[swapIdx] = temp;
    draft.forEach((m, i) => {
      m.sortOrder = i + 1;
    });
  }

  await syncCourseToFirestore(course);
  return { studio: (await getAdminCourseStudioDetail(course.id)) ?? undefined };
}

export async function deleteAdminModule(params: {
  courseId: string;
  moduleId: string;
}): Promise<{ studio?: AdminCourseStudioPayload; error?: string }> {
  const store = getCoursesMemoryStore();
  const course = store.courses.find((c) => c.id === params.courseId);
  if (!course) return { error: "Course not found." };

  const draft = ensureDraftModules(course);
  if (draft.length <= 1) {
    return { error: "A programme must keep at least 1 module." };
  }
  const filtered = draft.filter((m) => m.id !== params.moduleId);
  filtered.forEach((m, i) => {
    m.sortOrder = i + 1;
  });
  course.draftModules = filtered;

  await syncCourseToFirestore(course);
  return { studio: (await getAdminCourseStudioDetail(course.id)) ?? undefined };
}

export async function upsertAdminLesson(params: {
  courseId: string;
  moduleId: string;
  lessonId?: string;
  title: string;
  lessonType: CourseLesson["lessonType"];
  durationLabel: string;
  summary: string;
  isDraft?: boolean;
  skills?: string[];
  learningObjectives?: string[];
  realWorldContext?: string;
  noteHeading?: string;
  noteBody?: string;
  codeSnippet?: string;
  takeaway?: string;
  youtubeUrl?: string;
  videoCreator?: string;
  practicalExercise?: CourseLesson["practicalExercise"];
  commonMistakes?: CourseLesson["commonMistakes"];
  knowledgeCheck?: CourseLesson["knowledgeCheck"];
  resources?: CourseLesson["resources"];
  attachments?: CourseLesson["attachments"];
}): Promise<{ studio?: AdminCourseStudioPayload; lessonId?: string; error?: string }> {
  const store = getCoursesMemoryStore();
  const course = store.courses.find((c) => c.id === params.courseId);
  if (!course) return { error: "Course not found." };

  const draft = ensureDraftModules(course);
  const mod = draft.find((m) => m.id === params.moduleId);
  if (!mod) return { error: "Module not found." };

  const videoId = extractYoutubeVideoId(params.youtubeUrl);
  const existingIdx = params.lessonId
    ? mod.lessons.findIndex((l) => l.id === params.lessonId)
    : -1;

  if (existingIdx >= 0) {
    const prev = mod.lessons[existingIdx];
    const updatedNoteSections =
      params.noteHeading || params.noteBody
        ? [
            {
              heading: params.noteHeading?.trim() || prev.noteSections[0]?.heading || "Core Concept",
              body: params.noteBody?.trim() || prev.noteSections[0]?.body || params.summary.trim(),
              ...(params.codeSnippet?.trim() ? { codeSnippet: params.codeSnippet } : {}),
              takeaway:
                params.takeaway?.trim() ||
                prev.noteSections[0]?.takeaway ||
                "Verify assumptions cleanly with deterministic tests.",
            },
            ...prev.noteSections.slice(1),
          ]
        : prev.noteSections;

    mod.lessons[existingIdx] = {
      ...prev,
      title: params.title.trim(),
      lessonType: params.lessonType,
      durationLabel: params.durationLabel.trim() || prev.durationLabel,
      summary: params.summary.trim(),
      isDraft: Boolean(params.isDraft),
      skills:
        params.skills !== undefined
          ? params.skills.map((s) => s.trim()).filter(Boolean)
          : prev.skills,
      learningObjectives:
        params.learningObjectives?.map((s) => s.trim()).filter(Boolean) ??
        prev.learningObjectives,
      realWorldContext: params.realWorldContext?.trim() || prev.realWorldContext,
      noteSections: updatedNoteSections,
      youtubeVideoId: videoId ?? (params.youtubeUrl === "" ? undefined : prev.youtubeVideoId),
      youtubeUrl:
        params.youtubeUrl === ""
          ? undefined
          : params.youtubeUrl?.trim() || prev.youtubeUrl,
      videoCreator: params.videoCreator?.trim() || prev.videoCreator,
      practicalExercise:
        params.practicalExercise !== undefined ? params.practicalExercise : prev.practicalExercise,
      commonMistakes:
        params.commonMistakes !== undefined ? params.commonMistakes : prev.commonMistakes,
      knowledgeCheck:
        params.knowledgeCheck !== undefined ? params.knowledgeCheck : prev.knowledgeCheck,
      resources: params.resources !== undefined ? params.resources : prev.resources,
      attachments: params.attachments !== undefined ? params.attachments : prev.attachments,
    };

    await syncCourseToFirestore(course);
    return {
      studio: (await getAdminCourseStudioDetail(course.id)) ?? undefined,
      lessonId: prev.id,
    };
  }

  const newId = `les-${mod.id.slice(0, 12)}-${Date.now().toString(36)}`;
  const newLesson: CourseLesson = {
    id: newId,
    sortOrder: mod.lessons.length + 1,
    title: params.title.trim(),
    lessonType: params.lessonType,
    durationLabel: params.durationLabel.trim() || "20 min read",
    summary: params.summary.trim(),
    isDraft: Boolean(params.isDraft),
    ...(params.skills?.length
      ? { skills: params.skills.map((s) => s.trim()).filter(Boolean) }
      : {}),
    learningObjectives:
      params.learningObjectives?.map((s) => s.trim()).filter(Boolean) ?? [
        `Master ${params.title.trim()}`,
      ],
    realWorldContext: params.realWorldContext?.trim(),
    noteSections: [
      {
        heading: params.noteHeading?.trim() || "Core Engineering Explanation",
        body: params.noteBody?.trim() || params.summary.trim(),
        ...(params.codeSnippet?.trim() ? { codeSnippet: params.codeSnippet } : {}),
        takeaway:
          params.takeaway?.trim() ||
          "Verify behavior with explicit unit tests before moving to the next module.",
      },
    ],
    ...(videoId
      ? {
          youtubeVideoId: videoId,
          youtubeUrl: params.youtubeUrl?.trim(),
          videoCreator: params.videoCreator?.trim() || "External Educator (YouTube)",
        }
      : {}),
    practicalExercise: params.practicalExercise,
    commonMistakes: params.commonMistakes,
    knowledgeCheck: params.knowledgeCheck,
    resources: params.resources ?? [],
    attachments: params.attachments ?? [],
  };
  mod.lessons.push(newLesson);

  await syncCourseToFirestore(course);
  return {
    studio: (await getAdminCourseStudioDetail(course.id)) ?? undefined,
    lessonId: newId,
  };
}

export async function reorderAdminLessons(params: {
  courseId: string;
  moduleId: string;
  lessonId: string;
  direction: "up" | "down";
}): Promise<{ studio?: AdminCourseStudioPayload; error?: string }> {
  const store = getCoursesMemoryStore();
  const course = store.courses.find((c) => c.id === params.courseId);
  if (!course) return { error: "Course not found." };

  const draft = ensureDraftModules(course);
  const mod = draft.find((m) => m.id === params.moduleId);
  if (!mod) return { error: "Module not found." };

  const idx = mod.lessons.findIndex((l) => l.id === params.lessonId);
  if (idx < 0) return { error: "Lesson not found." };

  const swapIdx = params.direction === "up" ? idx - 1 : idx + 1;
  if (swapIdx >= 0 && swapIdx < mod.lessons.length) {
    const temp = mod.lessons[idx];
    mod.lessons[idx] = mod.lessons[swapIdx];
    mod.lessons[swapIdx] = temp;
    mod.lessons.forEach((l, i) => {
      l.sortOrder = i + 1;
    });
  }

  await syncCourseToFirestore(course);
  return { studio: (await getAdminCourseStudioDetail(course.id)) ?? undefined };
}

export async function deleteAdminLesson(params: {
  courseId: string;
  moduleId: string;
  lessonId: string;
}): Promise<{ studio?: AdminCourseStudioPayload; error?: string }> {
  const store = getCoursesMemoryStore();
  const course = store.courses.find((c) => c.id === params.courseId);
  if (!course) return { error: "Course not found." };

  const draft = ensureDraftModules(course);
  const mod = draft.find((m) => m.id === params.moduleId);
  if (!mod) return { error: "Module not found." };

  mod.lessons = mod.lessons.filter((l) => l.id !== params.lessonId);
  mod.lessons.forEach((l, i) => {
    l.sortOrder = i + 1;
  });

  await syncCourseToFirestore(course);
  return { studio: (await getAdminCourseStudioDetail(course.id)) ?? undefined };
}

export async function upsertAdminQuizOrAssignment(params: {
  courseId: string;
  finalQuiz?: CourseQuiz;
  assignments?: CourseAssignment[];
}): Promise<{ studio?: AdminCourseStudioPayload; error?: string }> {
  const store = getCoursesMemoryStore();
  const course = store.courses.find((c) => c.id === params.courseId);
  if (!course) return { error: "Course not found." };

  const currentExtras = resolveCourseExtras(course.slug);
  store.extrasBySlug[course.slug] = {
    ...store.extrasBySlug[course.slug],
    assignments: params.assignments ?? currentExtras.assignments,
    quiz: params.finalQuiz ?? currentExtras.quiz,
  };

  const studio = await getAdminCourseStudioDetail(course.id);
  return { studio: studio ?? undefined };
}

export async function publishAdminCourseDraft(
  courseId: string,
): Promise<{ studio?: AdminCourseStudioPayload; error?: string }> {
  const store = getCoursesMemoryStore();
  const course = store.courses.find((c) => c.id === courseId);
  if (!course) return { error: "Course not found." };

  if (course.draftModules && course.draftModules.length > 0) {
    course.modules = structuredClone(course.draftModules);
    course.draftModules = undefined;
  }
  course.contentStatus = "published";

  await syncCourseToFirestore(course);
  return { studio: (await getAdminCourseStudioDetail(course.id)) ?? undefined };
}

export async function discardAdminCourseDraft(
  courseId: string,
): Promise<{ studio?: AdminCourseStudioPayload; error?: string }> {
  const store = getCoursesMemoryStore();
  const course = store.courses.find((c) => c.id === courseId);
  if (!course) return { error: "Course not found." };

  course.draftModules = undefined;
  course.contentStatus = "published";

  await syncCourseToFirestore(course);
  return { studio: (await getAdminCourseStudioDetail(course.id)) ?? undefined };
}
