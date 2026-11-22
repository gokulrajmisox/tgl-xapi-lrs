import type { CourseDefinition } from "./types";

export const SEED_COURSES_PART_2: CourseDefinition[] = [
  {
    id: "course-cybersecurity",
    slug: "cybersecurity-trust-boundaries",
    title: "Cybersecurity & Trust Boundaries Internship Programme",
    subtitle:
      "Harden webhook endpoints, raw-body HMAC SHA-256 verification, replay protection, and role access boundaries — bundled with a 6-week Cloud & Security internship.",
    category: "Infrastructure",
    level: "Intermediate",
    pricePaise: 119900,
    currency: "INR",
    estimatedHours: 14,
    mentorName: "Rhea Kulkarni",
    mentorRole: "Security & Trust Engineer",
    prerequisites: [
      "Experience building at least one HTTP API endpoint in Node.js/TypeScript or Python",
      "Understanding of JSON serialization, HTTP headers, and environment secrets",
    ],
    outcomes: [
      "Verify webhook signatures against exact raw request bytes using constant-time comparison",
      "Prevent duplicate webhook replay attacks with idempotency ledgers",
      "Enforce server-side role claims and reject client-forged payment totals",
      "Complete 6-week Cloud & Security Internship sprints with included completion certificate",
    ],
    includes: [
      "3 deep security engineering modules with raw-body HMAC notes, diagrams & labs",
      "1 applied Webhook Trust Boundary capstone with mentor audit",
      "6-week Cloud & Security Engineering Internship with 2 hands-on security deliverables",
      "Official Internship Completion Certificate included (₹0 extra after approval)",
    ],
    linkedInternshipSlug: "cloud-security-engineering",
    linkedInternshipTitle: "Cloud & Security Engineering Internship",
    internshipDurationWeeks: 6,
    includedCertificateTitle: "Cloud & Security Engineering Internship Completion Certificate",
    completionRequirements: [
      "Complete all 3 Cybersecurity modules, security labs & pass the webhook quiz",
      "Submit HMAC Webhook Verifier & pass Rhea Kulkarni's audit",
      "Approve both 6-week Cloud & Security internship tasks and earn final sign-off",
    ],
    internshipDisclosure:
      "One single Programme Enrolment includes all written notes, curated video embeds, hands-on security labs, mentor audit, the 6-week Cloud & Security Engineering Internship, and your completion certificate at ₹0 extra once deliverables pass review.",
    isPublished: true,
    contentStatus: "published",
    modules: [
      {
        id: "mod-sec-1",
        sortOrder: 1,
        title: "Server-Authoritative Pricing & Input Validation",
        summary: "Eliminate price tampering and privilege escalation by resolving authority strictly on the server.",
        estimatedMinutes: 85,
        learningOutcomes: [
          "Explain why client-sent `amount`, `role`, or `isAdmin` fields must never drive server decisions",
          "Implement fail-closed credential & role guards",
        ],
        lessons: [
          {
            id: "les-sec-1-note",
            sortOrder: 1,
            title: "Why Client-Sent Amounts Are Always Vulnerable",
            lessonType: "note",
            durationLabel: "25 min read",
            summary: "Deriving integer paise amounts directly from authoritative database records.",
            learningObjectives: [
              "Replace client-supplied prices with server-side database lookups",
              "Store and validate currency totals in integer minor units (paise/cents)",
            ],
            realWorldContext:
              "Price-parameter tampering (`amount: 100` instead of `199900`) remains a top-ranked OWASP API authorization vulnerability in payment integrations.",
            noteSections: [
              {
                heading: "Reject Client Totals",
                body: "Checkout requests must send only target IDs (such as courseId or productId). The server looks up the authoritative integer paise price and creates the Razorpay order directly.",
                codeSnippet: `const course = await findPublishedCourse(body.courseId);\nif (!course) return NextResponse.json({ error: "Not found" }, { status: 404 });\nconst order = await createRazorpayOrder({\n  amountPaise: course.pricePaise,\n  currency: "INR",\n});`,
                takeaway: "Never trust price, role, or entitlement flags sent in JSON request bodies.",
              },
              {
                heading: "Fail-Closed Role Checks",
                body: "Authorization helpers must default to denied (`403`) whenever a session token or server-verified admin claim is missing — never fall back to permissive demo mode when Supabase auth is configured.",
                takeaway: "Fail closed on missing credentials; keep test sandboxes strictly isolated.",
              },
            ],
            keyConcepts: [
              {
                term: "Integer Minor Units (Paise)",
                definition: "Representing ₹1,299.00 as integer `129900` avoids binary floating-point rounding drift.",
              },
              {
                term: "Fail-Closed Guard",
                definition: "Rejecting requests immediately if auth configuration or role verification is absent or invalid.",
              },
            ],
            diagram: {
              title: "Authoritative Server Checkout Boundary",
              caption: "The client sends only an identifier; the server owns price lookup and gateway signing.",
              nodes: [
                { role: "1. Client", label: "POST { courseId }", detail: "No amount or role accepted" },
                { role: "2. Server DB", label: "Lookup pricePaise", detail: "Validate range & published status" },
                { role: "3. Gateway", label: "Create Signed Order", detail: "Authenticated Basic Auth secret" },
              ],
            },
            practicalExercise: {
              title: "Patch a Vulnerable Checkout Handler",
              difficulty: "Applied",
              estimatedMinutes: 20,
              objective: "Eliminate a client-supplied `pricePaise` override from a mock Next.js route.",
              instructions: [
                "Inspect the vulnerable snippet trusting `reqBody.pricePaise`.",
                "Look up the product record on the server by `reqBody.courseId` and validate integer paise >= 100.",
                "Return HTTP 400/404 when the ID does not match a published product.",
              ],
              starterCode: `export async function handleCreateOrder(reqBody: { courseId: string; pricePaise: number }) {\n  return createGatewayOrder({ amount: reqBody.pricePaise }); // VULNERABLE\n}`,
              expectedOutput: "Order amount always comes from `course.pricePaise` even if client sends `pricePaise: 1`.",
              hints: ["Remove `pricePaise` from the accepted request schema completely."],
            },
            commonMistakes: [
              {
                mistake: "Validating `pricePaise > 0` on a client-sent field instead of ignoring it",
                whyItHappens: "Confusing input format validation with business authorization.",
                fix: "Do not accept price fields from clients at all; derive totals exclusively on the server.",
              },
            ],
            keyTakeaways: [
              "Accept target IDs from clients, never prices or discount totals.",
              "Represent all currency computations in integer minor units (paise).",
            ],
            knowledgeCheck: {
              question: "A student edits the browser POST payload for `/api/create-order` to `{ courseId: 'c1', amountPaise: 100 }`. What should happen?",
              options: [
                "Create a ₹1 Razorpay order",
                "Ignore any client `amountPaise` field and derive the authoritative fee from the server course record",
                "Charge ₹1 and send an email warning",
              ],
              correctIndex: 1,
              explanation: "Ignoring client amounts completely guarantees the server always charges the catalog price.",
            },
            resources: [
              {
                id: "res-sec-owasp",
                title: "OWASP API Security Top 10 Project",
                provider: "OWASP",
                url: "https://owasp.org/www-project-api-security/",
              },
            ],
          },
          {
            id: "les-sec-1-lab",
            sortOrder: 2,
            title: "Allowlists & Server-Derived Entitlements",
            lessonType: "note",
            durationLabel: "20 min read",
            summary: "Preventing client profile or token metadata escalation with strict server-side checks.",
            learningObjectives: [
              "Separate user-editable display fields from server-only role/admin claims",
              "Enforce strict schema field picking across PATCH and profile sync routes",
            ],
            realWorldContext: "OAuth profile sync routes often accidentally let a client body write `{ role: 'admin' }` into the profiles table.",
            noteSections: [
              {
                heading: "Whitelisting Mutable Profile Fields",
                body: "When syncing a user profile on sign-in or settings update, explicitly pick allowed columns (`full_name`, `avatar_url`) and compute staff/admin role exclusively from server-managed app metadata or server email allowlists.",
                takeaway: "Explicit column whitelists block mass-assignment privilege escalation.",
              },
              {
                heading: "Enforcing Route-Level Entitlement Re-Verification",
                body: "Never trust hidden form fields, JWT UI hints, or client query parameters like `?role=admin`. Every sensitive API route must re-resolve the authenticated actor from signed session cookies and re-check database ownership or staff allowlist membership right before executing mutations.",
                codeSnippet: `const ProfilePatchSchema = z.object({\n  fullName: z.string().trim().min(2).max(80),\n  avatarUrl: z.string().url().optional(),\n});\n// Any unexpected \`role\` or \`isAdmin\` key is stripped automatically.`,
                takeaway: "Verify actor permissions freshly inside each server endpoint, never once on login only.",
              },
            ],
            keyConcepts: [
              {
                term: "Mass Assignment",
                definition: "Vulnerability when request JSON is passed wholesale into DB `.update(body)` calls, mutating unintended columns like `role`.",
              },
              {
                term: "Server-Derived Claim",
                definition: "Authorization role read from signed server metadata or allowlists, never client form state.",
              },
            ],
            practicalExercise: {
              title: "Audit a Profile Update Payload",
              difficulty: "Guided",
              estimatedMinutes: 15,
              objective: "Ensure `{ fullName: 'Aarav', role: 'admin' }` never updates the `role` field.",
              instructions: [
                "Validate the incoming PATCH payload using a strict `.pick({ fullName: true })` Zod schema before any DB update.",
                "Send an adversarial `{ fullName: 'Aarav', role: 'admin' }` request and verify HTTP logs confirm `role` remained `'student'`.",
              ],
              expectedOutput: "Only `fullName` persists; `role` remains unchanged.",
              hints: ["Never pass `await req.json()` directly to `.update(...)`."],
            },
            commonMistakes: [
              {
                mistake: "Checking admin roles only in client React state (`user.role === 'admin'`)",
                whyItHappens: "Forgetting API routes receive unverified HTTP calls directly.",
                fix: "Re-verify admin identity inside every protected Route Handler.",
              },
            ],
            keyTakeaways: [
              "Whitelist editable fields explicitly at every DB mutation.",
              "Check roles inside every API route handler, never UI-only.",
            ],
            knowledgeCheck: {
              question: "What protects a profile PATCH endpoint against mass-assignment attacks?",
              options: [
                "Hiding the role dropdown in CSS",
                "Picking only explicitly allowed fields via a Zod schema before writing to the database",
                "Using POST instead of PATCH",
              ],
              correctIndex: 1,
              explanation: "Schema field picking ensures extra keys like `role: 'admin'` are dropped before database writes.",
            },
            resources: [
              {
                id: "res-sec-zod",
                title: "Zod Schema Validation Documentation",
                provider: "Zod",
                url: "https://zod.dev/",
              },
            ],
          },
        ],
        moduleQuiz: {
          id: "mq-sec-1",
          title: "Module 1 Check: Server Authority & Input Safety",
          passingScorePercent: 67,
          questions: [
            {
              id: "mq-sec-1-q1",
              questionType: "conceptual",
              prompt: "Why represent INR payment amounts in integer paise (e.g. `129900`) rather than floating-point rupees?",
              options: [
                "To avoid IEEE-754 decimal rounding mismatches during signature & gateway reconciliation",
                "JSON does not support decimals",
                "Databases cannot index floats",
              ],
              correctIndex: 0,
              explanation: "Integer minor units guarantee exact arithmetic across app, gateway, and ledger.",
            },
            {
              id: "mq-sec-1-q2",
              questionType: "scenario",
              prompt: "A PATCH `/api/profile` handler receives `{ name: 'Meera', isAdmin: true }`. What prevents privilege escalation?",
              options: [
                "Stripping unknown properties with an explicit Zod schema (`z.object({ name: z.string() })`)",
                "Checking `document.cookie` on the browser",
                "Returning a 200 status with a warning",
              ],
              correctIndex: 0,
              explanation: "Explicit schemas discard unauthorized keys before persistence.",
            },
          ],
        },
      },
      {
        id: "mod-sec-2",
        sortOrder: 2,
        title: "Raw-Body HMAC & Idempotency Guards",
        summary: "Read exact raw request bytes before JSON parsing so HMAC SHA-256 signatures verify cleanly.",
        estimatedMinutes: 95,
        learningOutcomes: [
          "Verify HMAC SHA-256 webhook signatures against unparsed raw request strings",
          "Compare digests with `crypto.timingSafeEqual` and persist processed event IDs",
        ],
        lessons: [
          {
            id: "les-sec-2-note",
            sortOrder: 1,
            title: "Timing-Safe Signature Verification & Replay Prevention",
            lessonType: "note",
            durationLabel: "30 min read",
            summary: "Using `crypto.timingSafeEqual` and deduplicating event IDs idempotently.",
            learningObjectives: [
              "Avoid JSON re-serialization bugs when hashing incoming webhooks",
              "Implement idempotent retry handling returning HTTP 200 on duplicate events",
            ],
            realWorldContext:
              "Payment providers retry webhook deliveries when networks blink; without an idempotency ledger, a single ₹1,299 payment can double-trigger notifications or corrupt enrollments.",
            noteSections: [
              {
                heading: "Preserve Exact Raw Bytes",
                body: "Re-stringifying parsed JSON can alter key ordering or whitespace and break legitimate provider signatures. Always read `await request.text()` first, compute HMAC SHA-256, compare buffers with `crypto.timingSafeEqual`, and record `eventId` in `payment_webhook_events` before applying state transitions.",
                codeSnippet: `import { createHmac, timingSafeEqual } from "node:crypto";\n\nexport function verifyWebhookSignature(rawBody: string, headerSig: string, secret: string): boolean {\n  const expectedHex = createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");\n  const a = Buffer.from(expectedHex, "utf8");\n  const b = Buffer.from(headerSig.trim(), "utf8");\n  return a.length === b.length && timingSafeEqual(a, b);\n}`,
                takeaway: "Return HTTP 200 on already-processed duplicate events without re-running side effects.",
              },
              {
                heading: "Closing Replay Windows with Timestamp & Ledger Guards",
                body: "Signature authenticity alone only proves a payload was signed at some point in time. Record each gateway `eventId` in a unique-indexed ledger table and reject stale retries or duplicate deliveries idempotently so replayed requests never grant duplicate enrollments.",
                takeaway: "Pair HMAC validation with unique-keyed event ledgers for at-most-once settlement.",
              },
            ],
            keyConcepts: [
              {
                term: "Constant-Time Comparison",
                definition: "`crypto.timingSafeEqual` prevents attackers from deducing valid HMAC bytes via response-timing differences.",
              },
              {
                term: "Idempotency Key",
                definition: "Unique event identifier stored persistently so repeated webhook deliveries produce at-most-once state effects.",
              },
            ],
            diagram: {
              title: "Webhook Trust & Idempotency Pipeline",
              caption: "Raw text verification runs before JSON parsing; event ledger prevents duplicate processing.",
              nodes: [
                { role: "1. Raw Stream", label: "request.text()", detail: "Exact unparsed bytes" },
                { role: "2. Crypto", label: "HMAC + timingSafeEqual", detail: "401 if mismatch" },
                { role: "3. Ledger", label: "Check event_id", detail: "200 no-op if already processed" },
                { role: "4. Apply", label: "Activate / Refund", detail: "Atomic state update" },
              ],
            },
            practicalExercise: {
              title: "Test Raw-Body Whitespace Sensitivity",
              difficulty: "Applied",
              estimatedMinutes: 20,
              objective: "Prove that inserting one space into JSON invalidates HMAC-SHA256 verification.",
              instructions: [
                "Generate an HMAC SHA-256 hex digest over `JSON.stringify({ event: 'payment.captured' })`.",
                "Add a single space after the colon and run `verifyWebhookSignature`.",
                "Confirm it returns `false` cleanly without throwing length-mismatch exceptions.",
              ],
              expectedOutput: "Original returns `true`; modified whitespace and short signatures both return `false`.",
              hints: ["Check `a.length === b.length` BEFORE calling `timingSafeEqual(a, b)` so unequal hex strings don't throw RangeError."],
            },
            commonMistakes: [
              {
                mistake: "Calling `timingSafeEqual` on buffers of different byte lengths",
                whyItHappens: "Missing length guard causes an uncaught RangeError (500) on short attacker headers.",
                fix: "Always check `a.length === b.length && timingSafeEqual(a, b)`.",
              },
            ],
            keyTakeaways: [
              "Always read `request.text()` before `JSON.parse()` on webhook endpoints.",
              "Check buffer lengths before calling `timingSafeEqual`.",
              "Deduplicate processed event IDs idempotently.",
            ],
            knowledgeCheck: {
              question: "What happens if your webhook handler runs `JSON.stringify(await req.json())` before verifying the HMAC signature?",
              options: [
                "It speeds up SHA-256 computation",
                "Formatting differences (whitespace, escaped unicode, key order) can break valid signatures",
                "It encrypts the webhook secret",
              ],
              correctIndex: 1,
              explanation: "Even one altered byte invalidates HMAC-SHA256; verify the raw incoming body string directly.",
            },
            resources: [
              {
                id: "res-sec-crypto",
                title: "Node.js Docs: crypto.timingSafeEqual",
                provider: "Node.js Docs",
                url: "https://nodejs.org/api/crypto.html",
              },
            ],
          },
          {
            id: "les-sec-2-video",
            sortOrder: 2,
            title: "Curated Lecture: Node.js Server Architecture & HTTP Pipelines",
            lessonType: "video",
            durationLabel: "40 min watch",
            summary: "Deep dive into HTTP request streams, middleware validation, and server boundaries.",
            learningObjectives: [
              "Trace how Node.js parses incoming HTTP body chunks before route execution",
              "Verify raw request bytes before calling JSON.parse on signed webhooks",
            ],
            realWorldContext: "Automatic JSON body parsers in web frameworks often consume raw bytes before custom signature middleware runs.",
            noteSections: [
              {
                heading: "Key Focus: Request Stream Ordering",
                body: "Observe how request stream parsing behaves prior to middleware mutation so you always preserve raw body buffers on webhook routes.",
                takeaway: "Capture raw request text cleanly on webhook routes.",
              },
            ],
            keyConcepts: [
              {
                term: "Stream Consumption",
                definition: "Once an HTTP Request body stream is read once as JSON, calling `.text()` later fails unless raw bytes are read first.",
              },
              {
                term: "Raw Body Verification",
                definition: "Hashing untouched UTF-8 request text to match provider HMAC signatures without formatting drift.",
              },
            ],
            practicalExercise: {
              title: "Reorder Route Parsing to Verify Before Parsing JSON",
              difficulty: "Guided",
              estimatedMinutes: 10,
              objective: "Fix a route handler calling `req.json()` before signature verification.",
              instructions: [
                "Read `const raw = await req.text()` once at the top of the handler and pass `raw` directly into HMAC verification.",
                "Parse JSON with `JSON.parse(raw)` inside a `try/catch` block only after signature verification succeeds.",
              ],
              expectedOutput: "Handler verifies exact signature first and rejects invalid signatures with HTTP 401.",
              hints: ["Wrap `JSON.parse(raw)` in `try/catch` returning 400 after signature succeeds."],
            },
            commonMistakes: [
              {
                mistake: "Calling both `await req.json()` and `await req.text()` on the same Request",
                whyItHappens: "Web Fetch API Request bodies are single-use readable streams.",
                fix: "Read `await req.text()` once, verify signature, then `JSON.parse(rawBody)`.",
              },
            ],
            keyTakeaways: [
              "Fetch `Request` body streams can only be read once.",
              "Always validate raw HMAC digests before parsing JSON payloads.",
            ],
            knowledgeCheck: {
              question: "In Next.js Route Handlers, how should you obtain both the raw string for HMAC and the parsed object?",
              options: [
                "Call `req.json()` first, then `req.text()`",
                "Call `await req.text()` once, verify the signature, then call `JSON.parse(raw)`",
                "Use `req.clone()` on every GET request",
              ],
              correctIndex: 1,
              explanation: "Reading `.text()` once and parsing JSON afterwards avoids stream consumption errors.",
            },
            youtubeVideoId: "Oe421EPjeBE",
            youtubeUrl: "https://www.youtube.com/watch?v=Oe421EPjeBE",
            videoCreator: "freeCodeCamp.org (YouTube)",
            resources: [
              {
                id: "res-sec-route-handlers",
                title: "Next.js Route Handlers Reference",
                provider: "Next.js Docs",
                url: "https://nextjs.org/docs/app/building-your-application/routing/route-handlers",
              },
            ],
          },
        ],
        moduleQuiz: {
          id: "mq-sec-2",
          title: "Module 2 Check: Raw-Body HMAC & Idempotency",
          passingScorePercent: 67,
          questions: [
            {
              id: "mq-sec-2-q1",
              questionType: "code",
              prompt: "Why must you check `bufA.length === bufB.length` prior to `crypto.timingSafeEqual(bufA, bufB)`?",
              options: [
                "Because `timingSafeEqual` throws a RangeError if lengths differ, risking a 500 error on malformed headers",
                "To convert hex into Base64",
                "Node.js omits SHA-256 padding otherwise",
              ],
              correctIndex: 0,
              explanation: "Length-checking first ensures malformed signatures return `false` cleanly (401) rather than crashing (500).",
            },
            {
              id: "mq-sec-2-q2",
              questionType: "scenario",
              prompt: "Razorpay delivers the identical `evt_991` `payment.captured` webhook twice due to a network timeout. What should the second call do?",
              options: [
                "Create a second enrollment and send a second receipt email",
                "Detect `evt_991` in the processed events ledger and return HTTP 200 without duplicating side effects",
                "Return HTTP 500",
              ],
              correctIndex: 1,
              explanation: "Returning 200 idempotently signals safe receipt while guaranteeing at-most-once state updates.",
            },
          ],
        },
      },
      {
        id: "mod-sec-3",
        sortOrder: 3,
        title: "Capstone: HMAC Webhook & Idempotency Guard",
        summary: "Build and test a production-grade webhook trust boundary with tamper & replay coverage.",
        estimatedMinutes: 100,
        learningOutcomes: ["Ship a tested webhook verifier handling valid events, replays, refunds, and tampered headers"],
        lessons: [
          {
            id: "les-sec-3-project",
            sortOrder: 1,
            title: "Milestone Brief: Harden Payment Webhook Handler",
            lessonType: "project_milestone",
            durationLabel: "Build project",
            summary: "Implement signature checks, replay protection, and automated tamper tests.",
            learningObjectives: [
              "Verify tamper rejection (401), idempotent duplicates (200), and refund revocation",
              "Validate buffer lengths prior to crypto.timingSafeEqual to avoid 500 crashes",
            ],
            realWorldContext: "Security teams audit webhook endpoints rigorously before clearing payment go-lives.",
            noteSections: [
              {
                heading: "Security Verification",
                body: "Include automated tests proving whitespace edits invalidate signatures, short headers fail safely without 500s, and duplicate event IDs do not issue double enrollments.",
                takeaway: "Test both rejection paths and idempotent replay paths.",
              },
            ],
            keyConcepts: [
              {
                term: "Replay Attack / Duplicate Delivery",
                definition: "Re-sending a legitimately signed webhook payload multiple times to trigger repeated side effects.",
              },
              {
                term: "Fail-Closed Handler",
                definition: "Rejecting missing secrets or malformed signatures with 401/500 before running any entitlement writes.",
              },
            ],
            practicalExercise: {
              title: "Verify Refund Revocation State Transition",
              difficulty: "Applied",
              estimatedMinutes: 15,
              objective: "Confirm a signed `refund.processed` event revokes access cleanly.",
              instructions: [
                "Simulate an active enrollment payment capture, then dispatch a signed `refund.processed` webhook payload.",
                "Assert the enrollment status flips to `refunded` and a subsequent `getCourseDetailForActor` call returns `locked: true`.",
              ],
              expectedOutput: "Re-fetching locked details immediately returns `locked: true`.",
              hints: ["Ensure refund handler checks event ID idempotently just like payment capture."],
            },
            commonMistakes: [
              {
                mistake: "Testing only the valid signature happy path",
                whyItHappens: "Missing negative security assertions.",
                fix: "Write explicit assertions for altered whitespace, wrong secret, truncated signature, and replayed event ID.",
              },
            ],
            keyTakeaways: [
              "Test both invalid signature rejection and duplicate-event idempotency.",
              "Persist processed webhook event IDs durably before committing state changes.",
            ],
            knowledgeCheck: {
              question: "Which test case proves idempotency on a payment webhook handler?",
              options: [
                "Sending one invalid signature",
                "Sending the exact same signed `event_id` twice and verifying side effects execute only once",
                "Increasing the timeout to 30 seconds",
              ],
              correctIndex: 1,
              explanation: "Replaying the same valid event twice directly verifies duplicate ledger protection.",
            },
            resources: [
              {
                id: "res-sec-crypto-2",
                title: "Node.js Crypto API Reference",
                provider: "Node.js Docs",
                url: "https://nodejs.org/api/crypto.html",
              },
            ],
          },
        ],
        moduleQuiz: {
          id: "mq-sec-3",
          title: "Module 3 Check: Webhook Hardening Sign-Off",
          passingScorePercent: 67,
          questions: [
            {
              id: "mq-sec-3-q1",
              questionType: "conceptual",
              prompt: "Where must webhook secrets (`RAZORPAY_WEBHOOK_SECRET`) be stored?",
              options: [
                "In `.env` server-side only, never exposed via `NEXT_PUBLIC_` or logs",
                "Inside client browser localStorage",
                "Committed to README examples",
              ],
              correctIndex: 0,
              explanation: "Secrets belong strictly in server environment variables outside client bundles and logs.",
            },
            {
              id: "mq-sec-3-q2",
              questionType: "scenario",
              prompt: "When a refund event is verified, what must update immediately?",
              options: [
                "Only the UI button text",
                "Authoritative database payment & course enrollment status (`refunded`) so access locks on next request",
                "Browser favicon",
              ],
              correctIndex: 1,
              explanation: "Entitlement revocation must persist in authoritative database status.",
            },
          ],
        },
      },
    ],
    project: {
      slug: "webhook-trust-boundary",
      title: "HMAC Webhook Verifier & Idempotency Guard",
      summary:
        "Implement timing-safe HMAC SHA-256 signature verification, replay protection, and full refund revocation handling.",
      brief:
        "Harden a webhook endpoint against tampered signatures, body-whitespace mutations, and duplicate delivery replays with clear audit logs.",
      estimatedHours: 8,
      problemStatement:
        "Naive webhook endpoints parse JSON before checking signatures or forget idempotency ledgers, exposing platforms to forged activations and duplicate grants.",
      useCase:
        "Reusable cryptographic webhook gateway module securing checkout captures and refund revocations.",
      technologies: ["TypeScript", "Node crypto", "Next.js Route Handlers", "Node Test Runner"],
      milestones: [
        "Implement raw-body HMAC SHA-256 signature check using timingSafeEqual",
        "Persist processed event IDs for idempotent retry handling",
        "Verify tampered payloads return 401 and duplicates return 200 safely",
      ],
      deliverables: [
        "Webhook route handler & cryptographic verifier module",
        "Automated security unit tests",
        "Threat model note detailing key storage and replay windows",
      ],
      rubric: [
        "Constant-time signature validation",
        "Strict deduplication across duplicate deliveries",
        "Zero secrets leaked in logs or client bundles",
      ],
      structuredRubric: [
        {
          criterion: "Raw-Body Constant-Time Crypto Verification",
          weightPercent: 40,
          expectation: "Reads exact raw body string before JSON.parse and verifies hex buffer via length-checked timingSafeEqual.",
        },
        {
          criterion: "Idempotent Event Ledger & Refund Handling",
          weightPercent: 35,
          expectation: "Deduplicates event IDs safely (HTTP 200) and revokes active access on verified refunds.",
        },
        {
          criterion: "Automated Security Tests & Threat Model",
          weightPercent: 25,
          expectation: "Tests verify tamper, whitespace shift, short header, and replay cases cleanly.",
        },
      ],
      submissionInstructions: [
        "Submit public GitHub link with verifier module, threat model note, and test run output.",
      ],
      mentorName: "Rhea Kulkarni",
      mentorRole: "Security & Trust Engineer",
    },
  },
  {
    id: "course-product-ux",
    slug: "product-design-accessibility",
    title: "Product Architecture & Accessible UI Internship Programme",
    subtitle:
      "Turn dense feature sprawl into calm, responsive multi-role navigation and mobile-friendly touch ergonomics — bundled with internship tasks and included certification.",
    category: "Product & design",
    level: "Foundations",
    pricePaise: 49900,
    currency: "INR",
    estimatedHours: 10,
    mentorName: "Tara Sengupta",
    mentorRole: "Design Systems Lead",
    prerequisites: [
      "Basic HTML & CSS layout experience (Flexbox / CSS Grid)",
      "Familiarity opening browser DevTools responsive mode",
    ],
    outcomes: [
      "Audit sticky headers and bottom bars to stay compact (<15% viewport height) on 390px viewports",
      "Design unboxed typographic metadata and high-contrast interactive controls (WCAG AA 4.5:1)",
      "Build synchronized keyboard and screen-reader alternatives for custom interactive selectors",
      "Finish UX critique deliverables and internship sprints to unlock your included certificate",
    ],
    includes: [
      "3 concise modules on layout math, typography, color contrast & mobile touch ergonomics",
      "Hands-on accessibility critique exercises, module quizzes & UX specification project",
      "Included Full-Stack Product Engineering Internship track & task feedback",
      "Official Internship Completion Certificate included (₹0 extra after approval)",
    ],
    linkedInternshipSlug: "full-stack-product-engineering",
    linkedInternshipTitle: "Full-Stack Product Engineering Internship",
    internshipDurationWeeks: 8,
    includedCertificateTitle: "Product Architecture & Engineering Internship Certificate",
    completionRequirements: [
      "Complete all 3 Product Architecture modules, exercises & pass the accessibility quiz",
      "Submit Accessible Multi-Role Interface Critique and pass Tara Sengupta's review",
      "Complete linked internship deliverables and receive final mentor approval",
    ],
    internshipDisclosure:
      "One Programme Enrolment unlocks all notes, curated videos, hands-on UX labs, mentor critique, internship participation, and your official completion certificate at ₹0 extra once approved.",
    isPublished: true,
    contentStatus: "published",
    modules: [
      {
        id: "mod-ux-1",
        sortOrder: 1,
        title: "Information Hierarchy & Role Clarity",
        summary: "Give learners, mentors, and admins focused controls without visual pill clutter.",
        estimatedMinutes: 70,
        learningOutcomes: [
          "Separate quiet typographic metadata from primary call-to-action buttons",
          "Enforce WCAG AA text contrast in both Light Glassmorphism and Dark themes",
        ],
        lessons: [
          {
            id: "les-ux-1-note",
            sortOrder: 1,
            title: "Separating Static Metadata from Interactive Actions",
            lessonType: "note",
            durationLabel: "20 min read",
            summary: "Keeping cards scannable with typographic discipline and single-line controls.",
            learningObjectives: [
              "Eliminate decorative border-pill clutter from read-only labels",
              "Establish crisp focal points with 1 primary action per card",
            ],
            realWorldContext:
              "When every tag, duration, and category looks like a rounded button pill, learners suffer decision fatigue and miss the actual 'Continue Learning' CTA.",
            noteSections: [
              {
                heading: "Unboxed Metadata vs. Action Controls",
                body: "Reserve bordered pills and high-contrast fills exclusively for interactive buttons and filter tabs. Display durations, levels, and categories cleanly with inline middot (`·`) separators and `tabular-nums` alignment.",
                codeSnippet: `<p className="text-xs text-muted-foreground tabular-nums">\n  <span>{course.category}</span>\n  <span aria-hidden="true"> · </span>\n  <span>{course.estimatedHours}h study</span>\n  <span aria-hidden="true"> · </span>\n  <span>{course.lessonCount} lessons</span>\n</p>`,
                takeaway: "Users spot actionable buttons instantaneously when static metadata stays quiet.",
              },
              {
                heading: "Dual-Theme Contrast Discipline",
                body: "Light frosted glass cards require rich charcoal ink (`#0F172A`) and readable secondary text (`#475569`) while dark themes must maintain >= 4.5:1 contrast on subtle card surfaces.",
                takeaway: "Verify both Light and Dark tokens before shipping custom themes.",
              },
            ],
            keyConcepts: [
              {
                term: "Zero-Pill Discipline",
                definition: "Limiting rounded pill borders strictly to clickable controls rather than static labels.",
              },
              {
                term: "Tabular Numerals (tabular-nums)",
                definition: "Equal-width numeric glyphs preventing layout jitter when counters or timers change.",
              },
            ],
            diagram: {
              title: "Card Optical Hierarchy Pyramid",
              caption: "Reader eye flow from quiet eyebrow metadata -> bold heading -> primary CTA.",
              nodes: [
                { role: "1. Eyebrow", label: "Quiet Middot Metadata", detail: "Category · 18h · Intermediate" },
                { role: "2. Anchor", label: "Crisp Card Heading", detail: "Tight tracking headline" },
                { role: "3. Action", label: "Single Primary Pill CTA", detail: "Enrol Now / Continue" },
              ],
            },
            practicalExercise: {
              title: "Declutter a Pill-Overloaded Course Card",
              difficulty: "Guided",
              estimatedMinutes: 15,
              objective: "Convert 5 bordered tag chips into clean middot-separated typographic metadata.",
              instructions: [
                "Inspect the cluttered starter markup wrapping Duration, Level, Mentor, and Price in bordered pills.",
                "Replace non-interactive chips with a clean single-line middot metadata row.",
                "Keep only the 'Continue Learning' button styled as an interactive pill.",
              ],
              starterCode: `<div className="flex flex-wrap gap-2">\n  <span className="rounded-full border px-2">12h</span>\n  <span className="rounded-full border px-2">Core</span>\n  <span className="rounded-full border px-2">Python</span>\n</div>`,
              expectedOutput: "Clean single row: `Core · 12h · Python` above a high-contrast primary action button.",
              hints: ["Use `font-variant-numeric: tabular-nums` (`tabular-nums`) for durations."],
            },
            commonMistakes: [
              {
                mistake: "Using `opacity-40` for helper text on light glass backgrounds",
                whyItHappens: "Trying to create subtle hierarchy with transparency instead of semantic tokens.",
                fix: "Use calibrated muted tokens meeting >= 4.5:1 WCAG contrast.",
              },
            ],
            keyTakeaways: [
              "Reserve pill borders for actual buttons and tabs.",
              "Keep numbers aligned cleanly with `tabular-nums`.",
            ],
            knowledgeCheck: {
              question: "Which rule keeps a course card scannable on mobile and desktop?",
              options: [
                "Putting every metadata tag inside its own bordered pill",
                "Displaying static metadata as middot-separated text and reserving high-contrast fills for interactive buttons",
                "Removing card titles entirely",
              ],
              correctIndex: 1,
              explanation: "Quiet static metadata makes interactive controls stand out effortlessly.",
            },
            resources: [
              {
                id: "res-ux-contrast",
                title: "MDN: Understanding WCAG Color Contrast",
                provider: "MDN Web Docs",
                url: "https://developer.mozilla.org/en-US/docs/Web/Accessibility/Understanding_WCAG/Perceivable/Color_contrast",
              },
              {
                id: "res-ux-webdev",
                title: "web.dev: Accessibility Craft Collection",
                provider: "web.dev",
                url: "https://web.dev/explore/accessible",
              },
            ],
          },
          {
            id: "les-ux-1-video",
            sortOrder: 2,
            title: "Curated Lecture: JavaScript Event Loop & UI Responsiveness",
            lessonType: "video",
            durationLabel: "26 min watch",
            summary: "Why non-blocking rendering keeps interactive selectors and scroll animations crisp.",
            learningObjectives: [
              "Understand how long synchronous tasks starve UI frames and click responsiveness",
              "Prefer composited transform and opacity transitions over layout-thrashing properties",
            ],
            realWorldContext: "Even clean glassmorphism feels laggy if heavy synchronous loops run on the main thread during pointer events.",
            noteSections: [
              {
                heading: "UI Budget Takeaway",
                body: "Keep routine interactions below 200ms and animate GPU-friendly transform/opacity properties cleanly.",
                takeaway: "Never block main-thread paint cycles inside pointer handlers.",
              },
            ],
            keyConcepts: [
              {
                term: "Frame Budget (~16.6ms)",
                definition: "Maximum time per animation frame to maintain smooth 60fps interaction.",
              },
              {
                term: "Compositor-Only Property",
                definition: "Properties like `transform` and `opacity` animated by the GPU without recalculating page layout.",
              },
            ],
            practicalExercise: {
              title: "Choose GPU-Composited Properties",
              difficulty: "Guided",
              estimatedMinutes: 10,
              objective: "Replace layout-thrashing width/top transitions with `transform` and `opacity`.",
              instructions: [
                "Audit interactive hover and drawer transitions for layout-triggering properties like `width`, `height`, or `left`.",
                "Swap them to compositor-safe `transform` (`translate`, `scale`) and `opacity` classes to preserve smooth 60fps frames.",
              ],
              expectedOutput: "`transition-transform` and `transition-opacity` instead of animating `height` or `left`.",
              hints: ["Use `translateX`/`translateY` and `scale` for micro-interactions."],
            },
            commonMistakes: [
              {
                mistake: "Animating `top`/`left` or `width` every frame on scroll",
                whyItHappens: "Triggering full browser layout recalculation continuously.",
                fix: "Animate `transform` and `opacity` instead.",
              },
            ],
            keyTakeaways: [
              "Keep pointer interactions non-blocking and animate composited properties.",
              "Profile heavy handlers so routine interactions respond under 200ms.",
            ],
            knowledgeCheck: {
              question: "Which CSS properties animate smoothly without forcing browser layout reflow?",
              options: ["`width` and `margin-left`", "`transform` and `opacity`", "`padding-top` and `font-size`"],
              correctIndex: 1,
              explanation: "Transform and opacity run cleanly on the compositor layer.",
            },
            youtubeVideoId: "8aGhZQkoFbQ",
            youtubeUrl: "https://www.youtube.com/watch?v=8aGhZQkoFbQ",
            videoCreator: "JSConf / Philip Roberts (YouTube)",
            resources: [
              {
                id: "res-ux-webdev",
                title: "web.dev Accessibility Fundamentals",
                provider: "web.dev",
                url: "https://web.dev/explore/accessible",
              },
            ],
          },
        ],
        moduleQuiz: {
          id: "mq-ux-1",
          title: "Module 1 Check: Hierarchy & Responsiveness",
          passingScorePercent: 67,
          questions: [
            {
              id: "mq-ux-1-q1",
              questionType: "conceptual",
              prompt: "What happens when both static tags and primary CTA buttons share identical pill shapes?",
              options: [
                "Users click unclickable labels and miss the true primary CTA",
                "Fonts render bolder automatically",
                "Page weight drops",
              ],
              correctIndex: 0,
              explanation: "Visual ambiguity reduces conversion and frustrates keyboard/mouse scanning.",
            },
            {
              id: "mq-ux-1-q2",
              questionType: "scenario",
              prompt: "A dark-mode muted subtitle has a 2.8:1 contrast ratio. Does it pass WCAG AA?",
              options: [
                "Yes, dark mode has no contrast requirements",
                "No — standard body text requires at least 4.5:1 contrast",
                "Only if centered",
              ],
              correctIndex: 1,
              explanation: "WCAG AA mandates >= 4.5:1 for normal-sized text.",
            },
          ],
        },
      },
      {
        id: "mod-ux-2",
        sortOrder: 2,
        title: "Mobile Touch Ergonomics & Accessible Fallbacks",
        summary: "Pair spatial/rotational UI controls with keyboard buttons and 44px touch targets.",
        estimatedMinutes: 75,
        learningOutcomes: [
          "Audit 390x844 mobile frames for zero horizontal scroll and 44px minimum touch targets",
          "Provide direct button/keyboard alternatives alongside gesture controls",
        ],
        lessons: [
          {
            id: "les-ux-2-note",
            sortOrder: 1,
            title: "Dual Input Support for Interactive Selectors",
            lessonType: "note",
            durationLabel: "20 min read",
            summary: "Ensuring wheels, sliders, and canvases always work smoothly with keyboards and thumbs.",
            learningObjectives: [
              "Keep sticky chrome compact (< 15% of 390px viewport height)",
              "Avoid gesture-only traps with visible tap buttons",
            ],
            realWorldContext:
              "Delightful drag sliders or magnetic buttons break completely for voice-control users and crowded-bus commuters unless paired with single-tap button equivalents.",
            noteSections: [
              {
                heading: "Keyboard & Click Parity",
                body: "Any draggable dial or slide-to-submit control must also expose direct clickable fallback buttons (`min-h-11`, >= 44px hit height) and clear status feedback.",
                codeSnippet: `<div className="flex flex-col items-center gap-2">\n  <SlideCommit onConfirm={handleSubmit} />\n  <button type="button" onClick={handleSubmit} className="min-h-11 px-5 rounded-full">\n    Submit directly\n  </button>\n</div>`,
                takeaway: "Delightful physics should enhance—never replace—direct keyboard and touch clarity.",
              },
              {
                heading: "Protecting Horizontal Bounds Across Breakpoints",
                body: "Responsive multi-column layouts frequently break on 390px viewports when `<pre>` code blocks or long URLs expand grid tracks beyond screen width. Apply `min-w-0` on grid/flex containers and `overflow-x-auto` on code snippets so scrolling stays contained inside cards.",
                takeaway: "Every grid/flex child holding dynamic text or code needs `min-w-0`.",
              },
            ],
            keyConcepts: [
              {
                term: "44px Touch Target",
                definition: "Minimum recommended interactive target height/width (`min-h-11` in Tailwind) for comfortable thumb taps.",
              },
              {
                term: "Grid Shrink Guard (`min-w-0`)",
                definition: "CSS utility overriding default `min-width: auto` so inner scrollable `<pre>` elements don't break 390px screens.",
              },
            ],
            practicalExercise: {
              title: "390px Overflow & Touch Target Inspection",
              difficulty: "Applied",
              estimatedMinutes: 15,
              objective: "Eliminate horizontal scroll caused by long unbroken URLs or code snippets on mobile.",
              instructions: [
                "Inspect `<pre>` and URL display blocks on 390px width.",
                "Apply `min-w-0` on parent grid/flex tracks and `overflow-x-auto` / `break-all` appropriately.",
              ],
              expectedOutput: "`document.documentElement.scrollWidth <= 390` across all programme pages.",
              hints: ["CSS Grid children need `min-w-0` to allow inner `<pre>` elements to scroll internally rather than widening the page."],
            },
            commonMistakes: [
              {
                mistake: "Forgetting `min-w-0` on flex/grid columns containing code blocks",
                whyItHappens: "Grid items default to `min-width: auto`, pushing mobile viewports wider than 390px.",
                fix: "Add `min-w-0` on the grid column wrapper and `overflow-x-auto` on `<pre>`.",
              },
            ],
            keyTakeaways: [
              "Always pair custom drag gestures with standard 44px buttons.",
              "Verify `scrollWidth <= innerWidth` on 390px screens.",
            ],
            knowledgeCheck: {
              question: "Why does a `<pre>` code block inside a CSS Grid column sometimes break 390px mobile layout even with `overflow-x-auto`?",
              options: [
                "CSS Grid items default to `min-width: auto` unless `min-w-0` is added to the grid child",
                "`<pre>` does not support Tailwind classes",
                "HTML forbids code inside grids",
              ],
              correctIndex: 0,
              explanation: "Adding `min-w-0` allows the grid track to shrink to viewport bounds so `overflow-x-auto` activates.",
            },
            resources: [
              {
                id: "res-ux-aria-2",
                title: "W3C WAI-ARIA Authoring Practices Patterns",
                provider: "W3C",
                url: "https://www.w3.org/WAI/ARIA/apg/patterns/",
              },
            ],
          },
          {
            id: "les-ux-2-notes-mobile",
            sortOrder: 2,
            title: "Compact Sticky Headers & Content Preservation",
            lessonType: "note",
            durationLabel: "15 min read",
            summary: "Keeping sticky headers unobtrusive so students read lessons uninterrupted on phones.",
            learningObjectives: [
              "Measure sticky header height ratios on 844px mobile viewports",
              "Scope desktop sticky sidebars strictly to `lg:sticky` breakpoints",
            ],
            realWorldContext: "Oversized stacked sticky headers consume 30–40% of a phone screen, leaving tiny reading slits.",
            noteSections: [
              {
                heading: "The 15% Chrome Budget",
                body: "Collapse secondary navigation into clean hamburger drawers below `md:` and reserve `lg:sticky` only for desktop sidebars so mobile screens scroll naturally without trapped heights.",
                takeaway: "Content first: mobile sticky chrome should never exceed ~15% of viewport height.",
              },
              {
                heading: "Preserve Scroll Context on Active Step Navigation",
                body: "When switching lessons or collapsing navigation drawers on mobile, scroll only the workspace container or focus the heading smoothly without trapping keyboard focus inside closed overlays. Always trap focus inside true modal dialogs and restore focus on close.",
                takeaway: "Use `role='dialog'` with Escape close and focus return for inspection modals.",
              },
            ],
            keyConcepts: [
              {
                term: "Viewport Chrome Ratio",
                definition: "Percentage of screen height occupied by fixed/sticky navigation bars instead of actual study content.",
              },
              {
                term: "Breakpoint-Scoped Stickiness",
                definition: "Applying `lg:sticky` only when vertical height and multi-column width permit sidebars safely.",
              },
            ],
            practicalExercise: {
              title: "Scope Sticky Sidebars to Desktop (`lg:sticky`)",
              difficulty: "Guided",
              estimatedMinutes: 10,
              objective: "Ensure mobile users don't get stuck behind tall sticky sidebars.",
              instructions: [
                "Inspect sidebar sticky classes across breakpoints in mobile DevTools (`390x844`).",
                "Prefix sticky classes with `lg:sticky lg:top-24` so narrow mobile viewports stack cleanly without trapping vertical scroll.",
              ],
              expectedOutput: "Sidebar stacks cleanly below/above on mobile while sticking on desktop.",
              hints: ["Use `lg:sticky lg:top-24`."],
            },
            commonMistakes: [
              {
                mistake: "Putting `sticky top-20` unconditionally on a 400px-tall card",
                whyItHappens: "Desktop pattern carried blindly to mobile breakpoints.",
                fix: "Apply `lg:sticky lg:top-24` only above `1024px`.",
              },
            ],
            keyTakeaways: [
              "Keep mobile sticky headers single-row and scope sticky sidebars to desktop.",
              "Audit both 390px and 1440px scroll flows so reading areas stay unobstructed.",
            ],
            knowledgeCheck: {
              question: "How should desktop sticky progress sidebars behave on a 390px phone?",
              options: [
                "Stay sticky over the lesson text",
                "Stack naturally in document flow without sticking (`lg:sticky`)",
                "Hide all progress data permanently",
              ],
              correctIndex: 1,
              explanation: "Desktop sticky classes should use `lg:sticky` so mobile views flow naturally.",
            },
            resources: [
              {
                id: "res-ux-keyboard",
                title: "MDN Keyboard-navigable JavaScript widgets",
                provider: "MDN Web Docs",
                url: "https://developer.mozilla.org/en-US/docs/Web/Accessibility/Keyboard-navigable_JavaScript_widgets",
              },
            ],
          },
        ],
        moduleQuiz: {
          id: "mq-ux-2",
          title: "Module 2 Check: Mobile Ergonomics",
          passingScorePercent: 67,
          questions: [
            {
              id: "mq-ux-2-q1",
              questionType: "code",
              prompt: "Which Tailwind utility pair fixes a `<pre>` snippet pushing a 390px CSS Grid column horizontally off-screen?",
              options: [
                "`min-w-0` on the grid column + `overflow-x-auto` on `<pre>`",
                "`whitespace-nowrap` on headings",
                "`fixed inset-0`",
              ],
              correctIndex: 0,
              explanation: "`min-w-0` unlocks shrinking on grid children so internal scrolling works cleanly.",
            },
            {
              id: "mq-ux-2-q2",
              questionType: "conceptual",
              prompt: "Why expose a direct button alongside a slide-to-submit gesture control?",
              options: [
                "To double page height",
                "To guarantee keyboard, switch-device, and single-tap accessibility parity",
                "CSS animations require two buttons",
              ],
              correctIndex: 1,
              explanation: "Drag gestures are optional delight; direct tap/keyboard controls guarantee universal usability.",
            },
          ],
        },
      },
      {
        id: "mod-ux-3",
        sortOrder: 3,
        title: "Capstone: Multi-Role Interface Critique",
        summary: "Deliver a responsive UI audit and interactive navigation specification across roles.",
        estimatedMinutes: 85,
        learningOutcomes: ["Execute measurable desktop + mobile audits tying screenshots to CSS/DOM fixes"],
        lessons: [
          {
            id: "les-ux-3-project",
            sortOrder: 1,
            title: "Milestone Brief: Accessible Multi-Role Critique",
            lessonType: "project_milestone",
            durationLabel: "Build project",
            summary: "Audit desktop (1440px) and mobile (390px) flows and propose measurable improvements.",
            learningObjectives: [
              "Pair concrete before/after screenshots with contrast & DOM fixes",
              "Verify full keyboard Tab traversal and focus rings across Student, Mentor, and Admin screens",
            ],
            realWorldContext: "Design engineers present measurable viewport metrics—not vague opinions—during product reviews.",
            noteSections: [
              {
                heading: "Deliverable Checklist",
                body: "Capture before/after viewport measurements, contrast ratios, and keyboard tab order notes across Student, Mentor, and Admin views.",
                takeaway: "Pair every aesthetic critique with a concrete DOM/CSS fix.",
              },
            ],
            keyConcepts: [
              {
                term: "Audit Traceability",
                definition: "Linking each UI defect to its exact viewport, reproduction step, and targeted CSS/HTML fix.",
              },
              {
                term: "Dual-Theme Contrast Parity",
                definition: "Ensuring semantic color tokens satisfy WCAG AA across both Light Glassmorphism and Obsidian Dark themes.",
              },
            ],
            practicalExercise: {
              title: "Complete a 5-Item Mobile Viewport Checklist",
              difficulty: "Applied",
              estimatedMinutes: 15,
              objective: "Verify overflow, tap targets, sticky ratio, contrast, and focus ring visibility.",
              instructions: [
                "Inspect a live portal page at `390x844` in browser DevTools and verify `document.documentElement.scrollWidth <= 390`.",
                "Tab through every interactive button and modal dialog to document contrast, target size (`>= 44px`), and focus-ring findings.",
              ],
              expectedOutput: "Actionable 5-point audit table with severity ratings.",
              hints: ["Measure `scrollWidth` in the DevTools console."],
            },
            commonMistakes: [
              {
                mistake: "Auditing only at 1440px desktop width",
                whyItHappens: "Developing on large laptops without resizing the viewport.",
                fix: "Test 390x844 mobile and keyboard Tab order before finalizing any screen.",
              },
            ],
            keyTakeaways: [
              "Always verify both Light and Dark contrast alongside mobile 390px scroll bounds.",
              "Document concrete selectors and measurable verification metrics in every UI audit.",
            ],
            knowledgeCheck: {
              question: "What makes a UX design critique immediately actionable for engineers?",
              options: [
                "Saying 'the page feels busy'",
                "Listing exact viewport, selector/element, WCAG/layout impact, and concrete fix",
                "Changing brand colors randomly",
              ],
              correctIndex: 1,
              explanation: "Specific defect + measurable impact + targeted fix accelerates implementation.",
            },
            resources: [
              {
                id: "res-ux-contrast-2",
                title: "MDN Understanding WCAG Color Contrast",
                provider: "MDN Web Docs",
                url: "https://developer.mozilla.org/en-US/docs/Web/Accessibility/Understanding_WCAG/Perceivable/Color_contrast",
              },
            ],
          },
        ],
        moduleQuiz: {
          id: "mq-ux-3",
          title: "Module 3 Check: Audit & Delivery Standards",
          passingScorePercent: 67,
          questions: [
            {
              id: "mq-ux-3-q1",
              questionType: "scenario",
              prompt: "Your audit reveals `scrollWidth = 440px` on a `390px` viewport. Which severity should this carry?",
              options: ["Low", "High — horizontal mobile overflow breaks core reading & touch usability", "Ignore"],
              correctIndex: 1,
              explanation: "Unintended horizontal scrolling is a high-severity responsiveness defect.",
            },
            {
              id: "mq-ux-3-q2",
              questionType: "conceptual",
              prompt: "Why check keyboard Tab order across Student, Mentor, and Admin screens?",
              options: [
                "To make animations bounce faster",
                "To catch unreachable buttons, trapped modals, and missing focus rings",
                "To test server response headers",
              ],
              correctIndex: 1,
              explanation: "Keyboard traversal exposes hidden accessibility defects missed by mouse testing.",
            },
          ],
        },
      },
    ],
    project: {
      slug: "design-system-audit",
      title: "Accessible Multi-Role Interface Critique & Spec",
      summary:
        "Audit mobile sticky caps, contrast budgets, and accessible navigation across student, mentor, and admin flows.",
      brief:
        "Produce an actionable interface audit and working prototype fixing overflow, touch target sizes, and keyboard navigation ergonomics.",
      estimatedHours: 6,
      problemStatement:
        "Multi-role edtech tools frequently break on 390px mobile screens, overload cards with pill clutter, and hide keyboard focus rings.",
      useCase:
        "Design-engineering audit specification paired with working CSS/React PR fixes.",
      technologies: ["React", "Tailwind CSS", "WCAG 2.1 AA", "Playwright / DevTools"],
      milestones: [
        "Inspect desktop (1440px) and mobile (390px) sticky chrome ratios",
        "Document accessible focus states and screen-reader labels",
        "Implement clean responsive navigation adjustments",
      ],
      deliverables: [
        "Written UX & accessibility specification",
        "Working responsive fix PR or demo link",
        "Keyboard walkthrough checklist",
      ],
      rubric: [
        "Zero horizontal scroll on 390px mobile",
        "WCAG AA contrast compliance",
        "Clean hierarchy across role views",
      ],
      structuredRubric: [
        {
          criterion: "Responsive 390px & 1440px Layout Integrity",
          weightPercent: 35,
          expectation: "Zero horizontal overflow, compact header height, >= 44px touch targets.",
        },
        {
          criterion: "Accessibility & Keyboard Walkthrough Parity",
          weightPercent: 35,
          expectation: "Visible focus rings, semantic landmarks, WCAG AA contrast in light & dark themes.",
        },
        {
          criterion: "Clarity of Audit Spec & Actionable Fixes",
          weightPercent: 30,
          expectation: "Concrete before/after measurements and working code adjustments.",
        },
      ],
      submissionInstructions: [
        "Publish your working demo or code patch plus written spec on GitHub.",
        "Attach desktop (1440px) & mobile (390px) verification notes.",
      ],
      mentorName: "Tara Sengupta",
      mentorRole: "Design Systems Lead",
    },
  },
  {
    id: "course-cloud-devops",
    slug: "cloud-reliability-devops",
    title: "Cloud Reliability & DevOps Internship Programme",
    subtitle:
      "Containerize services, configure health checks, safe migrations, and ship reproducible CI gates — bundled with a 6-week Cloud & Security internship.",
    category: "Infrastructure",
    level: "Advanced Studio",
    pricePaise: 199900,
    currency: "INR",
    estimatedHours: 22,
    mentorName: "Siddharth Iyer",
    mentorRole: "Platform Reliability Mentor",
    prerequisites: [
      "Comfort with Linux shell commands, Git, and environment variables",
      "Familiarity running a Node.js or Python web service locally on a TCP port",
    ],
    outcomes: [
      "Author multi-stage Docker builds keeping build secrets out of image layers",
      "Design readiness & health check endpoints distinguishing degraded sandbox vs broken live services",
      "Execute zero-downtime expand-and-contract PostgreSQL migrations",
      "Automate CI build + lint + test gates before container deployment",
    ],
    includes: [
      "3 comprehensive DevOps & reliability modules with multi-stage Docker, health check & SQL migration notes",
      "Hands-on reliability labs, module quizzes & Zero-Downtime Service Blueprint project",
      "6-week Cloud & Security Engineering Internship with deployment/security deliverables",
      "Official Internship Completion Certificate included (₹0 extra after approval)",
    ],
    linkedInternshipSlug: "cloud-security-engineering",
    linkedInternshipTitle: "Cloud & Security Engineering Internship",
    internshipDurationWeeks: 6,
    includedCertificateTitle: "Cloud & Security Engineering Internship Completion Certificate",
    completionRequirements: [
      "Complete all 3 Cloud Reliability modules, exercises & pass the readiness check",
      "Earn mentor approval on Resilient Service Architecture & Rollback Runbook",
      "Complete Cloud & Security internship sprints and receive final mentor approval",
    ],
    internshipDisclosure:
      "One Programme Enrolment covers all written modules, curated DevOps videos, hands-on reliability labs, rollback runbook critique, the 6-week Cloud & Security Engineering Internship, and your certificate at ₹0 extra once approved.",
    isPublished: true,
    contentStatus: "published",
    modules: [
      {
        id: "mod-cloud-1",
        sortOrder: 1,
        title: "Immutable Builds & Secret-Free Containers",
        summary: "Separate build-time compilation stages from minimal non-root production runtime images.",
        estimatedMinutes: 100,
        learningOutcomes: [
          "Write multi-stage Dockerfiles shrinking image surface area and omitting dev dependencies",
          "Prevent secret leakage into Docker layer history",
        ],
        lessons: [
          {
            id: "les-cloud-1-note",
            sortOrder: 1,
            title: "Multi-Stage Dockerfiles & Non-Root Runtime Users",
            lessonType: "note",
            durationLabel: "25 min read",
            summary: "Why secrets passed via ENV/COPY during docker build remain baked inside image layers forever.",
            learningObjectives: [
              "Copy only compiled artifacts (`.next`, `dist`, production `node_modules`) into final runtime stages",
              "Switch to a dedicated non-root `USER` before `CMD`",
            ],
            realWorldContext:
              "Running `docker history` on single-stage images often exposes `.env` secrets, compilers, and SSH keys shipped accidentally to container registries.",
            noteSections: [
              {
                heading: "Keep Build Layers & Runtime Secrets Separate",
                body: "Compile source code in a builder stage and copy solely the built output into a slim runtime image running as an unprivileged user. Inject `GEMINI_API_KEY`, `DATABASE_URL`, and `RAZORPAY_KEY_SECRET` strictly at container runtime.",
                codeSnippet: `FROM node:22-alpine AS builder\nWORKDIR /app\nCOPY package*.json ./\nRUN npm ci\nCOPY . .\nRUN npm run build\n\nFROM node:22-alpine AS runner\nWORKDIR /app\nENV NODE_ENV=production\nRUN addgroup -S app && adduser -S app -G app\nCOPY --from=builder /app/.next ./.next\nCOPY --from=builder /app/package*.json ./\nRUN npm ci --omit=dev\nUSER app\nCMD ["npm", "run", "start"]`,
                takeaway: "Use non-root runtime users, `.dockerignore`, and runtime-injected secrets.",
              },
              {
                heading: "Locking Down Build Context with .dockerignore",
                body: "Even with a clean multi-stage `Dockerfile`, running `COPY . .` before excluding `.env*`, `.git`, `node_modules`, and test artifacts bloats build caches and exposes local credentials in layer snapshots. Maintain an explicit `.dockerignore` alongside every container config.",
                takeaway: "Deny secrets and dev artifacts at the build context boundary before layer 1 runs.",
              },
            ],
            keyConcepts: [
              {
                term: "Multi-Stage Build",
                definition: "Separating build toolchains from the minimal production runtime image using multiple `FROM` clauses.",
              },
              {
                term: "Image Layer Persistence",
                definition: "Files deleted in a later `RUN rm` layer still exist inside earlier cached layers of the image.",
              },
            ],
            diagram: {
              title: "Multi-Stage Container Pipeline",
              caption: "Secrets never enter builder layers; only compiled artifacts reach the non-root runner.",
              nodes: [
                { role: "1. Builder", label: "Compile + Bundle", detail: "Full SDK & devDependencies" },
                { role: "2. Copy Only", label: "Artifacts Only", detail: "No .git, .env, or tests" },
                { role: "3. Runner", label: "Non-Root Runtime", detail: "Inject env secrets at boot" },
              ],
            },
            practicalExercise: {
              title: "Write a `.dockerignore` Preventing Credential Leaks",
              difficulty: "Guided",
              estimatedMinutes: 15,
              objective: "Exclude local secrets, build caches, and `.git` directories from Docker build context.",
              instructions: [
                "Draft a `.dockerignore` blocking `.env*`, `node_modules`, `.git`, `.next`, and `.playwright-cli`.",
                "Run `docker build` dry-check / context inspection to confirm sensitive local files never enter builder layers.",
              ],
              expectedOutput: "Build context shrinks dramatically and `.env` files are never copied into images.",
              hints: ["Remember `.env` and `.env.local` must stay out; `.env.example` can be ignored or non-secret."],
            },
            commonMistakes: [
              {
                mistake: "Running `COPY . .` before creating `.dockerignore`",
                whyItHappens: "Copies `.env`, `.git` history, and host `node_modules` directly into image layers.",
                fix: "Always author `.dockerignore` alongside your `Dockerfile`.",
              },
            ],
            keyTakeaways: [
              "Never bake `.env` files into Docker images.",
              "Always switch to a non-root `USER` in runtime stages.",
            ],
            knowledgeCheck: {
              question: "If you `COPY .env .` in line 4 of a Dockerfile and `RUN rm .env` in line 8, is the secret removed from the image?",
              options: [
                "Yes, completely gone",
                "No — the `.env` file remains inspectable inside layer 4's history",
                "Only on Alpine Linux",
              ],
              correctIndex: 1,
              explanation: "Docker layers are immutable; inject runtime secrets via orchestrator env config instead.",
            },
            resources: [
              {
                id: "res-cloud-docker",
                title: "Docker Docs: Building Best Practices",
                provider: "Docker Docs",
                url: "https://docs.docker.com/build/building/best-practices/",
              },
            ],
          },
          {
            id: "les-cloud-1-video",
            sortOrder: 2,
            title: "Curated Lecture: Docker & Container Architecture",
            lessonType: "video",
            durationLabel: "35 min watch",
            summary: "End-to-end visual tutorial covering Docker images, layers, ports, and networking.",
            learningObjectives: [
              "Trace port binding (`-p 3000:3000`) and immutable container layers",
              "Store stateful user records externally instead of ephemeral container filesystems",
            ],
            realWorldContext: "Local `works on my machine` bugs disappear when environments share deterministic container builds.",
            noteSections: [
              {
                heading: "Production Takeaway",
                body: "Keep build secrets out of image layers and inject environment config strictly at runtime.",
                takeaway: "Use non-root runtime users and minimal base layers.",
              },
            ],
            keyConcepts: [
              {
                term: "Ephemeral Container Filesystem",
                definition: "Container restarts wipe local container writes; persist databases in managed external volumes or Cloud DBs.",
              },
              {
                term: "Runtime Host Binding (`0.0.0.0`)",
                definition: "Binding all network interfaces inside a container so load balancers and health probes reach the service.",
              },
            ],
            practicalExercise: {
              title: "Verify Runtime Port Binding Contract",
              difficulty: "Guided",
              estimatedMinutes: 10,
              objective: "Confirm web apps inside containers bind `0.0.0.0:3000` rather than `127.0.0.1` only.",
              instructions: [
                "Configure `HOSTNAME=0.0.0.0` in the container runtime command so external load balancers can route traffic to port `3000`.",
                "Verify the container responds with HTTP `200` over the container bridge network rather than binding loopback only.",
              ],
              expectedOutput: "Container responds cleanly to health checks across container bridge network.",
              hints: ["In Next.js standalone/server scripts listen on `0.0.0.0`."],
            },
            commonMistakes: [
              {
                mistake: "Writing user uploads to ephemeral container `/tmp` expecting persistence across deploys",
                whyItHappens: "Treating containers like persistent VMs.",
                fix: "Store durable state in managed PostgreSQL/Supabase/object storage.",
              },
            ],
            keyTakeaways: [
              "Containers are stateless and ephemeral; durable state belongs in external storage.",
              "Bind container HTTP listeners to `0.0.0.0` for load-balancer reachability.",
            ],
            knowledgeCheck: {
              question: "Where should uploaded student assignment artifacts or database state live in containerized deployments?",
              options: [
                "Inside container `/app/uploads`",
                "In external managed databases or object storage buckets",
                "Inside `package.json`",
              ],
              correctIndex: 1,
              explanation: "Container redeploys replace ephemeral container filesystems.",
            },
            youtubeVideoId: "3c-iBn73dDE",
            youtubeUrl: "https://www.youtube.com/watch?v=3c-iBn73dDE",
            videoCreator: "TechWorld with Nana (YouTube)",
            resources: [
              {
                id: "res-cloud-docker-2",
                title: "Docker Building Best Practices",
                provider: "Docker Docs",
                url: "https://docs.docker.com/build/building/best-practices/",
              },
            ],
          },
        ],
        moduleQuiz: {
          id: "mq-cloud-1",
          title: "Module 1 Check: Containers & Secret Hygiene",
          passingScorePercent: 67,
          questions: [
            {
              id: "mq-cloud-1-q1",
              questionType: "conceptual",
              prompt: "Why use a multi-stage Dockerfile for production Next.js or Node services?",
              options: [
                "To compile artifacts in a builder stage and copy only minimal runtime files to a non-root runner",
                "To embed `.env` inside layer 1",
                "Docker prohibits single-stage builds",
              ],
              correctIndex: 0,
              explanation: "Multi-stage builds reduce attack surface, shrink image pulls, and exclude dev toolchains.",
            },
            {
              id: "mq-cloud-1-q2",
              questionType: "scenario",
              prompt: "A service stores uploaded PDFs locally in `./uploads` inside a Cloud Run / Kubernetes pod. What happens during the next rollout?",
              options: [
                "The files are automatically replicated",
                "All locally written files disappear when old containers terminate",
                "The container refuses to stop",
              ],
              correctIndex: 1,
              explanation: "Ephemeral container storage vanishes on restarts — always use external object/DB storage.",
            },
          ],
        },
      },
      {
        id: "mod-cloud-2",
        sortOrder: 2,
        title: "Graceful Degradation, Probes & CI Gates",
        summary: "Design liveness/readiness checks, predictable error surfacing, and automated CI pipelines.",
        estimatedMinutes: 90,
        learningOutcomes: [
          "Differentiate liveness probes (process alive) from readiness probes (dependencies reachable)",
          "Configure CI build + lint + test gates failing fast prior to deploy",
        ],
        lessons: [
          {
            id: "les-cloud-2-note",
            sortOrder: 1,
            title: "Degraded Mode Runbooks & Explicit Banners",
            lessonType: "note",
            durationLabel: "25 min read",
            summary: "Distinguishing expected test/sandbox configurations from broken live services.",
            learningObjectives: [
              "Return structured `503 Service Unavailable` from readiness probes when critical DB checks fail",
              "Keep sandbox indicators honest without masking live production signature errors",
            ],
            realWorldContext:
              "Load balancers route live traffic onto booting containers unless readiness endpoints wait until database connections succeed.",
            noteSections: [
              {
                heading: "Fail Loudly on Misconfiguration, Degrade Intentionally in Sandbox",
                body: "When an optional payment key is absent in local development, expose a clear test-mode banner; when signature validation fails in live runtime, reject loudly with HTTP 401 and log sanitized correlation traces cleanly.",
                codeSnippet: `export async function GET() {\n  const dbOk = await pingDatabaseWithTimeout(1500);\n  if (!dbOk) {\n    return NextResponse.json({ status: "degraded", db: false }, { status: 503 });\n  }\n  return NextResponse.json({ status: "ok", db: true }, { status: 200 });\n}`,
                takeaway: "Never conflate silent errors with safe fallback modes.",
              },
              {
                heading: "Liveness vs Readiness Probe Separation",
                body: "Keep `/api/health/live` lightweight (process responds) so transient database restarts don't trigger infinite container crash-loops, while `/api/health/ready` runs bounded dependency pings (`<= 1500ms`) and returns `503` until PostgreSQL and required queues are healthy.",
                takeaway: "Never tie pod restart liveness checks directly to external database outages.",
              },
            ],
            keyConcepts: [
              {
                term: "Readiness Probe",
                definition: "HTTP check telling orchestrators whether a container is ready to receive user traffic.",
              },
              {
                term: "Timeout Budget",
                definition: "Bounding downstream pings (e.g. 1500ms) so health checks never hang indefinitely.",
              },
            ],
            practicalExercise: {
              title: "Design a Bounded Readiness Endpoint",
              difficulty: "Applied",
              estimatedMinutes: 15,
              objective: "Return 200 when DB ping succeeds within 1500ms and 503 otherwise.",
              instructions: [
                "Draft a `/api/health` route specification separating fast process liveness (`200`) from bounded DB readiness checks (`1500ms` timeout).",
                "Confirm degraded database conditions emit HTTP `503` with safe boolean flags and zero leaked credentials or stack traces.",
              ],
              expectedOutput: "`200 { status: 'ok' }` or `503 { status: 'unavailable' }` with zero secret values exposed.",
              hints: ["Never include database URLs or stack traces in public `/api/health` JSON."],
            },
            commonMistakes: [
              {
                mistake: "Returning database connection strings or raw error objects in `/api/health`",
                whyItHappens: "Quick debugging outputs left in public probes.",
                fix: "Emit boolean readiness flags only (`{ status, checks: { db: true } }`).",
              },
            ],
            keyTakeaways: [
              "Bound probe timeouts cleanly and never leak internal errors or credentials on health endpoints.",
              "Differentiate safe test-mode banners cleanly from live production failures.",
            ],
            knowledgeCheck: {
              question: "Which HTTP status code should a readiness probe return while its PostgreSQL dependency is unreachable?",
              options: ["200 OK with empty text", "503 Service Unavailable so the load balancer holds traffic", "302 Redirect to login"],
              correctIndex: 1,
              explanation: "503 signals orchestrators to stop routing requests to that instance until ready.",
            },
            resources: [
              {
                id: "res-cloud-k8s",
                title: "Kubernetes Pod Lifecycle & Probes",
                provider: "Kubernetes Docs",
                url: "https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/",
              },
              {
                id: "res-cloud-gha",
                title: "GitHub Actions Quickstart",
                provider: "GitHub Docs",
                url: "https://docs.github.com/en/actions/get-started/quickstart",
              },
            ],
          },
          {
            id: "les-cloud-2-ci",
            sortOrder: 2,
            title: "Deterministic CI Gates: Build, Lint & Unit Tests",
            lessonType: "note",
            durationLabel: "20 min read",
            summary: "Ordering fast checks before slow container pushes so broken builds never deploy.",
            learningObjectives: [
              "Structure fast-fail CI job steps (`npm ci` -> `lint` -> `test` -> `build`)",
              "Pin reproducible dependency trees via `package-lock.json`",
            ],
            realWorldContext: "Deploying uncompiled or un-linted TypeScript breaks running cohorts instantaneously.",
            noteSections: [
              {
                heading: "Fail-Fast Pipeline Ordering",
                body: "Run lightweight static lint and millisecond unit tests first, followed by full production `npm run build`, before tagging any container image.",
                takeaway: "Every merge to main passes lint, unit tests, and build cleanly.",
              },
              {
                heading: "Guarding Production Builds with Reproducible Lockfiles",
                body: "Always run `npm ci` inside CI runners so package resolution strictly follows committed `package-lock.json` hashes. Pair build gates with isolated pure-logic tests (`node:test`) so business rules like pricing, signature checks, and progress calculations cannot regress silently.",
                takeaway: "Deterministic lockfiles plus fast unit suites eliminate `works locally` deploy failures.",
              },
            ],
            keyConcepts: [
              {
                term: "Deterministic Lockfile Install (`npm ci`)",
                definition: "Installs exact versions pinned in `package-lock.json` cleanly in CI.",
              },
              {
                term: "Fast-Fail Gate",
                definition: "Ordering milliseconds-long lint and unit tests ahead of multi-minute Docker image builds.",
              },
            ],
            practicalExercise: {
              title: "Draft a 4-Step GitHub Actions CI Workflow",
              difficulty: "Guided",
              estimatedMinutes: 15,
              objective: "Define reproducible steps running `npm ci`, `npm run lint`, unit tests, and `npm run build`.",
              instructions: [
                "Order CI job steps from fastest check (`npm ci` -> `npm run lint` -> unit tests) to slowest check (`npm run build`).",
                "Verify any TypeScript error or test regression fails the workflow before container packaging begins.",
              ],
              expectedOutput: "Valid YAML workflow failing on first lint, test, or compile error.",
              hints: ["Use `actions/setup-node` with lockfile caching enabled."],
            },
            commonMistakes: [
              {
                mistake: "Running `npm install` instead of `npm ci` in CI",
                whyItHappens: "Habit from local development.",
                fix: "Use `npm ci` to respect exact lockfile dependencies reproducibly.",
              },
            ],
            keyTakeaways: [
              "Run fast lint + unit tests before full builds or container deploys.",
              "Always use `npm ci` in CI to keep dependency graphs deterministic.",
            ],
            knowledgeCheck: {
              question: "Why use `npm ci` rather than `npm install` inside CI workflows?",
              options: [
                "`npm ci` installs exact pinned versions from `package-lock.json` and errors if out of sync",
                "`npm ci` skips TypeScript checking",
                "`npm install` is deprecated locally",
              ],
              correctIndex: 0,
              explanation: "Clean lockfile installs eliminate drift between developer laptops and CI runners.",
            },
            resources: [
              {
                id: "res-cloud-gha-2",
                title: "GitHub Actions Quickstart",
                provider: "GitHub Docs",
                url: "https://docs.github.com/en/actions/get-started/quickstart",
              },
            ],
          },
        ],
        moduleQuiz: {
          id: "mq-cloud-2",
          title: "Module 2 Check: Probes & CI Reliability",
          passingScorePercent: 67,
          questions: [
            {
              id: "mq-cloud-2-q1",
              questionType: "conceptual",
              prompt: "Should a `/api/health` readiness endpoint return internal stack traces when DB connectivity drops?",
              options: [
                "No — return 503 with safe boolean indicators and log detailed diagnostics server-side",
                "Yes, include DB passwords for quick debugging",
                "Always return 200 OK",
              ],
              correctIndex: 0,
              explanation: "Never expose internal stack traces or connection credentials on public probe endpoints.",
            },
            {
              id: "mq-cloud-2-q2",
              questionType: "scenario",
              prompt: "Why place unit tests and lint before Docker image pushes in a CI pipeline?",
              options: [
                "To catch failures in seconds without wasting minutes pushing broken container layers",
                "Docker requires ESLint inside the image",
                "Unit tests modify package-lock.json",
              ],
              correctIndex: 0,
              explanation: "Fast-fail checks tighten feedback loops and save build compute.",
            },
          ],
        },
      },
      {
        id: "mod-cloud-3",
        sortOrder: 3,
        title: "Capstone: Zero-Downtime Service Blueprint",
        summary: "Deliver an incident-ready rollout, expand-and-contract migration, and rollback runbook.",
        estimatedMinutes: 120,
        learningOutcomes: [
          "Author non-destructive expand-and-contract SQL migrations compatible with rolling deploys",
        ],
        lessons: [
          {
            id: "les-cloud-3-project",
            sortOrder: 1,
            title: "Milestone Brief: Zero-Downtime Rollout & Runbook",
            lessonType: "project_milestone",
            durationLabel: "Build project",
            summary: "Document readiness probes, migration backward compatibility, and rollback steps.",
            learningObjectives: [
              "Apply expand-and-contract database migrations preventing breaking live containers",
              "Document crisp rollback verification criteria alongside every schema rollout",
            ],
            realWorldContext: "During rolling deployments, old and new application containers run simultaneously against the same database.",
            noteSections: [
              {
                heading: "Migration Safety: Expand & Contract",
                body: "Expand-and-contract SQL migrations prevent breaking running containers during rollouts: add nullable columns (`ADD COLUMN IF NOT EXISTS`) first, deploy application code reading/writing them, backfill, and drop obsolete columns only in a later release.",
                codeSnippet: `-- Safe additive expansion (does not break v1 containers)\nALTER TABLE public.courses\n  ADD COLUMN IF NOT EXISTS prerequisites jsonb NOT NULL DEFAULT '[]'::jsonb;`,
                takeaway: "Always pair schema additions with non-destructive rollback notes.",
              },
            ],
            keyConcepts: [
              {
                term: "Expand-and-Contract Migration",
                definition: "Two-phase schema evolution keeping both old and new app versions compatible during zero-downtime rollouts.",
              },
              {
                term: "Rolling Deployment Window",
                definition: "Transition period where v1 and v2 app containers simultaneously query the shared database.",
              },
            ],
            practicalExercise: {
              title: "Draft a Zero-Downtime Column Rename Plan",
              difficulty: "Applied",
              estimatedMinutes: 20,
              objective: "Plan a safe multi-step rollout instead of a blocking `RENAME COLUMN`.",
              instructions: [
                "Break a breaking column rename into 3 safe expand-and-contract phases across sequential deployments.",
                "Document exact rollback verification steps confirming old v1 containers keep serving traffic smoothly if v2 rolls back.",
              ],
              expectedOutput: "1) Add new column + dual-write -> 2) Backfill & read new column -> 3) Drop old column safely.",
              hints: ["Never run `ALTER TABLE ... RENAME COLUMN` while old containers still query the old name."],
            },
            commonMistakes: [
              {
                mistake: "Running `DROP COLUMN` or `RENAME COLUMN` in the same deploy that stops reading the old column",
                whyItHappens: "Forgetting old containers still serve requests during rolling updates.",
                fix: "Drop obsolete columns strictly in a follow-up migration after old replicas drain.",
              },
            ],
            keyTakeaways: [
              "Use `ADD COLUMN IF NOT EXISTS` with safe defaults so rolling deploys remain backward compatible.",
              "Defer destructive drops until all prior container replicas finish draining.",
            ],
            knowledgeCheck: {
              question: "Why can an immediate `ALTER TABLE ... RENAME COLUMN` trigger 500 errors during a rolling deployment?",
              options: [
                "Old running containers still execute queries referencing the original column name",
                "PostgreSQL forbids renaming text columns",
                "Docker ignores SQL migrations",
              ],
              correctIndex: 0,
              explanation: "Expand-and-contract keeps both old and new versions healthy while pods swap.",
            },
            resources: [
              {
                id: "res-cloud-pg",
                title: "PostgreSQL Docs: ALTER TABLE",
                provider: "PostgreSQL.org",
                url: "https://www.postgresql.org/docs/current/ddl-alter.html",
              },
            ],
          },
        ],
        moduleQuiz: {
          id: "mq-cloud-3",
          title: "Module 3 Check: Zero-Downtime Migrations & Rollbacks",
          passingScorePercent: 67,
          questions: [
            {
              id: "mq-cloud-3-q1",
              questionType: "conceptual",
              prompt: "What makes a SQL migration safe during an active rolling container deploy?",
              options: [
                "Dropping tables first",
                "Additive schema expansions (`ADD COLUMN IF NOT EXISTS` with defaults) leaving old code intact",
                "Disabling health probes",
              ],
              correctIndex: 1,
              explanation: "Additive backward-compatible migrations avoid downtime across mixed container versions.",
            },
            {
              id: "mq-cloud-3-q2",
              questionType: "scenario",
              prompt: "A newly rolled-out v2 pod fails readiness checks. What happens if probes and additive migrations are set up properly?",
              options: [
                "Traffic remains cleanly on healthy v1 pods while rollback restores service immediately",
                "All users see 500 errors immediately",
                "Data is wiped",
              ],
              correctIndex: 0,
              explanation: "Combined readiness gates and backward-compatible schemas make rollbacks painless.",
            },
          ],
        },
      },
    ],
    project: {
      slug: "zero-downtime-deploy",
      title: "Resilient Service Architecture & Rollback Runbook",
      summary:
        "Author a reproducible container build, readiness check strategy, and backward-compatible migration rollout plan.",
      brief:
        "Design and test a deployment pipeline ensuring linting, automated tests, health probes, and safe rollback steps operate deterministically.",
      estimatedHours: 10,
      problemStatement:
        "Ad-hoc production deploys frequently leak secrets in images, drop requests during container swaps, or crash live pods with breaking SQL migrations.",
      useCase:
        "Production-ready container + CI + migration + rollback blueprint for a full-stack web service.",
      technologies: ["Docker", "GitHub Actions", "PostgreSQL", "Next.js Health Probes"],
      milestones: [
        "Define expand-and-contract database migration checklist",
        "Add health/readiness check specification and timeout budgets",
        "Automate CI build + lint + test gates before deployment",
      ],
      deliverables: [
        "Dockerfile / CI pipeline specification repository",
        "Written rollback and incident runbook",
        "Verified test output",
      ],
      rubric: [
        "Clear separation between build-time and runtime secrets",
        "Safe backward-compatible DB migration plan",
        "Complete failure-mode documentation",
      ],
      structuredRubric: [
        {
          criterion: "Secret-Free Multi-Stage Container & CI Gates",
          weightPercent: 35,
          expectation: "Multi-stage Dockerfile, non-root runtime user, `.dockerignore`, and CI lint/test/build workflow.",
        },
        {
          criterion: "Bounded Readiness Probes & Degraded Mode Rules",
          weightPercent: 30,
          expectation: "Clear 200 vs 503 readiness specification with timeout ceilings and zero secret leaks.",
        },
        {
          criterion: "Expand-and-Contract Migration & Rollback Runbook",
          weightPercent: 35,
          expectation: "Backward-compatible SQL evolution plus step-by-step rollback procedure.",
        },
      ],
      submissionInstructions: [
        "Push Dockerfile, CI workflow YAML, health route implementation, and runbook markdown to GitHub.",
      ],
      mentorName: "Siddharth Iyer",
      mentorRole: "Platform Reliability Mentor",
    },
  },
];
