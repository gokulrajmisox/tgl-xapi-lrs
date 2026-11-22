import { createHmac, timingSafeEqual } from "node:crypto";
import { initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { onDocumentUpdated } from "firebase-functions/v2/firestore";

initializeApp();

const DATABASE_ID = "ai-studio-tglxapilrs-636051bf-84ac-43ff-8aa2-35226f35b24d";
const REGION = "asia-southeast1";

function db() {
  return getFirestore(DATABASE_ID);
}

function getRazorpaySecrets() {
  const keyId = process.env.RAZORPAY_KEY_ID?.trim() ?? "";
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim() ?? "";
  return { keyId, keySecret };
}

function buildCertificateId(courseId: string, uid: string): string {
  const suffix = `${courseId}-${uid}`.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8).toUpperCase();
  return `TGL-CERT-${new Date().getFullYear()}-${suffix}`;
}

export const createRazorpayOrderFn = onCall(
  { region: REGION, enforceAppCheck: true },
  async (request) => {
    if (!request.auth?.uid) {
      throw new HttpsError("unauthenticated", "Firebase Authentication required.");
    }
    const programmeId =
      typeof request.data?.programmeId === "string" ? request.data.programmeId.trim() : "";
    if (!programmeId) {
      throw new HttpsError("invalid-argument", "programmeId is required.");
    }

    const courseSnap = await db().collection("courses").doc(programmeId).get();
    if (!courseSnap.exists) {
      throw new HttpsError("not-found", "Programme not found.");
    }

    const course = courseSnap.data() as {
      title?: string;
      price_paise?: number;
      priceInr?: number;
    };
    const amountPaise =
      typeof course.price_paise === "number"
        ? course.price_paise
        : Math.round(Number(course.priceInr ?? 999) * 100);

    if (amountPaise < 49900 || amountPaise > 199900) {
      throw new HttpsError(
        "failed-precondition",
        "Programme fee must remain within ₹499–₹1,999 INR.",
      );
    }

    const { keyId, keySecret } = getRazorpaySecrets();
    const receipt = `tgl_${programmeId}_${Date.now()}`.slice(0, 40);
    let razorpayOrderId = `order_fn_${Date.now()}`;

    if (keyId && keySecret) {
      const authHeader = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
      const rzpRes = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: {
          Authorization: `Basic ${authHeader}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: amountPaise,
          currency: "INR",
          receipt,
          notes: {
            programme_id: programmeId,
            user_id: request.auth.uid,
          },
        }),
      });
      if (!rzpRes.ok) {
        throw new HttpsError("internal", "Unable to create Razorpay order.");
      }
      const rzpJson = (await rzpRes.json()) as { id: string };
      razorpayOrderId = rzpJson.id;
    }

    const orderRef = db().collection("payment_orders").doc(razorpayOrderId);
    await orderRef.set({
      id: razorpayOrderId,
      userId: request.auth.uid,
      programmeId,
      amountPaise,
      currency: "INR",
      receipt,
      status: "created",
      createdAt: FieldValue.serverTimestamp(),
    });

    return {
      orderId: razorpayOrderId,
      amountPaise,
      currency: "INR",
      keyId: keyId || null,
    };
  },
);

export const verifyRazorpayPaymentFn = onCall(
  { region: REGION, enforceAppCheck: true },
  async (request) => {
    if (!request.auth?.uid) {
      throw new HttpsError("unauthenticated", "Firebase Authentication required.");
    }
    const orderId = typeof request.data?.orderId === "string" ? request.data.orderId.trim() : "";
    const paymentId =
      typeof request.data?.paymentId === "string" ? request.data.paymentId.trim() : "";
    const signature =
      typeof request.data?.signature === "string" ? request.data.signature.trim() : "";

    if (!orderId || !paymentId || !signature) {
      throw new HttpsError(
        "invalid-argument",
        "orderId, paymentId, and signature are required.",
      );
    }

    const { keySecret } = getRazorpaySecrets();
    if (!keySecret) {
      throw new HttpsError("failed-precondition", "RAZORPAY_KEY_SECRET not configured.");
    }

    const expected = createHmac("sha256", keySecret)
      .update(`${orderId}|${paymentId}`)
      .digest("hex");

    const sigBuf = Buffer.from(signature, "utf8");
    const expBuf = Buffer.from(expected, "utf8");
    if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
      throw new HttpsError("permission-denied", "Invalid Razorpay payment signature.");
    }

    const store = db();
    const orderRef = store.collection("payment_orders").doc(orderId);
    const orderSnap = await orderRef.get();
    if (!orderSnap.exists) {
      throw new HttpsError("not-found", "Order not found.");
    }
    const orderData = orderSnap.data() as { userId: string; programmeId: string; amountPaise: number };
    if (orderData.userId !== request.auth.uid) {
      throw new HttpsError("permission-denied", "Order ownership mismatch.");
    }

    await store.runTransaction(async (tx) => {
      tx.update(orderRef, {
        status: "paid",
        razorpayPaymentId: paymentId,
        verifiedAt: FieldValue.serverTimestamp(),
      });
      tx.set(store.collection("payments").doc(paymentId), {
        id: paymentId,
        orderId,
        userId: request.auth!.uid,
        programmeId: orderData.programmeId,
        amountPaise: orderData.amountPaise,
        currency: "INR",
        status: "captured",
        capturedAt: FieldValue.serverTimestamp(),
      });
      tx.set(store.collection("enrollments").doc(`${request.auth!.uid}_${orderData.programmeId}`), {
        userId: request.auth!.uid,
        courseId: orderData.programmeId,
        status: "active",
        paymentOrderId: orderId,
        enrolledAt: FieldValue.serverTimestamp(),
      });
    });

    return { verified: true, orderId, paymentId, enrolled: true };
  },
);

export const onSubmissionApprovedIssueCertificate = onDocumentUpdated(
  {
    document: "submissions/{submissionId}",
    database: DATABASE_ID,
    region: REGION,
  },
  async (event) => {
    const before = event.data?.before.data() as { status?: string } | undefined;
    const after = event.data?.after.data() as
      | { status?: string; userId?: string; courseId?: string; projectSlug?: string; learnerName?: string }
      | undefined;

    if (!after || after.status !== "approved" || before?.status === "approved") {
      return;
    }
    if (!after.userId || !after.courseId) {
      return;
    }

    const certificateId = buildCertificateId(after.courseId, after.userId);
    const store = db();
    await store.collection("certificates").doc(certificateId).set(
      {
        certificateId,
        userId: after.userId,
        courseId: after.courseId,
        recipientName: after.learnerName ?? "Verified Learner",
        status: "issued",
        feeInr: 0,
        issuedAt: FieldValue.serverTimestamp(),
        verificationUrl: `https://touchgrasslater.org/verify/certificate/${certificateId}`,
      },
      { merge: true },
    );

    await store.collection("notifications").add({
      userId: after.userId,
      type: "certificate_issued",
      title: "Internship Certificate Ready",
      body: `Your project submission was approved and certificate ${certificateId} is unlocked (₹0 extra).`,
      read: false,
      createdAt: FieldValue.serverTimestamp(),
    });
  },
);

