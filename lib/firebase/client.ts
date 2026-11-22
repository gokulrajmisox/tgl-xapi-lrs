"use client";

import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import {
  applyActionCode,
  browserLocalPersistence,
  confirmPasswordReset,
  createUserWithEmailAndPassword,
  getAuth,
  GoogleAuthProvider,
  sendEmailVerification,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updatePassword,
  updateProfile,
  type Auth,
  type User,
} from "firebase/auth";
import {
  doc,
  getDoc,
  getDocFromServer,
  getFirestore,
  serverTimestamp,
  setDoc,
  type Firestore,
} from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";
import {
  initializeAppCheck,
  ReCaptchaEnterpriseProvider,
  type AppCheck,
} from "firebase/app-check";
import { isPrivilegedStaffEmail } from "@/lib/auth/access";
import { firebaseConfig, isFirebaseClientConfigured } from "./config";
import { handleFirestoreError, OperationType } from "./errors";

export type ClientUserProfile = {
  uid: string;
  displayName: string;
  role: "student" | "admin";
  cohort: string;
  email: string;
  emailVerified: boolean;
  avatarUrl: string | null;
};

export type ServerSessionSnapshot = {
  authenticated: boolean;
  user: {
    id: string;
    email: string;
    name: string;
    role: "student" | "admin";
    emailVerified: boolean;
  } | null;
};

let cachedApp: FirebaseApp | null = null;
let cachedAuth: Auth | null = null;
let cachedDb: Firestore | null = null;
let cachedStorage: FirebaseStorage | null = null;
let cachedAppCheck: AppCheck | null = null;
let persistencePromise: Promise<void> | null = null;
let testedConnection = false;

export function getFirebaseApp(): FirebaseApp {
  if (cachedApp) return cachedApp;
  cachedApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
  return cachedApp;
}

export function getFirebaseAuth(): Auth {
  if (cachedAuth) return cachedAuth;
  const authInstance = getAuth(getFirebaseApp());
  cachedAuth = authInstance;
  if (typeof window !== "undefined" && !persistencePromise) {
    persistencePromise = setPersistence(authInstance, browserLocalPersistence).catch(() => {
      // Non-fatal in constrained iframe contexts
    });
  }
  return authInstance;
}

export async function ensureAuthPersistence(): Promise<Auth> {
  const authInstance = getFirebaseAuth();
  if (typeof window !== "undefined") {
    if (!persistencePromise) {
      persistencePromise = setPersistence(authInstance, browserLocalPersistence).catch(() => {
        // Non-fatal fallback
      });
    }
    await persistencePromise;
  }
  return authInstance;
}

export function getFirebaseDb(): Firestore {
  if (cachedDb) return cachedDb;
  // CRITICAL: pass configured firestoreDatabaseId so named Enterprise Firestore DB is targeted
  cachedDb = getFirestore(getFirebaseApp(), firebaseConfig.firestoreDatabaseId);
  return cachedDb;
}

export function getFirebaseStorage(): FirebaseStorage {
  if (cachedStorage) return cachedStorage;
  cachedStorage = getStorage(getFirebaseApp());
  return cachedStorage;
}

export function initFirebaseAppCheck(): AppCheck | null {
  if (typeof window === "undefined") return null;
  if (cachedAppCheck) return cachedAppCheck;
  const siteKey = firebaseConfig.recaptchaSiteKey?.trim();
  if (!siteKey) return null;
  try {
    cachedAppCheck = initializeAppCheck(getFirebaseApp(), {
      provider: new ReCaptchaEnterpriseProvider(siteKey),
      isTokenAutoRefreshEnabled: true,
    });
    return cachedAppCheck;
  } catch {
    return null;
  }
}

export function clearClientUserCaches(): void {
  if (typeof window === "undefined") return;
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const k = window.localStorage.key(i);
      if (k && (k.startsWith("tgl_user_") || k.startsWith("tgl_profile_") || k.startsWith("tgl_workspace_"))) {
        keysToRemove.push(k);
      }
    }
    for (const k of keysToRemove) {
      window.localStorage.removeItem(k);
    }

    const sessionKeysToRemove: string[] = [];
    for (let i = 0; i < window.sessionStorage.length; i += 1) {
      const k = window.sessionStorage.key(i);
      if (k && (k.startsWith("tgl_user_") || k.startsWith("tgl_profile_") || k.startsWith("tgl_workspace_"))) {
        sessionKeysToRemove.push(k);
      }
    }
    for (const k of sessionKeysToRemove) {
      window.sessionStorage.removeItem(k);
    }
  } catch {
    // Storage access may be restricted in sandboxed browsers
  }
}

