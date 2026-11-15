import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sanitizeRedirectPath } from "@/lib/auth/redirects";
import {
  deriveStudentProfileSeed,
  syncAuthenticatedStudentProfile,
} from "@/lib/auth/profile-sync";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const oauthError = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");
  const safeNext = sanitizeRedirectPath(searchParams.get("next"), "/learn");

  if (oauthError) {
    const mappedCode =
      oauthError === "access_denied" ? "oauth_cancelled" : oauthError;
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("error", mappedCode);
    if (errorDescription) {
      loginUrl.searchParams.set("error_description", errorDescription);
    }
    loginUrl.searchParams.set("next", safeNext);
    return NextResponse.redirect(loginUrl);
  }

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      const seed = deriveStudentProfileSeed(data.user);
      if (!seed.emailVerified) {
        const loginUrl = new URL("/auth/login", request.url);
        loginUrl.searchParams.set("error", "oauth_unverified_email");
        loginUrl.searchParams.set("next", safeNext);
        return NextResponse.redirect(loginUrl);
      }

      await syncAuthenticatedStudentProfile(data.user);
      return NextResponse.redirect(new URL(safeNext, request.url));
    }
  }

  const loginUrl = new URL("/auth/login", request.url);
  loginUrl.searchParams.set("error", "callback");
  loginUrl.searchParams.set("next", safeNext);
  return NextResponse.redirect(loginUrl);
}
