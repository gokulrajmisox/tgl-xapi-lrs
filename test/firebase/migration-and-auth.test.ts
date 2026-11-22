import assert from "node:assert/strict";
import test from "node:test";
import { deriveStudentProfileSeed } from "../../lib/auth/profile-sync";
import {
  listAdminDirectoryUsers,
  requireAdminActor,
  resetMemoryStoreForTest,
  resolveCurrentActor,
} from "../../lib/certifications/store";
import {
  stripUndefinedForFirestore,
  SUPABASE_TO_FIRESTORE_TABLE_MAP,
  verifyMigrationBundleIntegrity,
} from "../../lib/firebase/migration";
import {
  createSignedSessionToken,
  FIREBASE_SESSION_COOKIE_NAME,
  verifySignedSessionToken,
  type VerifiedFirebaseActor,
} from "../../lib/firebase/server";
import { GET as sessionGet } from "../../app/api/auth/session/route";
import { GET as learnerGet } from "../../app/api/workspace/learner/route";
import { GET as profileGet } from "../../app/api/profile/route";
import { GET as mentorGet } from "../../app/api/workspace/mentor/route";
import {
  GET as adminCoursesGet,
  POST as adminCoursesPost,
} from "../../app/api/admin/courses/route";

test("signed Firebase session token roundtrips and rejects tampering or expiration", () => {
  const actor: VerifiedFirebaseActor = {
    uid: "fb-user-123",
    email: "gokulrajmisox@gmail.com",
    displayName: "Gokul Raj",
    avatarUrl: null,
    emailVerified: true,
    authProvider: "google.com",
    role: "admin",
  };

  const token = createSignedSessionToken(actor, 300);
  const verified = verifySignedSessionToken(token);
  assert.ok(verified);
  assert.equal(verified?.uid, "fb-user-123");
  assert.equal(verified?.role, "admin");

  // Tamper payload section
  const [payloadPart, sigPart] = token.split(".");
  const tamperedPayload = Buffer.from(
    JSON.stringify({ ...actor, role: "admin", email: "attacker@example.com", exp: Math.floor(Date.now() / 1000) + 300 }),
    "utf8",
  ).toString("base64url");
  assert.notEqual(tamperedPayload, payloadPart);
  assert.equal(verifySignedSessionToken(`${tamperedPayload}.${sigPart}`), null);

  // Expired token rejected
  const expired = createSignedSessionToken(actor, -10);
  assert.equal(verifySignedSessionToken(expired), null);
});

test("student profile seed and directory users never derive full name from email prefix", async () => {
  resetMemoryStoreForTest();
  const seed = deriveStudentProfileSeed({
    id: "uid-no-name",
    email: "ananya.verma99@example.edu",
    displayName: "",
    emailVerified: true,
  });
  assert.equal(seed.fullName, "");

  const users = await listAdminDirectoryUsers();
  for (const user of users) {
    assert.ok(!user.name.includes("@"), "name must never equal raw email");
  }
});

test("migration schema map and bundle integrity validator detect orphans and clean undefined", () => {
  assert.ok(SUPABASE_TO_FIRESTORE_TABLE_MAP.length >= 15);

  const validReport = verifyMigrationBundleIntegrity({
    users: [{ id: "u1", email: "student@example.edu", display_name: "Aarav Sharma" }],
    courses: [{ id: "c1", slug: "web-arch", title: "Web Arch" }],
    enrollments: [{ id: "u1_c1", user_id: "u1", course_id: "c1" }],
    submissions: [{ id: "s1", user_id: "u1" }],
    certificates: [{ certificate_id: "TGL-CERT-1", user_id: "u1", recipient_name: "Aarav Sharma" }],
    payment_orders: [{ id: "order_1", user_id: "u1" }],
  });
  assert.equal(validReport.valid, true);

  const invalidReport = verifyMigrationBundleIntegrity({
    users: [{ id: "u1", email: "student@example.edu" }],
    courses: [{ id: "c1", slug: "web-arch", title: "Web Arch" }],
    enrollments: [{ id: "bad", user_id: "missing", course_id: "c1" }],
    submissions: [{ id: "s1", user_id: "missing" }],
    certificates: [{ certificate_id: "TGL-CERT-BAD", user_id: "u1", recipient_name: "a@b.com" }],
  });
  assert.equal(invalidReport.valid, false);
  assert.deepEqual(invalidReport.orphanEnrollments, ["bad"]);
  assert.deepEqual(invalidReport.orphanSubmissions, ["s1"]);
  assert.deepEqual(invalidReport.missingCertificateNames, ["TGL-CERT-BAD"]);

  const cleaned = stripUndefinedForFirestore({ a: 1, b: undefined, nested: { c: "ok", d: undefined } });
  assert.deepEqual(cleaned, { a: 1, nested: { c: "ok" } });
});

test("resolveCurrentActor never auto-logs in any demo user when unauthenticated", async () => {
  resetMemoryStoreForTest();
  const req = new Request("http://localhost:3000/learn");
  const { user, configured } = await resolveCurrentActor({ request: req, allowSandboxAdmin: true });
  assert.equal(configured, true);
  assert.equal(user, null);
});

