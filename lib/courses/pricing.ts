export const MIN_COURSE_PRICE_PAISE = 49900; // ₹499.00 INR
export const MAX_COURSE_PRICE_PAISE = 199900; // ₹1,999.00 INR
export const COURSE_CURRENCY = "INR" as const;

export function validateCoursePricePaise(pricePaise: number): {
  valid: boolean;
  error?: string;
} {
  if (!Number.isInteger(pricePaise) || pricePaise <= 0) {
    return {
      valid: false,
      error: "Course price must be a positive integer amount in paise.",
    };
  }
  if (pricePaise < MIN_COURSE_PRICE_PAISE || pricePaise > MAX_COURSE_PRICE_PAISE) {
    return {
      valid: false,
      error: `Course prices must be between ₹${MIN_COURSE_PRICE_PAISE / 100} (${MIN_COURSE_PRICE_PAISE} paise) and ₹${MAX_COURSE_PRICE_PAISE / 100} (${MAX_COURSE_PRICE_PAISE} paise).`,
    };
  }
  return { valid: true };
}
