import { NextResponse, type NextRequest } from "next/server";
import { sanitizeRedirectPath } from "@/lib/auth/redirects";

/**
 * Legacy OAuth callback route preserved cleanly for external bookmarks or
 * Firebase email action continue URLs. Firebase Google Sign-In completes
 * via popup directly on `/auth/login` and `/auth/sign-up`.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const safeNext = sanitizeRedirectPath(searchParams.get("next"), "/learn");
  const mode = searchParams.get("mode");
  const oobCode = searchParams.get("oobCode");
  const authError = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  if (mode && oobCode) {
    const actionUrl = new URL("/auth/action", request.url);
    actionUrl.searchParams.set("mode", mode);
    actionUrl.searchParams.set("oobCode", oobCode);
    actionUrl.searchParams.set("next", safeNext);
    return NextResponse.redirect(actionUrl);
  }

  if (authError) {
    const mappedCode =
      authError === "access_denied" ? "oauth_cancelled" : authError;
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("error", mappedCode);
    if (errorDescription) {
      loginUrl.searchParams.set("error_description", errorDescription);
    }
    loginUrl.searchParams.set("next", safeNext);
    return NextResponse.redirect(loginUrl);
  }

  const loginUrl = new URL("/auth/login", request.url);
  loginUrl.searchParams.set("next", safeNext);
  return NextResponse.redirect(loginUrl);
}
