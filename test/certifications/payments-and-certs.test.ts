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
  createCertificationOrder,
  DEMO_STUDENT_ID,
  getCertificateByPublicId,
  listEmailLogs,
  listProducts,
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

test("pricing bounds enforce ₹299–₹599 INR in integer paise or free (0)", () => {
  assert.equal(validateProductPricePaise(0).valid, true);
  assert.equal(validateProductPricePaise(29900).valid, true);
  assert.equal(validateProductPricePaise(59900).valid, true);
  assert.equal(validateProductPricePaise(29899).valid, false);
  assert.equal(validateProductPricePaise(60000).valid, false);
  assert.equal(validateProductPricePaise(499.5).valid, false);
  assert.equal(formatInrFromPaise(49900), "₹499");
  assert.equal(formatInrFromPaise(0), "Free");
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

test("blocks payment without eligibility and prevents payment-only issuance", async () => {
  resetMemoryStoreForTest();
  const products = await listProducts();
  const specialProduct = products.find((p) => p.certificate_type === "special_achievement")!;

  const orderResult = await createCertificationOrder({
    user: testStudent,
    productId: specialProduct.id,
  });
  assert.equal(orderResult.status, 403);
  assert.match(orderResult.error ?? "", /Not eligible/i);

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
    pricePaise: 49900,
    eligibility: ineligibleEval,
    paymentStatus: "captured",
    paymentVerified: true,
  });
  assert.equal(gate.allowed, false);
  assert.match(gate.reason ?? "", /Payment alone never issues a certificate/i);
});

test("eligible student completes payment, verifies signature, issues certificate, generates QR, and prevents duplicate issuance", async () => {
  resetMemoryStoreForTest();
  const products = await listProducts();
  const internshipCert = products.find((p) => p.certificate_type === "internship")!;

  const orderRes = await createCertificationOrder({
    user: testStudent,
    productId: internshipCert.id,
  });
  assert.ok(orderRes.order);
  assert.equal(orderRes.order.amount_paise, 49900);

  // Reject invalid signature first
  const invalidVerify = await verifyAndCaptureCheckoutPayment({
    user: testStudent,
    razorpayOrderId: orderRes.order.razorpay_order_id,
    razorpayPaymentId: "pay_sim_invalid_attempt",
    razorpaySignature: "invalid_signature",
    simulateTestCheckout: true,
  });
  assert.equal(invalidVerify.status, 400);
  assert.equal(invalidVerify.issuance, undefined);

  // Valid signature succeeds and issues certificate
  const validVerify = await verifyAndCaptureCheckoutPayment({
    user: testStudent,
    razorpayOrderId: orderRes.order.razorpay_order_id,
    razorpayPaymentId: "pay_sim_valid_001",
    razorpaySignature: `sim_sig_${orderRes.order.razorpay_order_id}`,
    simulateTestCheckout: true,
  });
  assert.ok(validVerify.payment);
  assert.equal(validVerify.payment.payment_status, "captured");
  assert.ok(validVerify.issuance);
  assert.equal(validVerify.issuance.issuance_status, "issued");

  // QR generation + Public verification
  const qrSvg = await generateCertificateQrSvg(
    `https://touchgrasslater.org/verify/certificate/${validVerify.issuance.certificate_id}`,
  );
  assert.match(qrSvg, /<svg/);

  const verifiedCert = await getCertificateByPublicId(validVerify.issuance.certificate_id);
  assert.ok(verifiedCert);
  assert.equal(verifiedCert.issuance_status, "issued");

  // Prevent duplicate certificate issuance for the same user + product
  const duplicateOrderAttempt = await createCertificationOrder({
    user: testStudent,
    productId: internshipCert.id,
  });
  assert.equal(duplicateOrderAttempt.status, 409);
  assert.match(duplicateOrderAttempt.error ?? "", /Duplicate issuance is not permitted/i);

  // Revocation with audit reason reflects immediately in verification lookup
  const revoked = await revokeCertificateWithReason({
    certificateId: validVerify.issuance.certificate_id,
    reason: "Audit check test revocation",
  });
  assert.equal(revoked.issuance?.issuance_status, "revoked");
  const afterRevoke = await getCertificateByPublicId(validVerify.issuance.certificate_id);
  assert.equal(afterRevoke?.issuance_status, "revoked");
  assert.equal(afterRevoke?.revocation_reason, "Audit check test revocation");
});

test("handles failed and cancelled payments and logs lifecycle notifications", async () => {
  resetMemoryStoreForTest();
  const products = await listProducts();
  const internshipCert = products.find((p) => p.certificate_type === "internship")!;

  const order1 = await createCertificationOrder({ user: testStudent, productId: internshipCert.id });
  assert.ok(order1.order);
  const failedRes = await recordFailedOrCancelledPayment({
    user: testStudent,
    razorpayOrderId: order1.order.razorpay_order_id,
    status: "failed",
    reason: "Bank declined test card",
  });
  assert.equal(failedRes.order?.order_status, "failed");

  const order2 = await createCertificationOrder({ user: testStudent, productId: internshipCert.id });
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

test("processes webhook idempotently and rejects duplicate/replayed events", async () => {
  resetMemoryStoreForTest();
  const products = await listProducts();
  const internshipCert = products.find((p) => p.certificate_type === "internship")!;
  const orderRes = await createCertificationOrder({ user: testStudent, productId: internshipCert.id });
  assert.ok(orderRes.order);

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
