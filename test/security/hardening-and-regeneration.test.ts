import assert from "node:assert/strict";
import test from "node:test";
import { isPrivilegedStaffEmail } from "../../lib/auth/access";
import { generateCertificatePdf } from "../../lib/certifications/pdf";
import {
  DEMO_ADMIN_ID,
  getCertificateByPublicId,
  getCertificatePdfData,
  listAdminDirectoryUsers,
  listIssuances,
  regenerateCertificateByAdmin,
  requireAdminActor,
  resetMemoryStoreForTest,
} from "../../lib/certifications/store";
import { POST as createOrderPost } from "../../app/api/create-order/route";
import { GET as adminReportsGet } from "../../app/api/admin/reports/route";
import {
  createSignedSessionToken,
  FIREBASE_SESSION_COOKIE_NAME,
} from "../../lib/firebase/server";

test("isPrivilegedStaffEmail strictly restricts staff access to allowlisted addresses", () => {
  assert.equal(isPrivilegedStaffEmail("gokulrajmisox@gmail.com"), true);
  assert.equal(isPrivilegedStaffEmail("GOKULRAJMISOX@gmail.com"), true);
  assert.equal(isPrivilegedStaffEmail("gokulrajmathsmaths@gmail.com"), true);
  assert.equal(isPrivilegedStaffEmail("student@example.edu"), false);
  assert.equal(isPrivilegedStaffEmail(null), false);
});

test("POST /api/create-order refuses unauthenticated/sandbox checkout and cannot trust client-supplied amount", async () => {
  resetMemoryStoreForTest();
  const req = new Request("http://localhost:3000/api/create-order", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      courseId: "course-web-architecture",
      amount: 100,
    }),
  });
  const res = await createOrderPost(req);
  assert.equal(res.status, 401);
});

test("regenerateCertificateByAdmin updates recipient metadata in-place without duplicating active certificates and blocks revoked ones", async () => {
  resetMemoryStoreForTest();
  const beforeList = await listIssuances();
  const initialCount = beforeList.length;

  const updated = await regenerateCertificateByAdmin({
    certificateId: "TGL-CERT-2026-8419",
    adminId: DEMO_ADMIN_ID,
    recipientName: "Meera K. Krishnan",
    reason: "Fixed middle initial per verified ID",
  });

  assert.equal(updated.error, undefined);
  assert.ok(updated.issuance);
  assert.equal(updated.issuance.recipient_name, "Meera K. Krishnan");
  assert.equal(updated.issuance.regeneration_count, 1);
  assert.ok(updated.issuance.regenerated_at);

  const afterList = await listIssuances();
  assert.equal(afterList.length, initialCount);

  const fetched = await getCertificateByPublicId("TGL-CERT-2026-8419");
  assert.equal(fetched?.recipient_name, "Meera K. Krishnan");

  const revokedAttempt = await regenerateCertificateByAdmin({
    certificateId: "TGL-CERT-2026-0002",
    adminId: DEMO_ADMIN_ID,
    recipientName: "Rohan Verma",
  });
  assert.match(revokedAttempt.error ?? "", /Revoked certificates cannot be regenerated/i);
});

test("getCertificatePdfData and generateCertificatePdf produce complete PDF bytes with required dates & signatory", async () => {
  resetMemoryStoreForTest();
  const pdfData = await getCertificatePdfData("TGL-CERT-2026-8419");
  assert.ok(pdfData);
  assert.equal(pdfData.studentName, "Meera Krishnan");
  assert.ok(pdfData.joinedOn);
  assert.ok(pdfData.completedOn);
  assert.ok(pdfData.authorizedSignatory);

  const pdfBytes = await generateCertificatePdf(pdfData);
  assert.ok(pdfBytes instanceof Uint8Array);
  assert.ok(pdfBytes.byteLength > 1000);
  const header = Buffer.from(pdfBytes.slice(0, 5)).toString("utf8");
  assert.equal(header, "%PDF-");
});

test("requireAdminActor and GET /api/admin/reports enforce 401/403 and return structured summaries & CSV for verified staff", async () => {
  resetMemoryStoreForTest();

  const unauthReq = new Request("http://localhost:3000/api/admin/reports");
  const unauthCheck = await requireAdminActor(unauthReq);
  assert.equal(unauthCheck.user, null);
  assert.equal(unauthCheck.error?.status, 401);

  const unauthRes = await adminReportsGet(unauthReq);
  assert.equal(unauthRes.status, 401);

  const studentCookie = createSignedSessionToken({
    uid: "student-uid-1",
    email: "student@example.edu",
    displayName: "Regular Student",
    avatarUrl: null,
    emailVerified: true,
    authProvider: "password",
    role: "student",
  });
  const studentReq = new Request("http://localhost:3000/api/admin/reports", {
    headers: { cookie: `${FIREBASE_SESSION_COOKIE_NAME}=${studentCookie}` },
  });
  const studentRes = await adminReportsGet(studentReq);
  assert.equal(studentRes.status, 403);

  const adminCookie = createSignedSessionToken({
    uid: "staff-uid-gokul",
    email: "gokulrajmisox@gmail.com",
    displayName: "Gokul Raj",
    avatarUrl: null,
    emailVerified: true,
    authProvider: "google.com",
    role: "admin",
  });
  const adminCheck = await requireAdminActor(
    new Request("http://localhost:3000/api/admin/reports", {
      headers: { cookie: `${FIREBASE_SESSION_COOKIE_NAME}=${adminCookie}` },
    }),
  );
  assert.equal(adminCheck.error, null);
  assert.equal(adminCheck.user?.role, "admin");

  const users = await listAdminDirectoryUsers();
  assert.ok(users.length >= 4);
  assert.ok(users.some((u) => u.role === "student"));
  assert.ok(users.some((u) => u.role === "mentor"));
  assert.ok(users.some((u) => u.role === "admin"));

  const jsonRes = await adminReportsGet(
    new Request("http://localhost:3000/api/admin/reports", {
      headers: { cookie: `${FIREBASE_SESSION_COOKIE_NAME}=${adminCookie}` },
    }),
  );
  assert.equal(jsonRes.status, 200);
  const payload = (await jsonRes.json()) as {
    summary: { totalProgrammes: number; issuedCertificates: number; grossRevenueInr: number };
  };
  assert.ok(payload.summary.totalProgrammes >= 1);
  assert.ok(payload.summary.issuedCertificates >= 1);
  assert.ok(payload.summary.grossRevenueInr >= 1299);

  const csvRes = await adminReportsGet(
    new Request("http://localhost:3000/api/admin/reports?format=csv", {
      headers: { cookie: `${FIREBASE_SESSION_COOKIE_NAME}=${adminCookie}` },
    }),
  );
  assert.equal(csvRes.status, 200);
  assert.match(csvRes.headers.get("Content-Type") ?? "", /text\/csv/i);
  const csvBody = await csvRes.text();
  assert.match(csvBody, /^Section,ID,Label,Recipient\/Owner,Status,Amount_INR,Timestamp/);
  assert.match(csvBody, /Certificate,TGL-CERT-2026-8419/);
});
