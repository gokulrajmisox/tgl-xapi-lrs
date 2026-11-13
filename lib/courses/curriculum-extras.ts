export type CourseAnnouncement = {
  id: string;
  title: string;
  body: string;
  authorName: string;
  publishedAt: string;
  pinned?: boolean;
};

export type CourseAssignment = {
  id: string;
  title: string;
  prompt: string;
  deliverableHint: string;
  estimatedMinutes: number;
};

export type CourseQuizQuestion = {
  id: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};

export type CourseQuiz = {
  id: string;
  title: string;
  passingScorePercent: number;
  questions: CourseQuizQuestion[];
};

export type CourseExtras = {
  skills: string[];
  certificateInfo: string;
  announcements: CourseAnnouncement[];
  assignments: CourseAssignment[];
  quiz: CourseQuiz;
};

export const COURSE_EXTRAS_BY_SLUG: Record<string, CourseExtras> = {
  "web-architecture-systems": {
    skills: [
      "Next.js App Router",
      "WCAG AA Accessibility",
      "Zod API Contracts",
      "Server-Side Gating",
      "PostgreSQL RLS",
    ],
    certificateInfo:
      "Course Completion Certificate (₹299 INR) and Internship Certificate (₹499 INR) become optionally available after mentor-approved project and internship completion.",
    announcements: [
      {
        id: "ann-web-1",
        title: "Capstone Review Office Hours — Live Feedback Rubric",
        body: "Focus on semantic <button> / <Link> contrast, keyboard focus order across tabs, and server-side entitlement checks before submitting your GitHub repo.",
        authorName: "Kabir Malhotra",
        publishedAt: "2026-11-11T09:00:00.000Z",
        pinned: true,
      },
      {
        id: "ann-web-2",
        title: "Paired Internship Intake Now Open",
        body: "Learners who finish the capstone and quiz automatically satisfy course prerequisites for the Full-Stack Product Engineering Internship track.",
        authorName: "TGL Programs Team",
        publishedAt: "2026-11-12T10:30:00.000Z",
      },
    ],
    assignments: [
      {
        id: "asgn-web-1",
        title: "Boundary & Accessibility Audit Note",
        prompt:
          "Inspect one multi-role flow (student, mentor, or admin) and document two semantic landmark fixes plus how you prevent client-forged totals on checkout.",
        deliverableHint: "Short architecture memo + optional Gist or repo PR link",
        estimatedMinutes: 35,
      },
      {
        id: "asgn-web-2",
        title: "Zero-Secret Client Bundle Verification",
        prompt:
          "Explain how server-only keys stay isolated inside App Router route handlers and paste a sample Zod validation schema for a progress update endpoint.",
        deliverableHint: "Code snippet or repository URL",
        estimatedMinutes: 40,
      },
    ],
    quiz: {
      id: "quiz-web-architecture",
      title: "Architecture & Trust Boundaries Check",
      passingScorePercent: 67,
      questions: [
        {
          id: "q-web-1",
          prompt: "Where should enrollment gating and course pricing validation run?",
          options: [
            "Strictly in React client state before rendering",
            "On the server inside Route Handlers / Server Components querying database state",
            "Inside browser localStorage after redirect",
            "Inside CSS visibility utility classes",
          ],
          correctIndex: 1,
          explanation:
            "Authoritative pricing and active course_enrollments checks must happen on the server so locked notes and video IDs never cross the network to unenrolled visitors.",
        },
        {
          id: "q-web-2",
          prompt: "Which HTML element should trigger an in-page modal or filter switch?",
          options: [
            "A clickable <div> with onClick",
            "A native <button type=\"button\">",
            "A <span> with role=\"text\"",
            "An empty <a> tag without href",
          ],
          correctIndex: 1,
          explanation:
            "Native <button> elements ship keyboard activation, focusability, and screen-reader semantics out of the box.",
        },
        {
          id: "q-web-3",
          prompt: "How should webhook HTTP headers be prevented from serving stale paid access?",
          options: [
            "Cache paid responses forever with immutable headers",
            "Send Cache-Control: no-store on enrollment-gated and verification API routes",
            "Disable HTTPS during sandbox tests",
            "Store payment secrets in NEXT_PUBLIC_* variables",
          ],
          correctIndex: 1,
          explanation:
            "Returning Cache-Control: no-store guarantees newly verified payments unlock course workspaces immediately without stale CDN caches.",
        },
      ],
    },
  },
  "python-systems-cli": {
    skills: [
      "Streaming Generators",
      "Python Dataclasses",
      "UTC Normalization",
      "Contract Unit Testing",
      "CLI Exit Codes",
    ],
    certificateInfo:
      "Complete lessons, pass the systems quiz, and earn mentor approval on CLI Telemetry Analyzer to unlock eligibility for the Full-Stack Engineering Internship track.",
    announcements: [
      {
        id: "ann-py-1",
        title: "Sample Malformed JSONL Fixture Added",
        body: "Test your CLI Telemetry Analyzer against mixed timezone offsets (+05:30 and Z) and blank lines before requesting final mentor review.",
        authorName: "Ananya Rao",
        publishedAt: "2026-11-10T14:00:00.000Z",
        pinned: true,
      },
    ],
    assignments: [
      {
        id: "asgn-py-1",
        title: "Generator Memory Profile Exercise",
        prompt:
          "Compare memory usage between list-based file loading and lazy generator iteration on a 50k-line log stream, and summarize safe exception handling.",
        deliverableHint: "Written benchmark summary + optional repository script",
        estimatedMinutes: 30,
      },
    ],
    quiz: {
      id: "quiz-python-systems",
      title: "Streaming & CLI Reliability Check",
      passingScorePercent: 67,
      questions: [
        {
          id: "q-py-1",
          prompt: "Why use Python generators when scanning large JSONL logs?",
          options: [
            "They skip UTF-8 decoding automatically",
            "They yield one record at a time with constant memory overhead",
            "They parallelize across GPUs",
            "They remove the need for schema validation",
          ],
          correctIndex: 1,
          explanation:
            "Lazy iteration keeps resident memory flat regardless of input log size.",
        },
        {
          id: "q-py-2",
          prompt: "How should a testable CLI entrypoint accept arguments?",
          options: [
            "Read sys.argv directly inside module-level code",
            "Expose main(argv: list[str] | None = None) accepting explicit arguments",
            "Hardcode file paths inside __init__.py",
            "Prompt interactively with input() inside parsers",
          ],
          correctIndex: 1,
          explanation:
            "Accepting an optional argv parameter lets unit tests exercise flags, malformed input, and exit codes deterministically.",
        },
        {
          id: "q-py-3",
          prompt: "What should happen when a log file contains one corrupted JSON row?",
          options: [
            "Silently ignore and return exit code 0 with zero diagnostics",
            "Record a structured parse warning / error count according to strictness flags",
            "Delete the source log file",
            "Retry an infinite loop",
          ],
          correctIndex: 1,
          explanation:
            "Surfacing structured warnings and explicit exit codes prevents silent data loss in pipelines.",
        },
      ],
    },
  },
  "applied-ai-evaluation": {
    skills: [
      "Golden Evaluation Sets",
      "JSON Schema Grading",
      "Regression Diffs",
      "Calibration Thresholds",
      "Failure Categorization",
    ],
    certificateInfo:
      "Qualifies enrolled learners for the Applied AI & Data Systems Internship once lessons, quiz, and Structured AI Evaluation Harness are approved.",
    announcements: [
      {
        id: "ann-ai-1",
        title: "Minimum 25 Test Cases Required for Capstone",
        body: "Include at least 5 adversarial or empty-context prompts inside your evaluation dataset before sliding to submit.",
        authorName: "Dr. Nisha Menon",
        publishedAt: "2026-11-11T16:00:00.000Z",
        pinned: true,
      },
    ],
    assignments: [
      {
        id: "asgn-ai-1",
        title: "Failure Slice Taxonomy",
        prompt:
          "Categorize three concrete failure modes observed in structured LLM JSON extraction and propose deterministic post-generation schema checks.",
        deliverableHint: "Taxonomy summary or link to sample JSONL cases",
        estimatedMinutes: 35,
      },
    ],
    quiz: {
      id: "quiz-applied-ai",
      title: "Applied Evaluation Engineering Quiz",
      passingScorePercent: 67,
      questions: [
        {
          id: "q-ai-1",
          prompt: "What prevents silent prompt regressions when editing system instructions?",
          options: [
            "Running a versioned golden evaluation suite and comparing pass rates",
            "Eyeballing two sample answers in chat",
            "Increasing temperature to 1.8",
            "Removing schema checks on JSON responses",
          ],
          correctIndex: 0,
          explanation:
            "Repeatable regression harnesses catch silent drops across edge cases before deployment.",
        },
        {
          id: "q-ai-2",
          prompt: "How should applications handle LLM outputs used in downstream workflows?",
          options: [
            "Execute them blindly as trusted SQL",
            "Validate against strict schemas (e.g. Zod) and handle fallbacks cleanly",
            "Expose raw system prompts to users",
            "Bypass authorization on tool calls",
          ],
          correctIndex: 1,
          explanation:
            "Model outputs are untrusted text until validated by typed schemas and authorization rules.",
        },
        {
          id: "q-ai-3",
          prompt: "Why track refusal quality alongside task accuracy?",
          options: [
            "To inflate token spend",
            "To verify safe handling of out-of-scope or missing-context prompts without hallucination",
            "To disable all logging",
            "To avoid testing adversarial inputs",
          ],
          correctIndex: 1,
          explanation:
            "Reliable models abstain cleanly when evidence is missing instead of inventing plausible errors.",
        },
      ],
    },
  },
  "cybersecurity-trust-boundaries": {
    skills: [
      "HMAC SHA-256",
      "Timing-Safe Comparison",
      "Webhook Idempotency",
      "Server Pricing Authority",
      "Replay Protection",
    ],
    certificateInfo:
      "Prepares learners for the Cloud & Security Engineering Internship track with optional mentor-approved certification.",
    announcements: [
      {
        id: "ann-sec-1",
        title: "Raw Body Byte Rule Reminder",
        body: "Always verify Razorpay webhook signatures against req.text() raw bytes—never JSON.stringify(parsedBody).",
        authorName: "Rhea Kulkarni",
        publishedAt: "2026-11-11T12:00:00.000Z",
        pinned: true,
      },
    ],
    assignments: [
      {
        id: "asgn-sec-1",
        title: "Replay & Signature Threat Model",
        prompt:
          "Document how event_id uniqueness + HMAC SHA-256 signature verification block spoofed webhooks and duplicate reward/enrollment activation.",
        deliverableHint: "Concise security note + sample test assertion",
        estimatedMinutes: 35,
      },
    ],
    quiz: {
      id: "quiz-cybersecurity",
      title: "Webhook & Payment Security Quiz",
      passingScorePercent: 67,
      questions: [
        {
          id: "q-sec-1",
          prompt: "Why must webhook HMAC verification read request.text() directly?",
          options: [
            "Re-serializing parsed JSON can alter spacing or key order and break valid digests",
            "request.text() automatically decrypts TLS certificates",
            "It skips UTF-8 encoding",
            "JSON.parse strips HTTP status codes",
          ],
          correctIndex: 0,
          explanation:
            "Signatures are computed over the exact raw HTTP payload transmitted by the payment gateway.",
        },
        {
          id: "q-sec-2",
          prompt: "How do you prevent race conditions or duplicate processing on retried webhooks?",
          options: [
            "Return HTTP 500 on every retry",
            "Record the unique gateway event_id idempotently and return 200 if already processed",
            "Ignore signatures on retry requests",
            "Let the frontend browser run the webhook",
          ],
          correctIndex: 1,
          explanation:
            "Persisting processed event IDs ensures duplicate deliveries are acknowledged without repeating enrollment or issuance side effects.",
        },
        {
          id: "q-sec-3",
          prompt: "Where should checkout INR amounts be determined?",
          options: [
            "Inside the RazorpayCheckoutButton click handler",
            "On the server from the authoritative product/course database record",
            "Inside URL query strings",
            "Inside client cookies",
          ],
          correctIndex: 1,
          explanation:
            "Client payloads can always be tampered with; only send IDs from the client and resolve integer paise prices server-side.",
        },
      ],
    },
  },
  "product-design-accessibility": {
    skills: [
      "Touch Target Ergonomics",
      "Contrast & Typography",
      "Keyboard Navigation",
      "Role-Based UX",
      "Responsive Mobile Budgets",
    ],
    certificateInfo:
      "Connects directly to the Full-Stack Product Engineering Internship track upon passing the accessibility critique capstone.",
    announcements: [
      {
        id: "ann-ux-1",
        title: "390px Mobile Viewport Checklist",
        body: "Verify sticky nav height stays compact and circular interactive controls never push beyond horizontal viewport bounds.",
        authorName: "Tara Sengupta",
        publishedAt: "2026-11-12T08:00:00.000Z",
        pinned: true,
      },
    ],
    assignments: [
      {
        id: "asgn-ux-1",
        title: "Keyboard Focus Order Audit",
        prompt:
          "Tab through a multi-step enrollment and project flow without a mouse. Note two focus-visible or ARIA state improvements.",
        deliverableHint: "Audit notes or screenshot link",
        estimatedMinutes: 30,
      },
    ],
    quiz: {
      id: "quiz-product-ux",
      title: "Accessibility & Layout Discipline Check",
      passingScorePercent: 67,
      questions: [
        {
          id: "q-ux-1",
          prompt: "How should non-linear draggable controls (wheels/sliders) support accessibility?",
          options: [
            "Hide them from keyboard users completely",
            "Pair pointer gestures with Arrow/Home/End keyboard controls and clear aria-labels",
            "Only support mouse drag",
            "Disable focus outlines",
          ],
          correctIndex: 1,
          explanation:
            "Keyboard parity ensures every interactive control works seamlessly with assistive tech and keyboards.",
        },
        {
          id: "q-ux-2",
          prompt: "How should static metadata tags differ visually from interactive action buttons?",
          options: [
            "Style every duration/category tag as an identical high-contrast pill button",
            "Keep metadata unboxed/typographic and reserve solid button fills for clickable actions",
            "Make static metadata bounce continuously",
            "Remove spacing between badges",
          ],
          correctIndex: 1,
          explanation:
            "Clean typographic metadata eliminates false affordances so real buttons stand out immediately.",
        },
        {
          id: "q-ux-3",
          prompt: "What happens if mobile sticky headers exceed ~15% of viewport height?",
          options: [
            "Main content space shrinks dramatically and cards clip awkwardly",
            "Page FPS doubles",
            "Dark mode activates automatically",
            "Nothing changes",
          ],
          correctIndex: 0,
          explanation:
            "Compact navigation preserves screen estate on 390px mobile viewports.",
        },
      ],
    },
  },
  "cloud-reliability-devops": {
    skills: [
      "Multi-Stage Docker",
      "Expand-and-Contract Migrations",
      "Health & Readiness Probes",
      "CI Build/Lint Gates",
      "Rollback Runbooks",
    ],
    certificateInfo:
      "Leads into the Cloud & Security Engineering Internship track once your resilient architecture blueprint is reviewed by mentors.",
    announcements: [
      {
        id: "ann-cloud-1",
        title: "CI Parity Check Reminder",
        body: "Always pair typechecking (tsc --noEmit), unit tests, and production build checks in one pre-deploy workflow.",
        authorName: "Siddharth Iyer",
        publishedAt: "2026-11-11T15:00:00.000Z",
        pinned: true,
      },
    ],
    assignments: [
      {
        id: "asgn-cloud-1",
        title: "Zero-Downtime Column Rename Plan",
        prompt:
          "Outline the expand-and-contract steps to rename a live PostgreSQL column without breaking currently deployed Next.js containers.",
        deliverableHint: "SQL migration sequence + rollback plan",
        estimatedMinutes: 35,
      },
    ],
    quiz: {
      id: "quiz-cloud-devops",
      title: "Reliability & Rollout Safety Quiz",
      passingScorePercent: 67,
      questions: [
        {
          id: "q-cloud-1",
          prompt: "Why use expand-and-contract migrations during rolling deployments?",
          options: [
            "Both old and new app replicas can run concurrently without crashing on missing columns",
            "It bypasses foreign key constraints permanently",
            "It deletes audit tables automatically",
            "It disables connection pooling",
          ],
          correctIndex: 0,
          explanation:
            "Additive migrations keep active containers compatible before old code drains out.",
        },
        {
          id: "q-cloud-2",
          prompt: "Where should secret API keys be injected in containerized apps?",
          options: [
            "Baked into Dockerfile ARG instructions",
            "Injected strictly at container runtime via environment secrets",
            "Committed inside next.config.ts",
            "Logged on startup",
          ],
          correctIndex: 1,
          explanation:
            "Runtime environment injection keeps secrets out of immutable image layers.",
        },
        {
          id: "q-cloud-3",
          prompt: "What must run cleanly after your final code edit before shipping?",
          options: [
            "Only a visual guess",
            "Unit tests, TypeScript lint/typecheck, production build, and live smoke checks",
            "Manual database truncation",
            "Clearing browser cache only",
          ],
          correctIndex: 1,
          explanation:
            "Automated type, build, unit, and runtime checks prevent regressions from reaching learners.",
        },
      ],
    },
  },
};

