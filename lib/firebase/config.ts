import appletConfig from "../../firebase-applet-config.json";

export type FirebaseClientConfig = {
  projectId: string;
  appId: string;
  apiKey: string;
  authDomain: string;
  firestoreDatabaseId: string;
  storageBucket: string;
  messagingSenderId: string;
  measurementId?: string;
  oAuthClientId?: string;
  recaptchaSiteKey?: string;
};

export const firebaseConfig: FirebaseClientConfig = {
  projectId:
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim() || appletConfig.projectId,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID?.trim() || appletConfig.appId,
  apiKey:
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.trim() || appletConfig.apiKey,
  authDomain:
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN?.trim() ||
    appletConfig.authDomain,
  firestoreDatabaseId:
    process.env.NEXT_PUBLIC_FIREBASE_FIRESTORE_DATABASE_ID?.trim() ||
    appletConfig.firestoreDatabaseId ||
    "(default)",
  storageBucket:
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET?.trim() ||
    appletConfig.storageBucket,
  messagingSenderId:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID?.trim() ||
    appletConfig.messagingSenderId,
  measurementId:
    process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID?.trim() ||
    appletConfig.measurementId ||
    "",
  oAuthClientId: appletConfig.oAuthClientId || "",
  recaptchaSiteKey:
    process.env.NEXT_PUBLIC_FIREBASE_RECAPTCHA_SITE_KEY?.trim() ||
    appletConfig.recaptchaSiteKey ||
    "",
};

export function isFirebaseClientConfigured(): boolean {
  return Boolean(
    firebaseConfig.apiKey &&
      firebaseConfig.authDomain &&
      firebaseConfig.projectId &&
      firebaseConfig.appId &&
      !firebaseConfig.projectId.includes("remixed-project-id"),
  );
}

/**
 * Reports whether Firebase Authentication is configured for this app
 * (distinct from server Admin SDK service-account credentials).
 */
export function isFirebaseAuthConfigured(): boolean {
  return isFirebaseClientConfigured();
}
