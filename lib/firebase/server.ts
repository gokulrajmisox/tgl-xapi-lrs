import { createHmac, createVerify, timingSafeEqual } from "node:crypto";
import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getStorage, type Storage } from "firebase-admin/storage";
import { cookies, headers } from "next/headers";
import { isPrivilegedStaffEmail } from "@/lib/auth/access";
import { firebaseConfig, isFirebaseAuthConfigured } from "./config";

export { isFirebaseAuthConfigured };
export const DEMO_STUDENT_ID = "00000000-0000-4000-8000-000000000101";
export const FIREBASE_SESSION_COOKIE_NAME = "tgl_fb_session";

export type VerifiedFirebaseActor = {
  uid: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  emailVerified: boolean;
  authProvider: string;
  role: "student" | "admin";
};

function parseServiceAccountCredentials():
  | { projectId: string; clientEmail: string; privateKey: string }
  | null {
  const rawJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (rawJson) {
    try {
      const parsed = JSON.parse(rawJson) as {
        project_id?: string;
        client_email?: string;
        private_key?: string;
      };
      if (parsed.client_email && parsed.private_key) {
        return {
          projectId: parsed.project_id || firebaseConfig.projectId,
          clientEmail: parsed.client_email,
          privateKey: parsed.private_key.replace(/\\n/g, "\n"),
        };
      }
    } catch {
      // Ignore malformed JSON and check split env vars
    }
  }

  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.trim();
  if (clientEmail && privateKey) {
    return {
      projectId: firebaseConfig.projectId,
      clientEmail,
      privateKey: privateKey.replace(/\\n/g, "\n"),
    };
  }

  return null;
}

export function isFirebaseAdminConfigured(): boolean {
  return Boolean(
    parseServiceAccountCredentials() ||
      process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim() ||
      process.env.FIRESTORE_EMULATOR_HOST?.trim(),
  );
}

/**
 * Reports whether an external Firebase Admin Firestore connection is active
 * in the server runtime (used by server stores so hermetic preview/tests never stall).
 */
export function isFirestoreConfigured(): boolean {
  return isFirebaseAdminConfigured();
}

let cachedAdminApp: App | null = null;
let cachedAdminDb: Firestore | null = null;
let cachedAdminAuth: Auth | null = null;
let cachedAdminStorage: Storage | null = null;

export function getFirebaseAdminApp(): App | null {
  if (!isFirebaseAdminConfigured()) return null;
  if (cachedAdminApp) return cachedAdminApp;

  const existing = getApps()[0];
  if (existing) {
    cachedAdminApp = existing;
    return cachedAdminApp;
  }

  const creds = parseServiceAccountCredentials();
  cachedAdminApp = initializeApp(
    creds
      ? {
          credential: cert(creds),
          projectId: creds.projectId,
          storageBucket: firebaseConfig.storageBucket,
        }
      : {
          projectId: firebaseConfig.projectId,
          storageBucket: firebaseConfig.storageBucket,
        },
  );
  return cachedAdminApp;
}

export function getAdminFirestore(): Firestore | null {
  if (cachedAdminDb) return cachedAdminDb;
  const app = getFirebaseAdminApp();
  if (!app) return null;
  cachedAdminDb = getFirestore(app, firebaseConfig.firestoreDatabaseId);
  return cachedAdminDb;
}

export function getAdminAuth(): Auth | null {
  if (cachedAdminAuth) return cachedAdminAuth;
  const app = getFirebaseAdminApp();
  if (!app) return null;
  cachedAdminAuth = getAuth(app);
  return cachedAdminAuth;
}

export function getAdminStorage(): Storage | null {
  if (cachedAdminStorage) return cachedAdminStorage;
  const app = getFirebaseAdminApp();
  if (!app) return null;
  cachedAdminStorage = getStorage(app);
  return cachedAdminStorage;
}

let cachedPublicCerts: { certs: Record<string, string>; expiresAt: number } | null = null;