export const regenerateCertificateFn = onCall(
  { region: REGION, enforceAppCheck: true },
  async (request) => {
    if (!request.auth?.uid) {
      throw new HttpsError("unauthenticated", "Authentication required.");
    }
    const certificateId =
      typeof request.data?.certificateId === "string" ? request.data.certificateId.trim() : "";
    if (!certificateId) {
      throw new HttpsError("invalid-argument", "certificateId is required.");
    }

    const store = db();
    const adminSnap = await store.collection("admins").doc(request.auth.uid).get();
    const certRef = store.collection("certificates").doc(certificateId);
    const certSnap = await certRef.get();
    if (!certSnap.exists) {
      throw new HttpsError("not-found", "Certificate not found.");
    }
    const certData = certSnap.data() as { userId: string };
    if (certData.userId !== request.auth.uid && !adminSnap.exists) {
      throw new HttpsError("permission-denied", "Not authorized to regenerate this certificate.");
    }

    await certRef.update({
      regeneratedAt: FieldValue.serverTimestamp(),
    });

    return {
      ok: true,
      certificateId,
      verificationUrl: `/verify/certificate/${certificateId}`,
    };
  },
);

export const sendLifecycleNotificationFn = onCall(
  { region: REGION },
  async (request) => {
    if (!request.auth?.uid) {
      throw new HttpsError("unauthenticated", "Authentication required.");
    }
    const store = db();
    const adminSnap = await store.collection("admins").doc(request.auth.uid).get();
    if (!adminSnap.exists) {
      throw new HttpsError("permission-denied", "Administrator claim required.");
    }

    const recipientUid =
      typeof request.data?.recipientUid === "string" ? request.data.recipientUid.trim() : "";
    const title = typeof request.data?.title === "string" ? request.data.title.trim() : "";
    const body = typeof request.data?.body === "string" ? request.data.body.trim() : "";
    if (!recipientUid || !title || !body) {
      throw new HttpsError("invalid-argument", "recipientUid, title, and body are required.");
    }

    await store.collection("notifications").add({
      userId: recipientUid,
      type: "admin_notice",
      title: title.slice(0, 140),
      body: body.slice(0, 1000),
      read: false,
      createdAt: FieldValue.serverTimestamp(),
    });

    return { ok: true };
  },
);
