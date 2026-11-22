import { randomUUID } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { isPrivilegedStaffEmail } from "@/lib/auth/access";
import {
  getAdminFirestore,
  getAuthenticatedFirebaseActor,
  isFirebaseAuthConfigured,
  isFirestoreConfigured,
} from "@/lib/firebase/server";
import {
  activateCourseEnrollment,
  findCourseByIdOrSlug,
  hasActiveCourseEnrollment,
  revokeCourseEnrollment,
  type CourseEnrollmentRecord,
} from "@/lib/courses/store";
import {
  CERTIFICATE_CURRENCY,
  formatInrFromPaise,
  validateProductPricePaise,
  type CertificateType,
} from "./pricing";
import {
  canIssueCertificate,
  evaluateCertificateEligibility,
  type EligibilityEvaluation,
  type EligibilityRuleSet,
} from "./eligibility";
import {
  createRazorpayOrder,
  refundRazorpayPayment,
  verifyRazorpayPaymentSignature,
  verifyRazorpayWebhookSignature,
} from "@/lib/payments/razorpay";
import {
  DEFAULT_EMAIL_TEMPLATES,
  type EmailTemplateDefinition,
  type EmailTemplateKey,
} from "@/lib/email/templates";
import { dispatchLifecycleEmail, type EmailDeliveryRecord } from "@/lib/email/provider";
import type { CertificatePdfData } from "./pdf";

import {
  checkAllInternshipTasksApproved,
  type InternshipTaskDefinition,
  type InternshipTaskSubmission,
} from "@/lib/internships/eligibility";

export { isFirestoreConfigured };

function cleanForFirestore<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function safeFirestoreDocId(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 120) || randomUUID();
}

export type InternshipRecord = {
  id: string;
  slug: string;
  title: string;
  track: string;
  description: string;
  duration_weeks: number;
  required_course_slug?: string | null;
  required_project_slug?: string | null;
  require_project_approval?: boolean;
  tasks?: InternshipTaskDefinition[];
  is_published: boolean;
  created_at: string;
};

