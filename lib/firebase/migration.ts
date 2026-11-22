/**
 * Deterministic Supabase -> Firebase table-to-collection mapping,
 * record normalization, and verification audit utilities.
 * Never imports Supabase SDKs so the bundle stays 100% Firebase-native.
 */

export type MigrationCollectionName =
  | "users"
  | "users/{uid}/private/info"
  | "admins"
  | "courses"
  | "internships"
  | "assignments"
  | "enrollments"
  | "progress"
  | "submissions"
  | "reviews"
  | "certificates"
  | "notifications"
  | "payments"
  | "payment_orders"
  | "activity_logs"
  | "settings";

export const SUPABASE_TO_FIRESTORE_TABLE_MAP: ReadonlyArray<{
  sourceTable: string;
  targetCollection: MigrationCollectionName;
  docIdStrategy: string;
  notes: string;
}> = [
  {
    sourceTable: "auth.users + public.profiles",
    targetCollection: "users",
    docIdStrategy: "uid (preserved 1:1 with Firebase Auth importUsers)",
    notes: "Public displayName + role only; email/provider/phone isolated into users/{uid}/private/info",
  },
  {
    sourceTable: "auth.users (email/phone/provider)",
    targetCollection: "users/{uid}/private/info",
    docIdStrategy: "info",
    notes: "Owner + Admin read only via firestore.rules",
  },
  {
    sourceTable: "admin role allowlist / app_metadata",
    targetCollection: "admins",
    docIdStrategy: "uid",
    notes: "Explicit RBAC lookup docs used by firestore.rules isAdmin()",
  },
  {
    sourceTable: "courses + modules + lessons",
    targetCollection: "courses",
    docIdStrategy: "course.id",
    notes: "Published programmes (single INR fee ₹499–₹1,999 with embedded curriculum structure)",
  },
  {
    sourceTable: "internships",
    targetCollection: "internships",
    docIdStrategy: "internship.id",
    notes: "Included internship tracks linked to courseId (₹0 extra certificate)",
  },
  {
    sourceTable: "project_assignments",
    targetCollection: "assignments",
    docIdStrategy: "assignment.id",
    notes: "Structured project deliverables & rubrics per courseId",
  },
  {
    sourceTable: "course_enrollments / student_enrollments",
    targetCollection: "enrollments",
    docIdStrategy: "{userId}_{courseId}",
    notes: "Atomic enrollment record written after verified Razorpay capture",
  },
  {
    sourceTable: "lesson_progress / learning_resource_progress",
    targetCollection: "progress",
    docIdStrategy: "{userId}_{courseId}",
    notes: "Completed lesson IDs, practical exercises, quiz scores, and resume state",
  },
  {
    sourceTable: "project_submissions",
    targetCollection: "submissions",
    docIdStrategy: "submission.id",
    notes: "Student deliverables, GitHub URLs, and Storage paths",
  },
  {
    sourceTable: "submission_reviews",
    targetCollection: "reviews",
    docIdStrategy: "review.id",
    notes: "Mentor rubric notes, approval decision, and timestamps",
  },
  {
    sourceTable: "certificate_issuances",
    targetCollection: "certificates",
    docIdStrategy: "certificateId (e.g. TGL-CERT-2026-8419)",
    notes: "Public QR verification payload; zero separate fee",
  },
  {
    sourceTable: "student_notifications",
    targetCollection: "notifications",
    docIdStrategy: "notification.id",
    notes: "In-app notifications per userId",
  },
  {
    sourceTable: "payment_orders",
    targetCollection: "payment_orders",
    docIdStrategy: "razorpayOrderId",
    notes: "Single Programme order metadata",
  },
  {
    sourceTable: "payments",
    targetCollection: "payments",
    docIdStrategy: "razorpayPaymentId",
    notes: "Captured / refunded payment transactions",
  },
  {
    sourceTable: "email_logs + webhook_events",
    targetCollection: "activity_logs",
    docIdStrategy: "log.id",
    notes: "Server-only transactional audit trail",
  },
  {
    sourceTable: "cohorts + mentor_messages + email_templates",
    targetCollection: "settings",
    docIdStrategy: "scoped key (e.g. cohort_{id}, email_template_{key})",
    notes: "Configuration and workspace metadata documents",
  },
];

export type LegacyExportBundle = {
  users?: Array<{
    id: string;
    email?: string;
    display_name?: string;
    full_name?: string;
    role?: string;
    email_verified?: boolean;
    provider?: string;
  }>;
  courses?: Array<{ id: string; slug: string; title: string; [key: string]: unknown }>;
  enrollments?: Array<{ id?: string; user_id: string; course_id: string; [key: string]: unknown }>;
  submissions?: Array<{ id: string; user_id: string; [key: string]: unknown }>;
  certificates?: Array<{
    certificate_id: string;
    user_id?: string | null;
    recipient_name?: string;
    [key: string]: unknown;
  }>;
  payment_orders?: Array<{ id: string; user_id: string; [key: string]: unknown }>;
};

export type MigrationIntegrityReport = {
  valid: boolean;
  counts: {
    users: number;
    courses: number;
    enrollments: number;
    submissions: number;
    certificates: number;
    paymentOrders: number;
  };
  orphanEnrollments: string[];
  orphanSubmissions: string[];
  missingCertificateNames: string[];
};

/**
 * Verifies referential integrity across an exported migration bundle before or after
 * importing into Cloud Firestore & Firebase Authentication.
 */
export function verifyMigrationBundleIntegrity(
  bundle: LegacyExportBundle,
): MigrationIntegrityReport {
  const userIds = new Set((bundle.users ?? []).map((u) => u.id));
  const courseIds = new Set((bundle.courses ?? []).map((c) => c.id));

  const orphanEnrollments: string[] = [];
  for (const enr of bundle.enrollments ?? []) {
    if (!userIds.has(enr.user_id) || !courseIds.has(enr.course_id)) {
      orphanEnrollments.push(enr.id ?? `${enr.user_id}_${enr.course_id}`);
    }
  }

  const orphanSubmissions: string[] = [];
  for (const sub of bundle.submissions ?? []) {
    if (!userIds.has(sub.user_id)) {
      orphanSubmissions.push(sub.id);
    }
  }

  const missingCertificateNames: string[] = [];
  for (const cert of bundle.certificates ?? []) {
    const recipient = (cert.recipient_name ?? "").trim();
    if (!recipient || recipient.includes("@")) {
      missingCertificateNames.push(cert.certificate_id);
    }
  }

  return {
    valid:
      orphanEnrollments.length === 0 &&
      orphanSubmissions.length === 0 &&
      missingCertificateNames.length === 0,
    counts: {
      users: bundle.users?.length ?? 0,
      courses: bundle.courses?.length ?? 0,
      enrollments: bundle.enrollments?.length ?? 0,
      submissions: bundle.submissions?.length ?? 0,
      certificates: bundle.certificates?.length ?? 0,
      paymentOrders: bundle.payment_orders?.length ?? 0,
    },
    orphanEnrollments,
    orphanSubmissions,
    missingCertificateNames,
  };
}

/**
 * Strips undefined keys recursively so Firestore Admin batch writes never throw.
 */
export function stripUndefinedForFirestore<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
