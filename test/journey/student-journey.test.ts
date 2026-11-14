import assert from "node:assert/strict";
import test from "node:test";
import {
  approveInternshipApplication,
  claimIncludedCertificate,
  createAdminInternship,
  createCertificationOrder,
  createCourseEnrollmentOrder,
  evaluateInternshipTaskSubmission,
  getCertificateByPublicId,
  listInternships,
  listProducts,
  listStudentApplications,
  resetMemoryStoreForTest,
  submitInternshipTaskWork,
  verifyAndCaptureCheckoutPayment,
  type SandboxUser,
} from "../../lib/certifications/store";
import {
  createAdminCourse,
  getCourseDetailForActor,
  resetCoursesStoreForTest,
  submitCourseAssignment,
  submitCourseQuiz,
  updateCourseLessonProgress,
} from "../../lib/courses/store";
import { evaluateInternshipEligibility } from "../../lib/internships/eligibility";
import {
  getProjectStatusForUser,
  resetWorkspaceStoreForTest,
  reviewLearnerSubmission,
  startLearnerProjectWork,
  submitLearnerProjectWork,
} from "../../lib/learning-workspace-store";
import { getProjectGuidance, learningProjects } from "../../lib/learning-graph";

const freshStudent: SandboxUser = {
  id: "00000000-0000-4000-8000-000000000777",
  email: "kavya.nair@example.edu",
  name: "Kavya Nair",
  role: "student",
  isSandbox: true,
};