export type InternshipApplicationRecord = {
  id: string;
  user_id: string;
  internship_id: string;
  applicant_name: string;
  applicant_email: string;
  motivation: string;
  portfolio_url: string | null;
  status: "applied" | "accepted" | "in_progress" | "completed" | "withdrawn";
  course_id?: string | null;
  submission_url: string | null;
  submission_summary: string | null;
  task_submissions?: InternshipTaskSubmission[];
  final_evaluation_notes?: string | null;
  final_score_label?: string | null;
  assessment_passed: boolean;
  mentor_approved: boolean;
  mentor_approved_by: string | null;
  mentor_notes: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CertificationProductRecord = {
  id: string;
  slug: string;
  name: string;
  description: string;
  certificate_type: CertificateType;
  price_paise: number;
  currency: "INR";
  enabled: boolean;
  eligibility_rules: EligibilityRuleSet;
  created_at: string;
  updated_at: string;
};

export type CertificationOrderRecord = {
  id: string;
  user_id: string;
  order_kind?: "certificate" | "course_enrollment" | "programme_enrollment";
  product_id: string | null;
  course_id?: string | null;
  internship_application_id: string | null;
  razorpay_order_id: string;
  amount_paise: number;
  currency: "INR";
  order_status: "created" | "attempted" | "paid" | "failed" | "cancelled" | "refunded";
  payment_mode: "razorpay_test" | "razorpay_live" | "simulated_test";
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type CertificationPaymentRecord = {
  id: string;
  order_id: string;
  user_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string | null;
  payment_status: "pending" | "captured" | "failed" | "cancelled" | "refunded";
  payment_method: string | null;
  failure_reason: string | null;
  verified_at: string | null;
  refunded_at: string | null;
  refund_id: string | null;
  created_at: string;
};

export type WebhookEventRecord = {
  id: string;
  event_id: string;
  event_type: string;
  payload: Record<string, unknown>;
  processing_status: "received" | "processed" | "ignored_duplicate" | "failed";
  error_message: string | null;
  received_at: string;
  processed_at: string | null;
};

export type CertificateIssuanceRecord = {
  id: string;
  user_id: string;
  product_id: string;
  payment_id: string | null;
  internship_application_id: string | null;
  certificate_id: string;
  recipient_name: string;
  recipient_email: string;
  achievement_title: string;
  certificate_type: CertificateType;
  eligibility_status: "pending" | "eligible" | "ineligible";
  issuance_status: "pending_approval" | "issued" | "revoked";
  approved_by: string | null;
  revocation_reason: string | null;
  issued_at: string | null;
  revoked_at: string | null;
  claimed_at?: string | null;
  joined_at?: string | null;
  completed_at?: string | null;
  regeneration_count?: number;
  regenerated_at?: string | null;
  created_at: string;
};

export type SandboxUser = {
  id: string;
  email: string;
  name: string;
  role: "student" | "admin";
  isSandbox: boolean;
};

export const DEMO_STUDENT_ID = "00000000-0000-4000-8000-000000000101";
export const DEMO_GRADUATE_ID = "00000000-0000-4000-8000-000000000102";
export const DEMO_ADMIN_ID = "00000000-0000-4000-8000-000000000001";

type MemoryStore = {
  internships: InternshipRecord[];
  applications: InternshipApplicationRecord[];
  products: CertificationProductRecord[];
  orders: CertificationOrderRecord[];
  payments: CertificationPaymentRecord[];
  webhookEvents: WebhookEventRecord[];
  issuances: CertificateIssuanceRecord[];
  emailTemplates: EmailTemplateDefinition[];
  emailLogs: EmailDeliveryRecord[];
  pathwayCompletedUserIds: Set<string>;
  distinctionApprovedUserIds: Set<string>;
  claimedCertificateAtByCertId: Record<string, string>;
  sandboxDisplayNamesByUserId: Record<string, string>;
};

const globalStore = globalThis as unknown as { __tglCertStore?: MemoryStore };

function createSeedStore(): MemoryStore {
  const now = "2026-11-10T09:00:00.000Z";
  const intern1Id = "11111111-1111-4111-8111-111111111101";
  const intern2Id = "11111111-1111-4111-8111-111111111102";
  const intern3Id = "11111111-1111-4111-8111-111111111103";

  const prodInternId = "22222222-2222-4222-8222-222222222201";
  const prodCourseId = "22222222-2222-4222-8222-222222222202";
  const prodProjectId = "22222222-2222-4222-8222-222222222203";
  const prodSpecialId = "22222222-2222-4222-8222-222222222204";

  const app1Id = "33333333-3333-4333-8333-333333333301";
  const app2Id = "33333333-3333-4333-8333-333333333302";

  return {
    internships: [
      {
        id: intern1Id,
        slug: "full-stack-product-engineering",
        title: "Full-Stack Product Engineering Internship",
        track: "Engineering",
        description:
          "Build production web modules, API workflows, and accessible user interfaces with mentor code reviews and structured weekly engineering tasks.",
        duration_weeks: 8,
        required_course_slug: "web-architecture-systems",
        required_project_slug: "accessible-learning-portfolio",
        require_project_approval: true,
        tasks: [
          {
            id: "task-fs-1",
            title: "Task 1: Typed Route Boundary & Schema Audit",
            brief: "Submit a repository PR implementing Zod input validation and clean 400/403 status handling on two workspace routes.",
            deadlineLabel: "Week 2",
            deliverableFormat: "GitHub PR or branch URL",
          },
          {
            id: "task-fs-2",
            title: "Task 2: Accessible Production Dashboard Module",
            brief: "Build a keyboard-accessible multi-state workflow tested at 1440px desktop and 390px mobile viewports.",
            deadlineLabel: "Week 5",
            deliverableFormat: "Deployed demo URL + test notes",
          },
        ],
        is_published: true,
        created_at: now,
      },
      {
        id: intern2Id,
        slug: "applied-ai-data-systems",
        title: "Applied AI & Data Systems Internship",
        track: "Data & AI",
        description:
          "Design evaluation pipelines, structured prompts, and measurable data workflows on real datasets with mentor critique.",
        duration_weeks: 8,
        required_course_slug: "applied-ai-evaluation",
        required_project_slug: "eval-harness-studio",
        require_project_approval: true,
        tasks: [
          {
            id: "task-ai-1",
            title: "Task 1: Golden Dataset Curation (30+ Edge Cases)",
            brief: "Publish a reproducible JSONL test set covering normal, missing-context, and adversarial prompt cases.",
            deadlineLabel: "Week 2",
            deliverableFormat: "GitHub dataset link",
          },
          {
            id: "task-ai-2",
            title: "Task 2: Automated Regression Diff Report",
            brief: "Run deterministic schema and calibration comparisons between baseline and tuned prompt templates.",
            deadlineLabel: "Week 6",
            deliverableFormat: "Runner script + summary report URL",
          },
        ],
        is_published: true,
        created_at: now,
      },
      {
        id: intern3Id,
        slug: "cloud-security-engineering",
        title: "Cloud & Security Engineering Internship",
        track: "Infrastructure",
        description:
          "Implement authentication boundaries, webhook verification, and resilient telemetry instrumentation with architecture reviews.",
        duration_weeks: 6,
        required_course_slug: "cybersecurity-trust-boundaries",
        required_project_slug: "webhook-trust-boundary",
        require_project_approval: true,
        tasks: [
          {
            id: "task-sec-1",
            title: "Task 1: Timing-Safe Webhook Signature Harness",
            brief: "Demonstrate raw-body HMAC SHA-256 verification plus duplicate event_id replay protection under test.",
            deadlineLabel: "Week 2",
            deliverableFormat: "Repository + passing test trace URL",
          },
          {
            id: "task-sec-2",
            title: "Task 2: Zero-Downtime Rollout & Incident Runbook",
            brief: "Document health probes, backward-compatible SQL expansion steps, and rollback triggers.",
            deadlineLabel: "Week 5",
            deliverableFormat: "Architecture runbook URL",
          },
        ],
        is_published: true,
        created_at: now,
      },
    ],
    applications: [
      {
        id: app1Id,
        user_id: DEMO_STUDENT_ID,
        internship_id: intern1Id,
        applicant_name: "Aarav Sharma",
        applicant_email: "aarav.sharma@example.edu",
        motivation: "Building accessible full-stack systems and verifiable learning credentials.",
        portfolio_url: "https://github.com/example/aarav-portfolio",
        status: "completed",
        submission_url: "https://github.com/example/tgl-capstone-submission",
        submission_summary: "Implemented signed API boundaries, audit logging, and accessible React dashboard.",
        task_submissions: [
          {
            taskId: "task-fs-1",
            submissionUrl: "https://github.com/example/tgl-capstone-submission/pull/1",
            summary: "Added Zod schema guards across checkout and workspace endpoints.",
            status: "approved",
            mentorFeedback: "Clean boundary checks and unit tests.",
            scoreLabel: "Exceeds Expectations",
            submittedAt: "2026-11-10T10:00:00.000Z",
            evaluatedAt: "2026-11-11T11:00:00.000Z",
          },
          {
            taskId: "task-fs-2",
            submissionUrl: "https://github.com/example/tgl-capstone-submission/pull/2",
            summary: "Shipped responsive keyboard-accessible workspace views.",
            status: "approved",
            mentorFeedback: "Verified desktop 1440px and mobile 390px parity.",
            scoreLabel: "Exceeds Expectations",
            submittedAt: "2026-11-11T12:00:00.000Z",
            evaluatedAt: "2026-11-11T14:20:00.000Z",
          },
        ],
        final_evaluation_notes: "Delivered both studio engineering tasks cleanly with strong boundary discipline.",
        final_score_label: "Distinction (Approved)",
        assessment_passed: true,
        mentor_approved: true,
        mentor_approved_by: DEMO_ADMIN_ID,
        mentor_notes: "Capstone architecture and internship tasks approved by mentor.",
        completed_at: "2026-11-11T14:30:00.000Z",
        created_at: now,
        updated_at: "2026-11-11T14:30:00.000Z",
      },
      {
        id: app2Id,
        user_id: DEMO_STUDENT_ID,
        internship_id: intern2Id,
        applicant_name: "Aarav Sharma",
        applicant_email: "aarav.sharma@example.edu",
        motivation: "Exploring reproducible model evaluation pipelines.",
        portfolio_url: "https://github.com/example/aarav-portfolio",
        status: "in_progress",
        submission_url: null,
        submission_summary: null,
        task_submissions: [],
        final_evaluation_notes: null,
        final_score_label: null,
        assessment_passed: false,
        mentor_approved: false,
        mentor_approved_by: null,
        mentor_notes: null,
        completed_at: null,
        created_at: now,
        updated_at: now,
      },
    ],
    products: [
      {
        id: prodInternId,
        slug: "internship-certificate",
        name: "Internship Completion Certificate",
        description:
          "Official verified Internship Completion Certificate included in Programme Enrolment (₹0 extra) once learning, practical project, internship tasks, and mentor review are approved.",
        certificate_type: "internship",
        price_paise: 0,
        currency: "INR",
        enabled: true,
        eligibility_rules: {
          requiresInternshipCompletion: true,
          requiresSubmission: true,
          requiresMentorApproval: true,
        },
        created_at: now,
        updated_at: now,
      },
      {
        id: prodCourseId,
        slug: "course-completion-certificate",
        name: "Programme Completion Certificate",
        description:
          "Official Programme Completion Certificate included in your enrolment (₹0 extra) after finishing required modules, quiz, and mentor review.",
        certificate_type: "course_completion",
        price_paise: 0,
        currency: "INR",
        enabled: true,
        eligibility_rules: {
          requiresPathwayCompletion: true,
          requiresSubmission: false,
          requiresAssessmentPass: true,
          requiresMentorApproval: true,
        },
        created_at: now,
        updated_at: now,
      },
      {
        id: prodProjectId,
        slug: "project-completion-certificate",
        name: "Project Completion Certificate",
        description:
          "Official Project Completion Credential included with Programme Enrolment (₹0 extra) upon mentor capstone approval.",
        certificate_type: "project_completion",
        price_paise: 0,
        currency: "INR",
        enabled: true,
        eligibility_rules: {
          requiresSubmission: true,
          requiresAssessmentPass: true,
          requiresMentorApproval: true,
        },
        created_at: now,
        updated_at: now,
      },
      {
        id: prodSpecialId,
        slug: "special-achievement-certificate",
        name: "Special Achievement Distinction",
        description:
          "Honours distinction credential awarded by administrators at ₹0 extra for exceptional craftsmanship.",
        certificate_type: "special_achievement",
        price_paise: 0,
        currency: "INR",
        enabled: true,
        eligibility_rules: {
          requiresSubmission: true,
          requiresMentorApproval: true,
          requiresAdminDistinction: true,
        },
        created_at: now,
        updated_at: now,
      },
    ],
    orders: [
      {
        id: "44444444-4444-4444-8444-444444444401",
        user_id: DEMO_GRADUATE_ID,
        order_kind: "programme_enrollment",
        product_id: null,
        course_id: "course-web-architecture",
        internship_application_id: null,
        razorpay_order_id: "order_seed_prog_web_1299",
        amount_paise: 129900,
        currency: "INR",
        order_status: "paid",
        payment_mode: "razorpay_test",
        metadata: {
          programmeTitle: "Full Stack Web Architecture Internship Programme",
          certificateIncluded: true,
        },
        created_at: "2026-11-08T10:00:00.000Z",
        updated_at: "2026-11-08T10:03:00.000Z",
      },
    ],
    payments: [
      {
        id: "55555555-5555-4555-8555-555555555501",
        order_id: "44444444-4444-4444-8444-444444444401",
        user_id: DEMO_GRADUATE_ID,
        razorpay_payment_id: "pay_seed_prog_web_1299",
        razorpay_signature: "verified_seed_hmac",
        payment_status: "captured",
        payment_method: "upi",
        failure_reason: null,
        verified_at: "2026-11-08T10:03:00.000Z",
        refunded_at: null,
        refund_id: null,
        created_at: "2026-11-08T10:03:00.000Z",
      },
    ],
    webhookEvents: [],
    issuances: [
      {
        id: "66666666-6666-4666-8666-666666666601",
        user_id: DEMO_GRADUATE_ID,
        product_id: prodInternId,
        payment_id: "55555555-5555-4555-8555-555555555501",
        internship_application_id: null,
        certificate_id: "TGL-CERT-2026-8419",
        recipient_name: "Meera Krishnan",
        recipient_email: "meera.krishnan@example.edu",
        achievement_title: "Full-Stack Product Engineering Internship",
        certificate_type: "internship",
        eligibility_status: "eligible",
        issuance_status: "issued",
        approved_by: DEMO_ADMIN_ID,
        revocation_reason: null,
        issued_at: "2026-11-08T10:05:00.000Z",
        revoked_at: null,
        created_at: "2026-11-08T10:05:00.000Z",
      },
      {
        id: "66666666-6666-4666-8666-666666666602",
        user_id: DEMO_GRADUATE_ID,
        product_id: prodProjectId,
        payment_id: null,
        internship_application_id: null,
        certificate_id: "TGL-CERT-2026-0002",
        recipient_name: "Rohan Verma",
        recipient_email: "rohan.verma@example.edu",
        achievement_title: "Cloud Telemetry Capstone",
        certificate_type: "project_completion",
        eligibility_status: "ineligible",
        issuance_status: "revoked",
        approved_by: DEMO_ADMIN_ID,
        revocation_reason: "Superseded after post-submission audit review.",
        issued_at: "2026-10-15T10:00:00.000Z",
        revoked_at: "2026-11-02T12:00:00.000Z",
        created_at: "2026-10-15T10:00:00.000Z",
      },
    ],
    emailTemplates: DEFAULT_EMAIL_TEMPLATES.map((t) => ({ ...t })),
    emailLogs: [],
    pathwayCompletedUserIds: new Set([DEMO_STUDENT_ID, DEMO_GRADUATE_ID]),
    distinctionApprovedUserIds: new Set([DEMO_GRADUATE_ID]),
    claimedCertificateAtByCertId: {},
    sandboxDisplayNamesByUserId: {
      [DEMO_STUDENT_ID]: "Aarav Sharma",
      [DEMO_ADMIN_ID]: "TGL Administrator",
    },
  };
}

export function getMemoryStore(): MemoryStore {
  if (!globalStore.__tglCertStore) {
    globalStore.__tglCertStore = createSeedStore();
  }
  return globalStore.__tglCertStore;
}

export function resetMemoryStoreForTest(): void {
  globalStore.__tglCertStore = createSeedStore();
}

export function getCertificateClaimedAt(
  certificateId: string,
  issuance?: Pick<CertificateIssuanceRecord, "claimed_at"> | null,
): string | null {
  return (
    issuance?.claimed_at ??
    getMemoryStore().claimedCertificateAtByCertId[certificateId] ??
    null
  );
}

export function markCertificateClaimed(certificateId: string): string {
  const store = getMemoryStore();
  if (!store.claimedCertificateAtByCertId[certificateId]) {
    store.claimedCertificateAtByCertId[certificateId] = new Date().toISOString();
  }
  const claimedAt = store.claimedCertificateAtByCertId[certificateId];
  const cert = store.issuances.find((i) => i.certificate_id === certificateId);
  if (cert) {
    cert.claimed_at = cert.claimed_at ?? claimedAt;
  }
  if (isFirestoreConfigured()) {
    try {
      const db = getAdminFirestore();
      if (db) {
        void db.collection("certificates").doc(safeFirestoreDocId(certificateId)).set(
          {
            claimed_at: claimedAt,
            claimedAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
      }
    } catch {
      // Non-fatal
    }
  }
  return claimedAt;
}

export function updateSandboxDisplayName(userId: string, fullName: string): string {
  const trimmed = fullName.trim();
  const store = getMemoryStore();
  store.sandboxDisplayNamesByUserId[userId] = trimmed;
  for (const app of store.applications) {
    if (app.user_id === userId) {
      app.applicant_name = trimmed;
    }
  }
  for (const cert of store.issuances) {
    if (cert.user_id === userId) {
      cert.recipient_name = trimmed;
    }
  }
  return trimmed;
}

export async function resolveCurrentActor(options?: {
  request?: Request;
  allowSandboxAdmin?: boolean;
}): Promise<{ user: SandboxUser | null; configured: boolean }> {
  const authConfigured = isFirebaseAuthConfigured();
  const fbActor = await getAuthenticatedFirebaseActor(options?.request);
  if (fbActor) {
    let resolvedName = fbActor.displayName;
    if (!resolvedName && isFirestoreConfigured()) {
      try {
        const db = getAdminFirestore();
        const userSnap = await db?.collection("users").doc(fbActor.uid).get();
        const profileName = userSnap?.data()?.displayName;
        if (typeof profileName === "string" && profileName.trim()) {
          resolvedName = profileName.trim();
        }
      } catch {
        // Non-fatal
      }
    }
    const verifiedRole: "student" | "admin" =
      fbActor.emailVerified && isPrivilegedStaffEmail(fbActor.email)
        ? "admin"
        : "student";
    return {
      user: {
        id: fbActor.uid,
        email: fbActor.email,
        name: resolvedName,
        role: verifiedRole,
        isSandbox: false,
      },
      configured: true,
    };
  }

  // Whenever Firebase Authentication is configured, NEVER fall back to any demo/sandbox account.
  if (authConfigured || isFirestoreConfigured()) {
    return { user: null, configured: true };
  }

  const sandboxId = options?.allowSandboxAdmin ? DEMO_ADMIN_ID : DEMO_STUDENT_ID;
  const fallbackName = options?.allowSandboxAdmin ? "TGL Administrator" : "Aarav Sharma";
  const storedName = getMemoryStore().sandboxDisplayNamesByUserId[sandboxId];

  return {
    user: {
      id: sandboxId,
      email: options?.allowSandboxAdmin ? "admin@touchgrasslater.org" : "aarav.sharma@example.edu",
      name: storedName || fallbackName,
      role: options?.allowSandboxAdmin ? "admin" : "student",
      isSandbox: true,
    },
    configured: false,
  };
}

export async function requireAdminActor(
  request?: Request,
): Promise<
  { user: SandboxUser; error: null } | { user: null; error: { message: string; status: number } }
> {
  const { user, configured } = await resolveCurrentActor({
    request,
    allowSandboxAdmin: !isFirebaseAuthConfigured() && !isFirestoreConfigured(),
  });
  if (configured) {
    if (!user) return { user: null, error: { message: "Sign in required.", status: 401 } };
    if (user.role !== "admin" || !isPrivilegedStaffEmail(user.email)) {
      return { user: null, error: { message: "Administrator access required.", status: 403 } };
    }
    return { user, error: null };
  }
  if (!user) return { user: null, error: { message: "Sign in required.", status: 401 } };
  return { user, error: null };
}

export async function listInternships(): Promise<InternshipRecord[]> {
  if (isFirestoreConfigured()) {
    try {
      const db = getAdminFirestore();
      if (db) {
        const snap = await db.collection("internships").get();
        if (!snap.empty) {
          const rows = snap.docs
            .map((d) => d.data() as InternshipRecord)
            .filter((i) => i.is_published)
            .sort((a, b) => a.created_at.localeCompare(b.created_at));
          if (rows.length > 0) return rows;
        }
      }
    } catch {
      // Fallback to seed list
    }
  }
  return getMemoryStore().internships.filter((i) => i.is_published);
}

export async function listProducts(includeDisabled = false): Promise<CertificationProductRecord[]> {
  if (isFirestoreConfigured()) {
    try {
      const db = getAdminFirestore();
      if (db) {
        const snap = await db
          .collection("settings")
          .where("type", "==", "cert_product")
          .get();
        if (!snap.empty) {
          const rows = snap.docs
            .map((d) => d.data() as CertificationProductRecord)
            .filter((p) => includeDisabled || p.enabled)
            .sort((a, b) => a.created_at.localeCompare(b.created_at));
          if (rows.length > 0) return rows;
        }
      }
    } catch {
      // Fallback
    }
  }
  const products = getMemoryStore().products;
  return includeDisabled ? [...products] : products.filter((p) => p.enabled);
}

export async function createOrUpdateProduct(input: {
  id?: string;
  name: string;
  description: string;
  certificateType: CertificateType;
  pricePaise: number;
  enabled: boolean;
  eligibilityRules?: EligibilityRuleSet;
}): Promise<{ product?: CertificationProductRecord; error?: string }> {
  const priceCheck = validateProductPricePaise(input.pricePaise);
  if (!priceCheck.valid) return { error: priceCheck.error };

  const slug = input.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  const store = getMemoryStore();
  const now = new Date().toISOString();
  let product: CertificationProductRecord;

  if (input.id) {
    const existing = store.products.find((p) => p.id === input.id);
    if (existing) {
      existing.name = input.name;
      existing.description = input.description;
      existing.certificate_type = input.certificateType;
      existing.price_paise = input.pricePaise;
      existing.enabled = input.enabled;
      if (input.eligibilityRules) existing.eligibility_rules = input.eligibilityRules;
      existing.updated_at = now;
      product = existing;
    } else {
      product = {
        id: input.id,
        slug: `${slug}-${Date.now().toString(36)}`,
        name: input.name,
        description: input.description,
        certificate_type: input.certificateType,
        price_paise: input.pricePaise,
        currency: CERTIFICATE_CURRENCY,
        enabled: input.enabled,
        eligibility_rules: input.eligibilityRules ?? {
          requiresSubmission: true,
          requiresMentorApproval: true,
        },
        created_at: now,
        updated_at: now,
      };
      store.products.push(product);
    }
  } else {
    product = {
      id: randomUUID(),
      slug: `${slug}-${Date.now().toString(36)}`,
      name: input.name,
      description: input.description,
      certificate_type: input.certificateType,
      price_paise: input.pricePaise,
      currency: "INR",
      enabled: input.enabled,
      eligibility_rules: input.eligibilityRules ?? {
        requiresSubmission: true,
        requiresMentorApproval: true,
      },
      created_at: now,
      updated_at: now,
    };
    store.products.push(product);
  }

  if (isFirestoreConfigured()) {
    try {
      const db = getAdminFirestore();
      if (db) {
        await db
          .collection("settings")
          .doc(`cert_product_${product.id}`)
          .set({ type: "cert_product", ...cleanForFirestore(product) }, { merge: true });
      }
    } catch {
      // Non-fatal
    }
  }

  return { product };
}

export async function listStudentApplications(userId: string): Promise<InternshipApplicationRecord[]> {
  if (isFirestoreConfigured()) {
    try {
      const db = getAdminFirestore();
      if (db) {
        const snap = await db
          .collection("settings")
          .where("type", "==", "internship_application")
          .where("user_id", "==", userId)
          .get();
        if (!snap.empty) {
          return snap.docs
            .map((d) => d.data() as InternshipApplicationRecord)
            .sort((a, b) => b.created_at.localeCompare(a.created_at));
        }
      }
    } catch {
      // Fallback
    }
  }
  return getMemoryStore().applications.filter((a) => a.user_id === userId);
}

export async function applyForInternship(params: {
  userId: string;
  internshipId: string;
  applicantName: string;
  applicantEmail: string;
  motivation: string;
  portfolioUrl?: string;
}): Promise<{ application?: InternshipApplicationRecord; error?: string }> {
  const internships = await listInternships();
  const internship = internships.find((i) => i.id === params.internshipId);
  if (!internship) return { error: "Internship track not found." };

  const store = getMemoryStore();
  const existingApps = await listStudentApplications(params.userId);
  const existing = existingApps.find((a) => a.internship_id === params.internshipId);
  const now = new Date().toISOString();

  let app: InternshipApplicationRecord;
  if (existing) {
    app = {
      ...existing,
      motivation: params.motivation,
      portfolio_url: params.portfolioUrl || null,
      updated_at: now,
    };
    const idx = store.applications.findIndex((a) => a.id === app.id);
    if (idx >= 0) store.applications[idx] = app;
    else store.applications.unshift(app);
  } else {
    app = {
      id: randomUUID(),
      user_id: params.userId,
      internship_id: params.internshipId,
      applicant_name: params.applicantName,
      applicant_email: params.applicantEmail,
      motivation: params.motivation,
      portfolio_url: params.portfolioUrl || null,
      status: "in_progress",
      submission_url: null,
      submission_summary: null,
      assessment_passed: false,
      mentor_approved: false,
      mentor_approved_by: null,
      mentor_notes: null,
      completed_at: null,
      created_at: now,
      updated_at: now,
    };
    store.applications.unshift(app);
  }

  if (isFirestoreConfigured()) {
    try {
      const db = getAdminFirestore();
      if (db) {
        await db
          .collection("settings")
          .doc(`int_app_${app.id}`)
          .set({ type: "internship_application", ...cleanForFirestore(app) }, { merge: true });
      }
    } catch {
      return { error: "Could not submit internship application." };
    }
  }

  return { application: app };
}

export async function submitInternshipWork(params: {
  userId: string;
  applicationId: string;
  submissionUrl: string;
  submissionSummary: string;
}): Promise<{ application?: InternshipApplicationRecord; error?: string }> {
  const apps = await listStudentApplications(params.userId);
  const app = apps.find((a) => a.id === params.applicationId && a.user_id === params.userId);
  if (!app) return { error: "Internship application not found." };
  app.submission_url = params.submissionUrl;
  app.submission_summary = params.submissionSummary;
  app.updated_at = new Date().toISOString();

  if (isFirestoreConfigured()) {
    try {
      const db = getAdminFirestore();
      if (db) {
        await db
          .collection("settings")
          .doc(`int_app_${app.id}`)
          .set({ type: "internship_application", ...cleanForFirestore(app) }, { merge: true });
      }
    } catch {
      return { error: "Could not record submission." };
    }
  }
  return { application: app };
}

export async function evaluateProductEligibilityForUser(params: {
  userId: string;
  product: CertificationProductRecord;
  internshipApplicationId?: string | null;
}): Promise<{ evaluation: EligibilityEvaluation; matchedApplication: InternshipApplicationRecord | null; achievementTitle: string }> {
  const applications = await listStudentApplications(params.userId);
  const completedApps = applications.filter((a) => a.status === "completed");
  const targetApp =
    (params.internshipApplicationId
      ? applications.find((a) => a.id === params.internshipApplicationId)
      : null) ??
    completedApps.find((a) => a.mentor_approved) ??
    applications[0] ??
    null;

  let pathwayCompleted = false;
  let distinctionApproved = false;
  if (isFirestoreConfigured()) {
    try {
      const db = getAdminFirestore();
      if (db) {
        const completedSnap = await db
          .collection("progress")
          .where("userId", "==", params.userId)
          .where("status", "==", "completed")
          .limit(1)
          .get();
        pathwayCompleted = !completedSnap.empty;
      }
    } catch {
      pathwayCompleted = false;
    }
  } else {
    const store = getMemoryStore();
    pathwayCompleted = store.pathwayCompletedUserIds.has(params.userId);
    distinctionApproved = store.distinctionApprovedUserIds.has(params.userId);
  }

  const internshipCompleted = targetApp?.status === "completed";
  const submissionProvided = Boolean(targetApp?.submission_url);
  const assessmentPassed = Boolean(targetApp?.assessment_passed) || pathwayCompleted;
  const mentorApproved = Boolean(targetApp?.mentor_approved);

  const evaluation = evaluateCertificateEligibility({
    certificateType: params.product.certificate_type,
    rules: params.product.eligibility_rules,
    internshipCompleted,
    pathwayCompleted,
    submissionProvided,
    assessmentPassed,
    mentorApproved,
    adminDistinctionApproved: distinctionApproved,
  });

  const internships = await listInternships();
  const matchedInternship = targetApp
    ? internships.find((i) => i.id === targetApp.internship_id)
    : undefined;
  const achievementTitle = matchedInternship?.title ?? params.product.name;

  return { evaluation, matchedApplication: targetApp, achievementTitle };
}

export async function sendAndLogLifecycleEmail(params: {
  recipientEmail: string;
  templateKey: EmailTemplateKey;
  variables: Record<string, string>;
  isSimulatedTransaction?: boolean;
  forceFailure?: boolean;
}): Promise<EmailDeliveryRecord> {
  const templates = await listEmailTemplates();
  const templateOverride = templates.find((t) => t.template_key === params.templateKey);
  const { record } = await dispatchLifecycleEmail({
    recipientEmail: params.recipientEmail,
    templateKey: params.templateKey,
    variables: params.variables,
    templateOverride,
    isSimulatedTransaction: params.isSimulatedTransaction,
    forceFailure: params.forceFailure,
  });

  getMemoryStore().emailLogs.unshift(record);
  if (isFirestoreConfigured()) {
    try {
      const db = getAdminFirestore();
      if (db) {
        await db
          .collection("activity_logs")
          .doc(`email_${safeFirestoreDocId(record.id)}`)
          .set({
            type: "email_log",
            ...cleanForFirestore(record),
            createdAt: FieldValue.serverTimestamp(),
          });
      }
    } catch {
      // Non-fatal
    }
  }

  return record;
}

export async function createCertificationOrder(_params: {
  user: SandboxUser;
  productId: string;
  internshipApplicationId?: string | null;
}): Promise<{
  order?: CertificationOrderRecord;
  keyId?: string | null;
  isSimulated?: boolean;
  product?: CertificationProductRecord;
  error?: string;
  status?: number;
}> {
  void _params;
  return {
    error:
      "Separate certificate payments have been retired. Internship and programme completion certificates are included at ₹0 extra with your Programme Enrolment once all completion and mentor approval requirements are met.",
    status: 400,
  };
}

export async function activateBundledProgrammeInternship(params: {
  userId: string;
  userName: string;
  userEmail: string;
  courseId: string;
  courseSlug: string;
  courseTitle: string;
  linkedInternshipSlug: string;
}): Promise<InternshipApplicationRecord | null> {
  const internships = await listInternships();
  const track =
    internships.find((i) => i.slug === params.linkedInternshipSlug) ??
    internships.find((i) => i.required_course_slug === params.courseSlug) ??
    null;
  if (!track) return null;

  const now = new Date().toISOString();
  const store = getMemoryStore();
  const existingApps = await listStudentApplications(params.userId);
  const existing = existingApps.find((a) => a.internship_id === track.id);

  let app: InternshipApplicationRecord;
  if (existing) {
    app = {
      ...existing,
      course_id: params.courseId,
      status: existing.status === "completed" ? "completed" : "in_progress",
      updated_at: now,
    };
    const idx = store.applications.findIndex((a) => a.id === app.id);
    if (idx >= 0) store.applications[idx] = app;
    else store.applications.unshift(app);
  } else {
    app = {
      id: randomUUID(),
      user_id: params.userId,
      internship_id: track.id,
      course_id: params.courseId,
      applicant_name: params.userName,
      applicant_email: params.userEmail,
      motivation: `Activated automatically with Programme Enrolment: ${params.courseTitle}`,
      portfolio_url: null,
      status: "in_progress",
      submission_url: null,
      submission_summary: null,
      task_submissions: [],
      final_evaluation_notes: null,
      final_score_label: null,
      assessment_passed: false,
      mentor_approved: false,
      mentor_approved_by: null,
      mentor_notes: null,
      completed_at: null,
      created_at: now,
      updated_at: now,
    };
    store.applications.unshift(app);
  }

  if (isFirestoreConfigured()) {
    try {
      const db = getAdminFirestore();
      if (db) {
        await db
          .collection("settings")
          .doc(`int_app_${app.id}`)
          .set({ type: "internship_application", ...cleanForFirestore(app) }, { merge: true });
      }
    } catch {
      // Non-fatal
    }
  }

  return app;
}

export async function createCourseEnrollmentOrder(params: {
  user: SandboxUser;
  courseId: string;
  orderKind?: "programme_enrollment" | "course_enrollment";
}): Promise<{
  order?: CertificationOrderRecord;
  keyId?: string | null;
  isSimulated?: boolean;
  courseTitle?: string;
  error?: string;
  status?: number;
}> {
  const course = await findCourseByIdOrSlug(params.courseId);
  if (!course || !course.isPublished) {
    return { error: "Programme not found or not published.", status: 404 };
  }

  const alreadyEnrolled = await hasActiveCourseEnrollment(params.user.id, course.id);
  if (alreadyEnrolled) {
    return {
      error: `You are already enrolled in ${course.title}.`,
      status: 409,
    };
  }

  const resolvedKind = params.orderKind ?? "programme_enrollment";

  const rpOrder = await createRazorpayOrder({
    amountPaise: course.pricePaise,
    currency: "INR",
    receipt: `tgl_prog_${course.slug.slice(0, 18)}_${Date.now()}`,
    notes: {
      userId: params.user.id,
      orderKind: resolvedKind,
      courseId: course.id,
      courseSlug: course.slug,
      linkedInternshipSlug: course.linkedInternshipSlug,
    },
  });

  const now = new Date().toISOString();
  const order: CertificationOrderRecord = {
    id: randomUUID(),
    user_id: params.user.id,
    order_kind: resolvedKind,
    product_id: null,
    course_id: course.id,
    internship_application_id: null,
    razorpay_order_id: rpOrder.razorpayOrderId,
    amount_paise: rpOrder.amountPaise,
    currency: "INR",
    order_status: "created",
    payment_mode: rpOrder.mode,
    metadata: {
      courseId: course.id,
      courseSlug: course.slug,
      courseTitle: course.title,
      linkedInternshipSlug: course.linkedInternshipSlug,
      certificateIncluded: true,
    },
    created_at: now,
    updated_at: now,
  };
  getMemoryStore().orders.unshift(order);

  if (isFirestoreConfigured()) {
    try {
      const db = getAdminFirestore();
      if (db) {
        await db
          .collection("payment_orders")
          .doc(order.id)
          .set({
            ...cleanForFirestore(order),
            userId: order.user_id,
          });
      }
    } catch {
      return { error: "Failed to persist programme enrolment order.", status: 500 };
    }
  }

  await sendAndLogLifecycleEmail({
    recipientEmail: params.user.email,
    templateKey: "purchase_initiated",
    variables: {
      studentName: params.user.name,
      certificateName: `Programme Enrolment: ${course.title}`,
      amountFormatted: formatInrFromPaise(course.pricePaise),
      orderId: order.razorpay_order_id,
      achievementTitle: course.title,
    },
    isSimulatedTransaction: rpOrder.isSimulated,
  });

  return {
    order,
    keyId: rpOrder.keyId,
    isSimulated: rpOrder.isSimulated,
    courseTitle: course.title,
  };
}

export async function findActiveIssuanceForUserProduct(
  userId: string,
  productId: string,
  internshipApplicationId?: string | null,
): Promise<CertificateIssuanceRecord | null> {
  const list = await listIssuances(userId);
  return (
    list.find(
      (i) =>
        i.user_id === userId &&
        i.product_id === productId &&
        i.issuance_status !== "revoked" &&
        (internshipApplicationId
          ? i.internship_application_id === internshipApplicationId || i.internship_application_id === null
          : true),
    ) ?? null
  );
}

export async function findActiveIssuanceForInternshipApplication(
  internshipApplicationId: string,
): Promise<CertificateIssuanceRecord | null> {
  if (isFirestoreConfigured()) {
    try {
      const db = getAdminFirestore();
      if (db) {
        const snap = await db
          .collection("certificates")
          .where("internship_application_id", "==", internshipApplicationId)
          .get();
        const found = snap.docs
          .map((d) => d.data() as CertificateIssuanceRecord)
          .find((i) => i.issuance_status !== "revoked");
        if (found) return found;
      }
    } catch {
      // Fallback
    }
  }
  return (
    getMemoryStore().issuances.find(
      (i) =>
        i.internship_application_id === internshipApplicationId &&
        i.issuance_status !== "revoked",
    ) ?? null
  );
}

async function persistCertificateIssuanceDoc(issuance: CertificateIssuanceRecord): Promise<void> {
  if (!isFirestoreConfigured()) return;
  try {
    const db = getAdminFirestore();
    if (!db) return;
    await db
      .collection("certificates")
      .doc(safeFirestoreDocId(issuance.certificate_id))
      .set(
        {
          ...cleanForFirestore(issuance),
          certificateId: issuance.certificate_id,
          userId: issuance.user_id,
          recipientName: issuance.recipient_name,
          achievementTitle: issuance.achievement_title,
          issuanceStatus: issuance.issuance_status,
          issuedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
  } catch {
    // Non-fatal
  }
}

export async function issueCertificateForVerifiedOrder(params: {
  user: SandboxUser;
  order: CertificationOrderRecord;
  payment: CertificationPaymentRecord | null;
  approvedBy?: string | null;
}): Promise<{ issuance?: CertificateIssuanceRecord; error?: string }> {
  const products = await listProducts(true);
  const product = products.find((p) => p.id === params.order.product_id);
  if (!product) return { error: "Certification product not found." };

  const existing = await findActiveIssuanceForUserProduct(params.user.id, product.id);
  if (existing) return { issuance: existing };

  const { evaluation, matchedApplication, achievementTitle } = await evaluateProductEligibilityForUser({
    userId: params.user.id,
    product,
    internshipApplicationId: params.order.internship_application_id,
  });

  const gate = canIssueCertificate({
    productEnabled: product.enabled,
    pricePaise: product.price_paise,
    eligibility: evaluation,
    paymentStatus: params.payment?.payment_status ?? "none",
    paymentVerified: Boolean(params.payment?.verified_at),
    existingActiveCertificateId: null,
  });

  if (!gate.allowed) {
    return { error: gate.reason };
  }

  const certificateId = `TGL-CERT-2026-${Math.floor(1000 + Math.random() * 9000)}-${randomUUID().slice(0, 4).toUpperCase()}`;
  const now = new Date().toISOString();

  const issuance: CertificateIssuanceRecord = {
    id: randomUUID(),
    user_id: params.user.id,
    product_id: product.id,
    payment_id: params.payment?.id ?? null,
    internship_application_id: matchedApplication?.id ?? null,
    certificate_id: certificateId,
    recipient_name: params.user.name,
    recipient_email: params.user.email,
    achievement_title: achievementTitle,
    certificate_type: product.certificate_type,
    eligibility_status: "eligible",
    issuance_status: "issued",
    approved_by: params.approvedBy ?? matchedApplication?.mentor_approved_by ?? DEMO_ADMIN_ID,
    revocation_reason: null,
    issued_at: now,
    revoked_at: null,
    created_at: now,
  };
  getMemoryStore().issuances.unshift(issuance);
  await persistCertificateIssuanceDoc(issuance);

  const verificationUrl = `/verify/certificate/${issuance.certificate_id}`;
  const downloadUrl = `/api/certificates/${encodeURIComponent(issuance.certificate_id)}/pdf`;
  const joinedOn = params.order.created_at;
  const completedOn = matchedApplication?.completed_at ?? issuance.issued_at ?? now;
  const isSimulated = params.order.payment_mode === "simulated_test";

  await sendAndLogLifecycleEmail({
    recipientEmail: params.user.email,
    templateKey: "certificate_issued",
    variables: {
      studentName: params.user.name,
      certificateName: product.name,
      achievementTitle,
      certificateId: issuance.certificate_id,
      verificationUrl,
      downloadUrl,
      joinedOn,
      completedOn,
    },
    isSimulatedTransaction: isSimulated,
  });

  await sendAndLogLifecycleEmail({
    recipientEmail: params.user.email,
    templateKey: "certificate_ready",
    variables: {
      studentName: params.user.name,
      certificateName: product.name,
      achievementTitle,
      certificateId: issuance.certificate_id,
      verificationUrl,
      downloadUrl,
      joinedOn,
      completedOn,
    },
    isSimulatedTransaction: isSimulated,
  });

  return { issuance };
}

export async function verifyAndCaptureCheckoutPayment(params: {
  user: SandboxUser;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
  paymentMethod?: string;
  simulateTestCheckout?: boolean;
}): Promise<{
  payment?: CertificationPaymentRecord;
  issuance?: CertificateIssuanceRecord;
  enrollment?: CourseEnrollmentRecord;
  internshipApplication?: InternshipApplicationRecord | null;
  error?: string;
  status?: number;
}> {
  const orders = await listOrders(params.user.id);
  const order = orders.find((o) => o.razorpay_order_id === params.razorpayOrderId);
  if (!order) return { error: "Order not found for current user.", status: 404 };

  const isSimulatedOrder = order.payment_mode === "simulated_test";
  let signatureValid = false;

  if (isSimulatedOrder && params.simulateTestCheckout) {
    signatureValid =
      params.razorpaySignature !== "invalid_signature" &&
      params.razorpaySignature.startsWith("sim_sig_");
  } else {
    signatureValid = verifyRazorpayPaymentSignature({
      orderId: params.razorpayOrderId,
      paymentId: params.razorpayPaymentId,
      signature: params.razorpaySignature,
    });
  }

  if (!signatureValid) {
    return { error: "Invalid Razorpay payment signature. Payment rejected.", status: 400 };
  }

  const now = new Date().toISOString();
  const store = getMemoryStore();
  const existingPayments = await listPayments(params.user.id);
  const existingPay = existingPayments.find(
    (p) => p.razorpay_payment_id === params.razorpayPaymentId,
  );
  let payment: CertificationPaymentRecord;
  let isNewPayment = false;

  if (existingPay) {
    payment = existingPay;
  } else {
    payment = {
      id: randomUUID(),
      order_id: order.id,
      user_id: params.user.id,
      razorpay_payment_id: params.razorpayPaymentId,
      razorpay_signature: params.razorpaySignature,
      payment_status: "captured",
      payment_method: params.paymentMethod ?? "upi",
      failure_reason: null,
      verified_at: now,
      refunded_at: null,
      refund_id: null,
      created_at: now,
    };
    store.payments.unshift(payment);
    isNewPayment = true;
  }
  order.order_status = "paid";
  order.updated_at = now;

  if (isFirestoreConfigured()) {
    try {
      const db = getAdminFirestore();
      if (db) {
        await Promise.all([
          db.collection("payments").doc(payment.id).set({
            ...cleanForFirestore(payment),
            userId: payment.user_id,
          }, { merge: true }),
          db.collection("payment_orders").doc(order.id).set({
            order_status: "paid",
            updated_at: now,
          }, { merge: true }),
        ]);
      }
    } catch {
      return { error: "Could not record payment.", status: 500 };
    }
  }

  const isCourseOrder =
    order.order_kind === "programme_enrollment" ||
    order.order_kind === "course_enrollment" ||
    Boolean(order.course_id);

  if (isCourseOrder && order.course_id) {
    const course = await findCourseByIdOrSlug(order.course_id);
    const enrollment = await activateCourseEnrollment({
      userId: params.user.id,
      courseId: order.course_id,
      paymentId: payment.id,
    });

    const internshipApplication = course
      ? await activateBundledProgrammeInternship({
          userId: params.user.id,
          userName: params.user.name,
          userEmail: params.user.email,
          courseId: course.id,
          courseSlug: course.slug,
          courseTitle: course.title,
          linkedInternshipSlug: course.linkedInternshipSlug,
        })
      : null;

    if (isNewPayment) {
      await sendAndLogLifecycleEmail({
        recipientEmail: params.user.email,
        templateKey: "enrollment_confirmed",
        variables: {
          studentName: params.user.name,
          programmeName: course?.title ?? "TGL Programme",
          enrollmentId: enrollment.id,
          joinedOn: new Date(enrollment.enrolledAt).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          }),
          dashboardUrl: "/learn",
        },
        isSimulatedTransaction: isSimulatedOrder,
      });
    }

    return {
      payment,
      enrollment,
      internshipApplication,
    };
  }

  const products = await listProducts(true);
  const product = products.find((p) => p.id === order.product_id);

  if (isNewPayment) {
    await sendAndLogLifecycleEmail({
      recipientEmail: params.user.email,
      templateKey: "payment_success",
      variables: {
        studentName: params.user.name,
        certificateName: product?.name ?? "TGL Certificate",
        amountFormatted: formatInrFromPaise(order.amount_paise),
        paymentId: payment.razorpay_payment_id,
        orderId: order.razorpay_order_id,
      },
      isSimulatedTransaction: isSimulatedOrder,
    });
  }

  const issueResult = await issueCertificateForVerifiedOrder({
    user: params.user,
    order,
    payment,
  });

  return {
    payment,
    issuance: issueResult.issuance,
    error: issueResult.error,
  };
}

export async function recordFailedOrCancelledPayment(params: {
  user: SandboxUser;
  razorpayOrderId: string;
  razorpayPaymentId?: string;
  status: "failed" | "cancelled";
  reason: string;
}): Promise<{ order?: CertificationOrderRecord; error?: string }> {
  const orders = await listOrders(params.user.id);
  const order = orders.find((o) => o.razorpay_order_id === params.razorpayOrderId);
  if (!order) return { error: "Order not found." };

  const now = new Date().toISOString();
  const paymentId = params.razorpayPaymentId || `pay_${params.status}_${randomUUID().slice(0, 8)}`;

  const store = getMemoryStore();
  order.order_status = params.status;
  order.updated_at = now;
  const failedPayment: CertificationPaymentRecord = {
    id: randomUUID(),
    order_id: order.id,
    user_id: params.user.id,
    razorpay_payment_id: paymentId,
    razorpay_signature: null,
    payment_status: params.status,
    payment_method: null,
    failure_reason: params.reason,
    verified_at: null,
    refunded_at: null,
    refund_id: null,
    created_at: now,
  };
  store.payments.unshift(failedPayment);

  if (isFirestoreConfigured()) {
    try {
      const db = getAdminFirestore();
      if (db) {
        await Promise.all([
          db.collection("payment_orders").doc(order.id).set(
            { order_status: params.status, updated_at: now },
            { merge: true },
          ),
          db.collection("payments").doc(failedPayment.id).set({
            ...cleanForFirestore(failedPayment),
            userId: failedPayment.user_id,
          }, { merge: true }),
        ]);
      }
    } catch {
      // Non-fatal
    }
  }

  let itemName = "TGL Certificate";
  if (order.course_id) {
    const course = await findCourseByIdOrSlug(order.course_id);
    if (course) itemName = `Course Enrollment: ${course.title}`;
  } else if (order.product_id) {
    const products = await listProducts(true);
    const product = products.find((p) => p.id === order.product_id);
    if (product) itemName = product.name;
  }

  await sendAndLogLifecycleEmail({
    recipientEmail: params.user.email,
    templateKey: "payment_failed",
    variables: {
      studentName: params.user.name,
      certificateName: itemName,
      amountFormatted: formatInrFromPaise(order.amount_paise),
      reason: params.reason,
      orderId: order.razorpay_order_id,
    },
    isSimulatedTransaction: order.payment_mode === "simulated_test",
  });

  return { order };
}

export async function processRazorpayWebhookEvent(params: {
  rawBody: string;
  signature: string | null;
  eventIdHeader: string | null;
  webhookSecretOverride?: string;
}): Promise<{
  status: number;
  processingStatus: "processed" | "ignored_duplicate" | "rejected";
  message: string;
}> {
  const sigValid = verifyRazorpayWebhookSignature({
    rawBody: params.rawBody,
    signature: params.signature,
    webhookSecretOverride: params.webhookSecretOverride,
  });

  if (!sigValid) {
    return { status: 401, processingStatus: "rejected", message: "Invalid Razorpay webhook signature." };
  }

  let parsed: {
    event?: string;
    payload?: {
      payment?: { entity?: { id?: string; order_id?: string; method?: string; error_description?: string } };
      refund?: { entity?: { id?: string; payment_id?: string } };
    };
  };
  try {
    parsed = JSON.parse(params.rawBody);
  } catch {
    return { status: 400, processingStatus: "rejected", message: "Invalid webhook JSON." };
  }

  const eventType = parsed.event ?? "unknown";
  const paymentEntity = parsed.payload?.payment?.entity;
  const refundEntity = parsed.payload?.refund?.entity;
  const eventId =
    params.eventIdHeader?.trim() ||
    `${eventType}:${paymentEntity?.id ?? refundEntity?.id ?? "none"}`;

  const store = getMemoryStore();
  if (isFirestoreConfigured()) {
    try {
      const db = getAdminFirestore();
      if (db) {
        const eventRef = db
          .collection("activity_logs")
          .doc(`wh_${safeFirestoreDocId(eventId)}`);
        const existingEvent = await eventRef.get();
        if (existingEvent.exists) {
          return {
            status: 200,
            processingStatus: "ignored_duplicate",
            message: "Duplicate webhook event ignored idempotently.",
          };
        }
        await eventRef.set({
          type: "webhook_event",
          event_id: eventId,
          event_type: eventType,
          payload: cleanForFirestore(parsed),
          processing_status: "processed",
          received_at: new Date().toISOString(),
        });
      }
    } catch {
      // Fallback to in-memory duplicate guard
    }
  }

  const duplicate = store.webhookEvents.find((e) => e.event_id === eventId);
  if (duplicate) {
    return {
      status: 200,
      processingStatus: "ignored_duplicate",
      message: "Duplicate webhook event ignored idempotently.",
    };
  }

  const now = new Date().toISOString();
  const webhookEntry: WebhookEventRecord = {
    id: randomUUID(),
    event_id: eventId,
    event_type: eventType,
    payload: parsed as Record<string, unknown>,
    processing_status: "processed",
    error_message: null,
    received_at: now,
    processed_at: now,
  };
  store.webhookEvents.unshift(webhookEntry);

  const allOrders = await listOrders();
  const allPayments = await listPayments();

  if (eventType === "payment.captured" && paymentEntity?.order_id && paymentEntity.id) {
    const order = allOrders.find((o) => o.razorpay_order_id === paymentEntity.order_id);
    if (order) {
      order.order_status = "paid";
      order.updated_at = now;
      const existingPay = allPayments.find((p) => p.razorpay_payment_id === paymentEntity.id);
      let paymentIdRef = existingPay?.id;
      let targetPayment: CertificationPaymentRecord;
      if (existingPay) {
        existingPay.payment_status = "captured";
        existingPay.verified_at = existingPay.verified_at ?? now;
        targetPayment = existingPay;
      } else {
        targetPayment = {
          id: randomUUID(),
          order_id: order.id,
          user_id: order.user_id,
          razorpay_payment_id: paymentEntity.id,
          razorpay_signature: null,
          payment_status: "captured",
          payment_method: paymentEntity.method ?? "webhook",
          failure_reason: null,
          verified_at: now,
          refunded_at: null,
          refund_id: null,
          created_at: now,
        };
        store.payments.unshift(targetPayment);
        paymentIdRef = targetPayment.id;
      }

      if (isFirestoreConfigured()) {
        const db = getAdminFirestore();
        if (db) {
          await Promise.all([
            db.collection("payment_orders").doc(order.id).set(
              { order_status: "paid", updated_at: now },
              { merge: true },
            ),
            db.collection("payments").doc(targetPayment.id).set(
              { ...cleanForFirestore(targetPayment), userId: targetPayment.user_id },
              { merge: true },
            ),
          ]).catch(() => {});
        }
      }

      if (
        (order.order_kind === "programme_enrollment" ||
          order.order_kind === "course_enrollment" ||
          Boolean(order.course_id)) &&
        order.course_id
      ) {
        await activateCourseEnrollment({
          userId: order.user_id,
          courseId: order.course_id,
          paymentId: paymentIdRef ?? paymentEntity.id,
        });
        const course = await findCourseByIdOrSlug(order.course_id);
        if (course) {
          await activateBundledProgrammeInternship({
            userId: order.user_id,
            userName:
              (order.metadata?.studentName as string | undefined) || "Learner",
            userEmail:
              (order.metadata?.studentEmail as string | undefined) || "",
            courseId: course.id,
            courseSlug: course.slug,
            courseTitle: course.title,
            linkedInternshipSlug: course.linkedInternshipSlug,
          });
        }
      }
    }
  } else if (eventType === "payment.failed" && paymentEntity?.order_id && paymentEntity.id) {
    const order = allOrders.find((o) => o.razorpay_order_id === paymentEntity.order_id);
    if (order) {
      order.order_status = "failed";
      order.updated_at = now;
      const failedPay: CertificationPaymentRecord = {
        id: randomUUID(),
        order_id: order.id,
        user_id: order.user_id,
        razorpay_payment_id: paymentIdOrFallback(paymentEntity.id),
        razorpay_signature: null,
        payment_status: "failed",
        payment_method: paymentEntity.method ?? null,
        failure_reason: paymentEntity.error_description ?? "Payment failed via webhook",
        verified_at: null,
        refunded_at: null,
        refund_id: null,
        created_at: now,
      };
      store.payments.unshift(failedPay);
      if (isFirestoreConfigured()) {
        const db = getAdminFirestore();
        if (db) {
          await Promise.all([
            db.collection("payment_orders").doc(order.id).set(
              { order_status: "failed", updated_at: now },
              { merge: true },
            ),
            db.collection("payments").doc(failedPay.id).set(
              { ...cleanForFirestore(failedPay), userId: failedPay.user_id },
              { merge: true },
            ),
          ]).catch(() => {});
        }
      }
    }
  } else if (eventType === "refund.processed" && refundEntity?.payment_id) {
    const pay = allPayments.find((p) => p.razorpay_payment_id === refundEntity.payment_id);
    if (pay) {
      pay.payment_status = "refunded";
      pay.refunded_at = now;
      pay.refund_id = refundEntity.id ?? null;
      const order = allOrders.find((o) => o.id === pay.order_id);
      if (order) {
        order.order_status = "refunded";
        order.updated_at = now;
        if (
          (order.order_kind === "programme_enrollment" ||
            order.order_kind === "course_enrollment" ||
            Boolean(order.course_id)) &&
          order.course_id
        ) {
          await revokeCourseEnrollment({
            userId: order.user_id,
            courseId: order.course_id,
          });
        }
      }
      if (isFirestoreConfigured()) {
        const db = getAdminFirestore();
        if (db) {
          await Promise.all([
            db.collection("payments").doc(pay.id).set(
              { payment_status: "refunded", refunded_at: now, refund_id: pay.refund_id },
              { merge: true },
            ),
            order
              ? db.collection("payment_orders").doc(order.id).set(
                  { order_status: "refunded", updated_at: now },
                  { merge: true },
                )
              : Promise.resolve(),
          ]).catch(() => {});
        }
      }
    }
  }

  return { status: 200, processingStatus: "processed", message: `Processed ${eventType}.` };
}

function paymentIdOrFallback(id?: string): string {
  return id || `pay_wh_${randomUUID().slice(0, 8)}`;
}

export async function processAdminRefund(params: {
  paymentId: string;
  reason: string;
}): Promise<{ payment?: CertificationPaymentRecord; error?: string }> {
  const payments = await listPayments();
  const payment = payments.find((p) => p.id === params.paymentId);
  if (!payment) return { error: "Payment record not found." };
  if (payment.payment_status !== "captured") {
    return { error: "Only captured payments can be refunded." };
  }
  const orders = await listOrders();
  const order = orders.find((o) => o.id === payment.order_id);
  if (!order) return { error: "Parent order not found." };

  const rpRefund = await refundRazorpayPayment({
    razorpayPaymentId: payment.razorpay_payment_id,
    amountPaise: order.amount_paise,
    reason: params.reason,
    isSimulated: order.payment_mode === "simulated_test",
  });

  const now = new Date().toISOString();
  payment.payment_status = "refunded";
  payment.refunded_at = now;
  payment.refund_id = rpRefund.refundId;
  order.order_status = "refunded";
  order.updated_at = now;

  if (isFirestoreConfigured()) {
    try {
      const db = getAdminFirestore();
      if (db) {
        await Promise.all([
          db.collection("payments").doc(payment.id).set(
            { payment_status: "refunded", refunded_at: now, refund_id: rpRefund.refundId },
            { merge: true },
          ),
          db.collection("payment_orders").doc(order.id).set(
            { order_status: "refunded", updated_at: now },
            { merge: true },
          ),
        ]);
      }
    } catch {
      return { error: "Could not update payment refund state." };
    }
  }

  if ((order.order_kind === "course_enrollment" || order.course_id) && order.course_id) {
    await revokeCourseEnrollment({
      userId: order.user_id,
      courseId: order.course_id,
    });
  }

  const issuances = await listIssuances();
  const linkedIssuance = issuances.find((i) => i.payment_id === payment.id);
  const refundedCourse = order.course_id ? await findCourseByIdOrSlug(order.course_id) : null;
  if (linkedIssuance?.recipient_email || !isFirestoreConfigured()) {
    await sendAndLogLifecycleEmail({
      recipientEmail: linkedIssuance?.recipient_email ?? "aarav.sharma@example.edu",
      templateKey: "payment_refunded",
      variables: {
        studentName: linkedIssuance?.recipient_name ?? "Aarav Sharma",
        certificateName:
          refundedCourse?.title ?? linkedIssuance?.achievement_title ?? "TGL Certificate",
        amountFormatted: formatInrFromPaise(order.amount_paise),
        refundId: rpRefund.refundId,
        reason: params.reason,
      },
      isSimulatedTransaction: rpRefund.isSimulated,
    });
  }

  return { payment };
}

export async function listOrders(userId?: string): Promise<CertificationOrderRecord[]> {
  if (isFirestoreConfigured()) {
    try {
      const db = getAdminFirestore();
      if (db) {
        const snap = userId
          ? await db.collection("payment_orders").where("user_id", "==", userId).get()
          : await db.collection("payment_orders").limit(200).get();
        if (!snap.empty) {
          return snap.docs
            .map((d) => d.data() as CertificationOrderRecord)
            .sort((a, b) => b.created_at.localeCompare(a.created_at));
        }
      }
    } catch {
      // Fallback
    }
  }
  const orders = getMemoryStore().orders;
  return userId ? orders.filter((o) => o.user_id === userId) : [...orders];
}

export async function listPayments(userId?: string): Promise<CertificationPaymentRecord[]> {
  if (isFirestoreConfigured()) {
    try {
      const db = getAdminFirestore();
      if (db) {
        const snap = userId
          ? await db.collection("payments").where("user_id", "==", userId).get()
          : await db.collection("payments").limit(200).get();
        if (!snap.empty) {
          return snap.docs
            .map((d) => d.data() as CertificationPaymentRecord)
            .sort((a, b) => b.created_at.localeCompare(a.created_at));
        }
      }
    } catch {
      // Fallback
    }
  }
  const payments = getMemoryStore().payments;
  return userId ? payments.filter((p) => p.user_id === userId) : [...payments];
}

export async function listIssuances(userId?: string): Promise<CertificateIssuanceRecord[]> {
  if (isFirestoreConfigured()) {
    try {
      const db = getAdminFirestore();
      if (db) {
        const snap = userId
          ? await db.collection("certificates").where("user_id", "==", userId).get()
          : await db.collection("certificates").limit(200).get();
        if (!snap.empty) {
          return snap.docs
            .map((d) => d.data() as CertificateIssuanceRecord)
            .sort((a, b) => b.created_at.localeCompare(a.created_at));
        }
      }
    } catch {
      // Fallback
    }
  }
  const issuances = getMemoryStore().issuances;
  return userId ? issuances.filter((i) => i.user_id === userId) : [...issuances];
}

export async function getCertificateByPublicId(
  certificateId: string,
): Promise<CertificateIssuanceRecord | null> {
  if (isFirestoreConfigured()) {
    try {
      const db = getAdminFirestore();
      if (db) {
        const directSnap = await db
          .collection("certificates")
          .doc(safeFirestoreDocId(certificateId))
          .get();
        if (directSnap.exists) {
          return directSnap.data() as CertificateIssuanceRecord;
        }
        const querySnap = await db
          .collection("certificates")
          .where("certificate_id", "==", certificateId)
          .limit(1)
          .get();
        if (!querySnap.empty) {
          return querySnap.docs[0].data() as CertificateIssuanceRecord;
        }
      }
    } catch {
      // Fallback
    }
  }
  return getMemoryStore().issuances.find((i) => i.certificate_id === certificateId) ?? null;
}

export async function getCertificatePdfData(
  certificateId: string,
): Promise<CertificatePdfData | null> {
  const issuance = await getCertificateByPublicId(certificateId);
  if (!issuance || issuance.issuance_status !== "issued" || !issuance.issued_at) return null;

  const [orders, applications] = await Promise.all([
    listOrders(issuance.user_id),
    listStudentApplications(issuance.user_id),
  ]);
  const application = issuance.internship_application_id
    ? applications.find((item) => item.id === issuance.internship_application_id)
    : applications.find((item) => item.status === "completed" && item.mentor_approved);
  const matchingOrder =
    orders.find(
      (order) =>
        order.course_id &&
        (application?.course_id === order.course_id || order.metadata?.linkedInternshipSlug),
    ) ?? orders.find((order) => order.order_status === "paid");
  return {
    certificateId: issuance.certificate_id,
    studentName: issuance.recipient_name,
    programmeName: issuance.achievement_title,
    joinedOn:
      issuance.joined_at ??
      matchingOrder?.created_at ??
      application?.created_at ??
      issuance.created_at,
    completedOn:
      issuance.completed_at ??
      application?.completed_at ??
      issuance.issued_at,
    issuedOn: issuance.issued_at,
    authorizedSignatory: process.env.CERTIFICATE_SIGNATORY?.trim() || "Gokulraj",
    organization: "TGL Learning Portal",
  };
}

async function issueIncludedProgrammeCertificate(params: {
  application: InternshipApplicationRecord;
  internship: InternshipRecord | undefined;
  adminId: string;
}): Promise<{ issuance?: CertificateIssuanceRecord; error?: string }> {
  const existing = await findActiveIssuanceForInternshipApplication(params.application.id);
  if (existing) return { issuance: existing };

  const products = await listProducts(true);
  const internProduct =
    products.find((p) => p.certificate_type === "internship") ?? products[0];
  if (!internProduct) {
    return { error: "Internship certificate configuration missing." };
  }

  const tasks = params.internship?.tasks ?? [];
  const taskCheck = checkAllInternshipTasksApproved({
    tasks,
    submissions: params.application.task_submissions ?? [],
  });
  const submissionProvided =
    Boolean(params.application.submission_url) ||
    (params.application.task_submissions?.length ?? 0) > 0;

  const evaluation = evaluateCertificateEligibility({
    certificateType: internProduct.certificate_type,
    rules: {
      requiresInternshipCompletion: true,
      requiresSubmission: true,
      requiresMentorApproval: true,
    },
    internshipCompleted: params.application.status === "completed",
    pathwayCompleted: true,
    submissionProvided,
    assessmentPassed: Boolean(params.application.assessment_passed),
    mentorApproved: Boolean(params.application.mentor_approved),
    adminDistinctionApproved: false,
  });

  const gate = canIssueCertificate({
    productEnabled: internProduct.enabled,
    pricePaise: 0,
    eligibility: evaluation,
    paymentStatus: "none",
    paymentVerified: true,
    existingActiveCertificateId: null,
  });
  if (!gate.allowed) {
    return { error: gate.reason };
  }
  if (tasks.length > 0 && !taskCheck.readyForFinalApproval) {
    return {
      error: `All internship tasks must be approved first: ${taskCheck.pendingTaskTitles.join(", ")}.`,
    };
  }

  const orders = await listOrders(params.application.user_id);
  const payments = await listPayments(params.application.user_id);
  const matchingCourseOrder = orders.find(
    (o) =>
      o.order_status === "paid" &&
      (o.course_id === params.application.course_id ||
        o.metadata?.linkedInternshipSlug === params.internship?.slug),
  );
  const matchingPayment = matchingCourseOrder
    ? payments.find(
        (p) => p.order_id === matchingCourseOrder.id && p.payment_status === "captured",
      )
    : undefined;

  const achievementTitle = params.internship?.title ?? internProduct.name;
  const certificateId = `TGL-CERT-2026-${Math.floor(1000 + Math.random() * 9000)}-${randomUUID().slice(0, 4).toUpperCase()}`;
  const now = new Date().toISOString();

  const joinedAt =
    matchingCourseOrder?.created_at ?? params.application.created_at ?? now;
  const completedAt = params.application.completed_at ?? now;

  const issuance: CertificateIssuanceRecord = {
    id: randomUUID(),
    user_id: params.application.user_id,
    product_id: internProduct.id,
    payment_id: matchingPayment?.id ?? null,
    internship_application_id: params.application.id,
    certificate_id: certificateId,
    recipient_name: params.application.applicant_name,
    recipient_email: params.application.applicant_email,
    achievement_title: achievementTitle,
    certificate_type: "internship",
    eligibility_status: "eligible",
    issuance_status: "issued",
    approved_by: params.adminId,
    revocation_reason: null,
    issued_at: now,
    revoked_at: null,
    joined_at: joinedAt,
    completed_at: completedAt,
    regeneration_count: 0,
    regenerated_at: null,
    created_at: now,
  };
  getMemoryStore().issuances.unshift(issuance);
  await persistCertificateIssuanceDoc(issuance);

  const verificationUrl = `/verify/certificate/${issuance.certificate_id}`;
  const downloadUrl = `/api/certificates/${encodeURIComponent(issuance.certificate_id)}/pdf`;
  await sendAndLogLifecycleEmail({
    recipientEmail: params.application.applicant_email,
    templateKey: "certificate_issued",
    variables: {
      studentName: params.application.applicant_name,
      certificateName: internProduct.name,
      achievementTitle,
      certificateId: issuance.certificate_id,
      verificationUrl,
      downloadUrl,
      joinedOn: params.application.created_at,
      completedOn: params.application.completed_at ?? issuance.issued_at ?? now,
    },
  });

  return { issuance };
}

export async function claimIncludedCertificate(params: {
  user: SandboxUser;
  internshipApplicationId?: string | null;
}): Promise<{ issuance?: CertificateIssuanceRecord; error?: string; status?: number }> {
  const applications = await listStudentApplications(params.user.id);
  const targetApp =
    (params.internshipApplicationId
      ? applications.find((a) => a.id === params.internshipApplicationId)
      : applications.find((a) => a.status === "completed" && a.mentor_approved)) ?? null;

  if (!targetApp) {
    return {
      error: "Complete your programme, project, and internship tasks first to unlock your included certificate.",
      status: 403,
    };
  }
  if (targetApp.status !== "completed" || !targetApp.mentor_approved) {
    return {
      error: "Authorized mentor approval on all internship deliverables is required before issuing your included certificate. Enrolment alone never issues a certificate.",
      status: 403,
    };
  }

  const existing = await findActiveIssuanceForInternshipApplication(targetApp.id);
  if (existing) {
    return {
      error: `Your certificate (${existing.certificate_id}) has already been issued. Duplicate issuance is not permitted.`,
      status: 409,
    };
  }

  const internships = await listInternships();
  const internship = internships.find((i) => i.id === targetApp.internship_id);
  const res = await issueIncludedProgrammeCertificate({
    application: targetApp,
    internship,
    adminId: targetApp.mentor_approved_by ?? DEMO_ADMIN_ID,
  });
  if (res.error || !res.issuance) {
    return { error: res.error ?? "Unable to issue included certificate.", status: 400 };
  }
  return { issuance: res.issuance };
}

export async function approveInternshipApplication(params: {
  applicationId: string;
  adminId: string;
  mentorNotes?: string;
  finalScoreLabel?: string;
}): Promise<{
  application?: InternshipApplicationRecord;
  issuance?: CertificateIssuanceRecord;
  error?: string;
}> {
  const now = new Date().toISOString();
  const allApps = await listAllApplicationsForAdmin();
  const app = allApps.find((a) => a.id === params.applicationId);
  if (!app) return { error: "Internship application not found." };

  const internships = await listInternships();
  const internship = internships.find((i) => i.id === app.internship_id);
  const tasks = internship?.tasks ?? [];
  const taskStatus = checkAllInternshipTasksApproved({
    tasks,
    submissions: app.task_submissions ?? [],
  });
  if (tasks.length > 0 && !taskStatus.readyForFinalApproval) {
    return {
      error: `All internship tasks must be approved before final completion approval. Pending tasks: ${taskStatus.pendingTaskTitles.join(", ")}.`,
    };
  }

  app.status = "completed";
  app.assessment_passed = true;
  app.mentor_approved = true;
  app.mentor_approved_by = params.adminId;
  app.mentor_notes = params.mentorNotes ?? "Approved by TGL mentor/admin.";
  app.final_evaluation_notes =
    params.mentorNotes ?? "All assigned internship tasks and final evaluation approved.";
  app.final_score_label = params.finalScoreLabel ?? "Pass (Mentor Approved)";
  app.completed_at = now;
  app.updated_at = now;

  if (isFirestoreConfigured()) {
    try {
      const db = getAdminFirestore();
      if (db) {
        await db
          .collection("settings")
          .doc(`int_app_${app.id}`)
          .set({ type: "internship_application", ...cleanForFirestore(app) }, { merge: true });
      }
    } catch {
      return { error: "Could not approve internship application." };
    }
  }

  const issuedRes = await issueIncludedProgrammeCertificate({
    application: app,
    internship,
    adminId: params.adminId,
  });

  const title = internship?.title ?? "TGL Internship";
  await sendAndLogLifecycleEmail({
    recipientEmail: app.applicant_email,
    templateKey: "internship_approved",
    variables: { studentName: app.applicant_name, achievementTitle: title },
  });
  await sendAndLogLifecycleEmail({
    recipientEmail: app.applicant_email,
    templateKey: "internship_eligibility_confirmed",
    variables: { studentName: app.applicant_name, achievementTitle: title },
  });
  return { application: app, issuance: issuedRes.issuance };
}

export async function submitInternshipTaskWork(params: {
  userId: string;
  applicationId: string;
  taskId: string;
  submissionUrl: string;
  summary: string;
}): Promise<{ application?: InternshipApplicationRecord; error?: string }> {
  const now = new Date().toISOString();
  const apps = await listStudentApplications(params.userId);
  const app = apps.find((a) => a.id === params.applicationId && a.user_id === params.userId);
  if (!app) return { error: "Internship application not found." };

  const existingTasks = [...(app.task_submissions ?? [])];
  const nextItem: InternshipTaskSubmission = {
    taskId: params.taskId,
    submissionUrl: params.submissionUrl.trim(),
    summary: params.summary.trim(),
    status: "submitted",
    mentorFeedback: null,
    scoreLabel: null,
    submittedAt: now,
    evaluatedAt: null,
  };

  const idx = existingTasks.findIndex((t) => t.taskId === params.taskId);
  if (idx >= 0) {
    existingTasks[idx] = nextItem;
  } else {
    existingTasks.push(nextItem);
  }

  app.task_submissions = existingTasks;
  app.submission_url = app.submission_url ?? params.submissionUrl.trim();
  app.submission_summary = app.submission_summary ?? params.summary.trim();
  app.updated_at = now;

  if (isFirestoreConfigured()) {
    try {
      const db = getAdminFirestore();
      if (db) {
        await db
          .collection("settings")
          .doc(`int_app_${app.id}`)
          .set({ type: "internship_application", ...cleanForFirestore(app) }, { merge: true });
      }
    } catch {
      return { error: "Could not submit internship task." };
    }
  }

  return { application: app };
}

export async function evaluateInternshipTaskSubmission(params: {
  applicationId: string;
  taskId: string;
  decision: "approved" | "revision_required";
  mentorFeedback: string;
  scoreLabel?: string;
}): Promise<{ application?: InternshipApplicationRecord; error?: string }> {
  const now = new Date().toISOString();
  const allApps = await listAllApplicationsForAdmin();
  const app = allApps.find((a) => a.id === params.applicationId);

  if (!app) return { error: "Internship application not found." };

  const taskSubmissions = [...(app.task_submissions ?? [])];
  const target = taskSubmissions.find((t) => t.taskId === params.taskId);
  if (!target) {
    return { error: "Student has not submitted this task yet." };
  }

  target.status = params.decision;
  target.mentorFeedback = params.mentorFeedback.trim();
  target.scoreLabel =
    params.scoreLabel?.trim() || (params.decision === "approved" ? "Approved" : "Revision Required");
  target.evaluatedAt = now;

  app.task_submissions = taskSubmissions;
  app.updated_at = now;

  if (isFirestoreConfigured()) {
    try {
      const db = getAdminFirestore();
      if (db) {
        await db
          .collection("settings")
          .doc(`int_app_${app.id}`)
          .set({ type: "internship_application", ...cleanForFirestore(app) }, { merge: true });
      }
    } catch {
      return { error: "Could not save task evaluation." };
    }
  }

  return { application: app };
}

export async function createAdminInternship(params: {
  title: string;
  track: string;
  description: string;
  durationWeeks: number;
  requiredCourseSlug?: string | null;
  requiredProjectSlug?: string | null;
  requireProjectApproval: boolean;
  tasks: Array<{ title: string; brief: string; deadlineLabel: string; deliverableFormat: string }>;
}): Promise<{ internship?: InternshipRecord; error?: string }> {
  const slug = params.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  const now = new Date().toISOString();
  const tasks: InternshipTaskDefinition[] = params.tasks.map((t, i) => ({
    id: `task-${slug.slice(0, 12)}-${i + 1}-${Date.now().toString(36)}`,
    title: t.title.trim(),
    brief: t.brief.trim(),
    deadlineLabel: t.deadlineLabel.trim(),
    deliverableFormat: t.deliverableFormat.trim(),
  }));

  const created: InternshipRecord = {
    id: randomUUID(),
    slug: `${slug}-${Date.now().toString(36)}`,
    title: params.title.trim(),
    track: params.track.trim(),
    description: params.description.trim(),
    duration_weeks: Math.max(1, params.durationWeeks),
    required_course_slug: params.requiredCourseSlug || null,
    required_project_slug: params.requiredProjectSlug || null,
    require_project_approval: params.requireProjectApproval,
    tasks,
    is_published: true,
    created_at: now,
  };

  getMemoryStore().internships.unshift(created);
  if (isFirestoreConfigured()) {
    try {
      const db = getAdminFirestore();
      if (db) {
        await db.collection("internships").doc(created.id).set({
          ...cleanForFirestore(created),
          durationWeeks: created.duration_weeks,
          isPublished: true,
        });
      }
    } catch {
      // Non-fatal
    }
  }
  return { internship: created };
}

export async function addInternshipTask(params: {
  internshipId: string;
  title: string;
  brief: string;
  deadlineLabel: string;
  deliverableFormat: string;
  requireProjectApproval?: boolean;
}): Promise<{ internship?: InternshipRecord; error?: string }> {
  const internships = await listInternships();
  const internship = internships.find((i) => i.id === params.internshipId);
  if (!internship) return { error: "Internship programme not found." };

  const newTask: InternshipTaskDefinition = {
    id: `task-${Date.now().toString(36)}`,
    title: params.title.trim(),
    brief: params.brief.trim(),
    deadlineLabel: params.deadlineLabel.trim(),
    deliverableFormat: params.deliverableFormat.trim(),
  };

  internship.tasks = [...(internship.tasks ?? []), newTask];
  if (typeof params.requireProjectApproval === "boolean") {
    internship.require_project_approval = params.requireProjectApproval;
  }

  if (isFirestoreConfigured()) {
    try {
      const db = getAdminFirestore();
      if (db) {
        await db.collection("internships").doc(internship.id).set(
          cleanForFirestore({
            tasks: internship.tasks,
            require_project_approval: internship.require_project_approval,
          }),
          { merge: true },
        );
      }
    } catch {
      // Non-fatal
    }
  }

  return { internship };
}

export async function revokeCertificateWithReason(params: {
  certificateId: string;
  reason: string;
}): Promise<{ issuance?: CertificateIssuanceRecord; error?: string }> {
  if (!params.reason.trim()) return { error: "An audit revocation reason is required." };
  const now = new Date().toISOString();

  const cert = await getCertificateByPublicId(params.certificateId);
  if (!cert) return { error: "Certificate not found." };
  cert.issuance_status = "revoked";
  cert.revocation_reason = params.reason.trim();
  cert.revoked_at = now;

  if (isFirestoreConfigured()) {
    try {
      const db = getAdminFirestore();
      if (db) {
        await db
          .collection("certificates")
          .doc(safeFirestoreDocId(cert.certificate_id))
          .set(
            {
              issuance_status: "revoked",
              issuanceStatus: "revoked",
              revocation_reason: params.reason.trim(),
              revoked_at: now,
              updatedAt: FieldValue.serverTimestamp(),
            },
            { merge: true },
          );
      }
    } catch {
      return { error: "Could not revoke certificate." };
    }
  }

  return { issuance: cert };
}

export async function listEmailTemplates(): Promise<EmailTemplateDefinition[]> {
  if (isFirestoreConfigured()) {
    try {
      const db = getAdminFirestore();
      if (db) {
        const snap = await db
          .collection("settings")
          .where("type", "==", "email_template")
          .get();
        if (!snap.empty) {
          return snap.docs.map((d) => d.data() as EmailTemplateDefinition);
        }
      }
    } catch {
      // Fallback
    }
  }
  return getMemoryStore().emailTemplates;
}

export async function updateEmailTemplate(params: {
  templateKey: EmailTemplateKey;
  subjectTemplate: string;
  bodyTemplate: string;
}): Promise<EmailTemplateDefinition> {
  const now = new Date().toISOString();
  const store = getMemoryStore();
  let target = store.emailTemplates.find((t) => t.template_key === params.templateKey);
  if (target) {
    target.subject_template = params.subjectTemplate;
    target.body_template = params.bodyTemplate;
    target.updated_at = now;
  } else {
    target = {
      template_key: params.templateKey,
      subject_template: params.subjectTemplate,
      body_template: params.bodyTemplate,
      description: "",
      updated_at: now,
    };
    store.emailTemplates.push(target);
  }

  if (isFirestoreConfigured()) {
    try {
      const db = getAdminFirestore();
      if (db) {
        await db
          .collection("settings")
          .doc(`email_tpl_${params.templateKey}`)
          .set({ type: "email_template", ...cleanForFirestore(target) }, { merge: true });
      }
    } catch {
      // Non-fatal
    }
  }

  return target;
}

export async function listEmailLogs(): Promise<EmailDeliveryRecord[]> {
  if (isFirestoreConfigured()) {
    try {
      const db = getAdminFirestore();
      if (db) {
        const snap = await db
          .collection("activity_logs")
          .where("type", "==", "email_log")
          .limit(100)
          .get();
        if (!snap.empty) {
          return snap.docs
            .map((d) => d.data() as EmailDeliveryRecord)
            .sort((a, b) => b.created_at.localeCompare(a.created_at));
        }
      }
    } catch {
      // Fallback
    }
  }
  return [...getMemoryStore().emailLogs];
}

export async function listAllApplicationsForAdmin(): Promise<InternshipApplicationRecord[]> {
  if (isFirestoreConfigured()) {
    try {
      const db = getAdminFirestore();
      if (db) {
        const snap = await db
          .collection("settings")
          .where("type", "==", "internship_application")
          .get();
        if (!snap.empty) {
          return snap.docs
            .map((d) => d.data() as InternshipApplicationRecord)
            .sort((a, b) => b.created_at.localeCompare(a.created_at));
        }
      }
    } catch {
      // Fallback
    }
  }
  return [...getMemoryStore().applications];
}

export async function regenerateCertificateByAdmin(params: {
  certificateId: string;
  adminId: string;
  recipientName?: string;
  reason?: string;
}): Promise<{ issuance?: CertificateIssuanceRecord; error?: string }> {
  const existing = await getCertificateByPublicId(params.certificateId);
  if (!existing) {
    return { error: "Certificate issuance not found." };
  }
  if (existing.issuance_status === "revoked") {
    return { error: "Revoked certificates cannot be regenerated." };
  }

  const now = new Date().toISOString();
  const nextCount = (existing.regeneration_count ?? 0) + 1;
  const nextName = params.recipientName?.trim() || existing.recipient_name;
  const pdfCheck = await getCertificatePdfData(existing.certificate_id);

  existing.recipient_name = nextName;
  existing.regeneration_count = nextCount;
  existing.regenerated_at = now;

  if (isFirestoreConfigured()) {
    try {
      const db = getAdminFirestore();
      if (db) {
        await db
          .collection("certificates")
          .doc(safeFirestoreDocId(existing.certificate_id))
          .set(
            {
              recipient_name: nextName,
              recipientName: nextName,
              regeneration_count: nextCount,
              regenerated_at: now,
              metadata: {
                lastRegeneratedBy: params.adminId,
                lastRegeneratedAt: now,
                lastRegenerationReason: params.reason?.trim() || "Admin verified regeneration",
              },
              updatedAt: FieldValue.serverTimestamp(),
            },
            { merge: true },
          );
      }
    } catch {
      return { error: "Failed to update regenerated certificate." };
    }
  }

  if (pdfCheck) {
    await sendAndLogLifecycleEmail({
      recipientEmail: existing.recipient_email,
      templateKey: "certificate_ready",
      variables: {
        studentName: nextName,
        programmeName: existing.achievement_title,
        certificateName: existing.achievement_title,
        achievementTitle: existing.achievement_title,
        certificateId: existing.certificate_id,
        verificationUrl: `/verify/certificate/${existing.certificate_id}`,
        downloadUrl: `/api/certificates/${encodeURIComponent(existing.certificate_id)}/pdf`,
        joinedOn: pdfCheck.joinedOn,
        completedOn: pdfCheck.completedOn,
      },
    });
  }
  return { issuance: existing };
}

export type AdminDirectoryUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  cohort: string;
  enrolledCount?: number;
  certificatesCount?: number;
  joinedAt?: string | null;
};

export async function listAdminDirectoryUsers(): Promise<AdminDirectoryUser[]> {
  if (isFirestoreConfigured()) {
    try {
      const db = getAdminFirestore();
      if (db) {
        const [usersSnap, enrollSnap, certSnap] = await Promise.all([
          db.collection("users").limit(200).get(),
          db.collection("enrollments").where("status", "==", "active").get(),
          db.collection("certificates").where("issuance_status", "==", "issued").get(),
        ]);

        const enrollMap = new Map<string, number>();
        for (const docSnap of enrollSnap.docs) {
          const uid = String(docSnap.data().userId ?? "");
          if (uid) enrollMap.set(uid, (enrollMap.get(uid) ?? 0) + 1);
        }
        const certMap = new Map<string, number>();
        for (const docSnap of certSnap.docs) {
          const uid = String(docSnap.data().user_id ?? docSnap.data().userId ?? "");
          if (uid) certMap.set(uid, (certMap.get(uid) ?? 0) + 1);
        }

        if (!usersSnap.empty) {
          const results: AdminDirectoryUser[] = [];
          for (const docSnap of usersSnap.docs) {
            const p = docSnap.data() as Record<string, unknown>;
            const uid = String(p.uid ?? docSnap.id);
            const privSnap = await db
              .collection("users")
              .doc(uid)
              .collection("private")
              .doc("info")
              .get();
            const privEmail = privSnap.exists ? String(privSnap.data()?.email ?? "") : "";
            const displayName =
              typeof p.displayName === "string" && p.displayName.trim()
                ? p.displayName.trim()
                : "Learner";
            const role = typeof p.role === "string" ? p.role : "student";
            results.push({
              id: uid,
              name: displayName,
              email: privEmail,
              role,
              cohort:
                typeof p.cohort === "string" && p.cohort
                  ? p.cohort
                  : role === "admin"
                    ? "Platform Administration"
                    : "Registered Learner",
              enrolledCount: enrollMap.get(uid) ?? 0,
              certificatesCount: certMap.get(uid) ?? 0,
              joinedAt:
                typeof p.createdAt === "string" ? p.createdAt : null,
            });
          }
          return results;
        }
      }
    } catch {
      // Fallback cleanly to demo directory
    }
  }

  return [
    { id: DEMO_STUDENT_ID, name: "Aarav Sharma", email: "aarav.sharma@example.edu", role: "student", cohort: "Autumn Engineering Cohort", enrolledCount: 2, certificatesCount: 0, joinedAt: "2026-11-10T09:00:00.000Z" },
    { id: DEMO_GRADUATE_ID, name: "Meera Krishnan", email: "meera.krishnan@example.edu", role: "student", cohort: "Autumn Engineering Cohort", enrolledCount: 1, certificatesCount: 1, joinedAt: "2026-11-05T09:00:00.000Z" },
    { id: "00000000-0000-4000-8000-000000000103", name: "Diya Nair", email: "diya.nair@example.edu", role: "student", cohort: "Product Craft Cohort", enrolledCount: 1, certificatesCount: 0, joinedAt: "2026-11-11T09:00:00.000Z" },
    { id: "mentor-kabir", name: "Kabir Malhotra", email: "kabir.mentor@touchgrasslater.org", role: "mentor", cohort: "Autumn Engineering Cohort", enrolledCount: 0, certificatesCount: 0, joinedAt: "2026-10-01T09:00:00.000Z" },
    { id: "mentor-nisha", name: "Dr. Nisha Menon", email: "nisha.mentor@touchgrasslater.org", role: "mentor", cohort: "Applied AI Studio", enrolledCount: 0, certificatesCount: 0, joinedAt: "2026-10-01T09:00:00.000Z" },
    { id: DEMO_ADMIN_ID, name: "TGL Operations Admin", email: "admin@touchgrasslater.org", role: "admin", cohort: "All Cohorts", enrolledCount: 0, certificatesCount: 0, joinedAt: "2026-10-01T09:00:00.000Z" },
  ];
}
