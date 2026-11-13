import assert from "node:assert/strict";
import test from "node:test";
import { validateCoursePricePaise } from "../../lib/courses/pricing";
import {
  getCourseDetailForActor,
  listCoursesCatalog,
  resetCoursesStoreForTest,
  updateCourseAdminConfig,
  updateCourseLessonProgress,
} from "../../lib/courses/store";
import {
  createCourseEnrollmentOrder,
  processAdminRefund,
  processRazorpayWebhookEvent,
  recordFailedOrCancelledPayment,
  resetMemoryStoreForTest,
  verifyAndCaptureCheckoutPayment,
  type SandboxUser,
} from "../../lib/certifications/store";
import { DEMO_STUDENT_ID } from "../../lib/supabase/service";
import { computeWebhookSignatureForTest } from "../../lib/payments/razorpay";

const studentUser: SandboxUser = {
  id: DEMO_STUDENT_ID,
  email: "aarav.sharma@example.edu",
  name: "Aarav Sharma",
  role: "student",
  isSandbox: true,
};

test("course pricing validation enforces ₹499–₹1,999 INR in integer paise", () => {
  assert.equal(validateCoursePricePaise(49900).valid, true);
  assert.equal(validateCoursePricePaise(129900).valid, true);
  assert.equal(validateCoursePricePaise(199900).valid, true);
  assert.equal(validateCoursePricePaise(49899).valid, false);
  assert.equal(validateCoursePricePaise(200000).valid, false);
  assert.equal(validateCoursePricePaise(999.5).valid, false);
  assert.equal(validateCoursePricePaise(0).valid, false);
});

test("locked preview strips study notes, YouTube IDs, and project briefs for non-enrolled users", async () => {
  resetMemoryStoreForTest();
  resetCoursesStoreForTest();

  const anonDetail = await getCourseDetailForActor({
    slug: "web-architecture-systems",
    userId: null,
  });
  assert.ok(anonDetail);
  assert.equal(anonDetail.locked, true);
  assert.equal(anonDetail.enrolled, false);
  assert.ok(anonDetail.syllabusModules.length >= 3);

  // Ensure paid fields are not present in locked serialized payload
  const serialized = JSON.stringify(anonDetail);
  assert.equal(serialized.includes("hQAHSlTtcmY"), false);
  assert.equal(serialized.includes("noteSections"), false);
  assert.equal(serialized.includes("Design and ship an interactive full-stack workspace"), false);

  // Blocked progress writes before enrollment
  const blockedProgress = await updateCourseLessonProgress({
    userId: studentUser.id,
    courseSlug: "web-architecture-systems",
    lessonId: "les-web-1-note",
    status: "completed",
  });
  assert.equal(blockedProgress.statusCode, 403);
  assert.match(blockedProgress.error ?? "", /enrollment required/i);
});

test("Razorpay course checkout: rejects invalid signatures, unlocks notes/videos after verification, supports failure retry & refund revocation", async () => {
  resetMemoryStoreForTest();
  resetCoursesStoreForTest();

  // Admin adjusts price cleanly within bounds
  const updated = await updateCourseAdminConfig({
    courseId: "course-web-architecture",
    pricePaise: 139900,
    isPublished: true,
  });
  assert.equal(updated.course?.pricePaise, 139900);

  // 1. Initiate order (server computes amount from DB/catalog)
  const orderRes = await createCourseEnrollmentOrder({
    user: studentUser,
    courseId: "course-web-architecture",
  });
  assert.ok(orderRes.order);
  assert.equal(orderRes.order.amount_paise, 139900);
  assert.equal(orderRes.order.order_kind, "course_enrollment");

  // 2. Simulate failure and retry cleanly
  const failRes = await recordFailedOrCancelledPayment({
    user: studentUser,
    razorpayOrderId: orderRes.order.razorpay_order_id,
    status: "failed",
    reason: "Test bank timeout",
  });
  assert.equal(failRes.order?.order_status, "failed");

  const stillLocked = await getCourseDetailForActor({
    slug: "web-architecture-systems",
    userId: studentUser.id,
  });
  assert.equal(stillLocked?.locked, true);

  // 3. Create fresh order & test invalid signature rejection
  const retryOrderRes = await createCourseEnrollmentOrder({
    user: studentUser,
    courseId: "course-web-architecture",
  });
  assert.ok(retryOrderRes.order);

  const badVerify = await verifyAndCaptureCheckoutPayment({
    user: studentUser,
    razorpayOrderId: retryOrderRes.order.razorpay_order_id,
    razorpayPaymentId: "pay_bad_sig_01",
    razorpaySignature: "invalid_signature",
    simulateTestCheckout: true,
  });
  assert.equal(badVerify.status, 400);

  // 4. Valid signature verification activates enrollment & unlocks course materials
  const okVerify = await verifyAndCaptureCheckoutPayment({
    user: studentUser,
    razorpayOrderId: retryOrderRes.order.razorpay_order_id,
    razorpayPaymentId: "pay_ok_course_01",
    razorpaySignature: `sim_sig_${retryOrderRes.order.razorpay_order_id}`,
    simulateTestCheckout: true,
  });
  assert.ok(okVerify.payment);
  assert.equal(okVerify.enrollment?.status, "active");

  const unlocked = await getCourseDetailForActor({
    slug: "web-architecture-systems",
    userId: studentUser.id,
  });
  assert.ok(unlocked);
  assert.equal(unlocked.locked, false);
  assert.equal(unlocked.enrolled, true);
  if (!unlocked.locked) {
    const serialized = JSON.stringify(unlocked);
    assert.equal(serialized.includes("hQAHSlTtcmY"), true);
    assert.equal(serialized.includes("noteSections"), true);
  }

  // 5. Enrolled student can save lesson progress
  const progRes = await updateCourseLessonProgress({
    userId: studentUser.id,
    courseSlug: "web-architecture-systems",
    lessonId: "les-web-1-note",
    status: "completed",
  });
  assert.equal(progRes.summary?.completedLessonCount, 1);

  // 6. Admin refund revokes course enrollment cleanly
  const refundRes = await processAdminRefund({
    paymentId: okVerify.payment.id,
    reason: "Requested course refund within test",
  });
  assert.equal(refundRes.payment?.payment_status, "refunded");

  const revokedDetail = await getCourseDetailForActor({
    slug: "web-architecture-systems",
    userId: studentUser.id,
  });
  assert.equal(revokedDetail?.locked, true);

  // 7. Webhook payment.captured re-activates enrollment idempotently on paid retry
  const whOrderRes = await createCourseEnrollmentOrder({
    user: studentUser,
    courseId: "course-web-architecture",
  });
  assert.ok(whOrderRes.order);
  const webhookSecret = "whsec_course_test";
  const whBody = JSON.stringify({
    event: "payment.captured",
    payload: {
      payment: {
        entity: {
          id: "pay_wh_course_99",
          order_id: whOrderRes.order.razorpay_order_id,
          method: "upi",
        },
      },
    },
  });
  const whSig = computeWebhookSignatureForTest(whBody, webhookSecret);
  const whResult = await processRazorpayWebhookEvent({
    rawBody: whBody,
    signature: whSig,
    eventIdHeader: "evt_course_99",
    webhookSecretOverride: webhookSecret,
  });
  assert.equal(whResult.processingStatus, "processed");

  const catalog = await listCoursesCatalog(studentUser.id);
  const enrolledCourse = catalog.find((c) => c.slug === "web-architecture-systems");
  assert.equal(enrolledCourse?.enrolled, true);
});
