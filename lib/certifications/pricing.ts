export const MIN_PAID_CERTIFICATE_PAISE = 29900; // ₹299.00 INR
export const MAX_PAID_CERTIFICATE_PAISE = 59900; // ₹599.00 INR
export const CERTIFICATE_CURRENCY = "INR" as const;

export type CertificateType =
  | "internship"
  | "course_completion"
  | "project_completion"
  | "special_achievement";

export const CERTIFICATE_TYPE_LABELS: Record<CertificateType, string> = {
  internship: "Internship Certificate",
  course_completion: "Course Completion Certificate",
  project_completion: "Project Completion Certificate",
  special_achievement: "Special Achievement Certificate",
};

export function validateProductPricePaise(pricePaise: number): { valid: boolean; error?: string } {
  if (!Number.isInteger(pricePaise) || pricePaise < 0) {
    return { valid: false, error: "Price must be a non-negative integer in paise." };
  }
  if (pricePaise === 0) {
    return { valid: true };
  }
  if (pricePaise < MIN_PAID_CERTIFICATE_PAISE || pricePaise > MAX_PAID_CERTIFICATE_PAISE) {
    return {
      valid: false,
      error: `Paid certificate prices must be between ₹${MIN_PAID_CERTIFICATE_PAISE / 100} (${MIN_PAID_CERTIFICATE_PAISE} paise) and ₹${MAX_PAID_CERTIFICATE_PAISE / 100} (${MAX_PAID_CERTIFICATE_PAISE} paise).`,
    };
  }
  return { valid: true };
}

export function formatInrFromPaise(pricePaise: number): string {
  if (pricePaise === 0) return "Free";
  const rupees = pricePaise / 100;
  const formatted = Number.isInteger(rupees) ? rupees.toLocaleString("en-IN") : rupees.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `₹${formatted}`;
}

export function isPaidCertificate(pricePaise: number): boolean {
  return pricePaise > 0;
}
