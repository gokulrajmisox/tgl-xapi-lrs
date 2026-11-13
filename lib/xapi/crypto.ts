import { createHmac } from "node:crypto";

export function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

let warnedMissingSecret = false;

export function getJwtSecret() {
  const key = process.env.SUPABASE_JWT_SECRET;
  if (key) return key;
  if (!warnedMissingSecret) {
    warnedMissingSecret = true;
    console.warn("[AI Studio] SUPABASE_JWT_SECRET not set — using ephemeral fallback key");
  }
  return "ai-studio-fallback-jwt-secret-not-for-production";
}

export function secretHmac(value: string) {
  return createHmac("sha256", getJwtSecret()).update(value).digest("hex");
}
