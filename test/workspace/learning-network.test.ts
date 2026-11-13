import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  enrichedPathways,
  findPathwayByParam,
  findProjectBySlug,
  getNodesForPathway,
  learningNodes,
  learningProjects,
} from "../../lib/learning-graph";
import {
  addAdminCohort,
  getLearnerSnapshot,
  getMentorConsoleData,
  postMentorMessage,
  reviewLearnerSubmission,
  setLearnerNodeState,
  submitLearnerProjectWork,
  toggleLearnerSavedItem,
} from "../../lib/learning-workspace-store";
import { evaluateCertificateEligibility } from "../../lib/certifications/eligibility";
import { getMemoryStore } from "../../lib/certifications/store";

describe("connected learning graph & non-linear workspace", () => {
  it("exposes enriched pathways, spatial nodes, and detailed projects with cross-links", () => {
    assert.equal(enrichedPathways.length, 9);
    assert.equal(learningProjects.length, 9);
    assert.ok(learningNodes.length >= 24);

    const webBySlug = findPathwayByParam("web-development");
    const webByNumber = findPathwayByParam("02");
    assert.equal(webBySlug?.slug, "web-development");
    assert.equal(webByNumber?.slug, "web-development");

    const webNodes = getNodesForPathway("web-development");
    assert.ok(webNodes.some((n) => n.kind === "concept"));
    assert.ok(webNodes.some((n) => n.kind === "project"));
    assert.ok(webNodes.some((n) => n.kind === "touchpoint"));

    const secProject = findProjectBySlug("webhook-trust-boundary");
    assert.ok(secProject);
    assert.ok(secProject.deliverables.length >= 3);
    assert.ok(secProject.relatedConceptIds.length >= 2);
  });

  it("allows opening and completing any node non-linearly and records human-readable evidence", () => {
    const testUserId = "00000000-0000-4000-8000-000000009901";

    // Jump straight to a project/touchpoint node without completing prerequisites first
    const snap = setLearnerNodeState({
      userId: testUserId,
      nodeId: "sec-hmac-signatures",
      state: "completed",
    });

    assert.equal(snap.nodeStates["sec-hmac-signatures"], "completed");
    assert.ok(
      snap.evidence.some((e) => e.title.includes("Raw-Body HMAC & Idempotent Webhooks")),
    );

    const saved = toggleLearnerSavedItem({
      userId: testUserId,
      itemKey: "project:webhook-trust-boundary",
    });
    assert.ok(saved.includes("project:webhook-trust-boundary"));
  });

  it("bridges project submission -> mentor approval -> verified evidence & certification eligibility", () => {
    const testUserId = "00000000-0000-4000-8000-000000009902";
    const certStore = getMemoryStore();

    // Seed an active internship application not yet mentor-approved for this learner
    certStore.applications.push({
      id: "app-bridge-test-1",
      user_id: testUserId,
      internship_id: certStore.internships[0].id,
      applicant_name: "Priya Verma",
      applicant_email: "priya.verma@example.edu",
      motivation: "Ship verifiable systems",
      portfolio_url: "https://github.com/example/priya",
      status: "in_progress",
      submission_url: null,
      submission_summary: null,
      assessment_passed: false,
      mentor_approved: false,
      mentor_approved_by: null,
      mentor_notes: null,
      completed_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    const submitted = submitLearnerProjectWork({
      userId: testUserId,
      learnerName: "Priya Verma",
      learnerEmail: "priya.verma@example.edu",
      projectSlug: "webhook-trust-boundary",
      artifactUrl: "https://github.com/example/priya-webhook-guard",
      summary: "Implemented raw-body HMAC SHA-256 verification and replay protection.",
      reflection: "Checked constant-time comparison edge cases.",
    });

    assert.ok(submitted.submission);
    assert.equal(submitted.submission.status, "submitted");

    postMentorMessage({
      userId: testUserId,
      learnerName: "Priya Verma",
      projectSlug: "webhook-trust-boundary",
      nodeId: "sec-hmac-signatures",
      topic: "Replay protection test",
      authorRole: "student",
      authorName: "Priya Verma",
      body: "Should duplicate event IDs return 200 idempotently?",
    });

    const reviewed = reviewLearnerSubmission({
      submissionId: submitted.submission.id,
      decision: "approved",
      mentorFeedback: "Clean timing-safe signature verification and deterministic tests.",
      mentorName: "Rhea Kulkarni",
    });

    assert.equal(reviewed.submission?.status, "approved");

    const learnerSnap = getLearnerSnapshot(testUserId);
    assert.equal(learnerSnap.nodeStates["node-proj-sec"], "completed");
    assert.ok(
      learnerSnap.evidence.some((e) => e.kind === "mentor_approval"),
    );

    // Confirm mentor project approval unlocks Project Completion eligibility,
    // WITHOUT falsely auto-completing the separate Internship track!
    const projectProduct = certStore.products.find(
      (p) => p.certificate_type === "project_completion",
    );
    const internshipProduct = certStore.products.find(
      (p) => p.certificate_type === "internship",
    );
    assert.ok(projectProduct);
    assert.ok(internshipProduct);
    const updatedApp = certStore.applications.find((a) => a.id === "app-bridge-test-1");
    assert.ok(updatedApp);
    assert.equal(updatedApp.status, "in_progress");

    const appStatus: string = updatedApp.status;

    const pathwayCompleted = certStore.pathwayCompletedUserIds.has(testUserId);
    const projectEligibility = evaluateCertificateEligibility({
      certificateType: projectProduct.certificate_type,
      rules: projectProduct.eligibility_rules,
      internshipCompleted: false,
      pathwayCompleted,
      submissionProvided: Boolean(reviewed.submission?.githubUrl || reviewed.submission?.artifactUrl),
      assessmentPassed: Boolean(updatedApp.assessment_passed) || pathwayCompleted,
      mentorApproved: reviewed.submission?.status === "approved",
      adminDistinctionApproved: false,
    });
    assert.equal(projectEligibility.eligible, true);

    const internshipEligibility = evaluateCertificateEligibility({
      certificateType: internshipProduct.certificate_type,
      rules: internshipProduct.eligibility_rules,
      internshipCompleted: appStatus === "completed",
      pathwayCompleted: certStore.pathwayCompletedUserIds.has(testUserId),
      submissionProvided: Boolean(updatedApp.submission_url),
      assessmentPassed: updatedApp.assessment_passed,
      mentorApproved: updatedApp.mentor_approved,
      adminDistinctionApproved: false,
    });
    assert.equal(internshipEligibility.eligible, false);
  });

  it("supports mentor Q&A resolution and admin cohort creation", () => {
    const cohort = addAdminCohort({
      name: "Winter Systems Studio",
      pathwaySlug: "cybersecurity",
      mentorName: "Rhea Kulkarni",
      mentorEmail: "rhea@touchgrasslater.org",
    });
    assert.equal(cohort.name, "Winter Systems Studio");

    const mentorData = getMentorConsoleData();
    assert.ok(mentorData.cohorts.some((c) => c.id === cohort.id));
    assert.ok(mentorData.learners.length >= 1);
  });
});
