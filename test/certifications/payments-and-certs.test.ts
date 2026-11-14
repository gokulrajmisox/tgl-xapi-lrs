import assert from "node:assert/strict";
import test from "node:test";
import {
  formatInrFromPaise,
  validateProductPricePaise,
} from "../../lib/certifications/pricing";
import {
  canIssueCertificate,
  evaluateCertificateEligibility,
} from "../../lib/certifications/eligibility";
import { generateCertificateQrSvg } from "../../lib/certifications/qr";
import {
  computeSignatureForTest,
  computeWebhookSignatureForTest,
  verifyRazorpayPaymentSignature,
  verifyRazorpayWebhookSignature,
} from "../../lib/payments/razorpay";
import { dispatchLifecycleEmail } from "../../lib/email/provider";
import {
  claimIncludedCertificate,
  createCertificationOrder,
  createCourseEnrollmentOrder,
  DEMO_STUDENT_ID,
  getCertificateByPublicId,
  listEmailLogs,
  listProducts,
  listStudentApplications,
  processRazorpayWebhookEvent,
  recordFailedOrCancelledPayment,
  resetMemoryStoreForTest,
  revokeCertificateWithReason,
  verifyAndCaptureCheckoutPayment,
  type SandboxUser,
} from "../../lib/certifications/store";

const testStudent: SandboxUser = {
  id: DEMO_STUDENT_ID,
  email: "aarav.sharma@example.edu",
  name: "Aarav Sharma",
  role: "student",
  isSandbox: true,
};

const unapprovedStudent: SandboxUser = {
  id: "00000000-0000-4000-8000-000000000888",
  email: "rohan.test@example.edu",
  name: "Rohan Test",
  role: "student",
  isSandbox: true,
};

test("bundled model enforces ₹0 additional certificate fee and blocks separate certificate pricing", () => {
  assert.equal(validateProductPricePaise(0).valid, true);
  assert.equal(validateProductPricePaise(29900).valid, false);
  assert.equal(validateProductPricePaise(59900).valid, false);
  assert.equal(validateProductPricePaise(499.5).valid, false);
  assert.equal(formatInrFromPaise(49900), "₹499");
  assert.equal(formatInrFromPaise(0), "Included (₹0 extra)");
});

test("Razorpay payment signature and raw-body webhook HMAC verification", () => {
  const secret = "rzp_test_secret_123";
  const orderId = "order_test_001";
  const paymentId = "pay_test_001";
  const validSig = computeSignatureForTest(orderId, paymentId, secret);

  assert.equal(
    verifyRazorpayPaymentSignature({
      orderId,
      paymentId,
      signature: validSig,
      secretOverride: secret,
    }),
    true,
  );
  assert.equal(
    verifyRazorpayPaymentSignature({
      orderId,
      paymentId,
      signature: "tampered_signature",
      secretOverride: secret,
    }),
    false,
  );

  const webhookSecret = "whsec_test_999";
  const rawBody = JSON.stringify({ event: "payment.captured", payload: { payment: { entity: { id: paymentId, order_id: orderId } } } });
  const whSig = computeWebhookSignatureForTest(rawBody, webhookSecret);

  assert.equal(
    verifyRazorpayWebhookSignature({
      rawBody,
      signature: whSig,
      webhookSecretOverride: webhookSecret,
    }),
    true,
  );
  assert.equal(
    verifyRazorpayWebhookSignature({
      rawBody: `${rawBody} `,
      signature: whSig,
      webhookSecretOverride: webhookSecret,
    }),
    false,
  );
});

test("retires separate certificate checkout (400) and blocks certificate claim/issuance without completion + mentor approval", async () => {
  resetMemoryStoreForTest();
  const products = await listProducts();
  const internshipProduct = products.find((p) => p.certificate_type === "internship")!;

  const retiredOrder = await createCertificationOrder({
    user: testStudent,
    productId: internshipProduct.id,
  });
  assert.equal(retiredOrder.status, 400);
  assert.match(retiredOrder.error ?? "", /included at ₹0 extra/i);

  const blockedClaim = await claimIncludedCertificate({
    user: unapprovedStudent,
  });
  assert.equal(blockedClaim.status, 403);
  assert.match(blockedClaim.error ?? "", /Complete your programme/i);

  const ineligibleEval = evaluateCertificateEligibility({
    certificateType: "internship",
    rules: { requiresInternshipCompletion: true, requiresSubmission: true, requiresMentorApproval: true },
    internshipCompleted: false,
    pathwayCompleted: false,
    submissionProvided: false,
    assessmentPassed: false,
    mentorApproved: false,
    adminDistinctionApproved: false,
  });
  const gate = canIssueCertificate({
    productEnabled: true,
    pricePaise: 0,
    eligibility: ineligibleEval,
    paymentStatus: "captured",
    paymentVerified: true,
  });
  assert.equal(gate.allowed, false);
  assert.match(gate.reason ?? "", /never issues a certificate/i);
});

