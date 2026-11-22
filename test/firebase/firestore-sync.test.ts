import assert from "node:assert/strict";
import test from "node:test";
import { firebaseConfig } from "@/lib/firebase/config";
import {
  buildCourseCatalogPayload,
  buildReviewRecordPayload,
  buildSubmissionCreatePayload,
  buildSubmissionUpdatePayload,
  sanitizeFirestoreDocId,
  sanitizeFirestoreSlug,
} from "@/lib/firebase/firestore-sync";

test("firebaseConfig targets the provisioned Firestore Enterprise database", () => {
  assert.equal(
    firebaseConfig.firestoreDatabaseId,
    "ai-studio-tglxapilrs-636051bf-84ac-43ff-8aa2-35226f35b24d",
  );
  assert.equal(firebaseConfig.projectId, "tough-cinema-m61jg");
});

test("sanitizeFirestoreDocId and sanitizeFirestoreSlug match firestore.rules regex patterns", () => {
  const id = sanitizeFirestoreDocId("sub / weird! id @ 2026");
  assert.match(id, /^[a-zA-Z0-9_-]{1,128}$/);

  const slug = sanitizeFirestoreSlug("Full Stack Web & AI!");
  assert.match(slug, /^[a-z0-9_-]{2,128}$/);
});

test("buildSubmissionCreatePayload obeys isValidSubmission and excludes mentor-only fields", () => {
  const built = buildSubmissionCreatePayload(
    {
      id: "sub_001",
      projectSlug: "fullstack-nextjs-saas",
      githubUrl: "https://github.com/tgl-learner/saas-capstone",
      summary: "Built full-stack Next.js app with auth, quizzes, and live tests.",
      supportingFiles: Array.from({ length: 15 }, (_, idx) => ({
        name: `artifact-${idx}.pdf`,
        sizeBytes: 1024,
        mimeType: "application/pdf",
      })),
    },
    "uid_learner_1",
    "Maya Nair",
  );

  assert.ok(built);
  assert.equal(built.payload.status, "submitted");
  assert.equal(built.payload.userId, "uid_learner_1");
  assert.equal("mentorFeedback" in built.payload, false);
  assert.equal("reviewedAt" in built.payload, false);
  assert.ok(Array.isArray(built.payload.supportingFiles));
  assert.equal((built.payload.supportingFiles as unknown[]).length, 10);

  const update = buildSubmissionUpdatePayload({
    id: "sub_001",
    projectSlug: "fullstack-nextjs-saas",
    githubUrl: "https://github.com/tgl-learner/saas-capstone",
    summary: "Updated submission with improved test coverage and docs.",
  });
  assert.ok(update);
  assert.equal("userId" in update, false);
  assert.equal("submittedAt" in update, false);
});

test("buildReviewRecordPayload and buildCourseCatalogPayload clamp bounds to firestore.rules", () => {
  const rev = buildReviewRecordPayload(
    {
      submissionId: "sub_001",
      studentUid: "uid_learner_1",
      projectSlug: "fullstack-nextjs-saas",
      decision: "approved",
      mentorFeedback: "Clean architecture and passing end-to-end verification tests.",
      mentorName: "TGL Mentor",
    },
    "uid_admin_1",
  );
  assert.ok(rev);
  assert.equal(rev.reviewPayload.decision, "approved");
  assert.equal(rev.notificationPayload.read, false);

  const underReview = buildReviewRecordPayload(
    {
      submissionId: "sub_001",
      studentUid: "uid_learner_1",
      projectSlug: "fullstack-nextjs-saas",
      decision: "under_review",
      mentorFeedback: "Reviewing now",
      mentorName: "TGL Mentor",
    },
    "uid_admin_1",
  );
  assert.equal(underReview, null);

  const course = buildCourseCatalogPayload({
    id: "course-ai-01",
    slug: "Applied AI Systems!",
    title: "Applied AI Engineering",
    subtitle: "Hands-on production AI engineering programme.",
    pricePaise: 99900,
    isPublished: true,
  });
  assert.ok(course);
  assert.equal(course.payload.currency, "INR");
  assert.ok(course.payload.pricePaise >= 49900 && course.payload.pricePaise <= 199900);
  assert.match(course.payload.slug, /^[a-z0-9_-]{2,128}$/);
});
