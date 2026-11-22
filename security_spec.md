# Security Specification — TGL Learning Portal (Firestore & Storage)

## 1. Data Invariants

1. **Identity & Role Integrity (`admins/{uid}`, `users/{uid}`, `users/{uid}/private/{docId}`)**:
   - Every user profile document is keyed strictly by Firebase Auth UID (`{uid}`).
   - PII fields (`email`, `phone`, `authProvider`, `avatarUrl`, `emailVerified`) are isolated inside `users/{uid}/private/{docId}` and readable ONLY by the owner or verified administrator.
   - Public/workspace display fields live in `users/{uid}` (`uid`, `displayName`, `role`, `createdAt`, `updatedAt`).
   - Students can NEVER set or mutate `role`, `isAdmin`, or create documents under `admins/{uid}`. Admin identity checks (`isAdmin()`) rely on `admins/{uid}` existence OR verified Firebase Auth email matching the exact allowlisted admin emails with `request.auth.token.email_verified == true`.
   - Display names are optional on registration and NEVER auto-derived from email addresses.
2. **Courses & Content (`courses/{courseId}`, `modules`, `lessons`, `assignments`)**:
   - Public read (`get`, `list`) on `courses/{courseId}` is permitted only when `isPublished == true` or requester is `isAdmin()`.
   - Only verified admins can create, update, or delete `courses`, `modules`, `lessons`, and `assignments`.
3. **Payments & Enrolments (`payment_orders/{orderId}`, `payments/{paymentId}`, `enrollments/{enrollmentId}`)**:
   - Programme pricing (`₹499–₹1,999 INR` in integer paise) is derived strictly on the server.
   - Students may read (`get`, `list`) ONLY their own `enrollments`, `payments`, and `payment_orders` (`resource.data.userId == request.auth.uid`).
   - Client SDK writes (`create`, `update`, `delete`) to `enrollments`, `payments`, `payment_orders`, and `webhook_events` are **strictly forbidden** (`allow write: if false`). Only server-side Firebase Admin SDK / Cloud Functions may create/update after Razorpay HMAC verification.
4. **Learning Progress & Submissions (`progress/{progressId}`, `submissions/{submissionId}`, `reviews/{reviewId}`)**:
   - Students can create/update their own `progress/{progressId}` ONLY when `exists(/databases/$(database)/documents/enrollments/$(incoming().enrollmentId))` and `get(...).data.userId == request.auth.uid` and `get(...).data.status == 'active'`.
   - Students can create/update their own `submissions/{submissionId}` ONLY with initial/resubmitted status `'submitted'`; students CANNOT set `status` to `'approved'` or `'revision_required'`, and CANNOT write `mentorFeedback`, `mentorName`, or `reviewedAt`.
   - Only `isAdmin()` can create `reviews/{reviewId}` or transition submissions to `'approved'` / `'revision_required'`. Once `'approved'`, a submission is terminal-locked unless modified by `isAdmin()`.
5. **Certificates (`certificates/{certificateId}`)**:
   - Certificates can ONLY be created, updated (revoked/regenerated), or deleted server-side / by `isAdmin()`.
   - Public verification supports single-document `get` on non-PII verification summary (or public lookup), while `list` is strictly restricted to `resource.data.userId == request.auth.uid || isAdmin()`.
   - Certificate owner (`userId == request.auth.uid`) may update ONLY `['claimedAt', 'updatedAt']` when `existing().issuanceStatus == 'issued'` and `existing().claimedAt == null`.
6. **Notifications & Admin Logs (`notifications/{notificationId}`, `activity_logs/{logId}`, `settings/{settingId}`)**:
   - Owners can read their own notifications (`resource.data.userId == request.auth.uid`) and mark `['read', 'updatedAt']` only. Creation is server/admin-only.
   - `activity_logs` and `settings` are admin-only (`allow read, write: if isAdmin()`).

## 2. The "Dirty Dozen" Adversarial Payloads

| # | Target Collection | Attack Vector | Malicious Payload / Operation | Expected Result |
|---|-------------------|---------------|-------------------------------|-----------------|
| 1 | `users/{uid}` | Privilege Escalation on Create | `{ uid: callerUid, displayName: "Eve", role: "admin", createdAt: request.time, updatedAt: request.time }` | `PERMISSION_DENIED` (`role` must equal `'student'`) |
| 2 | `users/{uid}` | Shadow / Ghost Field Injection | `{ uid: callerUid, displayName: "Eve", role: "student", isVerified: true, createdAt: request.time, updatedAt: request.time }` | `PERMISSION_DENIED` (`hasOnly` rejects `isVerified`) |
| 3 | `users/{uid}` | Role Mutation on Update | `update({ role: "admin", updatedAt: request.time })` | `PERMISSION_DENIED` (`affectedKeys` rejects `role`) |
| 4 | `users/{otherUid}/private/info` | Cross-Tenant PII Read | Authenticated student reads `users/{otherUid}/private/info` | `PERMISSION_DENIED` (PII isolation) |
| 5 | `admins/{callerUid}` | Self-Promotion to Admin | Student attempts `setDoc(doc(db, 'admins', callerUid), { granted: true })` | `PERMISSION_DENIED` (`allow write: if false`) |
| 6 | `enrollments/{enrollmentId}` | Free Self-Enrollment Bypass | Student creates `{ userId: callerUid, courseId: "course-web-architecture", status: "active" }` directly via client SDK | `PERMISSION_DENIED` (`allow write: if false`) |
| 7 | `payments/{paymentId}` | Forged Payment Record | Student writes `{ userId: callerUid, paymentStatus: "captured", amountPaise: 100 }` | `PERMISSION_DENIED` (`allow write: if false`) |
| 8 | `submissions/{submissionId}` | Self-Approval of Project | Student updates their submission `{ status: "approved", mentorFeedback: "LGTM", updatedAt: request.time }` | `PERMISSION_DENIED` (tier 2 allows only student deliverable fields & `status == 'submitted'`) |
| 9 | `submissions/{submissionId}` | Post-Approval Tampering | Student updates `githubUrl` after admin already set `status: "approved"` | `PERMISSION_DENIED` (terminal state lock) |
| 10 | `certificates/{certId}` | Direct Certificate Issuance | Verified student creates `{ userId: callerUid, issuanceStatus: "issued", recipientName: "Eve" }` | `PERMISSION_DENIED` (student create blocked) |
| 11 | `courses/{courseId}` | Unauthenticated Email Spoof | Caller has unverified email claim matching allowlisted admin email (`email_verified == false`) updating course fee | `PERMISSION_DENIED` (`email_verified == true` check blocks spoof) |
| 12 | `submissions/{badId}` | ID Poisoning / Denial of Wallet | Student writes document with 200-char ID or 2MB `summary` string | `PERMISSION_DENIED` (`isValidId` + `.size()` guards reject) |
