import assert from "node:assert/strict";
import test from "node:test";
import {
  canAccessCourseProject,
  canAccessInternshipTasks,
  computeUnifiedProgrammeProgression,
} from "../../lib/learning/progression";
import {
  POST as workspacePost,
} from "../../app/api/workspace/learner/route";
import { resetCoursesStoreForTest } from "../../lib/courses/store";
import { resetMemoryStoreForTest } from "../../lib/certifications/store";
import { resetWorkspaceStoreForTest } from "../../lib/learning-workspace-store";

test("progression steps strictly remain locked until prerequisites complete in order", () => {
  // 1. Freshly enrolled student with partial lessons
  const step2 = computeUnifiedProgrammeProgression({
    enrolled: true,
    completedLessonCount: 1,
    totalLessonCount: 5,
    quizPassed: false,
    projectStatus: "not_started",
    hasInternshipTrack: true,
    totalInternshipTasks: 2,
    approvedInternshipTasksCount: 0,
    internshipFinalApproved: false,
    certificateStatus: "none",
    certificateClaimed: false,
  });

  assert.equal(step2.completedStepsCount, 1);
  assert.equal(step2.remainingStepsCount, 8);
  assert.equal(step2.currentStep.key, "learning_modules");
  assert.equal(step2.steps[0].status, "completed");
  assert.equal(step2.steps[1].status, "active");
  for (let i = 2; i < step2.steps.length; i += 1) {
    assert.equal(step2.steps[i].status, "locked");
  }
  assert.equal(step2.canAccessProject, false);
  assert.equal(step2.projectStageStatus, "locked");
  assert.equal(step2.canSubmitInternshipTasks, false);
  assert.equal(step2.certificateState, "locked");

  // 2. Lessons finished, quiz still pending
  const step3 = computeUnifiedProgrammeProgression({
    enrolled: true,
    completedLessonCount: 5,
    totalLessonCount: 5,
    quizPassed: false,
    projectStatus: "not_started",
    hasInternshipTrack: true,
    totalInternshipTasks: 2,
    approvedInternshipTasksCount: 0,
    internshipFinalApproved: false,
    certificateStatus: "none",
    certificateClaimed: false,
  });
  assert.equal(step3.completedStepsCount, 2);
  assert.equal(step3.currentStep.key, "modules_completed");
  assert.equal(step3.canAccessProject, false);

  // 3. Quiz passed -> Project unlocked
  const step4 = computeUnifiedProgrammeProgression({
    enrolled: true,
    completedLessonCount: 5,
    totalLessonCount: 5,
    quizPassed: true,
    projectStatus: "not_started",
    hasInternshipTrack: true,
    totalInternshipTasks: 2,
    approvedInternshipTasksCount: 0,
    internshipFinalApproved: false,
    certificateStatus: "none",
    certificateClaimed: false,
  });
  assert.equal(step4.completedStepsCount, 3);
  assert.equal(step4.currentStep.key, "project_unlocked");
  assert.equal(step4.canAccessProject, true);
  assert.equal(step4.projectStageStatus, "available");

  // 4. Revision requested keeps Step 5 active with Changes requested label
  const revision = computeUnifiedProgrammeProgression({
    enrolled: true,
    completedLessonCount: 5,
    totalLessonCount: 5,
    quizPassed: true,
    projectStatus: "revision_required",
    hasInternshipTrack: true,
    totalInternshipTasks: 2,
    approvedInternshipTasksCount: 0,
    internshipFinalApproved: false,
    certificateStatus: "none",
    certificateClaimed: false,
  });
  assert.equal(revision.currentStep.key, "project_submitted");
  assert.equal(revision.projectStageStatus, "revision_required");
  assert.equal(revision.canSubmitInternshipTasks, false);

  // 5. Project approved -> Program completion active (internship tasks unlocked)
  const step7 = computeUnifiedProgrammeProgression({
    enrolled: true,
    completedLessonCount: 5,
    totalLessonCount: 5,
    quizPassed: true,
    projectStatus: "approved",
    hasInternshipTrack: true,
    totalInternshipTasks: 2,
    approvedInternshipTasksCount: 1,
    internshipFinalApproved: false,
    certificateStatus: "none",
    certificateClaimed: false,
  });
  assert.equal(step7.completedStepsCount, 6);
  assert.equal(step7.currentStep.key, "program_completed");
  assert.equal(step7.canSubmitInternshipTasks, true);
  assert.equal(step7.certificateState, "locked");

  // 6. Completed & Mentor approved -> Certificate Eligible -> Issued -> Claimed
  const eligible = computeUnifiedProgrammeProgression({
    enrolled: true,
    completedLessonCount: 5,
    totalLessonCount: 5,
    quizPassed: true,
    projectStatus: "approved",
    hasInternshipTrack: true,
    totalInternshipTasks: 2,
    approvedInternshipTasksCount: 2,
    internshipFinalApproved: true,
    certificateStatus: "none",
    certificateClaimed: false,
  });
  assert.equal(eligible.completedStepsCount, 7);
  assert.equal(eligible.certificateState, "eligible");
  assert.equal(eligible.currentStep.key, "certificate_unlocked");

  const issued = computeUnifiedProgrammeProgression({
    enrolled: true,
    completedLessonCount: 5,
    totalLessonCount: 5,
    quizPassed: true,
    projectStatus: "approved",
    hasInternshipTrack: true,
    totalInternshipTasks: 2,
    approvedInternshipTasksCount: 2,
    internshipFinalApproved: true,
    certificateStatus: "issued",
    certificateClaimed: false,
  });
  assert.equal(issued.completedStepsCount, 8);
  assert.equal(issued.certificateState, "issued");
  assert.equal(issued.currentStep.key, "certificate_claimed");

  const claimed = computeUnifiedProgrammeProgression({
    enrolled: true,
    completedLessonCount: 5,
    totalLessonCount: 5,
    quizPassed: true,
    projectStatus: "approved",
    hasInternshipTrack: true,
    totalInternshipTasks: 2,
    approvedInternshipTasksCount: 2,
    internshipFinalApproved: true,
    certificateStatus: "issued",
    certificateClaimed: true,
  });
  assert.equal(claimed.completedStepsCount, 9);
  assert.equal(claimed.remainingStepsCount, 0);
  assert.equal(claimed.overallProgressPercent, 100);
  assert.equal(claimed.certificateState, "claimed");
});