async function fetchGooglePublicCerts(): Promise<Record<string, string>> {
  if (cachedPublicCerts && Date.now() < cachedPublicCerts.expiresAt) {
    return cachedPublicCerts.certs;
  }
  const res = await fetch(
    "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com",
    { cache: "no-store" },
  );
  if (!res.ok) {
    throw new Error("Unable to fetch Firebase public verification certificates.");
  }
  const certs = (await res.json()) as Record<string, string>;
  cachedPublicCerts = {
    certs,
    expiresAt: Date.now() + 30 * 60 * 1000,
  };
  return certs;
}

function decodeBase64UrlJson<T>(segment: string): T | null {
  try {
    const padded = segment.replace(/-/g, "+").replace(/_/g, "/");
    const json = Buffer.from(padded, "base64").toString("utf8");
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

let cachedTokenVerifierApp: App | null = null;
let cachedTokenVerifierAuth: Auth | null = null;

function getTokenVerifierAuth(): Auth | null {
  const adminAuth = getAdminAuth();
  if (adminAuth) return adminAuth;
  if (!firebaseConfig.projectId || firebaseConfig.projectId.includes("remixed-project-id")) {
    return null;
  }
  if (cachedTokenVerifierAuth) return cachedTokenVerifierAuth;
  const existing = getApps().find((a) => a.name === "tgl-token-verifier");
  cachedTokenVerifierApp =
    existing ??
    initializeApp(
      {
        projectId: firebaseConfig.projectId,
        storageBucket: firebaseConfig.storageBucket,
      },
      "tgl-token-verifier",
    );
  cachedTokenVerifierAuth = getAuth(cachedTokenVerifierApp);
  return cachedTokenVerifierAuth;
}

export async function verifyFirebaseIdToken(
  idToken: string,
): Promise<VerifiedFirebaseActor | null> {
  if (!idToken || idToken.split(".").length !== 3) return null;

  const verifierAuth = getTokenVerifierAuth();
  if (verifierAuth) {
    try {
      const checkRevoked = isFirebaseAdminConfigured();
      const decoded = await verifierAuth.verifyIdToken(idToken, checkRevoked);
      const email = (decoded.email ?? "").trim().toLowerCase();
      const emailVerified = Boolean(decoded.email_verified);
      return {
        uid: decoded.uid,
        email,
        displayName:
          typeof decoded.name === "string" ? decoded.name.trim().slice(0, 120) : "",
        avatarUrl:
          typeof decoded.picture === "string" && decoded.picture.startsWith("https://")
            ? decoded.picture.slice(0, 512)
            : null,
        emailVerified,
        authProvider:
          typeof decoded.firebase?.sign_in_provider === "string"
            ? decoded.firebase.sign_in_provider
            : "firebase",
        role: emailVerified && isPrivilegedStaffEmail(email) ? "admin" : "student",
      };
    } catch {
      // Fall through to direct Google x509 public cert RS256 check
    }
  }

  // Fallback cryptographic RS256 verification against Google's Firebase securetoken x509 certs
  const parts = idToken.split(".");
  const header = decodeBase64UrlJson<{ alg?: string; kid?: string }>(parts[0]);
  const payload = decodeBase64UrlJson<{
    aud?: string;
    iss?: string;
    sub?: string;
    exp?: number;
    email?: string;
    email_verified?: boolean;
    name?: string;
    picture?: string;
    firebase?: { sign_in_provider?: string };
  }>(parts[1]);

  if (!header || !payload || header.alg !== "RS256" || !header.kid) return null;
  if (payload.aud !== firebaseConfig.projectId) return null;
  if (payload.iss !== `https://securetoken.google.com/${firebaseConfig.projectId}`) return null;
  if (!payload.sub || !payload.exp || payload.exp * 1000 <= Date.now()) return null;

  try {
    const certs = await fetchGooglePublicCerts();
    const pem = certs[header.kid];
    if (!pem) return null;

    const verifier = createVerify("RSA-SHA256");
    verifier.update(`${parts[0]}.${parts[1]}`);
    verifier.end();
    const signature = Buffer.from(
      parts[2].replace(/-/g, "+").replace(/_/g, "/"),
      "base64",
    );
    if (!verifier.verify(pem, signature)) return null;

    const email = (payload.email ?? "").trim().toLowerCase();
    const emailVerified = Boolean(payload.email_verified);
    return {
      uid: payload.sub,
      email,
      displayName: typeof payload.name === "string" ? payload.name.trim().slice(0, 120) : "",
      avatarUrl:
        typeof payload.picture === "string" && payload.picture.startsWith("https://")
          ? payload.picture.slice(0, 512)
          : null,
      emailVerified,
      authProvider: payload.firebase?.sign_in_provider ?? "firebase",
      role: emailVerified && isPrivilegedStaffEmail(email) ? "admin" : "student",
    };
  } catch {
    return null;
  }
}

function getSessionSecret(): string {
  return (
    process.env.FIREBASE_SESSION_SECRET?.trim() ||
    process.env.RAZORPAY_KEY_SECRET?.trim() ||
    `${firebaseConfig.projectId}:${firebaseConfig.appId}:session`
  );
}

export function createSignedSessionToken(
  actor: VerifiedFirebaseActor,
  ttlSeconds = 60 * 60 * 24 * 5,
): string {
  const payload = {
    ...actor,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  };
  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const sig = createHmac("sha256", getSessionSecret()).update(encoded).digest("base64url");
  return `${encoded}.${sig}`;
}

export function verifySignedSessionToken(token: string): VerifiedFirebaseActor | null {
  const [encoded, sig] = token.split(".");
  if (!encoded || !sig) return null;

  const expectedSig = createHmac("sha256", getSessionSecret())
    .update(encoded)
    .digest("base64url");

  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }

  const decoded = decodeBase64UrlJson<VerifiedFirebaseActor & { exp?: number }>(encoded);
  if (!decoded || !decoded.uid || !decoded.exp || decoded.exp * 1000 <= Date.now()) {
    return null;
  }

  return {
    uid: decoded.uid,
    email: (decoded.email ?? "").trim().toLowerCase(),
    displayName: (decoded.displayName ?? "").trim(),
    avatarUrl: decoded.avatarUrl ?? null,
    emailVerified: Boolean(decoded.emailVerified),
    authProvider: decoded.authProvider || "firebase",
    role:
      decoded.emailVerified && isPrivilegedStaffEmail(decoded.email)
        ? "admin"
        : "student",
  };
}

function readCookieFromHeader(
  cookieHeader: string | null | undefined,
  cookieName: string,
): string | null {
  if (!cookieHeader) return null;
  const parts = cookieHeader.split(";");
  for (const part of parts) {
    const idx = part.indexOf("=");
    if (idx <= 0) continue;
    const name = part.slice(0, idx).trim();
    if (name !== cookieName) continue;
    const rawVal = part.slice(idx + 1).trim();
    try {
      return decodeURIComponent(rawVal);
    } catch {
      return rawVal;
    }
  }
  return null;
}

export async function getAuthenticatedFirebaseActor(
  request?: Request,
): Promise<VerifiedFirebaseActor | null> {
  if (!isFirebaseAuthConfigured()) return null;

  try {
    let authHeader: string | null = null;
    let sessionCookie: string | null = null;

    if (request) {
      authHeader = request.headers.get("authorization");
      sessionCookie = readCookieFromHeader(
        request.headers.get("cookie"),
        FIREBASE_SESSION_COOKIE_NAME,
      );
    } else {
      const hdrs = await headers();
      authHeader = hdrs.get("authorization");
      const cookieStore = await cookies();
      sessionCookie = cookieStore.get(FIREBASE_SESSION_COOKIE_NAME)?.value ?? null;
    }

    if (authHeader?.startsWith("Bearer ")) {
      const bearer = authHeader.slice(7).trim();
      const verified = await verifyFirebaseIdToken(bearer);
      if (verified) return verified;
    }

    if (!sessionCookie) return null;
    return verifySignedSessionToken(sessionCookie);
  } catch {
    return null;
  }
}