test("End-to-end journey: Pay -> Enrol -> Learn (Assignments + Quiz) -> 5-stage Project -> Internship Tasks -> Final Approval -> Certificate + QR Lookup", async () => {
  resetMemoryStoreForTest();
  resetCoursesStoreForTest();
  resetWorkspaceStoreForTest();

  // 0. Unenrolled student cannot submit course assignment or quiz
  const blockedQuiz = await submitCourseQuiz({
    userId: freshStudent.id,
    courseSlug: "web-architecture-systems",
    answers: { "q-web-1": 1, "q-web-2": 1, "q-web-3": 1 },
  });
  assert.equal(blockedQuiz.statusCode, 403);

  const blockedAssignment = await submitCourseAssignment({
    userId: freshStudent.id,
    courseSlug: "web-architecture-systems",
    assignmentId: "asgn-web-1",
    submissionText: "Verified server gating before enrollment attempt.",
  });
  assert.equal(blockedAssignment.statusCode, 403);

  // 1. Pay & enrol in course "web-architecture-systems"
  const courseOrder = await createCourseEnrollmentOrder({
    user: freshStudent,
    courseId: "course-web-architecture",
  });
  assert.ok(courseOrder.order);

  const coursePaid = await verifyAndCaptureCheckoutPayment({
    user: freshStudent,
    razorpayOrderId: courseOrder.order.razorpay_order_id,
    razorpayPaymentId: "pay_journey_course_1",
    razorpaySignature: `sim_sig_${courseOrder.order.razorpay_order_id}`,
    simulateTestCheckout: true,
  });
  assert.equal(coursePaid.enrollment?.status, "active");
  assert.equal(coursePaid.internshipApplication?.status, "in_progress");

  // 2. Learn: complete all lessons, submit assignment, and submit graded quiz
  const detail = await getCourseDetailForActor({
    slug: "web-architecture-systems",
    userId: freshStudent.id,
  });
  assert.ok(detail && !detail.locked);
  const allLessons = detail.modules.flatMap((m) => m.lessons);
  for (const les of allLessons) {
    await updateCourseLessonProgress({
      userId: freshStudent.id,
      courseSlug: "web-architecture-systems",
      lessonId: les.id,
      status: "completed",
    });
  }

  const assignmentRes = await submitCourseAssignment({
    userId: freshStudent.id,
    courseSlug: "web-architecture-systems",
    assignmentId: "asgn-web-1",
    submissionText: "Audited semantic landmarks and implemented Zod API checkout boundary.",
    artifactUrl: "https://github.com/kavya/audit-memo",
  });
  assert.ok(assignmentRes.submissions?.["asgn-web-1"]);

  // Wrong quiz score fails first, then passing attempt succeeds
  const failedQuiz = await submitCourseQuiz({
    userId: freshStudent.id,
    courseSlug: "web-architecture-systems",
    answers: { "q-web-1": 0, "q-web-2": 0, "q-web-3": 0 },
  });
  assert.equal(failedQuiz.attempt?.passed, false);
  assert.equal(failedQuiz.attempt?.scorePercent, 0);

  const passedQuiz = await submitCourseQuiz({
    userId: freshStudent.id,
    courseSlug: "web-architecture-systems",
    answers: { "q-web-1": 1, "q-web-2": 1, "q-web-3": 1 },
  });
  assert.equal(passedQuiz.attempt?.passed, true);
  assert.equal(passedQuiz.attempt?.scorePercent, 100);

  // 3. Build Project: full 5-stage lifecycle (not_started -> in_progress -> submitted -> under_review -> revision_required -> submitted -> approved)
  assert.equal(
    getProjectStatusForUser(freshStudent.id, "accessible-learning-portfolio"),
    "not_started",
  );

  const started = startLearnerProjectWork({
    userId: freshStudent.id,
    learnerName: freshStudent.name,
    learnerEmail: freshStudent.email,
    projectSlug: "accessible-learning-portfolio",
  });
  assert.equal(started.submission?.status, "in_progress");

  const firstSubmit = submitLearnerProjectWork({
    userId: freshStudent.id,
    learnerName: freshStudent.name,
    learnerEmail: freshStudent.email,
    projectSlug: "accessible-learning-portfolio",
    githubUrl: "https://github.com/kavya/tgl-portfolio",
    deploymentUrl: "https://kavya-portfolio.example.app",
    supportingEvidence: "Vitest 12/12 passing log",
    summary: "Implemented accessible React workspace and server checkout routes.",
    reflection: "Tested keyboard navigation.",
  });
  assert.equal(firstSubmit.submission?.status, "submitted");
  assert.equal(firstSubmit.submission?.deploymentUrl, "https://kavya-portfolio.example.app");

  const underReview = reviewLearnerSubmission({
    submissionId: firstSubmit.submission!.id,
    decision: "under_review",
    mentorFeedback: "Inspecting WCAG landmarks and backend Zod schema.",
    mentorName: "Kabir Malhotra",
  });
  assert.equal(underReview.submission?.status, "under_review");

  const revReq = reviewLearnerSubmission({
    submissionId: firstSubmit.submission!.id,
    decision: "revision_required",
    mentorFeedback: "Add mobile 390px overflow verification note and resubmit.",
    mentorName: "Kabir Malhotra",
  });
  assert.equal(revReq.submission?.status, "revision_required");

  // While revision_required, internship prerequisite MUST remain ineligible
  const tracks = await listInternships();
  const fsTrack = tracks.find((t) => t.slug === "full-stack-product-engineering")!;
  const ineligible = evaluateInternshipEligibility({
    requiredCourseSlug: fsTrack.required_course_slug ?? null,
    requiredProjectSlug: fsTrack.required_project_slug ?? null,
    requireProjectApproval: Boolean(fsTrack.require_project_approval),
    courseEnrolled: true,
    quizPassed: true,
    projectApproved:
      getProjectStatusForUser(freshStudent.id, "accessible-learning-portfolio") === "approved",
  });
  assert.equal(ineligible.eligible, false);

  // Resubmit revision & get approved
  const resubmit = submitLearnerProjectWork({
    userId: freshStudent.id,
    learnerName: freshStudent.name,
    learnerEmail: freshStudent.email,
    projectSlug: "accessible-learning-portfolio",
    githubUrl: "https://github.com/kavya/tgl-portfolio",
    deploymentUrl: "https://kavya-portfolio.example.app",
    supportingEvidence: "Mobile 390px + desktop 1440px Playwright logs attached",
    summary: "Fixed mobile overflow and documented accessibility focus verification.",
    reflection: "Verified zero console errors across viewports.",
  });
  assert.equal(resubmit.submission?.status, "submitted");

  const approvedProj = reviewLearnerSubmission({
    submissionId: resubmit.submission!.id,
    decision: "approved",
    mentorFeedback: "Approved project build and test verification.",
    mentorName: "Kabir Malhotra",
  });
  assert.equal(approvedProj.submission?.status, "approved");

  // Verify paying for the Programme auto-activated the bundled internship (without separate purchase)
  const appsAfterPayment = await listStudentApplications(freshStudent.id);
  assert.equal(appsAfterPayment.length, 1);
  assert.equal(appsAfterPayment[0].status, "in_progress");

  // 4. Admin can still publish an additional internship track, and the bundled track is active
  const createdInternRes = await createAdminInternship({
    title: "Production Web Engineering Sprint",
    track: "Engineering",
    description: "Hands-on mentor-evaluated engineering internship sprint.",
    durationWeeks: 6,
    requiredCourseSlug: "web-architecture-systems",
    requiredProjectSlug: "accessible-learning-portfolio",
    requireProjectApproval: true,
    tasks: [
      {
        title: "Task 1: Typed Validation Boundary",
        brief: "Implement Zod validation on mutation routes.",
        deadlineLabel: "Week 2",
        deliverableFormat: "GitHub URL",
      },
      {
        title: "Task 2: E2E Regression Verification",
        brief: "Ship Playwright desktop & mobile checks.",
        deadlineLabel: "Week 4",
        deliverableFormat: "Test report URL",
      },
    ],
  });
  assert.ok(createdInternRes.internship);

  const eligibleCheck = evaluateInternshipEligibility({
    requiredCourseSlug: createdInternRes.internship.required_course_slug ?? null,
    requiredProjectSlug: createdInternRes.internship.required_project_slug ?? null,
    requireProjectApproval: true,
    courseEnrolled: true,
    quizPassed: true,
    projectApproved: true,
  });
  assert.equal(eligibleCheck.eligible, true);

  // Use the auto-activated bundled internship application
  const activeApplication = appsAfterPayment[0];
  assert.ok(activeApplication);

  const fsTasks = fsTrack.tasks ?? [];
  assert.equal(fsTasks.length, 2);

  // Submit task 1 & approve it
  await submitInternshipTaskWork({
    userId: freshStudent.id,
    applicationId: activeApplication.id,
    taskId: fsTasks[0].id,
    submissionUrl: "https://github.com/kavya/task-1-pr",
    summary: "Implemented Zod input checks and clean 400 error payloads.",
  });
  await evaluateInternshipTaskSubmission({
    applicationId: activeApplication.id,
    taskId: fsTasks[0].id,
    decision: "approved",
    mentorFeedback: "Clean boundary schemas.",
    scoreLabel: "Exceeds Expectations",
  });

  // Final internship approval MUST fail while Task 2 is still unapproved
  const blockedFinal = await approveInternshipApplication({
    applicationId: activeApplication.id,
    adminId: "00000000-0000-4000-8000-000000000001",
    mentorNotes: "Attempt early approval",
  });
  assert.match(blockedFinal.error ?? "", /All internship tasks must be approved/i);

  // Submit Task 2, request revision, resubmit, approve Task 2, then approve final internship completion
  await submitInternshipTaskWork({
    userId: freshStudent.id,
    applicationId: activeApplication.id,
    taskId: fsTasks[1].id,
    submissionUrl: "https://github.com/kavya/task-2-demo",
    summary: "Built initial dashboard layout.",
  });
  await evaluateInternshipTaskSubmission({
    applicationId: activeApplication.id,
    taskId: fsTasks[1].id,
    decision: "revision_required",
    mentorFeedback: "Verify 390px viewport overflow.",
    scoreLabel: "Revision Required",
  });
  await submitInternshipTaskWork({
    userId: freshStudent.id,
    applicationId: activeApplication.id,
    taskId: fsTasks[1].id,
    submissionUrl: "https://github.com/kavya/task-2-demo-v2",
    summary: "Fixed mobile overflow and verified cleanly.",
  });
  await evaluateInternshipTaskSubmission({
    applicationId: activeApplication.id,
    taskId: fsTasks[1].id,
    decision: "approved",
    mentorFeedback: "Approved desktop and mobile implementation.",
    scoreLabel: "Verified",
  });

  const finalApproved = await approveInternshipApplication({
    applicationId: activeApplication.id,
    adminId: "00000000-0000-4000-8000-000000000001",
    mentorNotes: "Strong execution across all internship tasks.",
    finalScoreLabel: "Distinction",
  });
  assert.equal(finalApproved.application?.status, "completed");
  assert.equal(finalApproved.application?.mentor_approved, true);
  assert.equal(finalApproved.application?.final_score_label, "Distinction");

  // 5. Final internship approval automatically issues included Internship Certificate at ₹0 extra
  assert.ok(finalApproved.issuance);
  assert.equal(finalApproved.issuance.issuance_status, "issued");

  const lookup = await getCertificateByPublicId(finalApproved.issuance.certificate_id);
  assert.equal(lookup?.recipient_name, "Kavya Nair");
  assert.equal(lookup?.issuance_status, "issued");

  // Claiming again returns 409 duplicate guard rather than creating a second record
  const duplicateClaim = await claimIncludedCertificate({
    user: freshStudent,
    internshipApplicationId: activeApplication.id,
  });
  assert.equal(duplicateClaim.status, 409);

  // 6. Admin can also publish a new paid course within INR bounds
  const createdCourse = await createAdminCourse({
    title: "Production TypeScript Pipelines",
    subtitle: "Build deterministic workers, schema contracts, and verification suites.",
    category: "Engineering",
    level: "Applied",
    pricePaise: 149900,
    estimatedHours: 16,
    mentorName: "Kabir Malhotra",
    mentorRole: "Principal Systems Mentor",
    skills: ["TypeScript", "Workers", "Testing"],
    linkedInternshipSlug: "full-stack-product-engineering",
    linkedInternshipTitle: "Full-Stack Product Engineering Internship",
    projectTitle: "Deterministic Job Runner",
    projectSummary: "Implement idempotent queue retries with dead-letter logging.",
  });
  assert.equal(createdCourse.course?.pricePaise, 149900);
});

