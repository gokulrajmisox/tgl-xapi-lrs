import assert from "node:assert/strict";
import test from "node:test";
import {
  buildOAuthCallbackUrl,
  mapOAuthErrorToMessage,
  sanitizeRedirectPath,
} from "../../lib/auth/redirects";
import { deriveStudentProfileSeed } from "../../lib/auth/profile-sync";
import {
  computeSignatureForTest,
  createRazorpayOrder,
  RazorpayGatewayError,
  validateRazorpayOrderAmountPaise,
  verifyRazorpayPaymentSignature,
} from "../../lib/payments/razorpay";

test("Razorpay amount validation enforces integer >= 100 paise and rejects under-minimum amounts", async () => {
  assert.equal(validateRazorpayOrderAmountPaise(100).valid, true);
  assert.equal(validateRazorpayOrderAmountPaise(49900).valid, true);
  assert.equal(validateRazorpayOrderAmountPaise(99).valid, false);
  assert.equal(validateRazorpayOrderAmountPaise(0).valid, false);
  assert.equal(validateRazorpayOrderAmountPaise(-100).valid, false);
  assert.equal(validateRazorpayOrderAmountPaise(100.5).valid, false);

  await assert.rejects(
    () =>
      createRazorpayOrder({
        amountPaise: 50,
        currency: "INR",
        receipt: "rcpt_too_small",
      }),
    (err: unknown) =>
      err instanceof RazorpayGatewayError &&
      err.statusCode === 400 &&
      err.code === "INVALID_AMOUNT",
  );
});

test("Razorpay signature verification rejects missing fields, mismatches, and confirms valid HMAC-SHA256", () => {
  const secret = "test_secret_key_xyz";
  const orderId = "order_PQR123456";
  const paymentId = "pay_ABC987654";
  const expectedSig = computeSignatureForTest(orderId, paymentId, secret);

  assert.equal(
    verifyRazorpayPaymentSignature({
      orderId,
      paymentId,
      signature: expectedSig,
      secretOverride: secret,
    }),
    true,
  );
  assert.equal(
    verifyRazorpayPaymentSignature({
      orderId,
      paymentId,
      signature: `${expectedSig.slice(0, -1)}0`,
      secretOverride: secret,
    }),
    false,
  );
  assert.equal(
    verifyRazorpayPaymentSignature({
      orderId: "",
      paymentId,
      signature: expectedSig,
      secretOverride: secret,
    }),
    false,
  );
  assert.equal(
    verifyRazorpayPaymentSignature({
      orderId,
      paymentId: "",
      signature: expectedSig,
      secretOverride: secret,
    }),
    false,
  );
});

test("OAuth redirect sanitization prevents open redirects and auth loops while preserving valid programme routes", () => {
  assert.equal(
    sanitizeRedirectPath("/programmes/web-architecture-systems?tab=notes"),
    "/programmes/web-architecture-systems?tab=notes",
  );
  assert.equal(sanitizeRedirectPath("/learn#projects"), "/learn#projects");

  // Block external URLs, protocol-relative URLs, backslashes, and auth route loops
  assert.equal(sanitizeRedirectPath("https://evil.com/phish"), "/learn");
  assert.equal(sanitizeRedirectPath("//evil.com/phish"), "/learn");
  assert.equal(sanitizeRedirectPath("/\\evil.com"), "/learn");
  assert.equal(sanitizeRedirectPath("/javascript:alert(1)"), "/learn");
  assert.equal(sanitizeRedirectPath("/auth/login"), "/learn");
  assert.equal(sanitizeRedirectPath("/auth/callback?code=123"), "/learn");
  assert.equal(sanitizeRedirectPath(null), "/learn");

  // Builds clean callback URL across local, Cloud Run, and custom domains
  assert.equal(
    buildOAuthCallbackUrl(
      "https://ais-dev-ipjqzfdw5cmh7st6msrh6m-885004922569.asia-east1.run.app/",
      "/programmes/web-architecture-systems",
    ),
    "https://ais-dev-ipjqzfdw5cmh7st6msrh6m-885004922569.asia-east1.run.app/auth/callback?next=%2Fprogrammes%2Fweb-architecture-systems",
  );
  assert.equal(
    buildOAuthCallbackUrl("http://localhost:3000", "https://evil.com"),
    "http://localhost:3000/auth/callback?next=%2Flearn",
  );
});

test("OAuth error mapper translates cancellation, missing config, and unverified email cleanly", () => {
  assert.match(mapOAuthErrorToMessage("oauth_cancelled"), /cancelled/i);
  assert.match(mapOAuthErrorToMessage("access_denied"), /cancelled/i);
  assert.match(mapOAuthErrorToMessage("oauth_config"), /not configured/i);
  assert.match(mapOAuthErrorToMessage("oauth_unverified_email"), /verified/i);
  assert.match(mapOAuthErrorToMessage("callback"), /complete Google sign-in/i);
});

test("Google OAuth profile seed populates first-time Google names without overwriting custom display_name or escalating roles", () => {
  // 1. New Google OAuth student with verified email
  const googleNewUser = deriveStudentProfileSeed({
    id: "user-google-1",
    email: "Meera.Nair@Example.com",
    email_confirmed_at: "2026-11-15T06:00:00Z",
    app_metadata: { provider: "google" },
    user_metadata: {
      full_name: "Meera Nair",
      avatar_url: "https://lh3.googleusercontent.com/a/avatar",
      email_verified: true,
    },
  });
  assert.equal(googleNewUser.email, "meera.nair@example.com");
  assert.equal(googleNewUser.fullName, "Meera Nair");
  assert.equal(googleNewUser.emailVerified, true);
  assert.equal(googleNewUser.role, "student");
  assert.equal(googleNewUser.needsMetadataBackfill, true);

  // 2. Linked user who already saved a custom certificate display_name
  const linkedCustomUser = deriveStudentProfileSeed({
    id: "user-linked-2",
    email: "student@example.edu",
    email_confirmed_at: "2026-11-10T06:00:00Z",
    app_metadata: { provider: "google" },
    user_metadata: {
      display_name: "Aarav S. Kulkarni",
      full_name: "Aarav Kulkarni",
      avatar_url: "http://insecure-avatar.example/pic.png",
      email_verified: true,
    },
  });
  assert.equal(linkedCustomUser.fullName, "Aarav S. Kulkarni");
  assert.equal(linkedCustomUser.needsMetadataBackfill, false);
  assert.equal(linkedCustomUser.avatarUrl, null); // Non-HTTPS avatar URL rejected

  // 3. Unverified email rejected for linking/sync, and non-admin metadata never escalates
  const unverifiedUser = deriveStudentProfileSeed({
    id: "user-unverified-3",
    email: "spoof@example.com",
    email_confirmed_at: null,
    app_metadata: { provider: "google" },
    user_metadata: {
      name: "Spoof Account",
      email_verified: false,
      role: "admin",
    },
  });
  assert.equal(unverifiedUser.emailVerified, false);
  assert.equal(unverifiedUser.role, "student");
});