export function getCourseExtras(slug: string): CourseExtras {
  return (
    COURSE_EXTRAS_BY_SLUG[slug] ?? {
      skills: ["Practical Engineering", "Project Craft", "Mentor Review"],
      certificateInfo:
        "Complete lessons, assignments, quiz, and linked project to unlock internship eligibility and optional certification (₹299–₹599 INR).",
      announcements: [],
      assignments: [
        {
          id: `asgn-${slug}-1`,
          title: "Architecture & Practice Reflection",
          prompt:
            "Summarize the core system concept from this course and share a link or short walkthrough of your working solution.",
          deliverableHint: "Short write-up + optional repo URL",
          estimatedMinutes: 30,
        },
      ],
      quiz: {
        id: `quiz-${slug}`,
        title: "Course Knowledge Check",
        passingScorePercent: 67,
        questions: [
          {
            id: `q-${slug}-1`,
            prompt: "What activates course enrollment and internship certificate issuance on TGL?",
            options: [
              "Clicking checkout before paying",
              "Server-verified Razorpay payment plus meeting all course/internship eligibility checks",
              "Editing client cookies manually",
              "Uploading an empty form",
            ],
            correctIndex: 1,
            explanation:
              "Access and certification require server-verified payment and completed eligibility milestones.",
          },
        ],
      },
    }
  );
}