test("eligible student claims included ₹0 certificate, generates QR, prevents duplicate issuance, and reflects revocation immediately", async () => {
  resetMemoryStoreForTest();

  const claimed = await claimIncludedCertificate({
    user: testStudent,
  });
  assert.ok(claimed.issuance);
  assert.equal(claimed.issuance.issuance_status, "issued");

  // QR generation + Public verification
  const qrSvg = await generateCertificateQrSvg(
    `https://touchgrasslater.org/verify/certificate/${claimed.issuance.certificate_id}`,
  );
  assert.match(qrSvg, /<svg/);

  const verifiedCert = await getCertificateByPublicId(claimed.issuance.certificate_id);
  assert.ok(verifiedCert);
  assert.equal(verifiedCert.issuance_status, "issued");

  // Prevent duplicate certificate issuance for the same student/internship
  const duplicateClaim = await claimIncludedCertificate({
    user: testStudent,
  });
  assert.equal(duplicateClaim.status, 409);
  assert.match(duplicateClaim.error ?? "", /Duplicate issuance is not permitted/i);

  // Revocation with audit reason reflects immediately in verification lookup
  const revoked = await revokeCertificateWithReason({
    certificateId: claimed.issuance.certificate_id,
    reason: "Audit check test revocation",
  });
  assert.equal(revoked.issuance?.issuance_status, "revoked");
  const afterRevoke = await getCertificateByPublicId(claimed.issuance.certificate_id);
  assert.equal(afterRevoke?.issuance_status, "revoked");
  assert.equal(afterRevoke?.revocation_reason, "Audit check test revocation");
});

test("handles failed and cancelled programme payments and logs lifecycle notifications", async () => {
  resetMemoryStoreForTest();

  const order1 = await createCourseEnrollmentOrder({
    user: testStudent,
    courseId: "course-web-architecture",
  });
  assert.ok(order1.order);
  const failedRes = await recordFailedOrCancelledPayment({
    user: testStudent,
    razorpayOrderId: order1.order.razorpay_order_id,
    status: "failed",
    reason: "Bank declined test card",
  });
  assert.equal(failedRes.order?.order_status, "failed");

  const order2 = await createCourseEnrollmentOrder({
    user: testStudent,
    courseId: "course-web-architecture",
  });
  assert.ok(order2.order);
  const cancelledRes = await recordFailedOrCancelledPayment({
    user: testStudent,
    razorpayOrderId: order2.order.razorpay_order_id,
    status: "cancelled",
    reason: "Student closed Razorpay checkout",
  });
  assert.equal(cancelledRes.order?.order_status, "cancelled");

  const logs = await listEmailLogs();
  assert.ok(logs.some((log) => log.template_key === "payment_failed"));
});

test("processes programme webhook idempotently, auto-activates linked internship, and rejects replayed events", async () => {
  resetMemoryStoreForTest();
  const orderRes = await createCourseEnrollmentOrder({
    user: unapprovedStudent,
    courseId: "course-web-architecture",
  });
  assert.ok(orderRes.order);
  assert.equal(orderRes.order.order_kind, "programme_enrollment");

  const whSecret = "whsec_unit_test_secret";
  const payload = JSON.stringify({
    event: "payment.captured",
    payload: {
      payment: {
        entity: {
          id: "pay_wh_captured_101",
          order_id: orderRes.order.razorpay_order_id,
          method: "upi",
        },
      },
    },
  });
  const sig = computeWebhookSignatureForTest(payload, whSecret);

  const first = await processRazorpayWebhookEvent({
    rawBody: payload,
    signature: sig,
    eventIdHeader: "evt_unique_101",
    webhookSecretOverride: whSecret,
  });
  assert.equal(first.status, 200);
  assert.equal(first.processingStatus, "processed");

  const appsAfterCapture = await listStudentApplications(unapprovedStudent.id);
  assert.ok(
    appsAfterCapture.some((a) => a.status === "in_progress"),
    "Linked internship should auto-activate upon verified programme payment capture",
  );

  const replay = await processRazorpayWebhookEvent({
    rawBody: payload,
    signature: sig,
    eventIdHeader: "evt_unique_101",
    webhookSecretOverride: whSecret,
  });
  assert.equal(replay.status, 200);
  assert.equal(replay.processingStatus, "ignored_duplicate");
});

test("email system applies TEST label, suppresses simulated live payment dispatch, and logs provider failures with retry", async () => {
  const testSend = await dispatchLifecycleEmail({
    recipientEmail: "student@example.edu",
    templateKey: "internship_eligibility_confirmed",
    variables: {
      studentName: "Aarav Sharma",
      achievementTitle: "Full-Stack Product Engineering Internship",
    },
    transportOverride: async () => ({ messageId: "msg_test_123" }),
  });
  assert.equal(testSend.record.is_test, true);
  assert.equal(testSend.record.delivery_status, "sent");
  assert.match(testSend.record.subject, /^\[TEST\]/);

  const simulatedPaymentEmail = await dispatchLifecycleEmail({
    recipientEmail: "student@example.edu",
    templateKey: "payment_success",
    variables: {
      studentName: "Aarav Sharma",
      certificateName: "Internship Certificate",
      amountFormatted: "₹499",
      paymentId: "pay_sim_1",
      orderId: "order_sim_1",
    },
    isSimulatedTransaction: true,
  });
  assert.equal(simulatedPaymentEmail.record.delivery_status, "simulated_test");
  assert.match(simulatedPaymentEmail.rendered.html, /Simulated sandbox transaction/i);

  const failedSend = await dispatchLifecycleEmail({
    recipientEmail: "student@example.edu",
    templateKey: "certificate_issued",
    variables: {
      studentName: "Aarav Sharma",
      certificateName: "Internship Certificate",
      achievementTitle: "Full-Stack Product Engineering Internship",
      certificateId: "TGL-CERT-2026-8419",
      verificationUrl: "https://touchgrasslater.org/verify/certificate/TGL-CERT-2026-8419",
    },
    forceFailure: true,
    maxRetries: 2,
  });
  assert.equal(failedSend.record.delivery_status, "failed");
  assert.equal(failedSend.record.attempt_count, 2);
  assert.match(failedSend.record.error_message ?? "", /Simulated email provider failure/);
});
