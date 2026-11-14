export const MIN_PAID_CERTIFICATE_PAISE = 0; // Certificates are included in Programme Enrolment
export const MAX_PAID_CERTIFICATE_PAISE = 0; // No separate certificate fee
export const CERTIFICATE_CURRENCY = "INR" as const;

export type CertificateType =
  | "internship"
  | "course_completion"
  | "project_completion"
  | "special_achievement";

export const CERTIFICATE_TYPE_LABELS: Record<CertificateType, string> = {
  internship: "Internship Completion Certificate",
  course_completion: "Programme Completion Certificate",
  project_completion: "Project Completion Certificate",
  special_achievement: "Special Achievement Distinction",
};

export function validateProductPricePaise(pricePaise: number): { valid: boolean; error?: string } {
  if (!Number.isInteger(pricePaise) || pricePaise < 0) {
    return { valid: false, error: "Price must be a non-negative integer in paise." };
  }
  if (pricePaise !== 0) {
    return {
      valid: false,
      error: "Certificates are included in Programme Enrolment at ₹0 extra. Separate certificate pricing is disabled.",
    };
  }
  return { valid: true };
}

export function formatInrFromPaise(pricePaise: number): string {
  if (pricePaise === 0) return "Included (₹0 extra)";
  const rupees = pricePaise / 100;
  const formatted = Number.isInteger(rupees)
    ? rupees.toLocaleString("en-IN")
    : rupees.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `₹${formatted}`;
}

export function isPaidCertificate(pricePaise: number): boolean {
  return pricePaise > 0;
}
