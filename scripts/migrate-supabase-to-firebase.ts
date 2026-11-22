/**
 * Idempotent batch migration script: Supabase JSON export -> Firebase Auth & Cloud Firestore.
 *
 * Usage:
 *   export FIREBASE_SERVICE_ACCOUNT_JSON='...'
 *   npx tsx scripts/migrate-supabase-to-firebase.ts --input=./supabase-export.json [--dry-run]
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { isPrivilegedStaffEmail } from "../lib/auth/access";
import { getAdminAuth, getAdminFirestore } from "../lib/firebase/server";
import {
  stripUndefinedForFirestore,
  verifyMigrationBundleIntegrity,
  type LegacyExportBundle,
} from "../lib/firebase/migration";

async function run() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const inputArg = args.find((a) => a.startsWith("--input="))?.split("=")[1];

  if (!inputArg) {
    console.error("Usage: npx tsx scripts/migrate-supabase-to-firebase.ts --input=./export.json [--dry-run]");
    process.exit(1);
  }

  const raw = readFileSync(resolve(process.cwd(), inputArg), "utf8");
  const bundle = JSON.parse(raw) as LegacyExportBundle;
  const integrity = verifyMigrationBundleIntegrity(bundle);

  console.log("Migration integrity check:", JSON.stringify(integrity, null, 2));
  if (!integrity.valid) {
    console.error("Integrity check failed. Resolve orphan references or missing recipient names first.");
    process.exit(1);
  }

  if (dryRun) {
    console.log("Dry run complete. No Firebase Auth or Firestore writes performed.");
    return;
  }

  const adminAuth = getAdminAuth();
  const db = getAdminFirestore();
  if (!adminAuth || !db) {
    console.error("FIREBASE_SERVICE_ACCOUNT_JSON must be set before writing to Firebase.");
    process.exit(1);
  }

  // 1. Import users into Firebase Authentication (Google users auto-link cleanly by email;
  //    legacy password users receive a password reset link on first sign-in or password import if bcrypt hash exported)
  for (const user of bundle.users ?? []) {
    const email = (user.email ?? "").trim().toLowerCase();
    const displayName = (user.display_name || user.full_name || "").trim();
    const isAdmin = Boolean(user.email_verified) && isPrivilegedStaffEmail(email);

    await adminAuth
      .importUsers([
        {
          uid: user.id,
          email: email || undefined,
          emailVerified: Boolean(user.email_verified),
          displayName: displayName || undefined,
          customClaims: { role: isAdmin ? "admin" : "student" },
        },
      ])
      .catch(() => {
        // User may already exist in Firebase Auth; keep Firestore write idempotent
      });

    const batch = db.batch();
    batch.set(
      db.collection("users").doc(user.id),
      stripUndefinedForFirestore({
        uid: user.id,
        displayName,
        role: isAdmin ? "admin" : "student",
        migratedFromSupabase: true,
        updatedAt: new Date().toISOString(),
      }),
      { merge: true },
    );
    batch.set(
      db.collection("users").doc(user.id).collection("private").doc("info"),
      stripUndefinedForFirestore({
        uid: user.id,
        email,
        emailVerified: Boolean(user.email_verified),
        authProvider: user.provider || "password",
        updatedAt: new Date().toISOString(),
      }),
      { merge: true },
    );
    if (isAdmin) {
      batch.set(db.collection("admins").doc(user.id), { uid: user.id, email, active: true }, { merge: true });
    }
    await batch.commit();
  }

  // 2. Write domain collections cleanly in batches <= 400
  const writeCollection = async (
    collectionName: string,
    rows: Array<Record<string, unknown>>,
    idResolver: (row: Record<string, unknown>) => string,
  ) => {
    for (let i = 0; i < rows.length; i += 400) {
      const batch = db.batch();
      for (const row of rows.slice(i, i + 400)) {
        const docId = idResolver(row);
        batch.set(
          db.collection(collectionName).doc(docId),
          stripUndefinedForFirestore(row),
          { merge: true },
        );
      }
      await batch.commit();
    }
  };

  await writeCollection("courses", bundle.courses ?? [], (r) => String(r.id));
  await writeCollection(
    "enrollments",
    bundle.enrollments ?? [],
    (r) => String(r.id || `${r.user_id}_${r.course_id}`),
  );
  await writeCollection("submissions", bundle.submissions ?? [], (r) => String(r.id));
  await writeCollection(
    "certificates",
    bundle.certificates ?? [],
    (r) => String(r.certificate_id),
  );
  await writeCollection("payment_orders", bundle.payment_orders ?? [], (r) => String(r.id));

  console.log("Firebase migration completed successfully.");
}

void run();