test("allowlisted staff requires emailVerified=true and restricts access strictly to the two allowlisted emails", async () => {
  resetMemoryStoreForTest();

  const unverifiedStaffToken = createSignedSessionToken({
    uid: "unverified-gokul",
    email: "gokulrajmisox@gmail.com",
    displayName: "Gokul Raj",
    avatarUrl: null,
    emailVerified: false,
    authProvider: "password",
    role: "admin",
  });
  const unverifiedReq = new Request("http://localhost:3000/mentor", {
    headers: { cookie: `${FIREBASE_SESSION_COOKIE_NAME}=${unverifiedStaffToken}` },
  });
  const unverifiedActor = await resolveCurrentActor({ request: unverifiedReq });
  assert.equal(unverifiedActor.user?.role, "student");

  const unverifiedAdminCheck = await requireAdminActor(unverifiedReq);
  assert.equal(unverifiedAdminCheck.user, null);
  assert.equal(unverifiedAdminCheck.error?.status, 403);

  for (const allowedEmail of ["gokulrajmisox@gmail.com", "gokulrajmathsmaths@gmail.com"]) {
    const validStaffToken = createSignedSessionToken({
      uid: `staff-${allowedEmail}`,
      email: allowedEmail,
      displayName: "Gokul Raj",
      avatarUrl: null,
      emailVerified: true,
      authProvider: "google.com",
      role: "admin",
    });
    const staffReq = new Request("http://localhost:3000/admin", {
      headers: { cookie: `${FIREBASE_SESSION_COOKIE_NAME}=${validStaffToken}` },
    });
    const staffCheck = await requireAdminActor(staffReq);
    assert.equal(staffCheck.error, null);
    assert.equal(staffCheck.user?.role, "admin");
    assert.equal(staffCheck.user?.email, allowedEmail);
  }
});

test("GET /api/auth/session validates cookies, clears forged cookies, and returns no-store state", async () => {
  const unauthRes = await sessionGet(new Request("http://localhost:3000/api/auth/session"));
  assert.equal(unauthRes.status, 200);
  assert.equal(unauthRes.headers.get("Cache-Control"), "no-store");
  assert.deepEqual(await unauthRes.json(), { authenticated: false, user: null });

  const forgedRes = await sessionGet(
    new Request("http://localhost:3000/api/auth/session", {
      headers: { cookie: `${FIREBASE_SESSION_COOKIE_NAME}=forged.invalid.token` },
    }),
  );
  assert.equal(forgedRes.status, 200);
  assert.deepEqual(await forgedRes.json(), { authenticated: false, user: null });
  const setCookie = forgedRes.headers.get("set-cookie") ?? "";
  assert.match(setCookie, /tgl_fb_session=;/);
  assert.match(setCookie, /Max-Age=0/i);

  const validToken = createSignedSessionToken({
    uid: "learner-uid-42",
    email: "learner@example.edu",
    displayName: "Maya Lin",
    avatarUrl: null,
    emailVerified: true,
    authProvider: "password",
    role: "student",
  });
  const validRes = await sessionGet(
    new Request("http://localhost:3000/api/auth/session", {
      headers: { cookie: `${FIREBASE_SESSION_COOKIE_NAME}=${validToken}` },
    }),
  );
  assert.equal(validRes.status, 200);
  const validPayload = (await validRes.json()) as {
    authenticated: boolean;
    user: { id: string; email: string; role: string } | null;
  };
  assert.equal(validPayload.authenticated, true);
  assert.equal(validPayload.user?.id, "learner-uid-42");
  assert.equal(validPayload.user?.email, "learner@example.edu");
  assert.equal(validPayload.user?.role, "student");
});

test("protected learner, profile, mentor, and admin API routes reject unauthenticated (401) and non-staff (403) requests", async () => {
  const learnerUnauth = await learnerGet(new Request("http://localhost:3000/api/workspace/learner"));
  assert.equal(learnerUnauth.status, 401);

  const profileUnauth = await profileGet(new Request("http://localhost:3000/api/profile"));
  assert.equal(profileUnauth.status, 401);

  const mentorUnauth = await mentorGet(new Request("http://localhost:3000/api/workspace/mentor"));
  assert.equal(mentorUnauth.status, 401);

  const adminCoursesUnauth = await adminCoursesGet(
    new Request("http://localhost:3000/api/admin/courses?courseId=course-web-architecture"),
  );
  assert.equal(adminCoursesUnauth.status, 401);

  const adminCoursesPostUnauth = await adminCoursesPost(
    new Request("http://localhost:3000/api/admin/courses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "publish", courseId: "course-web-architecture" }),
    }),
  );
  assert.equal(adminCoursesPostUnauth.status, 401);

  const studentCookie = createSignedSessionToken({
    uid: "student-999",
    email: "notstaff@example.edu",
    displayName: "Regular Learner",
    avatarUrl: null,
    emailVerified: true,
    authProvider: "password",
    role: "student",
  });
  const studentHeaders = { cookie: `${FIREBASE_SESSION_COOKIE_NAME}=${studentCookie}` };

  const mentorForbidden = await mentorGet(
    new Request("http://localhost:3000/api/workspace/mentor", { headers: studentHeaders }),
  );
  assert.equal(mentorForbidden.status, 403);

  const adminCoursesForbidden = await adminCoursesGet(
    new Request("http://localhost:3000/api/admin/courses?courseId=course-web-architecture", {
      headers: studentHeaders,
    }),
  );
  assert.equal(adminCoursesForbidden.status, 403);
});
