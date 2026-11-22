"use client";

import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { isPrivilegedStaffEmail } from "@/lib/auth/access";
import { getFirebaseAuth, getFirebaseDb } from "./client";
import { isFirebaseClientConfigured } from "./config";
import { handleFirestoreError, OperationType } from "./errors";

const VALID_ID_REGEX = /^[a-zA-Z0-9_-]{1,128}$/;
const VALID_SLUG_REGEX = /^[a-z0-9_-]{2,128}$/;

export function sanitizeFirestoreDocId(raw: string, fallbackPrefix = "doc"): string {
  const cleaned = raw
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 128);
  if (cleaned.length >= 2 && VALID_ID_REGEX.test(cleaned)) {
    return cleaned;
  }
  return `${fallbackPrefix}_${Date.now()}`.slice(0, 128);
}

export function sanitizeFirestoreSlug(raw: string, fallback = "tgl-item"): string {
  const cleaned = raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 128);
  if (cleaned.length >= 2 && VALID_SLUG_REGEX.test(cleaned)) {
    return cleaned;
  }
  return fallback;
}

function getCurrentAuthInfo() {
  const user = getFirebaseAuth().currentUser;
  if (!user) return {};
  return {
    userId: user.uid,
    email: user.email,
    emailVerified: user.emailVerified,
    isAnonymous: user.isAnonymous,
    tenantId: user.tenantId,
    providerInfo:
      user.providerData?.map((p) => ({
        providerId: p.providerId,
        email: p.email,
      })) ?? [],
  };
}

function isPermissionDeniedError(error: unknown): boolean {
  const code =
    typeof error === "object" && error && "code" in error
      ? String((error as { code?: unknown }).code)
      : "";
  const msg = error instanceof Error ? error.message.toLowerCase() : "";
  return code.includes("permission-denied") || msg.includes("insufficient permissions");
}

export type SubmissionSyncInput = {
  id: string;
  projectSlug: string;
  pathwaySlug?: string;
  cohortName?: string;
  learnerName?: string;
  githubUrl: string;
  deploymentUrl?: string;
  supportingEvidence?: string;
  supportingFiles?: Array<{
    name: string;
    sizeBytes: number;
    mimeType: string;
    storagePath?: string;
    downloadUrl?: string;
  }>;
  summary: string;
  reflection?: string;
};

export function buildSubmissionCreatePayload(
  input: SubmissionSyncInput,
  uid: string,
  fallbackDisplayName = "",
) {
  const id = sanitizeFirestoreDocId(input.id, "sub");
  const projectSlug = sanitizeFirestoreSlug(input.projectSlug, "capstone-project");
  const githubUrl = input.githubUrl.trim().slice(0, 512);
  const summary = input.summary.trim().slice(0, 4000);

  if (githubUrl.length < 8 || summary.length < 10) {
    return null;
  }

  const payload: Record<string, unknown> = {
    id,
    userId: uid,
    projectSlug,
    githubUrl,
    summary,
    status: "submitted",
  };

  const learnerName = (input.learnerName || fallbackDisplayName).trim().slice(0, 120);
  if (learnerName) payload.learnerName = learnerName;

  if (input.pathwaySlug?.trim()) {
    payload.pathwaySlug = sanitizeFirestoreSlug(input.pathwaySlug, "web-development");
  }
  if (input.cohortName?.trim()) {
    payload.cohortName = input.cohortName.trim().slice(0, 120);
  }
  if (input.deploymentUrl?.trim()) {
    payload.deploymentUrl = input.deploymentUrl.trim().slice(0, 512);
  }
  if (input.supportingEvidence?.trim()) {
    payload.supportingEvidence = input.supportingEvidence.trim().slice(0, 2000);
  }
  if (Array.isArray(input.supportingFiles) && input.supportingFiles.length > 0) {
    payload.supportingFiles = input.supportingFiles.slice(0, 10).map((f) => ({
      name: String(f.name || "file").slice(0, 140),
      sizeBytes: Math.max(0, Math.round(Number(f.sizeBytes) || 0)),
      mimeType: String(f.mimeType || "application/octet-stream").slice(0, 120),
      ...(f.storagePath ? { storagePath: String(f.storagePath).slice(0, 400) } : {}),
      ...(f.downloadUrl ? { downloadUrl: String(f.downloadUrl).slice(0, 512) } : {}),
    }));
  }
  if (input.reflection?.trim()) {
    payload.reflection = input.reflection.trim().slice(0, 4000);
  }

  return { id, payload };
}