test("Every seeded project provides clear beginner guidance and persists supporting files", () => {
  resetWorkspaceStoreForTest();
  assert.ok(learningProjects.length > 0);
  for (const project of learningProjects) {
    const guidance = getProjectGuidance(project);
    assert.ok(guidance.whyItMatters.length > 10);
    assert.ok(guidance.stepByStep.length >= 3);
    assert.ok(guidance.requiredSkills.length >= 1);
    assert.ok(guidance.submissionDeadline.length > 5);
    assert.ok(guidance.submissionMethod.length > 5);
    assert.ok(guidance.evaluationCriteria.length >= 2);
  }

  const submitted = submitLearnerProjectWork({
    userId: freshStudent.id,
    learnerName: freshStudent.name,
    learnerEmail: freshStudent.email,
    projectSlug: "accessible-learning-portfolio",
    githubUrl: "https://github.com/kavya/tgl-portfolio",
    supportingEvidence: "Attached Playwright audit screenshot and test summary.",
    supportingFiles: [
      { name: "playwright-audit.png", sizeBytes: 48210, mimeType: "image/png" },
      { name: "test-report.txt", sizeBytes: 2048, mimeType: "text/plain" },
    ],
    summary: "Implemented accessible workspace with verified tests.",
    reflection: "Tested across desktop and mobile.",
  });

  assert.equal(submitted.submission?.supportingFiles?.length, 2);
  assert.deepEqual(
    submitted.submission?.supportingFiles?.map((f) => f.name),
    ["playwright-audit.png", "test-report.txt"],
  );
});

