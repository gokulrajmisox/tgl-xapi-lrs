# TGL Learning Portal — Supabase to Firebase Migration Guide

## 1. Provisioned Firebase Target
- **Project ID:** `tough-cinema-m61jg`
- **Firestore Database ID:** `ai-studio-tglxapilrs-636051bf-84ac-43ff-8aa2-35226f35b24d`
- **Region:** `asia-southeast1`
- **Storage Bucket:** `tough-cinema-m61jg.firebasestorage.app`
- **Config File:** `firebase-applet-config.json`
- **Security Rules:** `firestore.rules` (deployed & ESLint-clean) + `storage.rules` + `firestore.indexes.json`

## 2. Supabase Table -> Firestore Collection Mapping
| Legacy Supabase Source | Firestore Collection | Document ID Strategy | Privacy / Rules Guarantee |
| :--- | :--- | :--- | :--- |
| `auth.users` + `profiles` | `users` | `uid` | Public `displayName` + `role` only; no PII |
| `auth.users` PII | `users/{uid}/private/info` | `info` | Email, verification flag, provider; owner/admin read only |
| Staff allowlist / `app_metadata` | `admins` | `uid` | Server-verified admin lookup for `firestore.rules` |
| `courses`, `modules`, `lessons` | `courses` | `course.id` | Published programmes (single INR fee `₹499–₹1,999`) |
| `internships` | `internships` | `internship.id` | Linked `courseId`; `₹0` extra certificate |
| `project_assignments` | `assignments` | `assignment.id` | Rubric & deliverables per course |
| `course_enrollments` | `enrollments` | `{userId}_{courseId}` | Server/Transaction write on Razorpay verification |
| `lesson_progress` | `progress` | `{userId}_{courseId}` | Owner read/write with field allowlist |
| `project_submissions` | `submissions` | `submission.id` | Owner create/update while not approved; mentor review |
| `submission_reviews` | `reviews` | `review.id` | Admin/Mentor write |
| `certificate_issuances` | `certificates` | `certificateId` | Public QR verification (`get`), owner/admin write checks |
| `payment_orders` | `payment_orders` | `razorpayOrderId` | Server/Owner-scoped read |
| `payments` | `payments` | `razorpayPaymentId` | Server/Owner-scoped capture/refund ledger |
| `email_logs`, `webhook_events` | `activity_logs` | `log.id` | Admin/Server only |
| `cohorts`, `mentor_messages`, `email_templates` | `settings` | Scoped key | Staff config & workspace metadata |

## 3. Running Data Migration & Verification
1. Export legacy Supabase JSON matching `LegacyExportBundle` (`lib/firebase/migration.ts`).
2. Dry-run integrity check (verifies user/course foreign keys and rejects missing or email-derived recipient names):
   ```bash
   npx tsx scripts/migrate-supabase-to-firebase.ts --input=./supabase-export.json --dry-run
   ```
3. Run live import once `FIREBASE_SERVICE_ACCOUNT_JSON` is configured:
   ```bash
   npx tsx scripts/migrate-supabase-to-firebase.ts --input=./supabase-export.json
   ```
4. Deploy Cloud Functions (`functions/src/index.ts`) and indexes (`firestore.indexes.json`):
   ```bash
   cd functions && npm install && npm run build
   firebase deploy --only functions,firestore:indexes,storage
   ```

## 4. User Authentication Cutover Notes
- **Google Sign-In:** Existing Google users sign in via Firebase Popup on `/auth/login` (add production domains under Firebase Console -> Authentication -> Settings -> Authorized domains).
- **Email/Password Users:** Enable Email/Password provider in Firebase Authentication Console; imported users either keep scrypt/bcrypt hashes or receive a password reset email via `sendPasswordResetEmail`.
- **Rollback Plan:** Because `scripts/migrate-supabase-to-firebase.ts` is read-only against the Supabase export JSON and preserves original UUID `uid` values, rollback consists of re-enabling the previous Supabase deployment tag without losing any primary key alignment.
