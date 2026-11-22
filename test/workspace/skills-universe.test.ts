import test from "node:test";
import assert from "node:assert/strict";
import { buildLearningUniverseSnapshot } from "../../lib/learning/skills-universe";
import {
  activateCourseEnrollment,
  getCourseDetailForActor,
  listCoursesCatalog,
  resetCoursesStoreForTest,
  submitCourseQuiz,
  updateCourseLessonProgress,
} from "../../lib/courses/store";
import {
  resetWorkspaceStoreForTest,
  submitLearnerProjectWork,
  reviewLearnerSubmission,
} from "../../lib/learning-workspace-store";
import {
  DEMO_STUDENT_ID,
  resetMemoryStoreForTest,
} from "../../lib/certifications/store";
import {
  publishAdminCourseDraft,
  upsertAdminLesson,
} from "../../lib/courses/admin-content";

test("enrolling without completing lessons keeps skills locked or in_progress, NEVER acquired", async () => {
  resetMemoryStoreForTest();
  resetCoursesStoreForTest();
  resetWorkspaceStoreForTest();

  const freshUserId = "stu-zero-progress-test";
  await activateCourseEnrollment({
    userId: freshUserId,
    courseId: "course-web-architecture",
    paymentId: "pay-test-web-1",
  });

  const courses = await listCoursesCatalog(freshUserId);
  const details = (
    await Promise.all(
      courses.map((c) => getCourseDetailForActor({ slug: c.slug, userId: freshUserId })),
    )
  ).filter((d): d is NonNullable<typeof d> => Boolean(d));

  const snapshot = buildLearningUniverseSnapshot({
    courseDetails: details,
    submissions: [],
    internships: [],
    applications: [],
    issuances: [],
  });

  assert.equal(
    snapshot.metrics.skillsAcquiredCount,
    0,
    "Zero skills may be acquired purely from course enrollment",
  );
  assert.equal(snapshot.metrics.lessonsCompletedCount, 0);

  const webFirstSkill = snapshot.nodes.find((n) => n.id === "skill-web-landmarks");
  const webSecondSkill = snapshot.nodes.find((n) => n.id === "skill-web-boundaries");
  assert.ok(webFirstSkill);
  assert.ok(webSecondSkill);
  assert.equal(webFirstSkill.status, "in_progress");
  assert.equal(webFirstSkill.progressPercent, 0);
  assert.equal(webSecondSkill.status, "locked");
});

test("completing lessons, quiz, and approved project advances dependent skills cleanly", async () => {
  resetMemoryStoreForTest();
  resetCoursesStoreForTest();
  resetWorkspaceStoreForTest();

  const studentId = DEMO_STUDENT_ID;

  // Seed already has les-py-1-note completed for DEMO_STUDENT_ID
  let courses = await listCoursesCatalog(studentId);
  let details = (
    await Promise.all(
      courses.map((c) => getCourseDetailForActor({ slug: c.slug, userId: studentId })),
    )
  ).filter((d): d is NonNullable<typeof d> => Boolean(d));

  let snap = buildLearningUniverseSnapshot({
    courseDetails: details,
    submissions: [],
    internships: [],
    applications: [],
    issuances: [],
  });

  const genNode = snap.nodes.find((n) => n.id === "skill-py-generators");
  const dcNode = snap.nodes.find((n) => n.id === "skill-py-dataclasses");
  assert.equal(genNode?.status, "acquired");
  assert.equal(dcNode?.status, "in_progress");

  // Complete remaining python lessons and capstone approval
  for (const lessonId of ["les-py-1-video", "les-py-2-note", "les-py-2-video", "les-py-3-project"]) {
    await updateCourseLessonProgress({
      userId: studentId,
      courseSlug: "python-systems-cli",
      lessonId,
      status: "completed",
    });
  }

  const submitted = submitLearnerProjectWork({
    userId: studentId,
    learnerName: "Aarav Sharma",
    learnerEmail: "aarav.sharma@example.edu",
    projectSlug: "cli-telemetry-analyzer",
    githubUrl: "https://github.com/example/cli-telemetry",
    summary: "Implemented streaming Python CLI telemetry analyzer with full UTC unit tests.",
    reflection: "Used buffered lazy iterators and strict ISO-8601 parsing.",
  });
  assert.ok(submitted.submission);

  const reviewed = reviewLearnerSubmission({
    submissionId: submitted.submission.id,
    mentorName: "Ananya Rao",
    decision: "approved",
    mentorFeedback: "Clean generator pipeline and deterministic exit codes.",
  });
  assert.equal(reviewed.submission?.status, "approved");

  courses = await listCoursesCatalog(studentId);
  details = (
    await Promise.all(
      courses.map((c) => getCourseDetailForActor({ slug: c.slug, userId: studentId })),
    )
  ).filter((d): d is NonNullable<typeof d> => Boolean(d));

  snap = buildLearningUniverseSnapshot({
    courseDetails: details,
    submissions: reviewed.submission ? [reviewed.submission] : [],
    internships: [],
    applications: [],
    issuances: [],
  });

  assert.equal(snap.nodes.find((n) => n.id === "skill-py-dataclasses")?.status, "acquired");
  assert.equal(snap.nodes.find((n) => n.id === "skill-py-cli")?.status, "acquired");
  assert.equal(snap.nodes.find((n) => n.id === "cap-py-telemetry")?.status, "acquired");
  assert.equal(snap.nodes.find((n) => n.id === "cap-py-telemetry")?.proficiencyLevel, "Mastered");
  assert.equal(snap.metrics.projectsApprovedCount, 1);
  assert.ok(snap.metrics.learningHoursCompleted > 0);
});

test("final quiz submission & admin custom lesson skills appear dynamically in constellation once published", async () => {
  resetMemoryStoreForTest();
  resetCoursesStoreForTest();
  resetWorkspaceStoreForTest();

  const adminRes = await upsertAdminLesson({
    courseId: "course-python-systems",
    moduleId: "mod-py-1",
    lessonId: "les-py-1-note",
    title: "Streaming Iterators vs. Eager Loads",
    lessonType: "note",
    durationLabel: "25 min read",
    summary: "Stream JSONL rows cleanly in constant memory.",
    isDraft: false,
    skills: ["Backpressure Pipelines"],
  });
  assert.ok(!adminRes.error);

  const pubRes = await publishAdminCourseDraft("course-python-systems");
  assert.ok(!pubRes.error);

  const quizRes = await submitCourseQuiz({
    userId: DEMO_STUDENT_ID,
    courseSlug: "python-systems-cli",
    answers: { "q-py-1": 1, "q-py-2": 1, "q-py-3": 1 },
  });
  assert.equal(quizRes.attempt?.passed, true);

  const courses = await listCoursesCatalog(DEMO_STUDENT_ID);
  const details = (
    await Promise.all(
      courses.map((c) => getCourseDetailForActor({ slug: c.slug, userId: DEMO_STUDENT_ID })),
    )
  ).filter((d): d is NonNullable<typeof d> => Boolean(d));

  const snap = buildLearningUniverseSnapshot({
    courseDetails: details,
    submissions: [],
    internships: [],
    applications: [],
    issuances: [],
  });

  const customNode = snap.nodes.find((n) => n.title === "Backpressure Pipelines");
  assert.ok(customNode, "Custom admin-mapped skill should appear in universe");
  assert.equal(customNode.status, "acquired");
  assert.equal(snap.metrics.assessmentsPassedCount, 1);
});