test("prerequisite guards explain missing steps cleanly", () => {
  const notEnrolled = canAccessCourseProject({
    enrolled: false,
    completedLessonCount: 0,
    totalLessonCount: 5,
    quizPassed: false,
  });
  assert.equal(notEnrolled.allowed, false);
  assert.match(notEnrolled.reason ?? "", /enrol/i);

  const taskLocked = canAccessInternshipTasks({
    allModulesAndQuizDone: true,
    projectApproved: false,
  });
  assert.equal(taskLocked.allowed, false);
  assert.match(taskLocked.reason ?? "", /mentor approval/i);
});

test("POST /api/workspace/learner blocks project start/submit with 403 when course prerequisites are incomplete", async () => {
  resetMemoryStoreForTest();
  resetCoursesStoreForTest();
  resetWorkspaceStoreForTest();

  // Demo student is enrolled in python-systems-cli ("cli-telemetry-analyzer") with 1/5 lessons done and no quiz pass
  const req = new Request("http://localhost:3000/api/workspace/learner", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "start_project",
      projectSlug: "cli-telemetry-analyzer",
    }),
  });
  const res = await workspacePost(req);
  assert.equal(res.status, 403);
  const body = (await res.json()) as { error?: string };
  assert.match(body.error ?? "", /Complete all learning modules/i);

  // Attempting to submit web project directly without enrolling in web-architecture-systems also returns 403
  const submitReq = new Request("http://localhost:3000/api/workspace/learner", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "submit_project",
      projectSlug: "accessible-learning-portfolio",
      githubUrl: "https://github.com/example/bypass-attempt",
      summary: "Attempting direct API project submission before enrollment.",
    }),
  });
  const submitRes = await workspacePost(submitReq);
  assert.equal(submitRes.status, 403);
});