export function buildSubmissionUpdatePayload(input: SubmissionSyncInput) {
  const githubUrl = input.githubUrl.trim().slice(0, 512);
  const summary = input.summary.trim().slice(0, 4000);

  if (githubUrl.length < 8 || summary.length < 10) {
    return null;
  }

  const payload: Record<string, unknown> = {
    githubUrl,
    summary,
    status: "submitted",
    deploymentUrl: (input.deploymentUrl ?? "").trim().slice(0, 512),
    supportingEvidence: (input.supportingEvidence ?? "").trim().slice(0, 2000),
    reflection: (input.reflection ?? "").trim().slice(0, 4000),
    supportingFiles: (input.supportingFiles ?? []).slice(0, 10).map((f) => ({
      name: String(f.name || "file").slice(0, 140),
      sizeBytes: Math.max(0, Math.round(Number(f.sizeBytes) || 0)),
      mimeType: String(f.mimeType || "application/octet-stream").slice(0, 120),
      ...(f.storagePath ? { storagePath: String(f.storagePath).slice(0, 400) } : {}),
      ...(f.downloadUrl ? { downloadUrl: String(f.downloadUrl).slice(0, 512) } : {}),
    })),
  };

  return payload;
}

/**
 * Mirrors a verified learner's project submission directly into Firestore
 * `submissions/{id}` in the configured database (`ai-studio-tglxapilrs-...`).
 */