function authInfoFromUser(user: User | null) {
  if (!user) return {};
  return {
    userId: user.uid,
    email: user.email,
    emailVerified: user.emailVerified,
    isAnonymous: user.isAnonymous,
    tenantId: user.tenantId,
    providerInfo:
      user.providerData?.map((p) => ({
        providerId: p.providerId,
        email: p.email,
      })) ?? [],
  };
}

export async function testFirestoreConnection(): Promise<boolean> {
  if (typeof window === "undefined" || testedConnection || !isFirebaseClientConfigured()) {
    return true;
  }
  testedConnection = true;
  try {
    const db = getFirebaseDb();
    await getDocFromServer(doc(db, "test", "connection"));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes("the client is offline")) {
      console.error("Please check your Firebase configuration: the Firestore client is offline.");
    }
    return false;
  }
}

export async function fetchServerSessionState(): Promise<ServerSessionSnapshot | null> {
  if (typeof window === "undefined") return null;
  try {
    const res = await fetch("/api/auth/session", { method: "GET", cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as ServerSessionSnapshot;
  } catch {
    return null;
  }
}

export async function syncServerSessionCookie(
  user: User | null,
  forceRefresh = false,
): Promise<ServerSessionSnapshot | null> {
  if (typeof window === "undefined") return null;
  try {
    if (!user) {
      const res = await fetch("/api/auth/session", { method: "DELETE", cache: "no-store" });
      return res.ok ? ((await res.json()) as ServerSessionSnapshot) : null;
    }
    const idToken = await user.getIdToken(forceRefresh);
    const res = await fetch("/api/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({
        idToken,
        displayName: user.displayName?.trim() || undefined,
      }),
    });
    if (!res.ok) return null;
    return (await res.json()) as ServerSessionSnapshot;
  } catch {
    return null;
  }
}

/**
 * Looks up `users/{uid}` in Firestore using only `user.uid` (never by email or fallback IDs).
 * Creates the profile ONLY if missing (`!snap.exists()`) and the account has a verified email.
 */
