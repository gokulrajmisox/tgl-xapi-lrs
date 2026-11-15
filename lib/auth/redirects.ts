const DEFAULT_FALLBACK_PATH = "/learn";

/**
 * Sanitizes a post-auth redirect target so external URLs, protocol-relative
 * paths, backslashes, control characters, and `/auth/*` loops are rejected.
 */
export function sanitizeRedirectPath(
  rawNext: string | null | undefined,
  fallback = DEFAULT_FALLBACK_PATH,
): string {
  if (!rawNext || typeof rawNext !== "string") return fallback;
  const trimmed = rawNext.trim();
  if (!trimmed.startsWith("/")) return fallback;
  if (trimmed.startsWith("//") || trimmed.startsWith("/\\")) return fallback;
  if (/[\u0000-\u001f\u007f]/.test(trimmed)) return fallback;

  const pathOnly = trimmed.split(/[?#]/)[0] ?? "";
  if (pathOnly.includes(":")) return fallback;
  if (pathOnly === "/auth" || pathOnly.startsWith("/auth/")) return fallback;

  return trimmed;
}

/**
 * Builds an origin-aware OAuth callback URL supporting local dev, Cloud Run
 * preview/shared URLs, and production custom domains without trailing-slash issues.
 */
export function buildOAuthCallbackUrl(
  origin: string,
  nextPath?: string | null,
  siteUrlOverride?: string | null,
): string {
  const baseSource = siteUrlOverride?.trim() || origin.trim();
  const normalizedBase = baseSource.replace(/\/+$/, "");
  const safeNext = sanitizeRedirectPath(nextPath, DEFAULT_FALLBACK_PATH);
  return `${normalizedBase}/auth/callback?next=${encodeURIComponent(safeNext)}`;
}

/**
 * Maps OAuth query error parameters to clear, actionable user-facing copy.
 */
export function mapOAuthErrorToMessage(
  errorCode: string | null | undefined,
  description?: string | null,
): string {
  const code = (errorCode ?? "").trim().toLowerCase();
  const desc = (description ?? "").trim().toLowerCase();

  if (code === "oauth_cancelled" || code === "access_denied" || desc.includes("access_denied")) {
    return "Google sign-in was cancelled. You can try again anytime or sign in with your email.";
  }

  if (code === "oauth_config" || code === "not_configured" || desc.includes("provider is not enabled")) {
    return "Google Sign-In is not configured yet in this environment. Enable Google provider credentials in Supabase and environment settings to sign in with Google.";
  }

  if (code === "oauth_unverified_email") {
    return "Your Google account email could not be verified. Please verify your Google email address before continuing.";
  }

  if (code === "callback" || code === "server_error" || code === "temporarily_unavailable") {
    return "We could not complete Google sign-in right now. Please try again in a moment.";
  }

  return description?.trim() || "Unable to sign in with Google right now. Please try again.";
}