export async function syncProjectSubmissionToFirestore(
  input: SubmissionSyncInput,
): Promise<boolean> {
  if (typeof window === "undefined" || !isFirebaseClientConfigured()) return false;
  const user = getFirebaseAuth().currentUser;
  if (!user || !user.emailVerified) return false;

  const built = buildSubmissionCreatePayload(input, user.uid, user.displayName ?? "");
  if (!built) return false;

  const path = `submissions/${built.id}`;
  const db = getFirebaseDb();
  const subRef = doc(db, "submissions", built.id);

  try {
    const snap = await getDoc(subRef);
    if (snap.exists()) {
      const existingData = snap.data() as { status?: string; userId?: string };
      if (existingData.status === "approved" || existingData.userId !== user.uid) {
        return false;
      }
      const updatePayload = buildSubmissionUpdatePayload(input);
      if (!updatePayload) return false;
      await updateDoc(subRef, {
        ...updatePayload,
        updatedAt: serverTimestamp(),
      });
      return true;
    }

    await setDoc(subRef, {
      ...built.payload,
      submittedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return true;
  } catch (error) {
    if (isPermissionDeniedError(error)) {
      try {
        handleFirestoreError(error, OperationType.WRITE, path, getCurrentAuthInfo());
      } catch {
        // Logged via structured FirestoreErrorInfo without blocking server-confirmed UI flow
      }
    }
    return false;
  }
}

export type MentorReviewSyncInput = {
  submissionId: string;
  studentUid: string;
  projectSlug: string;
  decision: "under_review" | "approved" | "revision_required";
  mentorFeedback: string;
  mentorName: string;
};

export function buildReviewRecordPayload(
  input: MentorReviewSyncInput,
  reviewerUid: string,
) {
  if (input.decision !== "approved" && input.decision !== "revision_required") {
    return null;
  }
  const submissionId = sanitizeFirestoreDocId(input.submissionId, "sub");
  const studentUid = sanitizeFirestoreDocId(input.studentUid, "usr");
  const feedback = input.mentorFeedback.trim().slice(0, 2000);
  if (feedback.length < 5) return null;

  const reviewId = sanitizeFirestoreDocId(`rev_${submissionId}_${Date.now()}`, "rev");
  const notificationId = sanitizeFirestoreDocId(`notif_${submissionId}_${Date.now()}`, "notif");

  return {
    submissionId,
    reviewId,
    notificationId,
    reviewPayload: {
      id: reviewId,
      submissionId,
      studentUid,
      reviewerUid,
      decision: input.decision,
      feedback,
    },
    notificationPayload: {
      id: notificationId,
      userId: studentUid,
      title:
        input.decision === "approved"
          ? "Project submission approved"
          : "Project revision requested",
      body: feedback.slice(0, 1000),
      href: `/projects/${sanitizeFirestoreSlug(input.projectSlug, "project")}`,
      read: false,
    },
  };
}

/**
 * Mirrors an authenticated staff mentor's submission review, audit record,
 * and learner notification directly into Firestore (`submissions`, `reviews`, `notifications`).
 */
export async function syncMentorReviewToFirestore(
  input: MentorReviewSyncInput,
): Promise<boolean> {
  if (typeof window === "undefined" || !isFirebaseClientConfigured()) return false;
  const user = getFirebaseAuth().currentUser;
  if (!user || !user.emailVerified || !isPrivilegedStaffEmail(user.email)) {
    return false;
  }

  const submissionId = sanitizeFirestoreDocId(input.submissionId, "sub");
  const subPath = `submissions/${submissionId}`;
  const db = getFirebaseDb();
  const subRef = doc(db, "submissions", submissionId);

  try {
    const snap = await getDoc(subRef);
    if (!snap.exists()) {
      return false;
    }

    await updateDoc(subRef, {
      status: input.decision,
      mentorName: input.mentorName.trim().slice(0, 120) || user.displayName || "TGL Mentor",
      mentorFeedback: input.mentorFeedback.trim().slice(0, 2000),
      reviewedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    const built = buildReviewRecordPayload(input, user.uid);
    if (built) {
      await setDoc(doc(db, "reviews", built.reviewId), {
        ...built.reviewPayload,
        createdAt: serverTimestamp(),
      });
      await setDoc(doc(db, "notifications", built.notificationId), {
        ...built.notificationPayload,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    return true;
  } catch (error) {
    if (isPermissionDeniedError(error)) {
      try {
        handleFirestoreError(error, OperationType.WRITE, subPath, getCurrentAuthInfo());
      } catch {
        // Structured diagnostics logged
      }
    }
    return false;
  }
}

export type CourseCatalogSyncInput = {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  category?: string;
  level?: string;
  pricePaise: number;
  currency?: string;
  estimatedHours?: number;
  linkedInternshipSlug?: string | null;
  isPublished: boolean;
};

export function buildCourseCatalogPayload(course: CourseCatalogSyncInput) {
  const id = sanitizeFirestoreDocId(course.id, "course");
  const slug = sanitizeFirestoreSlug(course.slug, "tgl-course");
  const title = course.title.trim().slice(0, 160);
  const subtitle = (course.subtitle || course.title).trim().slice(0, 600);
  const pricePaise = Math.max(49900, Math.min(199900, Math.round(course.pricePaise)));

  if (title.length < 3 || subtitle.length < 3) {
    return null;
  }

  return {
    id,
    payload: {
      id,
      slug,
      title,
      subtitle,
      category: (course.category ?? "Engineering").trim().slice(0, 80),
      level: (course.level ?? "Beginner to Intermediate").trim().slice(0, 60),
      pricePaise,
      currency: "INR",
      estimatedHours: Math.max(1, Math.round(course.estimatedHours ?? 12)),
      ...(course.linkedInternshipSlug?.trim()
        ? { linkedInternshipSlug: sanitizeFirestoreSlug(course.linkedInternshipSlug, "internship") }
        : {}),
      isPublished: Boolean(course.isPublished),
    },
  };
}

/**
 * Syncs a single bundled programme record to Firestore `courses/{id}`
 * when triggered by an authenticated, verified staff administrator.
 */
export async function syncCourseToFirestore(
  course: CourseCatalogSyncInput,
): Promise<boolean> {
  if (typeof window === "undefined" || !isFirebaseClientConfigured()) return false;
  const user = getFirebaseAuth().currentUser;
  if (!user || !user.emailVerified || !isPrivilegedStaffEmail(user.email)) {
    return false;
  }

  const built = buildCourseCatalogPayload(course);
  if (!built) return false;

  const path = `courses/${built.id}`;
  const db = getFirebaseDb();
  try {
    await setDoc(
      doc(db, "courses", built.id),
      {
        ...built.payload,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
    return true;
  } catch (error) {
    if (isPermissionDeniedError(error)) {
      try {
        handleFirestoreError(error, OperationType.WRITE, path, getCurrentAuthInfo());
      } catch {
        // Logged via structured FirestoreErrorInfo
      }
    }
    return false;
  }
}

/**
 * Syncs all bundled courses from the Admin Studio into Firestore `courses/{id}`.
 */
export async function syncCatalogCoursesToFirestore(
  courses: CourseCatalogSyncInput[],
): Promise<{ synced: number; total: number }> {
  let synced = 0;
  for (const course of courses) {
    const ok = await syncCourseToFirestore(course);
    if (ok) synced += 1;
  }
  return { synced, total: courses.length };
}
