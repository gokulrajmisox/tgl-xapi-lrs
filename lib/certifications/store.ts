import { randomUUID } from "node:crypto";
import { createClient as createUserClient } from "@/lib/supabase/server";
import { serviceClient } from "@/lib/xapi/server";
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

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() &&
      (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()),
  );
}

export type InternshipRecord = {
  id: string;
  slug: string;
  title: string;
  track: string;
  description: string;
  duration_weeks: number;
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
  submission_url: string | null;
  submission_summary: string | null;
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
  product_id: string;
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
          "Build production web modules, API workflows, and accessible user interfaces with mentor code reviews. Participation is 100% free.",
        duration_weeks: 8,
        is_published: true,
        created_at: now,
      },
      {
        id: intern2Id,
        slug: "applied-ai-data-systems",
        title: "Applied AI & Data Systems Internship",
        track: "Data & AI",
        description:
          "Design evaluation pipelines, structured prompts, and measurable data workflows on real datasets. Participation is 100% free.",
        duration_weeks: 8,
        is_published: true,
        created_at: now,
      },
      {
        id: intern3Id,
        slug: "cloud-security-engineering",
        title: "Cloud & Security Engineering Internship",
        track: "Infrastructure",
        description:
          "Implement authentication boundaries, webhook verification, and resilient telemetry instrumentation. Participation is 100% free.",
        duration_weeks: 6,
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
        submission_summary: "Implemented xAPI validation gateway, audit logging, and accessible React dashboard.",
        assessment_passed: true,
        mentor_approved: true,
        mentor_approved_by: DEMO_ADMIN_ID,
        mentor_notes: "Capstone architecture and test coverage approved by mentor.",
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
        name: "Internship Certificate",
        description:
          "Official verified Internship Certificate confirming internship completion, project submission, and authorized mentor approval.",
        certificate_type: "internship",
        price_paise: 49900,
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
        name: "Course Completion Certificate",
        description:
          "Official Course Completion Certificate recognizing verified completion of a structured TGL learning pathway.",
        certificate_type: "course_completion",
        price_paise: 29900,
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
          "Official Project Completion Certificate documenting an approved capstone build and technical review.",
        certificate_type: "project_completion",
        price_paise: 39900,
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
        name: "Special Achievement Certificate",
        description:
          "Distinction credential awarded for exceptional technical craftsmanship, mentorship, or open-source impact.",
        certificate_type: "special_achievement",
        price_paise: 59900,
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
        product_id: prodCourseId,
        internship_application_id: null,
        razorpay_order_id: "order_seed_verified_299",
        amount_paise: 29900,
        currency: "INR",
        order_status: "paid",
        payment_mode: "razorpay_test",
        metadata: { certificateType: "course_completion" },
        created_at: "2026-11-08T10:00:00.000Z",
        updated_at: "2026-11-08T10:03:00.000Z",
      },
    ],
    payments: [
      {
        id: "55555555-5555-4555-8555-555555555501",
        order_id: "44444444-4444-4444-8444-444444444401",
        user_id: DEMO_GRADUATE_ID,
        razorpay_payment_id: "pay_seed_verified_299",
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

export async function resolveCurrentActor(options?: {
  allowSandboxAdmin?: boolean;
}): Promise<{ user: SandboxUser | null; configured: boolean }> {
  if (isSupabaseConfigured()) {
    const supabase = await createUserClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { user: null, configured: true };
    const role = user.app_metadata?.role === "admin" ? "admin" : "student";
    const name =
      typeof user.user_metadata?.display_name === "string" && user.user_metadata.display_name.trim()
        ? user.user_metadata.display_name.trim()
        : user.email?.split("@")[0] ?? "Learner";
    return {
      user: {
        id: user.id,
        email: user.email ?? "",
        name,
        role,
        isSandbox: false,
      },
      configured: true,
    };
  }

  return {
    user: {
      id: options?.allowSandboxAdmin ? DEMO_ADMIN_ID : DEMO_STUDENT_ID,
      email: options?.allowSandboxAdmin ? "admin@touchgrasslater.org" : "aarav.sharma@example.edu",
      name: options?.allowSandboxAdmin ? "TGL Administrator" : "Aarav Sharma",
      role: options?.allowSandboxAdmin ? "admin" : "student",
      isSandbox: true,
    },
    configured: false,
  };
}

export async function requireAdminActor(): Promise<
  { user: SandboxUser; error: null } | { user: null; error: { message: string; status: number } }
> {
  if (isSupabaseConfigured()) {
    const { user } = await resolveCurrentActor();
    if (!user) return { user: null, error: { message: "Sign in required.", status: 401 } };
    if (user.role !== "admin") {
      return { user: null, error: { message: "Administrator access required.", status: 403 } };
    }
    return { user, error: null };
  }
  const { user } = await resolveCurrentActor({ allowSandboxAdmin: true });
  return { user: user!, error: null };
}

export async function listInternships(): Promise<InternshipRecord[]> {
  if (isSupabaseConfigured()) {
    const client = serviceClient();
    const { data } = await client
      .from("internships")
      .select("*")
      .eq("is_published", true)
      .order("created_at", { ascending: true });
    return (data ?? []) as InternshipRecord[];
  }
  return getMemoryStore().internships.filter((i) => i.is_published);
}

export async function listProducts(includeDisabled = false): Promise<CertificationProductRecord[]> {
  if (isSupabaseConfigured()) {
    const client = serviceClient();
    let query = client.from("certification_products").select("*").order("created_at", { ascending: true });
    if (!includeDisabled) query = query.eq("enabled", true);
    const { data } = await query;
    return (data ?? []) as CertificationProductRecord[];
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

  if (isSupabaseConfigured()) {
    const client = serviceClient();
    if (input.id) {
      const { data, error } = await client
        .from("certification_products")
        .update({
          name: input.name,
          description: input.description,
          certificate_type: input.certificateType,
          price_paise: input.pricePaise,
          enabled: input.enabled,
          ...(input.eligibilityRules ? { eligibility_rules: input.eligibilityRules } : {}),
          updated_at: new Date().toISOString(),
        })
        .eq("id", input.id)
        .select("*")
        .single();
      if (error || !data) return { error: error?.message ?? "Could not update certification product." };
      return { product: data as CertificationProductRecord };
    }
    const { data, error } = await client
      .from("certification_products")
      .insert({
        slug: `${slug}-${Date.now().toString(36)}`,
        name: input.name,
        description: input.description,
        certificate_type: input.certificateType,
        price_paise: input.pricePaise,
        currency: CERTIFICATE_CURRENCY,
        enabled: input.enabled,
        eligibility_rules: input.eligibilityRules ?? { requiresSubmission: true, requiresMentorApproval: true },
      })
      .select("*")
      .single();
    if (error || !data) return { error: error?.message ?? "Could not create certification product." };
    return { product: data as CertificationProductRecord };
  }

  const store = getMemoryStore();
  const now = new Date().toISOString();
  if (input.id) {
    const existing = store.products.find((p) => p.id === input.id);
    if (!existing) return { error: "Certification product not found." };
    existing.name = input.name;
    existing.description = input.description;
    existing.certificate_type = input.certificateType;
    existing.price_paise = input.pricePaise;
    existing.enabled = input.enabled;
    if (input.eligibilityRules) existing.eligibility_rules = input.eligibilityRules;
    existing.updated_at = now;
    return { product: existing };
  }

  const created: CertificationProductRecord = {
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
  store.products.push(created);
  return { product: created };
}

export async function listStudentApplications(userId: string): Promise<InternshipApplicationRecord[]> {
  if (isSupabaseConfigured()) {
    const client = serviceClient();
    const { data } = await client
      .from("internship_applications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    return (data ?? []) as InternshipApplicationRecord[];
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
  if (isSupabaseConfigured()) {
    const client = serviceClient();
    const { data, error } = await client
      .from("internship_applications")
      .upsert(
        {
          user_id: params.userId,
          internship_id: params.internshipId,
          applicant_name: params.applicantName,
          applicant_email: params.applicantEmail,
          motivation: params.motivation,
          portfolio_url: params.portfolioUrl || null,
          status: "in_progress",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,internship_id" },
      )
      .select("*")
      .single();
    if (error || !data) return { error: error?.message ?? "Could not submit internship application." };
    return { application: data as InternshipApplicationRecord };
  }

  const store = getMemoryStore();
  const internship = store.internships.find((i) => i.id === params.internshipId);
  if (!internship) return { error: "Internship track not found." };

  const existing = store.applications.find(
    (a) => a.user_id === params.userId && a.internship_id === params.internshipId,
  );
  const now = new Date().toISOString();
  if (existing) {
    existing.motivation = params.motivation;
    existing.portfolio_url = params.portfolioUrl || null;
    existing.updated_at = now;
    return { application: existing };
  }
  const app: InternshipApplicationRecord = {
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
  return { application: app };
}

export async function submitInternshipWork(params: {
  userId: string;
  applicationId: string;
  submissionUrl: string;
  submissionSummary: string;
}): Promise<{ application?: InternshipApplicationRecord; error?: string }> {
  if (isSupabaseConfigured()) {
    const client = serviceClient();
    const { data, error } = await client
      .from("internship_applications")
      .update({
        submission_url: params.submissionUrl,
        submission_summary: params.submissionSummary,
        updated_at: new Date().toISOString(),
      })
      .eq("id", params.applicationId)
      .eq("user_id", params.userId)
      .select("*")
      .single();
    if (error || !data) return { error: error?.message ?? "Could not record submission." };
    return { application: data as InternshipApplicationRecord };
  }

  const store = getMemoryStore();
  const app = store.applications.find((a) => a.id === params.applicationId && a.user_id === params.userId);
  if (!app) return { error: "Internship application not found." };
  app.submission_url = params.submissionUrl;
  app.submission_summary = params.submissionSummary;
  app.updated_at = new Date().toISOString();
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
  if (isSupabaseConfigured()) {
    const client = serviceClient();
    const { data: enrollments } = await client
      .from("learning_progress")
      .select("completion")
      .eq("user_id", params.userId)
      .eq("completion", true)
      .limit(1);
    pathwayCompleted = Boolean(enrollments?.length);
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

  if (isSupabaseConfigured()) {
    await serviceClient().from("email_delivery_logs").insert({
      recipient_email: record.recipient_email,
      template_key: record.template_key,
      subject: record.subject,
      is_test: record.is_test,
      provider: record.provider,
      delivery_status: record.delivery_status,
      provider_message_id: record.provider_message_id,
      error_message: record.error_message,
      attempt_count: record.attempt_count,
      metadata: record.metadata,
    });
  } else {
    getMemoryStore().emailLogs.unshift(record);
  }

  return record;
}

export async function createCertificationOrder(params: {
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
  const products = await listProducts(true);
  const product = products.find((p) => p.id === params.productId);
  if (!product) return { error: "Certification product not found.", status: 404 };
  if (!product.enabled) return { error: "This certification product is currently disabled.", status: 400 };

  const { evaluation, matchedApplication, achievementTitle } = await evaluateProductEligibilityForUser({
    userId: params.user.id,
    product,
    internshipApplicationId: params.internshipApplicationId,
  });

  if (!evaluation.eligible) {
    return {
      error: `Not eligible for ${product.name}. Missing: ${evaluation.missingReasons.join("; ")}.`,
      status: 403,
    };
  }

  const existingIssuance = await findActiveIssuanceForUserProduct(params.user.id, product.id);
  if (existingIssuance) {
    return {
      error: `You already hold an active ${product.name} (${existingIssuance.certificate_id}). Duplicate issuance is not permitted.`,
      status: 409,
    };
  }

  if (product.price_paise === 0) {
    return { error: "This certificate is free and does not require a payment order.", status: 400 };
  }

  const rpOrder = await createRazorpayOrder({
    amountPaise: product.price_paise,
    currency: "INR",
    receipt: `tgl_${product.certificate_type}_${Date.now()}`,
    notes: {
      userId: params.user.id,
      productId: product.id,
      certificateType: product.certificate_type,
      achievementTitle,
    },
  });

  const now = new Date().toISOString();
  let order: CertificationOrderRecord;

  if (isSupabaseConfigured()) {
    const client = serviceClient();
    const { data, error } = await client
      .from("certification_orders")
      .insert({
        user_id: params.user.id,
        product_id: product.id,
        internship_application_id: matchedApplication?.id ?? null,
        razorpay_order_id: rpOrder.razorpayOrderId,
        amount_paise: rpOrder.amountPaise,
        currency: "INR",
        order_status: "created",
        payment_mode: rpOrder.mode,
        metadata: { achievementTitle, certificateType: product.certificate_type },
      })
      .select("*")
      .single();
    if (error || !data) return { error: "Failed to persist order.", status: 500 };
    order = data as CertificationOrderRecord;
  } else {
    order = {
      id: randomUUID(),
      user_id: params.user.id,
      product_id: product.id,
      internship_application_id: matchedApplication?.id ?? null,
      razorpay_order_id: rpOrder.razorpayOrderId,
      amount_paise: rpOrder.amountPaise,
      currency: "INR",
      order_status: "created",
      payment_mode: rpOrder.mode,
      metadata: { achievementTitle, certificateType: product.certificate_type },
      created_at: now,
      updated_at: now,
    };
    getMemoryStore().orders.unshift(order);
  }

  await sendAndLogLifecycleEmail({
    recipientEmail: params.user.email,
    templateKey: "purchase_initiated",
    variables: {
      studentName: params.user.name,
      certificateName: product.name,
      amountFormatted: formatInrFromPaise(product.price_paise),
      orderId: order.razorpay_order_id,
      achievementTitle,
    },
    isSimulatedTransaction: rpOrder.isSimulated,
  });

  return {
    order,
    keyId: rpOrder.keyId,
    isSimulated: rpOrder.isSimulated,
    product,
  };
}

export async function findActiveIssuanceForUserProduct(
  userId: string,
  productId: string,
): Promise<CertificateIssuanceRecord | null> {
  if (isSupabaseConfigured()) {
    const client = serviceClient();
    const { data } = await client
      .from("certificate_issuances")
      .select("*")
      .eq("user_id", userId)
      .eq("product_id", productId)
      .neq("issuance_status", "revoked")
      .maybeSingle();
    return (data as CertificateIssuanceRecord | null) ?? null;
  }
  return (
    getMemoryStore().issuances.find(
      (i) => i.user_id === userId && i.product_id === productId && i.issuance_status !== "revoked",
    ) ?? null
  );
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

  let issuance: CertificateIssuanceRecord;
  if (isSupabaseConfigured()) {
    const client = serviceClient();
    const { data, error } = await client
      .from("certificate_issuances")
      .insert({
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
        approved_by: params.approvedBy ?? matchedApplication?.mentor_approved_by ?? null,
        issued_at: now,
      })
      .select("*")
      .single();
    if (error || !data) return { error: error?.message ?? "Failed to issue certificate." };
    issuance = data as CertificateIssuanceRecord;
  } else {
    issuance = {
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
  }

  const verificationUrl = `/verify/certificate/${issuance.certificate_id}`;
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
  error?: string;
  status?: number;
}> {
  const orders = await listOrders(params.user.id);
  const order = orders.find((o) => o.razorpay_order_id === params.razorpayOrderId);
  if (!order) return { error: "Order not found for current user.", status: 404 };

  const isSimulatedOrder = order.payment_mode === "simulated_test";
  let signatureValid = false;

  if (isSimulatedOrder && params.simulateTestCheckout) {
    // Simulated sandbox mode explicitly checks a deterministic test signature token so invalid signatures still fail!
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
  let payment: CertificationPaymentRecord;

  if (isSupabaseConfigured()) {
    const client = serviceClient();
    const { data: existingPay } = await client
      .from("certification_payments")
      .select("*")
      .eq("razorpay_payment_id", params.razorpayPaymentId)
      .maybeSingle();

    if (existingPay) {
      payment = existingPay as CertificationPaymentRecord;
    } else {
      const { data: insertedPay, error } = await client
        .from("certification_payments")
        .insert({
          order_id: order.id,
          user_id: params.user.id,
          razorpay_payment_id: params.razorpayPaymentId,
          razorpay_signature: params.razorpaySignature,
          payment_status: "captured",
          payment_method: params.paymentMethod ?? "upi",
          verified_at: now,
        })
        .select("*")
        .single();
      if (error || !insertedPay) return { error: "Could not record payment.", status: 500 };
      payment = insertedPay as CertificationPaymentRecord;
    }

    await client
      .from("certification_orders")
      .update({ order_status: "paid", updated_at: now })
      .eq("id", order.id);
  } else {
    const store = getMemoryStore();
    const existingPay = store.payments.find((p) => p.razorpay_payment_id === params.razorpayPaymentId);
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
    }
    order.order_status = "paid";
    order.updated_at = now;
  }

  const products = await listProducts(true);
  const product = products.find((p) => p.id === order.product_id);

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

  if (isSupabaseConfigured()) {
    const client = serviceClient();
    await client
      .from("certification_orders")
      .update({ order_status: params.status, updated_at: now })
      .eq("id", order.id);
    await client.from("certification_payments").upsert(
      {
        order_id: order.id,
        user_id: params.user.id,
        razorpay_payment_id: paymentId,
        payment_status: params.status,
        failure_reason: params.reason,
      },
      { onConflict: "razorpay_payment_id" },
    );
  } else {
    const store = getMemoryStore();
    order.order_status = params.status;
    order.updated_at = now;
    store.payments.unshift({
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
    });
  }

  const products = await listProducts(true);
  const product = products.find((p) => p.id === order.product_id);

  await sendAndLogLifecycleEmail({
    recipientEmail: params.user.email,
    templateKey: "payment_failed",
    variables: {
      studentName: params.user.name,
      certificateName: product?.name ?? "TGL Certificate",
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

  // Idempotency check
  if (isSupabaseConfigured()) {
    const client = serviceClient();
    const { data: existingEvent } = await client
      .from("payment_webhook_events")
      .select("id,processing_status")
      .eq("event_id", eventId)
      .maybeSingle();

    if (existingEvent) {
      return {
        status: 200,
        processingStatus: "ignored_duplicate",
        message: "Duplicate webhook event ignored idempotently.",
      };
    }

    await client.from("payment_webhook_events").insert({
      event_id: eventId,
      event_type: eventType,
      payload: parsed as Record<string, unknown>,
      processing_status: "received",
    });

    const now = new Date().toISOString();
    if (eventType === "payment.captured" && paymentEntity?.order_id && paymentEntity.id) {
      const { data: order } = await client
        .from("certification_orders")
        .select("*")
        .eq("razorpay_order_id", paymentEntity.order_id)
        .maybeSingle();

      if (order) {
        await client
          .from("certification_orders")
          .update({ order_status: "paid", updated_at: now })
          .eq("id", order.id);
        await client.from("certification_payments").upsert(
          {
            order_id: order.id,
            user_id: order.user_id,
            razorpay_payment_id: paymentEntity.id,
            payment_status: "captured",
            payment_method: paymentEntity.method ?? null,
            verified_at: now,
          },
          { onConflict: "razorpay_payment_id" },
        );
      }
    } else if (eventType === "payment.failed" && paymentEntity?.order_id && paymentEntity.id) {
      const { data: order } = await client
        .from("certification_orders")
        .select("*")
        .eq("razorpay_order_id", paymentEntity.order_id)
        .maybeSingle();

      if (order) {
        await client
          .from("certification_orders")
          .update({ order_status: "failed", updated_at: now })
          .eq("id", order.id);
        await client.from("certification_payments").upsert(
          {
            order_id: order.id,
            user_id: order.user_id,
            razorpay_payment_id: paymentEntity.id,
            payment_status: "failed",
            failure_reason: paymentEntity.error_description ?? "Payment failed via webhook",
          },
          { onConflict: "razorpay_payment_id" },
        );
      }
    } else if (eventType === "refund.processed" && refundEntity?.payment_id) {
      await client
        .from("certification_payments")
        .update({ payment_status: "refunded", refunded_at: now, refund_id: refundEntity.id ?? null })
        .eq("razorpay_payment_id", refundEntity.payment_id);
    }

    await client
      .from("payment_webhook_events")
      .update({ processing_status: "processed", processed_at: now })
      .eq("event_id", eventId);

    return { status: 200, processingStatus: "processed", message: `Processed ${eventType}.` };
  }

  const store = getMemoryStore();
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

  if (eventType === "payment.captured" && paymentEntity?.order_id && paymentEntity.id) {
    const order = store.orders.find((o) => o.razorpay_order_id === paymentEntity.order_id);
    if (order) {
      order.order_status = "paid";
      order.updated_at = now;
      const existingPay = store.payments.find((p) => p.razorpay_payment_id === paymentEntity.id);
      if (existingPay) {
        existingPay.payment_status = "captured";
        existingPay.verified_at = existingPay.verified_at ?? now;
      } else {
        store.payments.unshift({
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
        });
      }
    }
  } else if (eventType === "payment.failed" && paymentEntity?.order_id && paymentEntity.id) {
    const order = store.orders.find((o) => o.razorpay_order_id === paymentEntity.order_id);
    if (order) {
      order.order_status = "failed";
      order.updated_at = now;
      store.payments.unshift({
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
      });
    }
  } else if (eventType === "refund.processed" && refundEntity?.payment_id) {
    const pay = store.payments.find((p) => p.razorpay_payment_id === refundEntity.payment_id);
    if (pay) {
      pay.payment_status = "refunded";
      pay.refunded_at = now;
      pay.refund_id = refundEntity.id ?? null;
      const order = store.orders.find((o) => o.id === pay.order_id);
      if (order) order.order_status = "refunded";
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
  if (isSupabaseConfigured()) {
    const client = serviceClient();
    const { data, error } = await client
      .from("certification_payments")
      .update({
        payment_status: "refunded",
        refunded_at: now,
        refund_id: rpRefund.refundId,
      })
      .eq("id", payment.id)
      .select("*")
      .single();
    if (error || !data) return { error: "Could not update payment refund state." };
    await client
      .from("certification_orders")
      .update({ order_status: "refunded", updated_at: now })
      .eq("id", order.id);

    const issuances = await listIssuances();
    const linkedIssuance = issuances.find((i) => i.payment_id === payment.id);
    if (linkedIssuance) {
      await sendAndLogLifecycleEmail({
        recipientEmail: linkedIssuance.recipient_email,
        templateKey: "payment_refunded",
        variables: {
          studentName: linkedIssuance.recipient_name,
          certificateName: linkedIssuance.achievement_title,
          amountFormatted: formatInrFromPaise(order.amount_paise),
          refundId: rpRefund.refundId,
          reason: params.reason,
        },
        isSimulatedTransaction: rpRefund.isSimulated,
      });
    }
    return { payment: data as CertificationPaymentRecord };
  }

  payment.payment_status = "refunded";
  payment.refunded_at = now;
  payment.refund_id = rpRefund.refundId;
  order.order_status = "refunded";
  order.updated_at = now;

  const store = getMemoryStore();
  const linkedIssuance = store.issuances.find((i) => i.payment_id === payment.id);
  await sendAndLogLifecycleEmail({
    recipientEmail: linkedIssuance?.recipient_email ?? "aarav.sharma@example.edu",
    templateKey: "payment_refunded",
    variables: {
      studentName: linkedIssuance?.recipient_name ?? "Aarav Sharma",
      certificateName: linkedIssuance?.achievement_title ?? "TGL Certificate",
      amountFormatted: formatInrFromPaise(order.amount_paise),
      refundId: rpRefund.refundId,
      reason: params.reason,
    },
    isSimulatedTransaction: rpRefund.isSimulated,
  });

  return { payment };
}

export async function listOrders(userId?: string): Promise<CertificationOrderRecord[]> {
  if (isSupabaseConfigured()) {
    const client = serviceClient();
    let query = client.from("certification_orders").select("*").order("created_at", { ascending: false });
    if (userId) query = query.eq("user_id", userId);
    const { data } = await query;
    return (data ?? []) as CertificationOrderRecord[];
  }
  const orders = getMemoryStore().orders;
  return userId ? orders.filter((o) => o.user_id === userId) : [...orders];
}

export async function listPayments(userId?: string): Promise<CertificationPaymentRecord[]> {
  if (isSupabaseConfigured()) {
    const client = serviceClient();
    let query = client.from("certification_payments").select("*").order("created_at", { ascending: false });
    if (userId) query = query.eq("user_id", userId);
    const { data } = await query;
    return (data ?? []) as CertificationPaymentRecord[];
  }
  const payments = getMemoryStore().payments;
  return userId ? payments.filter((p) => p.user_id === userId) : [...payments];
}

export async function listIssuances(userId?: string): Promise<CertificateIssuanceRecord[]> {
  if (isSupabaseConfigured()) {
    const client = serviceClient();
    let query = client.from("certificate_issuances").select("*").order("created_at", { ascending: false });
    if (userId) query = query.eq("user_id", userId);
    const { data } = await query;
    return (data ?? []) as CertificateIssuanceRecord[];
  }
  const issuances = getMemoryStore().issuances;
  return userId ? issuances.filter((i) => i.user_id === userId) : [...issuances];
}

export async function getCertificateByPublicId(
  certificateId: string,
): Promise<CertificateIssuanceRecord | null> {
  if (isSupabaseConfigured()) {
    const client = serviceClient();
    const { data } = await client
      .from("certificate_issuances")
      .select("*")
      .eq("certificate_id", certificateId)
      .maybeSingle();
    return (data as CertificateIssuanceRecord | null) ?? null;
  }
  return getMemoryStore().issuances.find((i) => i.certificate_id === certificateId) ?? null;
}

export async function approveInternshipApplication(params: {
  applicationId: string;
  adminId: string;
  mentorNotes?: string;
}): Promise<{ application?: InternshipApplicationRecord; error?: string }> {
  const now = new Date().toISOString();
  if (isSupabaseConfigured()) {
    const client = serviceClient();
    const { data, error } = await client
      .from("internship_applications")
      .update({
        status: "completed",
        assessment_passed: true,
        mentor_approved: true,
        mentor_approved_by: params.adminId,
        mentor_notes: params.mentorNotes ?? "Approved by TGL mentor/admin.",
        completed_at: now,
        updated_at: now,
      })
      .eq("id", params.applicationId)
      .select("*")
      .single();
    if (error || !data) return { error: "Could not approve internship application." };
    const app = data as InternshipApplicationRecord;
    const internships = await listInternships();
    const title = internships.find((i) => i.id === app.internship_id)?.title ?? "TGL Internship";

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
    return { application: app };
  }

  const store = getMemoryStore();
  const app = store.applications.find((a) => a.id === params.applicationId);
  if (!app) return { error: "Internship application not found." };
  app.status = "completed";
  app.assessment_passed = true;
  app.mentor_approved = true;
  app.mentor_approved_by = params.adminId;
  app.mentor_notes = params.mentorNotes ?? "Approved by TGL mentor/admin.";
  app.completed_at = now;
  app.updated_at = now;

  const title = store.internships.find((i) => i.id === app.internship_id)?.title ?? "TGL Internship";
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
  return { application: app };
}

export async function revokeCertificateWithReason(params: {
  certificateId: string;
  reason: string;
}): Promise<{ issuance?: CertificateIssuanceRecord; error?: string }> {
  if (!params.reason.trim()) return { error: "An audit revocation reason is required." };
  const now = new Date().toISOString();

  if (isSupabaseConfigured()) {
    const client = serviceClient();
    const { data, error } = await client
      .from("certificate_issuances")
      .update({
        issuance_status: "revoked",
        revocation_reason: params.reason.trim(),
        revoked_at: now,
      })
      .eq("certificate_id", params.certificateId)
      .select("*")
      .single();
    if (error || !data) return { error: "Certificate not found." };
    return { issuance: data as CertificateIssuanceRecord };
  }

  const cert = getMemoryStore().issuances.find((i) => i.certificate_id === params.certificateId);
  if (!cert) return { error: "Certificate not found." };
  cert.issuance_status = "revoked";
  cert.revocation_reason = params.reason.trim();
  cert.revoked_at = now;
  return { issuance: cert };
}

export async function listEmailTemplates(): Promise<EmailTemplateDefinition[]> {
  if (isSupabaseConfigured()) {
    const client = serviceClient();
    const { data } = await client.from("email_templates").select("*").order("template_key");
    if (data?.length) return data as EmailTemplateDefinition[];
  }
  return getMemoryStore().emailTemplates;
}

export async function updateEmailTemplate(params: {
  templateKey: EmailTemplateKey;
  subjectTemplate: string;
  bodyTemplate: string;
}): Promise<EmailTemplateDefinition> {
  const now = new Date().toISOString();
  if (isSupabaseConfigured()) {
    const client = serviceClient();
    const { data } = await client
      .from("email_templates")
      .upsert(
        {
          template_key: params.templateKey,
          subject_template: params.subjectTemplate,
          body_template: params.bodyTemplate,
          updated_at: now,
        },
        { onConflict: "template_key" },
      )
      .select("*")
      .single();
    if (data) return data as EmailTemplateDefinition;
  }
  const store = getMemoryStore();
  const existing = store.emailTemplates.find((t) => t.template_key === params.templateKey);
  if (existing) {
    existing.subject_template = params.subjectTemplate;
    existing.body_template = params.bodyTemplate;
    existing.updated_at = now;
    return existing;
  }
  const created: EmailTemplateDefinition = {
    template_key: params.templateKey,
    subject_template: params.subjectTemplate,
    body_template: params.bodyTemplate,
    description: "",
    updated_at: now,
  };
  store.emailTemplates.push(created);
  return created;
}

export async function listEmailLogs(): Promise<EmailDeliveryRecord[]> {
  if (isSupabaseConfigured()) {
    const client = serviceClient();
    const { data } = await client
      .from("email_delivery_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    return (data ?? []) as EmailDeliveryRecord[];
  }
  return [...getMemoryStore().emailLogs];
}

export async function listAllApplicationsForAdmin(): Promise<InternshipApplicationRecord[]> {
  if (isSupabaseConfigured()) {
    const client = serviceClient();
    const { data } = await client
      .from("internship_applications")
      .select("*")
      .order("created_at", { ascending: false });
    return (data ?? []) as InternshipApplicationRecord[];
  }
  return [...getMemoryStore().applications];
}
