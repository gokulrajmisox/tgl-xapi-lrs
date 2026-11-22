import { FieldValue } from "firebase-admin/firestore";
import { isPrivilegedStaffEmail } from "@/lib/auth/access";
import {
  getAdminFirestore,
  isFirebaseAdminConfigured,
  type VerifiedFirebaseActor,
} from "@/lib/firebase/server";

export type AuthUserLike = {
  id?: string;
  uid?: string;
  email?: string | null;
  emailVerified?: boolean;
  email_confirmed_at?: string | null;
  displayName?: string | null;
  photoURL?: string | null;
  authProvider?: string | null;
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
 * Pure helper deriving a safe student profile seed from a Firebase Auth user
 * or compatible identity record. Never derives full names from email prefixes
 * and restricts admin role exclusively to the allowlisted verified staff emails.
 */
export function deriveStudentProfileSeed(user: AuthUserLike): StudentProfileSeed {
  const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
  const appMeta = (user.app_metadata ?? {}) as Record<string, unknown>;

  const userId = cleanString(user.uid || user.id, 128);
  const email = cleanString(user.email, 254).toLowerCase();
  const existingDisplayName =
    cleanString(user.displayName, 120) || cleanString(metadata.display_name, 120);
  const providerName =
    cleanString(metadata.full_name, 120) || cleanString(metadata.name, 120);

  const fullName = existingDisplayName || providerName;
  const avatarUrl =
    cleanSafeAvatarUrl(user.photoURL) ||
    cleanSafeAvatarUrl(metadata.avatar_url) ||
    cleanSafeAvatarUrl(metadata.picture);

  const authProvider =
    cleanString(user.authProvider, 40) ||
    cleanString(appMeta.provider, 40) ||
    (Array.isArray(appMeta.providers) && typeof appMeta.providers[0] === "string"
      ? cleanString(appMeta.providers[0], 40)
      : "firebase");

  const explicitFalse = metadata.email_verified === false || user.emailVerified === false;
  const emailVerified =
    !explicitFalse &&
    Boolean(
      user.emailVerified === true ||
        user.email_confirmed_at ||
        metadata.email_verified === true,
    );

  const role = emailVerified && isPrivilegedStaffEmail(email) ? "admin" : "student";

  return {
    userId,
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
 * Syncs an authenticated Firebase user into Firestore `users/{uid}`,
 * `users/{uid}/private/info`, and (when allowlisted) `admins/{uid}`.
 * Preserves any previously saved certificate displayName.
 */
export async function syncFirebaseUserRecord(
  actor: VerifiedFirebaseActor,
): Promise<{ synced: boolean }> {
  if (!isFirebaseAdminConfigured() || !actor.uid || !actor.email || !actor.emailVerified) {
    return { synced: false };
  }

  const db = getAdminFirestore();
  if (!db) return { synced: false };

  try {
    const userRef = db.collection("users").doc(actor.uid);
    const privateRef = userRef.collection("private").doc("info");
    const existingSnap = await userRef.get();
    const existingData = existingSnap.exists ? existingSnap.data() : undefined;
    const existingName =
      existingData && typeof existingData.displayName === "string"
        ? existingData.displayName.trim()
        : "";
    const finalName = existingName || actor.displayName;
    const resolvedRole = isPrivilegedStaffEmail(actor.email) ? "admin" : "student";

    await userRef.set(
      {
        uid: actor.uid,
        displayName: finalName,
        role: resolvedRole,
        cohort:
          typeof existingData?.cohort === "string" && existingData.cohort
            ? existingData.cohort
            : resolvedRole === "admin"
              ? "Platform Administration"
              : "Registered Learner",
        createdAt: existingData?.createdAt ?? FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    await privateRef.set(
      {
        uid: actor.uid,
        email: actor.email,
        emailVerified: actor.emailVerified,
        authProvider: actor.authProvider,
        ...(actor.avatarUrl ? { avatarUrl: actor.avatarUrl } : {}),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    if (resolvedRole === "admin") {
      await db.collection("admins").doc(actor.uid).set(
        {
          uid: actor.uid,
          email: actor.email,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    }

    return { synced: true };
  } catch {
    return { synced: false };
  }
}

export async function syncAuthenticatedStudentProfile(
  user: AuthUserLike | null | undefined,
): Promise<{ synced: boolean; seed: StudentProfileSeed | null }> {
  if (!user) return { synced: false, seed: null };
  const seed = deriveStudentProfileSeed(user);
  if (!seed.userId || !seed.email || !seed.emailVerified) {
    return { synced: false, seed };
  }
  const { synced } = await syncFirebaseUserRecord({
    uid: seed.userId,
    email: seed.email,
    displayName: seed.fullName,
    avatarUrl: seed.avatarUrl,
    emailVerified: seed.emailVerified,
    authProvider: seed.authProvider,
    role: seed.role,
  });
  return { synced, seed };
}
