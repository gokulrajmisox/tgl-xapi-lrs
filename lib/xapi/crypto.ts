import { createHmac } from "node:crypto";

export function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function secretHmac(value: string) {
  const key = process.env.SUPABASE_JWT_SECRET;
  if (!key) throw new Error("SUPABASE_JWT_SECRET is required for LRS signing.");
  return createHmac("sha256", key).update(value).digest("hex");
}
