import test from "node:test";
import assert from "node:assert/strict";
import { SEED_COURSES } from "../../lib/courses/catalog";
import {
  activateCourseEnrollment,
  completeLessonPracticalExercise,
  getCourseDetailForActor,
  listCoursesCatalog,
  recordLastVisitedLesson,
  submitLessonKnowledgeCheck,
  submitModuleQuiz,
} from "../../lib/courses/store";
import {
  discardAdminCourseDraft,
  getAdminCourseStudioDetail,
  publishAdminCourseDraft,
  reorderAdminModules,
  updateAdminCourseCurriculumMeta,
  upsertAdminLesson,
} from "../../lib/courses/admin-content";
import { DEMO_STUDENT_ID } from "../../lib/firebase/server";

test("all 6 seeded programmes meet Coursera-grade depth, rubric, exercise, and verified-link standards", () => {
  assert.equal(SEED_COURSES.length, 6);

  for (const course of SEED_COURSES) {
    assert.ok(
      (course.prerequisites?.length ?? 0) >= 2,
      `${course.slug} should define >= 2 prerequisites`,
    );
    assert.ok(course.modules.length >= 3, `${course.slug} should have >= 3 modules`);
    assert.ok(
      course.project.problemStatement && course.project.problemStatement.length > 20,
      `${course.slug} project should have problemStatement`,
    );
    assert.ok(
      course.project.useCase && course.project.useCase.length > 20,
      `${course.slug} project should have useCase`,
    );
    assert.ok(
      (course.project.technologies?.length ?? 0) >= 3,
      `${course.slug} project should list >= 3 technologies`,
    );
    const rubric = course.project.structuredRubric ?? [];
    assert.ok(rubric.length >= 3, `${course.slug} project should have >= 3 rubric criteria`);
    const weightTotal = rubric.reduce((sum, item) => sum + item.weightPercent, 0);
    assert.equal(weightTotal, 100, `${course.slug} structuredRubric weights should sum to 100%`);

    const totalCourseLessons = course.modules.reduce((acc, m) => acc + m.lessons.length, 0);
    assert.ok(totalCourseLessons >= 5, `${course.slug} should have >= 5 total lessons`);

    for (const mod of course.modules) {
      const minLessons = mod.sortOrder <= 2 ? 2 : 1;
      assert.ok(
        mod.lessons.length >= minLessons,
        `${course.slug} / ${mod.id} should have >= ${minLessons} lessons`,
      );
      assert.ok(mod.moduleQuiz, `${course.slug} / ${mod.id} should include a moduleQuiz`);
      assert.ok(
        mod.moduleQuiz.questions.length >= 2,
        `${course.slug} / ${mod.id} moduleQuiz should have >= 2 questions`,
      );
      for (const q of mod.moduleQuiz.questions) {
        assert.ok(
          q.correctIndex >= 0 && q.correctIndex < q.options.length,
          `${course.slug} / ${mod.id} question ${q.id} has valid correctIndex`,
        );
        assert.ok(q.explanation.length > 10);
      }

      for (const les of mod.lessons) {
        assert.ok(
          (les.learningObjectives?.length ?? 0) >= 2,
          `${les.id} should have >= 2 learningObjectives`,
        );
        assert.ok(les.realWorldContext && les.realWorldContext.length > 20);
        const minSections = les.lessonType === "note" ? 2 : 1;
        assert.ok(
          les.noteSections.length >= minSections,
          `${les.id} should have >= ${minSections} noteSections`,
        );
        assert.ok((les.keyConcepts?.length ?? 0) >= 2, `${les.id} should have keyConcepts`);
        assert.ok(les.practicalExercise, `${les.id} should have practicalExercise`);
        assert.ok(les.practicalExercise.instructions.length >= 2);
        assert.ok((les.commonMistakes?.length ?? 0) >= 1, `${les.id} should have commonMistakes`);
        assert.ok((les.keyTakeaways?.length ?? 0) >= 2, `${les.id} should have keyTakeaways`);
        assert.ok(les.knowledgeCheck, `${les.id} should have knowledgeCheck`);
        assert.ok(
          les.knowledgeCheck.correctIndex >= 0 &&
            les.knowledgeCheck.correctIndex < les.knowledgeCheck.options.length,
        );
        assert.ok(les.resources.length >= 1, `${les.id} should include >= 1 verified resource`);
        for (const r of les.resources) {
          assert.match(r.url, /^https:\/\//);
          assert.ok(
            !r.url.includes("web.dev/articles/wcag-contrast"),
            `${les.id} must not reference removed 404 web.dev wcag-contrast URL`,
          );
        }
      }
    }
  }
});

test("locked preview exposes prerequisites while stripping protected notes, exercises, and quiz answers", async () => {
  const locked = await getCourseDetailForActor({
    slug: "web-architecture-systems",
    userId: "visitor-no-enrollment",
  });
  assert.ok(locked);
  assert.equal(locked.locked, true);
  assert.ok(locked.course.prerequisites.length >= 2);

  const json = JSON.stringify(locked);
  assert.equal(json.includes("practicalExercise"), false);
  assert.equal(json.includes("knowledgeCheck"), false);
  assert.equal(json.includes("moduleQuiz"), false);
  assert.equal(json.includes("correctIndex"), false);
});

test("enrolled learner resumes lastVisitedLessonId and tracks exercises, knowledge checks, and module quizzes", async () => {
  const userId = "enhancement-learner-1";
  await activateCourseEnrollment({
    userId,
    courseId: "course-web-architecture",
    paymentId: "pay-enhance-001",
  });

  // 1. Check demo student seed resume point on python-systems-cli
  const demoDetail = await getCourseDetailForActor({
    slug: "python-systems-cli",
    userId: DEMO_STUDENT_ID,
  });
  assert.ok(demoDetail && !demoDetail.locked);
  assert.equal(demoDetail.lastVisitedLessonId, "les-py-1-video");
  // Ensure correctIndex is never leaked in unlocked DTO
  assert.equal(JSON.stringify(demoDetail).includes("correctIndex"), false);

  // 2. Unenrolled user cannot mutate progress
  const unauthVisit = await recordLastVisitedLesson({
    userId: "stranger-999",
    courseSlug: "web-architecture-systems",
    lessonId: "les-web-1-note",
  });
  assert.equal(unauthVisit.statusCode, 403);

  // 3. Visit lesson persists lastVisitedLessonId
  const visited = await recordLastVisitedLesson({
    userId,
    courseSlug: "web-architecture-systems",
    lessonId: "les-web-1-video",
  });
  assert.equal(visited.lastVisitedLessonId, "les-web-1-video");

  const reloaded = await getCourseDetailForActor({
    slug: "web-architecture-systems",
    userId,
  });
  assert.ok(reloaded && !reloaded.locked);
  assert.equal(reloaded.lastVisitedLessonId, "les-web-1-video");

  // 4. Practical exercise completion updates summary counts
  const exRes = await completeLessonPracticalExercise({
    userId,
    courseSlug: "web-architecture-systems",
    lessonId: "les-web-1-note",
    completed: true,
  });
  assert.ok(exRes.summary);
  assert.equal(exRes.summary.completedExerciseCount, 1);

  // 5. Knowledge check grades deterministically
  const seedWeb = SEED_COURSES.find((c) => c.slug === "web-architecture-systems")!;
  const firstLesson = seedWeb.modules[0].lessons[0];
  const expectedIdx = firstLesson.knowledgeCheck!.correctIndex;
  const kcRes = await submitLessonKnowledgeCheck({
    userId,
    courseSlug: "web-architecture-systems",
    lessonId: firstLesson.id,
    selectedIndex: expectedIdx,
  });
  assert.equal(kcRes.result?.passed, true);

  // 6. Module checkpoint quiz grades & unlocks module quiz pass count
  const mod1 = seedWeb.modules[0];
  const answers = Object.fromEntries(
    mod1.moduleQuiz!.questions.map((q) => [q.id, q.correctIndex]),
  );
  const mqRes = await submitModuleQuiz({
    userId,
    courseSlug: "web-architecture-systems",
    moduleId: mod1.id,
    answers,
  });
  assert.equal(mqRes.attempt?.passed, true);
  assert.equal(mqRes.attempt?.scorePercent, 100);
  assert.equal(mqRes.summary?.passedModuleQuizCount, 1);

  const catalog = await listCoursesCatalog(userId);
  const webCard = catalog.find((c) => c.slug === "web-architecture-systems");
  assert.equal(webCard?.lastVisitedLessonId, "les-web-1-note");
  assert.equal(webCard?.completedExerciseCount, 1);
  assert.equal(webCard?.passedModuleQuizCount, 1);
});

test("admin course studio isolates draft edits from students until published and allows preview", async () => {
  const courseId = "course-applied-ai";
  const slug = "applied-ai-evaluation";
  const studentId = "draft-test-student";
  await activateCourseEnrollment({
    userId: studentId,
    courseId,
    paymentId: "pay-draft-001",
  });

  const beforeStudio = await getAdminCourseStudioDetail(courseId);
  assert.ok(beforeStudio);
  const firstModId = beforeStudio.editableModules[0].id;

  // Stage a draft lesson
  const added = await upsertAdminLesson({
    courseId,
    moduleId: firstModId,
    title: "Staged Draft Token Budgeting Lab",
    lessonType: "note",
    durationLabel: "15 min read",
    summary: "Experimental lesson kept in draft mode before publish.",
    isDraft: true,
    noteHeading: "Token Caps",
    noteBody: "Enforce hard token budgets per request path.",
  });
  assert.ok(added.lessonId);

  // Enrolled regular student MUST NOT see draft lesson yet
  const studentViewBefore = await getCourseDetailForActor({
    slug,
    userId: studentId,
  });
  assert.ok(studentViewBefore && !studentViewBefore.locked);
  const studentLessonIdsBefore = studentViewBefore.modules.flatMap((m) =>
    m.lessons.map((l) => l.id),
  );
  assert.equal(studentLessonIdsBefore.includes(added.lessonId!), false);

  // Admin "Preview as Student" DOES see the draft lesson
  const adminPreview = await getCourseDetailForActor({
    slug,
    userId: "sandbox-admin",
    bypassLockForAdmin: true,
    previewDraft: true,
  });
  assert.ok(adminPreview && !adminPreview.locked);
  const previewLessonIds = adminPreview.modules.flatMap((m) => m.lessons.map((l) => l.id));
  assert.equal(previewLessonIds.includes(added.lessonId!), true);

  // Reorder module stays in draft only
  const reordered = await reorderAdminModules({
    courseId,
    moduleId: firstModId,
    direction: "down",
  });
  assert.equal(reordered.studio?.editableModules[1].id, firstModId);

  // Discard draft restores clean live state cleanly (keeps test catalog pristine for subsequent tests)
  const discarded = await discardAdminCourseDraft(courseId);
  assert.equal(discarded.studio?.course.contentStatus, "published");
  assert.equal(discarded.studio?.editableModules[0].id, firstModId);

  // Test updateAdminCourseCurriculumMeta & publish cycle on clean non-destructive metadata
  const updatedMeta = await updateAdminCourseCurriculumMeta({
    courseId,
    prerequisites: [
      ...(beforeStudio.course.prerequisites ?? []),
      "Familiarity with JSON Schema validation",
    ],
  });
  assert.ok(
    updatedMeta.studio?.course.prerequisites?.includes("Familiarity with JSON Schema validation"),
  );
  const published = await publishAdminCourseDraft(courseId);
  assert.equal(published.studio?.course.contentStatus, "published");
});