test("Internship eligibility surfaces human-readable titles instead of raw slugs", () => {
  const result = evaluateInternshipEligibility({
    requiredCourseSlug: "web-architecture-systems",
    requiredProjectSlug: "accessible-learning-portfolio",
    requiredCourseTitle: "Web Architecture & Systems",
    requiredProjectTitle: "Accessible Learning Portfolio & Verification Workspace",
    requiredSkills: ["React", "TypeScript", "API Design"],
    requireProjectApproval: true,
    courseEnrolled: false,
    quizPassed: false,
    projectApproved: false,
  });

  assert.equal(result.eligible, false);
  assert.equal(result.requiredCourseTitle, "Web Architecture & Systems");
  assert.equal(result.requiredProjectTitle, "Accessible Learning Portfolio & Verification Workspace");
  assert.deepEqual(result.requiredSkills, ["React", "TypeScript", "API Design"]);
  assert.equal(
    result.missingRequirements.some((msg) => msg.includes("web-architecture-systems") || msg.includes("accessible-learning-portfolio")),
    false,
  );
  assert.equal(
    result.missingRequirements.some((msg) => msg.includes("Web Architecture & Systems")),
    true,
  );
});

test("Invalid Razorpay signature never unlocks enrollment, and ineligible or duplicate certificate claims stay blocked", async () => {
  resetMemoryStoreForTest();
  resetCoursesStoreForTest();
  resetWorkspaceStoreForTest();

  const orderRes = await createCourseEnrollmentOrder({
    user: freshStudent,
    courseId: "course-web-architecture",
  });
  assert.ok(orderRes.order);

  const tamperedVerify = await verifyAndCaptureCheckoutPayment({
    user: freshStudent,
    razorpayOrderId: orderRes.order.razorpay_order_id,
    razorpayPaymentId: "pay_tampered_1",
    razorpaySignature: "invalid_hmac_signature",
    simulateTestCheckout: true,
  });
  assert.ok(tamperedVerify.error);
  assert.equal(tamperedVerify.enrollment, undefined);

  const lockedDetail = await getCourseDetailForActor({
    slug: "web-architecture-systems",
    userId: freshStudent.id,
  });
  assert.equal(lockedDetail?.locked, true);

  // Ineligible certificate claim without completed internship or course stays blocked (403)
  const blockedClaim = await claimIncludedCertificate({ user: freshStudent });
  assert.equal(blockedClaim.status, 403);

  // Separate certificate order creation remains retired (400)
  const products = await listProducts(false);
  const internProduct = products.find((p) => p.certificate_type === "internship")!;
  const ineligibleOrder = await createCertificationOrder({
    user: freshStudent,
    productId: internProduct.id,
  });
  assert.ok(ineligibleOrder.error);
  assert.equal(ineligibleOrder.status, 400);
});