export async function resolveOrCreateUserProfileFromFirestore(
  user: User,
): Promise<ClientUserProfile> {
  const email = (user.email ?? "").trim().toLowerCase();
  const resolvedRole: "student" | "admin" =
    user.emailVerified && isPrivilegedStaffEmail(email) ? "admin" : "student";
  const authDisplayName = user.displayName?.trim() || "";

  const fallbackProfile: ClientUserProfile = {
    uid: user.uid,
    displayName: authDisplayName,
    role: resolvedRole,
    cohort: resolvedRole === "admin" ? "Platform Administration" : "Registered Learner",
    email,
    emailVerified: user.emailVerified,
    avatarUrl: user.photoURL?.startsWith("https://") ? user.photoURL : null,
  };

  if (!isFirebaseClientConfigured()) return fallbackProfile;

  const db = getFirebaseDb();
  const userRef = doc(db, "users", user.uid);
  const privateRef = doc(db, "users", user.uid, "private", "info");

  try {
    const [snap, privateSnap] = await Promise.all([
      getDoc(userRef),
      getDoc(privateRef).catch(() => null),
    ]);

    const privateData = privateSnap?.exists()
      ? (privateSnap.data() as { avatarUrl?: string; phone?: string })
      : null;
    const storedAvatar =
      typeof privateData?.avatarUrl === "string" &&
      privateData.avatarUrl.startsWith("https://")
        ? privateData.avatarUrl
        : fallbackProfile.avatarUrl;

    if (snap.exists()) {
      const data = snap.data() as {
        uid?: string;
        displayName?: string;
        role?: string;
        cohort?: string;
      };
      if (data.uid && data.uid !== user.uid) {
        throw new Error("Profile UID mismatch detected.");
      }

      const storedDisplayName =
        typeof data.displayName === "string" ? data.displayName.trim() : "";
      const finalName = storedDisplayName || authDisplayName;

      if (!storedDisplayName && authDisplayName && user.emailVerified) {
        // Rule-compliant partial update: only displayName + updatedAt
        await setDoc(
          userRef,
          {
            displayName: authDisplayName,
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        ).catch(() => {});
      }

      if (!privateSnap?.exists() && user.emailVerified && email) {
        await setDoc(privateRef, {
          uid: user.uid,
          email,
          emailVerified: user.emailVerified,
          authProvider: user.providerData[0]?.providerId ?? "password",
          ...(storedAvatar ? { avatarUrl: storedAvatar } : {}),
          updatedAt: serverTimestamp(),
        }).catch(() => {});
      }

      return {
        ...fallbackProfile,
        displayName: finalName,
        role: resolvedRole,
        avatarUrl: storedAvatar,
        cohort:
          typeof data.cohort === "string" && data.cohort.trim()
            ? data.cohort.trim()
            : fallbackProfile.cohort,
      };
    }

    // Create only if genuinely missing and verified (per firestore.rules)
    if (user.emailVerified && email) {
      await setDoc(userRef, {
        uid: user.uid,
        displayName: authDisplayName,
        role: "student",
        cohort: resolvedRole === "admin" ? "Platform Administration" : "Registered Learner",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      await setDoc(privateRef, {
        uid: user.uid,
        email,
        emailVerified: user.emailVerified,
        authProvider: user.providerData[0]?.providerId ?? "password",
        ...(storedAvatar ? { avatarUrl: storedAvatar } : {}),
        updatedAt: serverTimestamp(),
      }).catch(() => {});
    }
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.toLowerCase().includes("mismatch")
    ) {
      throw error;
    }
    if (
      error instanceof Error &&
      error.message.toLowerCase().includes("permission")
    ) {
      try {
        handleFirestoreError(
          error,
          OperationType.GET,
          `users/${user.uid}`,
          authInfoFromUser(user),
        );
      } catch {
        // Structured diagnostics logged; preserve fallback profile
      }
    }
  }

  return fallbackProfile;
}

export async function syncClientUserProfileToFirestore(user: User): Promise<void> {
  await resolveOrCreateUserProfileFromFirestore(user);
}

export function mapFirebaseAuthError(error: unknown): string {
  const code =
    typeof error === "object" && error && "code" in error
      ? String((error as { code?: unknown }).code)
      : "";
  const message = error instanceof Error ? error.message : String(error ?? "");

  switch (code) {
    case "auth/invalid-credential":
    case "auth/user-not-found":
    case "auth/wrong-password":
      return "Invalid email or password.";
    case "auth/email-already-in-use":
      return "An account with this email already exists. Try signing in instead.";
    case "auth/invalid-email":
      return "Enter a valid email address.";
    case "auth/weak-password":
      return "Choose a stronger password (at least 8 characters).";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a moment and try again.";
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return "Google sign-in was cancelled. You can try again anytime or sign in with your email.";
    case "auth/popup-blocked":
      return "Your browser blocked the sign-in popup. Please allow popups for this site and try again.";
    case "auth/unauthorized-domain":
      return "This domain is not yet authorized for Google Sign-In in Firebase Console -> Authentication -> Authorized domains.";
    case "auth/operation-not-allowed":
      return "This sign-in provider is not enabled yet in Firebase Authentication settings.";
    case "auth/expired-action-code":
    case "auth/invalid-action-code":
      return "This verification or reset link has expired. Request a new link and try again.";
    case "auth/requires-recent-login":
      return "Please sign in again before updating your password.";
    default:
      return message || "Authentication failed. Please try again.";
  }
}

export async function registerStudentWithEmail(params: {
  email: string;
  password: string;
  fullName?: string;
  continueUrl?: string;
}): Promise<{ user: User; verificationSent: boolean }> {
  const auth = await ensureAuthPersistence();
  if (auth.currentUser) {
    clearClientUserCaches();
    await signOut(auth).catch(() => {});
    await syncServerSessionCookie(null);
  }
  try {
    const credential = await createUserWithEmailAndPassword(
      auth,
      params.email.trim(),
      params.password,
    );
    const trimmedName = params.fullName?.trim();
    if (trimmedName) {
      await updateProfile(credential.user, { displayName: trimmedName });
    }
    let verificationSent = false;
    try {
      await sendEmailVerification(credential.user, {
        url: params.continueUrl || `${window.location.origin}/auth/login?verified=1`,
      });
      verificationSent = true;
    } catch {
      verificationSent = false;
    }
    await syncServerSessionCookie(credential.user, true);
    return { user: credential.user, verificationSent };
  } catch (error) {
    throw new Error(mapFirebaseAuthError(error));
  }
}

export async function loginStudentWithEmail(
  email: string,
  password: string,
): Promise<{ user: User; emailVerified: boolean }> {
  const auth = await ensureAuthPersistence();
  const normalizedTarget = email.trim().toLowerCase();
  if (auth.currentUser && auth.currentUser.email?.toLowerCase() !== normalizedTarget) {
    clearClientUserCaches();
    await signOut(auth).catch(() => {});
    await syncServerSessionCookie(null);
  }
  try {
    const credential = await signInWithEmailAndPassword(
      auth,
      email.trim(),
      password,
    );
    clearClientUserCaches();
    await syncServerSessionCookie(credential.user, true);
    return {
      user: credential.user,
      emailVerified: credential.user.emailVerified,
    };
  } catch (error) {
    throw new Error(mapFirebaseAuthError(error));
  }
}

export async function signInWithGooglePopup(): Promise<User> {
  const auth = await ensureAuthPersistence();
  const previousUid = auth.currentUser?.uid ?? null;
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  try {
    const result = await signInWithPopup(auth, provider);
    if (!result.user.emailVerified) {
      await signOut(auth).catch(() => {});
      await syncServerSessionCookie(null);
      throw new Error(
        "Your Google account email is not verified. Please verify it before continuing.",
      );
    }
    if (previousUid && previousUid !== result.user.uid) {
      clearClientUserCaches();
    }
    await syncServerSessionCookie(result.user, true);
    await resolveOrCreateUserProfileFromFirestore(result.user).catch(() => {});
    return result.user;
  } catch (error) {
    throw new Error(mapFirebaseAuthError(error));
  }
}

export async function requestPasswordReset(
  email: string,
  continueUrl?: string,
): Promise<void> {
  const auth = await ensureAuthPersistence();
  try {
    await sendPasswordResetEmail(auth, email.trim(), {
      url: continueUrl || `${window.location.origin}/auth/login?updated=1`,
    });
  } catch (error) {
    throw new Error(mapFirebaseAuthError(error));
  }
}

export async function completePasswordReset(params: {
  oobCode?: string | null;
  newPassword: string;
}): Promise<void> {
  const auth = await ensureAuthPersistence();
  try {
    if (params.oobCode) {
      await confirmPasswordReset(auth, params.oobCode, params.newPassword);
      return;
    }
    if (!auth.currentUser) {
      throw new Error("Open a fresh password reset link from your email to update your password.");
    }
    await updatePassword(auth.currentUser, params.newPassword);
  } catch (error) {
    throw new Error(mapFirebaseAuthError(error));
  }
}

export async function verifyEmailActionCode(oobCode: string): Promise<void> {
  const auth = await ensureAuthPersistence();
  try {
    await applyActionCode(auth, oobCode);
    if (auth.currentUser) {
      await auth.currentUser.reload();
      await syncServerSessionCookie(auth.currentUser, true);
      await resolveOrCreateUserProfileFromFirestore(auth.currentUser).catch(() => {});
    }
  } catch (error) {
    throw new Error(mapFirebaseAuthError(error));
  }
}

export async function resendVerificationForCurrentUser(): Promise<boolean> {
  const auth = getFirebaseAuth();
  if (!auth.currentUser) return false;
  try {
    await sendEmailVerification(auth.currentUser, {
      url: `${window.location.origin}/auth/login?verified=1`,
    });
    return true;
  } catch (error) {
    throw new Error(mapFirebaseAuthError(error));
  }
}

export async function logoutStudent(): Promise<void> {
  const auth = getFirebaseAuth();
  clearClientUserCaches();
  await signOut(auth);
  await syncServerSessionCookie(null);
}

export async function saveStudentDisplayNameClient(fullName: string): Promise<void> {
  const auth = getFirebaseAuth();
  const user = auth.currentUser;
  if (!user) return;
  const trimmed = fullName.trim();
  await updateProfile(user, { displayName: trimmed });
  if (!user.emailVerified) return;

  try {
    const db = getFirebaseDb();
    const userRef = doc(db, "users", user.uid);
    const snap = await getDoc(userRef);

    if (snap.exists()) {
      await setDoc(
        userRef,
        {
          displayName: trimmed,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
    } else {
      await setDoc(userRef, {
        uid: user.uid,
        displayName: trimmed,
        role: "student",
        cohort: "Registered Learner",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    if (error instanceof Error && error.message.toLowerCase().includes("permission")) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`, authInfoFromUser(user));
    }
  }
}

export async function saveStudentAvatarClient(avatarUrl: string): Promise<void> {
  const auth = getFirebaseAuth();
  const user = auth.currentUser;
  const trimmed = avatarUrl.trim().slice(0, 512);
  if (!user || !trimmed.startsWith("https://")) return;

  await updateProfile(user, { photoURL: trimmed }).catch(() => {});
  if (!user.emailVerified || !user.email) return;

  const path = `users/${user.uid}/private/info`;
  try {
    const db = getFirebaseDb();
    const privateRef = doc(db, "users", user.uid, "private", "info");
    const snap = await getDoc(privateRef);
    if (snap.exists()) {
      await setDoc(
        privateRef,
        {
          avatarUrl: trimmed,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
    } else {
      await setDoc(privateRef, {
        uid: user.uid,
        email: user.email.trim().toLowerCase(),
        emailVerified: user.emailVerified,
        authProvider: user.providerData[0]?.providerId ?? "password",
        avatarUrl: trimmed,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    if (error instanceof Error && error.message.toLowerCase().includes("permission")) {
      handleFirestoreError(error, OperationType.WRITE, path, authInfoFromUser(user));
    }
  }
}
