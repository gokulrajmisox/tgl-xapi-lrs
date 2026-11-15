# Authentication & Payments Configuration Guide

This guide explains how to configure **Razorpay Standard Web Checkout (INR)** and **Google OAuth via Supabase Auth** for **Touch Grass Later (TGL)** across local development, Cloud Run preview/shared URLs, and production custom domains.

> **Security Note:** Never commit `.env` or secret values (`RAZORPAY_KEY_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, or Google OAuth Client Secret) into source control. Store secrets only in your local `.env` or deployment environment secret manager.

---

## 1. Environment Variables

Copy `.env.example` to `.env` (already gitignored via `.env*`) and set:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://erpejqlbnriflkbctrow.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<your-supabase-publishable-or-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-supabase-service-role-key>

# Optional explicit redirect origin for local dev
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Razorpay Standard Web Checkout
RAZORPAY_KEY_ID=<your-razorpay-key-id>
RAZORPAY_KEY_SECRET=<your-razorpay-key-secret>
NEXT_PUBLIC_RAZORPAY_KEY_ID=<your-razorpay-key-id>
RAZORPAY_WEBHOOK_SECRET=<optional-razorpay-webhook-secret>
```

---

## 2. Razorpay Standard Web Checkout

### Endpoints
- `POST /api/payments/orders` & `POST /api/create-order`: Creates an INR Razorpay order using the official `razorpay` Node SDK (`minimum 100 paise` / `₹1`). Returns `{ order_id, amount, currency, keyId, isSimulated }`.
- `POST /api/payments/verify` & `POST /api/verify-payment`: Verifies `HMAC-SHA256(order_id + "|" + payment_id, RAZORPAY_KEY_SECRET)` server-side using constant-time comparison, captures payment, unlocks the programme lessons/project, and activates the linked internship track.
- `POST /api/payments/fail`: Records cancelled (`modal.ondismiss`) or failed (`payment.failed`) checkout attempts cleanly so students can retry without duplicate charges.

### Frontend Script
- `https://checkout.razorpay.com/v1/checkout.js` is loaded in `app/layout.tsx` (`afterInteractive`) with a dynamic fallback inside `components/razorpay-checkout-button.tsx`.

---

## 3. Google Cloud Console Setup (OAuth 2.0 Web Client)

1. Open [Google Cloud Console](https://console.cloud.google.com/) and select your project.
2. Navigate to **APIs & Services → OAuth consent screen**:
   - Choose **External** user type.
   - Set **App name** to `Touch Grass Later`, support email, and developer contact email.
   - Add scopes: `openid`, `email`, `profile` (`.../auth/userinfo.email`, `.../auth/userinfo.profile`).
   - Add test users while in Testing status, or publish the consent screen for public students.
3. Navigate to **APIs & Services → Credentials → Create Credentials → OAuth client ID → Web application**:
   - **Authorized JavaScript origins**:
     - `http://localhost:3000`
     - `https://ais-dev-ipjqzfdw5cmh7st6msrh6m-885004922569.asia-east1.run.app`
     - `https://ais-pre-ipjqzfdw5cmh7st6msrh6m-885004922569.asia-east1.run.app`
     - Your production custom domain (e.g., `https://touchgrasslater.org`)
   - **Authorized redirect URIs**:
     - `https://erpejqlbnriflkbctrow.supabase.co/auth/v1/callback`
4. Copy the generated **Client ID** (`*.apps.googleusercontent.com`) and **Client Secret** for Supabase Dashboard in Step 4. Do **not** place the Google Client Secret into frontend or repository source files.

---

## 4. Supabase Dashboard Setup (Google Provider & Redirect URLs)

1. Open your Supabase project (`https://supabase.com/dashboard/project/erpejqlbnriflkbctrow`).
2. Run the database migrations under `supabase/migrations/` (including `20261115_student_profiles_oauth.sql`) in the Supabase SQL Editor or via `supabase db push`.
3. Navigate to **Authentication → Providers → Google**:
   - Toggle **Enable Sign in with Google** ON.
   - Paste your Google **Client ID** and **Client Secret**.
   - Confirm the callback URL displayed matches: `https://erpejqlbnriflkbctrow.supabase.co/auth/v1/callback`.
   - Keep **Skip nonce checks** OFF for standard web PKCE security.
4. Navigate to **Authentication → URL Configuration**:
   - Set **Site URL** to your primary environment origin (e.g. `https://ais-dev-ipjqzfdw5cmh7st6msrh6m-885004922569.asia-east1.run.app` or your production domain).
   - Add all environment **Redirect URLs**:
     - `http://localhost:3000/auth/callback`
     - `http://localhost:3000/**`
     - `https://ais-dev-ipjqzfdw5cmh7st6msrh6m-885004922569.asia-east1.run.app/auth/callback`
     - `https://ais-dev-ipjqzfdw5cmh7st6msrh6m-885004922569.asia-east1.run.app/**`
     - `https://ais-pre-ipjqzfdw5cmh7st6msrh6m-885004922569.asia-east1.run.app/auth/callback`
     - `https://ais-pre-ipjqzfdw5cmh7st6msrh6m-885004922569.asia-east1.run.app/**`
     - `https://your-custom-domain.com/auth/callback`

---

## 5. Verification Checklist

- [ ] `/auth/login` and `/auth/sign-up` show **Continue with Google** alongside email/password forms.
- [ ] Cancelling Google consent redirects cleanly back to `/auth/login?error=oauth_cancelled` with a retryable message.
- [ ] Completing Google Sign-In exchanges the PKCE code on `/auth/callback`, creates/updates `student_profiles` without overwriting a custom saved name, and opens `/learn` (or sanitized `next` path).
- [ ] Clicking **Enrol Now** on a programme creates an INR order via `POST /api/payments/orders` (or `/api/create-order`), opens Razorpay Checkout, and verifies `HMAC-SHA256` signature on `POST /api/payments/verify` (or `/api/verify-payment`) before unlocking course content.
