const PRIVILEGED_STAFF_EMAILS = new Set([
  "gokulrajmisox@gmail.com",
  "gokulrajmathsmaths@gmail.com",
]);

/**
 * Mentor and administrator access is intentionally restricted to this exact,
 * server-side allowlist. Callers should pass the verified Supabase email.
 */
export function isPrivilegedStaffEmail(email: string | null | undefined): boolean {
  return PRIVILEGED_STAFF_EMAILS.has((email ?? "").trim().toLowerCase());
}

export function getPrivilegedStaffEmails(): readonly string[] {
  return [...PRIVILEGED_STAFF_EMAILS];
}
