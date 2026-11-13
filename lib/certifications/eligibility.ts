import type { CertificateType } from "./pricing";

export type EligibilityRuleSet = {
  requiresInternshipCompletion?: boolean;
  requiresPathwayCompletion?: boolean;
  requiresSubmission?: boolean;
  requiresAssessmentPass?: boolean;
  requiresMentorApproval?: boolean;
  requiresAdminDistinction?: boolean;
};

export type EligibilityInput = {
  certificateType: CertificateType;
  rules: EligibilityRuleSet;
  internshipCompleted: boolean;
  pathwayCompleted: boolean;
  submissionProvided: boolean;
  assessmentPassed: boolean;
  mentorApproved: boolean;
  adminDistinctionApproved: boolean;
};

export type EligibilityCheckItem = {
  key: string;
  label: string;
  satisfied: boolean;
};

export type EligibilityEvaluation = {
  eligible: boolean;
  status: "eligible" | "ineligible";
  checks: EligibilityCheckItem[];
  missingReasons: string[];
};

export function evaluateCertificateEligibility(input: EligibilityInput): EligibilityEvaluation {
  const checks: EligibilityCheckItem[] = [];
  const rules = input.rules;

  if (rules.requiresInternshipCompletion || input.certificateType === "internship") {
    checks.push({
      key: "internship_completed",
      label: "Internship completion record confirmed",
      satisfied: input.internshipCompleted,
    });
  }

  if (rules.requiresPathwayCompletion || input.certificateType === "course_completion") {
    checks.push({
      key: "pathway_completed",
      label: "Required learning pathway completed",
      satisfied: input.pathwayCompleted,
    });
  }

  if (rules.requiresSubmission ?? true) {
    checks.push({
      key: "submission_provided",
      label: "Required project or work submission recorded",
      satisfied: input.submissionProvided,
    });
  }

  if (rules.requiresAssessmentPass) {
    checks.push({
      key: "assessment_passed",
      label: "Required assessment passed",
      satisfied: input.assessmentPassed,
    });
  }

  if (rules.requiresMentorApproval ?? true) {
    checks.push({
      key: "mentor_approved",
      label: "Authorized mentor or admin approval obtained",
      satisfied: input.mentorApproved,
    });
  }

  if (rules.requiresAdminDistinction || input.certificateType === "special_achievement") {
    checks.push({
      key: "admin_distinction",
      label: "Special achievement distinction approved by administrator",
      satisfied: input.adminDistinctionApproved,
    });
  }

  const missingReasons = checks.filter((c) => !c.satisfied).map((c) => c.label);
  const eligible = checks.length > 0 && missingReasons.length === 0;

  return {
    eligible,
    status: eligible ? "eligible" : "ineligible",
    checks,
    missingReasons,
  };
}

export type IssuanceGateInput = {
  productEnabled: boolean;
  pricePaise: number;
  eligibility: EligibilityEvaluation;
  paymentStatus: "none" | "pending" | "captured" | "failed" | "cancelled" | "refunded";
  paymentVerified: boolean;
  existingActiveCertificateId?: string | null;
};

export function canIssueCertificate(input: IssuanceGateInput): { allowed: boolean; reason?: string } {
  if (!input.productEnabled) {
    return { allowed: false, reason: "This certification product is currently disabled." };
  }
  if (input.existingActiveCertificateId) {
    return {
      allowed: false,
      reason: `An active certificate (${input.existingActiveCertificateId}) has already been issued for this achievement.`,
    };
  }
  if (!input.eligibility.eligible) {
    return {
      allowed: false,
      reason: `Eligibility requirements not met: ${input.eligibility.missingReasons.join("; ")}. Payment alone never issues a certificate.`,
    };
  }
  if (input.pricePaise > 0) {
    if (input.paymentStatus !== "captured" || !input.paymentVerified) {
      return {
        allowed: false,
        reason: "Verified payment is required before issuing a paid certificate.",
      };
    }
  }
  return { allowed: true };
}
