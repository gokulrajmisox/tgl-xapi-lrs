import type { User } from "@supabase/supabase-js";
import { isSupabaseConfigured, serviceClient } from "@/lib/supabase/service";

export type AuthUserLike = {
  id: string;
  email?: string | null;
  email_confirmed_at?: string | null;
  user_metadata?: Record<string, unknown> | null;
  app_metadata?: Record<string, unknown> | null;
};

export type StudentProfileSeed = {
  userId: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  authProvider: string;
  emailVerified: boolean;
  role: "student" | "admin";
  needsMetadataBackfill: boolean;
};

function cleanString(value: unknown, maxLength = 120): string {
  if (typeof value !== "string") return "";
  return value.trim().replace(/\s+/g, " ").slice(0, maxLength);
}

function cleanSafeAvatarUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed.startsWith("https://")) return null;
  return trimmed.slice(0, 512);
}

/**
 * Pure helper deriving a safe student profile seed from a Supabase user object.
 * - Preserves an existing `display_name` so custom student names are never overwritten.
 * - Falls back to Google OAuth `full_name` / `name` when `display_name` is absent.
 * - Requires verified email before trusting profile sync/account linking.
 * - Never elevates roles beyond `app_metadata.role === "admin"`.
 */
export function deriveStudentProfileSeed(user: AuthUserLike | User): StudentProfileSeed {
  const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
  const appMeta = (user.app_metadata ?? {}) as Record<string, unknown>;

  const email = cleanString(user.email, 254).toLowerCase();
  const existingDisplayName = cleanString(metadata.display_name, 120);
  const providerName =
    cleanString(metadata.full_name, 120) || cleanString(metadata.name, 120);

  const fullName = existingDisplayName || providerName;
  const avatarUrl =
    cleanSafeAvatarUrl(metadata.avatar_url) || cleanSafeAvatarUrl(metadata.picture);

  const authProvider =
    cleanString(appMeta.provider, 40) ||
    (Array.isArray(appMeta.providers) && typeof appMeta.providers[0] === "string"
      ? cleanString(appMeta.providers[0], 40)
      : "email");

  // Explicitly block untrusted / unverified emails from syncing or linking profiles.
  const explicitFalse = metadata.email_verified === false;
  const emailVerified =
    !explicitFalse &&
    Boolean(user.email_confirmed_at || metadata.email_verified === true);

  const role = appMeta.role === "admin" ? "admin" : "student";

  return {
    userId: user.id,
    email,
    fullName,
    avatarUrl,
    authProvider,
    emailVerified,
    role,
    needsMetadataBackfill: !existingDisplayName && Boolean(providerName),
  };
}

/**
 * Syncs an authenticated Supabase user (Google OAuth or email/password) into
 * `student_profiles` and backfills `display_name` metadata on first OAuth sign-in
 * without overwriting an existing saved name or bypassing role/enrolment guards.
 */
export async function syncAuthenticatedStudentProfile(
  user: User | AuthUserLike | null | undefined,
): Promise<{ synced: boolean; seed: StudentProfileSeed | null }> {
  if (!user) return { synced: false, seed: null };
  const seed = deriveStudentProfileSeed(user);

  if (!isSupabaseConfigured() || !seed.email || !seed.emailVerified) {
    return { synced: false, seed };
  }

  try {
    const admin = serviceClient();

    // Check existing profile first so an already-saved student full_name is preserved.
    const { data: existingProfile, error: readErr } = await admin
      .from("student_profiles")
      .select("id, full_name, avatar_url")
      .eq("id", seed.userId)
      .maybeSingle();

    if (!readErr) {
      const existingName =
        existingProfile && typeof existingProfile.full_name === "string"
          ? existingProfile.full_name.trim()
          : "";
      const finalName = existingName || seed.fullName;

      await admin.from("student_profiles").upsert(
        {
          id: seed.userId,
          email: seed.email,
          full_name: finalName,
          avatar_url: seed.avatarUrl ?? existingProfile?.avatar_url ?? null,
          auth_provider: seed.authProvider,
          email_verified: seed.emailVerified,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" },
      );

      if (seed.needsMetadataBackfill && finalName) {
        await admin.auth.admin.updateUserById(seed.userId, {
          user_metadata: {
            ...(user.user_metadata ?? {}),
            display_name: finalName,
          },
        });
      }
    }

    return { synced: true, seed };
  } catch {
    // Non-fatal if student_profiles table has not been migrated yet on external Supabase.
    return { synced: false, seed };
  }
}
