export type LessonKind = "note" | "video" | "project_milestone";

export type CourseNoteSection = {
  heading: string;
  body: string;
  codeSnippet?: string;
  takeaway: string;
};

export type CourseResourceLink = {
  id: string;
  title: string;
  provider: string;
  url: string;
};

export type CourseLesson = {
  id: string;
  sortOrder: number;
  title: string;
  lessonType: LessonKind;
  durationLabel: string;
  summary: string;
  noteSections: CourseNoteSection[];
  youtubeVideoId?: string;
  youtubeUrl?: string;
  videoCreator?: string;
  resources: CourseResourceLink[];
};

export type CourseModule = {
  id: string;
  sortOrder: number;
  title: string;
  summary: string;
  estimatedMinutes: number;
  lessons: CourseLesson[];
};

export type CourseProjectDefinition = {
  slug: string;
  title: string;
  summary: string;
  brief: string;
  estimatedHours: number;
  milestones: string[];
  deliverables: string[];
  rubric: string[];
  mentorName: string;
  mentorRole: string;
};

export type CourseDefinition = {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  category: "Engineering" | "Data & AI" | "Infrastructure" | "Product & design";
  level: string;
  pricePaise: number;
  currency: "INR";
  estimatedHours: number;
  mentorName: string;
  mentorRole: string;
  outcomes: string[];
  includes: string[];
  linkedInternshipSlug: string;
  linkedInternshipTitle: string;
  internshipDisclosure: string;
  isPublished: boolean;
  modules: CourseModule[];
  project: CourseProjectDefinition;
};

export const SEED_COURSES: CourseDefinition[] = [
  {
    id: "course-web-architecture",
    slug: "web-architecture-systems",
    title: "Web Architecture & Full-Stack Systems",
    subtitle:
      "Design accessible interfaces, typed server boundaries, and production payment trust flows with Next.js and PostgreSQL.",
    category: "Engineering",
    level: "Foundations → Production",
    pricePaise: 129900,
    currency: "INR",
    estimatedHours: 18,
    mentorName: "Kabir Malhotra",
    mentorRole: "Principal Frontend Architect",
    outcomes: [
      "Structure App Router layouts separating server-only secrets from interactive client leaves",
      "Build WCAG AA keyboard-navigable dashboards, forms, and live status regions",
      "Validate API inputs with Zod schemas and authoritative server-computed prices",
      "Ship a mentor-reviewed capstone web workspace ready for portfolio review",
    ],
    includes: [
      "3 structured modules with detailed written study notes and code walkthroughs",
      "Curated YouTube technical lectures embedded natively with creator attribution",
      "1 scoped real-world capstone project with milestone checklist and mentor review",
      "Direct eligibility pathway into the Full-Stack Product Engineering Internship track",
    ],
    linkedInternshipSlug: "full-stack-product-engineering",
    linkedInternshipTitle: "Full-Stack Product Engineering Internship",
    internshipDisclosure:
      "Course enrollment unlocks all modules, notes, videos, and project submissions. Completing this course satisfies project prerequisites for the practical internship track; optional completion certificates carry a separate ₹299–₹599 INR issuance fee after mentor approval. Completing a course or studio internship does not guarantee external employer placement.",
    isPublished: true,
    modules: [
      {
        id: "mod-web-1",
        sortOrder: 1,
        title: "Accessible DOM Semantics & Layout Contracts",
        summary:
          "Build clear visual hierarchy, responsive landmarks, focus management, and keyboard parity across desktop and mobile viewports.",
        estimatedMinutes: 75,
        lessons: [
          {
            id: "les-web-1-note",
            sortOrder: 1,
            title: "Landmarks, Focus Flow & Reduced Motion",
            lessonType: "note",
            durationLabel: "25 min read",
            summary: "Why native interactive elements and predictable focus order outperform generic clickable divs.",
            noteSections: [
              {
                heading: "Semantic Landmarks Before Styling",
                body: "Screen-reader and keyboard users navigate modern apps using header, nav, main, section, and button elements rather than visual proximity alone. Every interactive card action must be reachable via Tab and announce state changes through aria-expanded or aria-live regions.",
                codeSnippet: `<button\n  type="button"\n  aria-expanded={open}\n  onClick={() => setOpen((v) => !v)}\n  className="rounded-full px-4 py-2 text-xs font-medium"\n>\n  Toggle syllabus details\n</button>`,
                takeaway: "Use native <button> and <Link> primitives first; add ARIA attributes only to describe dynamic state.",
              },
              {
                heading: "Optical Hierarchy & Reduced Motion",
                body: "Respect prefers-reduced-motion in every animated hero or interactive control so users sensitive to motion receive crisp state transitions without disorienting parallax or continuous loops.",
                takeaway: "Always guard GSAP timelines and keyframe motion with a reduced-motion media query check.",
              },
            ],
            resources: [
              {
                id: "res-web-mdn",
                title: "MDN: Keyboard-navigable JavaScript widgets",
                provider: "MDN Web Docs",
                url: "https://developer.mozilla.org/en-US/docs/Web/Accessibility/Keyboard-navigable_JavaScript_widgets",
              },
            ],
          },
          {
            id: "les-web-1-video",
            sortOrder: 2,
            title: "Curated Lecture: React Rendering & Component Mental Model",
            lessonType: "video",
            durationLabel: "32 min watch",
            summary: "Curated external lecture explaining declarative state boundaries and re-render discipline.",
            noteSections: [
              {
                heading: "Watch Focus Guide",
                body: "Pay close attention to how state ownership stays at the lowest shared ancestor while static presentation markup remains pure.",
                takeaway: "Keep Server Components pure and move 'use client' strictly to interactive leaf controls.",
              },
            ],
            youtubeVideoId: "hQAHSlTtcmY",
            youtubeUrl: "https://www.youtube.com/watch?v=hQAHSlTtcmY",
            videoCreator: "Web Dev Simplified (YouTube)",
            resources: [],
          },
        ],
      },
      {
        id: "mod-web-2",
        sortOrder: 2,
        title: "Typed Server Boundaries & Enrollment Gating",
        summary:
          "Enforce entitlement checks inside Next.js Route Handlers and sanitize server responses before serialization.",
        estimatedMinutes: 90,
        lessons: [
          {
            id: "les-web-2-note",
            sortOrder: 1,
            title: "Never Trust Client State for Paid Access",
            lessonType: "note",
            durationLabel: "30 min read",
            summary: "Architecting database-backed entitlement gates and sanitized preview DTOs.",
            noteSections: [
              {
                heading: "Sanitizing Locked Payloads on the Server",
                body: "Hiding a locked note in CSS does not protect paid curriculum. The server loader must query active course_enrollments for the authenticated actor and strip notes, video IDs, and submission forms from the JSON payload whenever enrollment is absent.",
                codeSnippet: `if (!isEnrolled) {\n  return {\n    locked: true,\n    syllabusModules: course.modules.map(({ id, title, summary, lessons }) => ({\n      id, title, summary,\n      lessons: lessons.map((l) => ({ id: l.id, title: l.title, durationLabel: l.durationLabel }))\n    }))\n  };\n}`,
                takeaway: "Zero paid note text or video identifiers should cross the network before verified checkout.",
              },
            ],
            resources: [
              {
                id: "res-web-next",
                title: "Next.js App Router Route Handlers",
                provider: "Next.js Docs",
                url: "https://nextjs.org/docs/app/building-your-application/routing/route-handlers",
              },
            ],
          },
          {
            id: "les-web-2-video",
            sortOrder: 2,
            title: "Curated Lecture: Next.js Architecture & App Router",
            lessonType: "video",
            durationLabel: "15 min watch",
            summary: "Concise visual walkthrough of server-first routing, caching, and API boundaries.",
            noteSections: [
              {
                heading: "Architecture Checklist",
                body: "Verify every paid route disables stale CDN caching with Cache-Control: no-store so newly verified enrollments appear immediately.",
                takeaway: "Use no-store headers on order, verification, and enrollment-gated API responses.",
              },
            ],
            youtubeVideoId: "Sklc_fQBmcs",
            youtubeUrl: "https://www.youtube.com/watch?v=Sklc_fQBmcs",
            videoCreator: "Fireship (YouTube)",
            resources: [],
          },
        ],
      },
      {
        id: "mod-web-3",
        sortOrder: 3,
        title: "Real-World Capstone Project & Mentor Critique",
        summary:
          "Apply accessible layouts, typed API validation, and verifiable submission proof in a mentor-reviewed build.",
        estimatedMinutes: 120,
        lessons: [
          {
            id: "les-web-3-project",
            sortOrder: 1,
            title: "Milestone Brief: Accessible Learning & Verification Workspace",
            lessonType: "project_milestone",
            durationLabel: "Build project",
            summary: "Review project rubric, test expectations, and submit your GitHub repository.",
            noteSections: [
              {
                heading: "Submission Expectations",
                body: "Include a clear README, unit tests covering server authorization boundaries, and screenshots of keyboard navigation focus rings.",
                takeaway: "Mentor feedback evaluates boundary security, accessibility semantics, and reproducible tests.",
              },
            ],
            resources: [],
          },
        ],
      },
    ],
    project: {
      slug: "accessible-learning-portfolio",
      title: "Accessible Learning Portfolio & Verification Workspace",
      summary:
        "Create an accessible React & Next.js project workspace that enforces server-side validation and clean milestone tracking.",
      brief:
        "Design and ship an interactive full-stack workspace with keyboard-navigable controls, strict Zod server validation, and database-backed progress persistence. Connects frontend polish directly to backend trust boundaries.",
      estimatedHours: 10,
      milestones: [
        "Build accessible landmarks, keyboard-reachable tabs, and high-contrast focus states",
        "Implement typed Next.js API route verifying ownership before writing progress",
        "Write automated Node/TSX tests proving unauthorized writes return 401/403",
      ],
      deliverables: [
        "Public GitHub repository with clear setup instructions",
        "Automated test run output verifying API boundary checks",
        "Short architecture reflection summarizing trade-offs",
      ],
      rubric: [
        "Zero keyboard traps and valid semantic button/link usage",
        "Server-derived authorization with zero hardcoded client secrets",
        "Clean error, loading, and empty states",
      ],
      mentorName: "Kabir Malhotra",
      mentorRole: "Principal Frontend Architect",
    },
  },
  {
    id: "course-python-systems",
    slug: "python-systems-cli",
    title: "Python Systems & CLI Engineering",
    subtitle:
      "Write deterministic Python data pipelines, defensive parsers, and fast contract tests for production utilities.",
    category: "Engineering",
    level: "Core → Systems",
    pricePaise: 79900,
    currency: "INR",
    estimatedHours: 12,
    mentorName: "Ananya Rao",
    mentorRole: "Staff Systems Engineer",
    outcomes: [
      "Stream large JSONL and CSV event logs with constant memory overhead",
      "Use Python type hints, dataclasses, and strict validation contracts",
      "Write deterministic unit tests covering timezone and malformed input edge cases",
      "Package clean CLI commands with predictable exit codes and JSON reports",
    ],
    includes: [
      "3 practical modules with complete written engineering notes",
      "Curated YouTube Python systems lectures with creator attribution",
      "1 applied CLI Telemetry Analyzer project reviewed by a Staff Systems Engineer",
      "Preparation pathway for the Full-Stack Product Engineering Internship track",
    ],
    linkedInternshipSlug: "full-stack-product-engineering",
    linkedInternshipTitle: "Full-Stack Product Engineering Internship",
    internshipDisclosure:
      "Course enrollment unlocks all notes, video lessons, and mentor project feedback. Optional completion certificates carry a separate ₹299–₹599 INR fee after passing project requirements. Studio projects do not constitute external job placement guarantees.",
    isPublished: true,
    modules: [
      {
        id: "mod-py-1",
        sortOrder: 1,
        title: "Streaming Generators & Typed Records",
        summary: "Process arbitrary-sized log files safely using Python iterators and strict schema dataclasses.",
        estimatedMinutes: 60,
        lessons: [
          {
            id: "les-py-1-note",
            sortOrder: 1,
            title: "Bounded Memory Parsing with Generators",
            lessonType: "note",
            durationLabel: "20 min read",
            summary: "Avoid loading entire datasets into RAM when summarizing sequential event streams.",
            noteSections: [
              {
                heading: "Line-by-Line Lazy Iteration",
                body: "Opening files lazily and yielding validated dataclasses keeps resident memory flat even across multi-gigabyte archives.",
                codeSnippet: `def iter_records(path: Path) -> Iterator[EventRow]:\n    with path.open("r", encoding="utf-8") as handle:\n        for line_no, raw in enumerate(handle, start=1):\n            yield parse_event(raw, line_no)`,
                takeaway: "Separate parsing errors into structured warnings instead of crashing mid-stream.",
              },
            ],
            resources: [
              {
                id: "res-py-pathlib",
                title: "Python Docs: pathlib & argparse",
                provider: "Python.org",
                url: "https://docs.python.org/3/library/pathlib.html",
              },
            ],
          },
          {
            id: "les-py-1-video",
            sortOrder: 2,
            title: "Curated Lecture: Modern Python Type & Runtime Overview",
            lessonType: "video",
            durationLabel: "18 min watch",
            summary: "Curated overview of Python idioms, generators, and clean structure.",
            noteSections: [
              {
                heading: "Key Video Notes",
                body: "Compare list comprehensions vs. generator expressions when feeding downstream aggregation steps.",
                takeaway: "Prefer generators for single-pass pipelines.",
              },
            ],
            youtubeVideoId: "x7X9w_GIm1s",
            youtubeUrl: "https://www.youtube.com/watch?v=x7X9w_GIm1s",
            videoCreator: "Fireship (YouTube)",
            resources: [],
          },
        ],
      },
      {
        id: "mod-py-2",
        sortOrder: 2,
        title: "Boundary Testing & Deterministic CLIs",
        summary: "Test malformed payloads, UTC normalization, and CLI flags cleanly.",
        estimatedMinutes: 75,
        lessons: [
          {
            id: "les-py-2-note",
            sortOrder: 1,
            title: "Contract Tests & Non-Zero Exit Codes",
            lessonType: "note",
            durationLabel: "25 min read",
            summary: "Design testable command entrypoints accepting explicit stdin/stdout streams.",
            noteSections: [
              {
                heading: "Testable main(argv) Entrypoints",
                body: "Never bind argparse directly inside top-level script execution; accept argv: list[str] | None so pytest/unittest can exercise every failure mode cleanly.",
                takeaway: "Deterministic exit codes turn scripts into reliable automation building blocks.",
              },
            ],
            resources: [],
          },
          {
            id: "les-py-2-video",
            sortOrder: 2,
            title: "Curated Lecture: Complete Python Foundations Reference",
            lessonType: "video",
            durationLabel: "45 min reference",
            summary: "Comprehensive freeCodeCamp Python walkthrough for rapid syntax lookup.",
            noteSections: [
              {
                heading: "Suggested Chapters",
                body: "Focus on file handling, exception guards, and dictionary aggregation chapters.",
                takeaway: "Keep exception blocks narrow around untrusted I/O.",
              },
            ],
            youtubeVideoId: "rfscVS0vtbw",
            youtubeUrl: "https://www.youtube.com/watch?v=rfscVS0vtbw",
            videoCreator: "freeCodeCamp.org (YouTube)",
            resources: [],
          },
        ],
      },
      {
        id: "mod-py-3",
        sortOrder: 3,
        title: "Capstone CLI Telemetry Analyzer",
        summary: "Ship your streaming Python parser with unit tests and architecture notes.",
        estimatedMinutes: 110,
        lessons: [
          {
            id: "les-py-3-project",
            sortOrder: 1,
            title: "Milestone Brief: Build CLI Telemetry Analyzer",
            lessonType: "project_milestone",
            durationLabel: "Build project",
            summary: "Complete milestones and submit your repository for Ananya Rao's review.",
            noteSections: [
              {
                heading: "Milestone Checklist",
                body: "Verify streaming parser handles blank lines, invalid JSON rows, and mixed UTC offsets gracefully.",
                takeaway: "Submit reproducible test commands with your artifact link.",
              },
            ],
            resources: [],
          },
        ],
      },
    ],
    project: {
      slug: "cli-telemetry-analyzer",
      title: "CLI Telemetry Analyzer",
      summary:
        "Parse structured JSONL activity logs in Python, compute rolling metrics, and export clean summary reports.",
      brief:
        "Build a command-line tool that ingests raw event streams, validates timestamps and malformed rows cleanly, and outputs reproducible daily summaries. Compare trade-offs between streaming generators and in-memory aggregation.",
      estimatedHours: 6,
      milestones: [
        "Implement streaming JSONL reader with strict ISO-8601 UTC normalization",
        "Add summary aggregation exported cleanly as formatted table or JSON",
        "Ship comprehensive unit tests covering malformed rows and exit codes",
      ],
      deliverables: [
        "Typed Python CLI accepting input log path and output format flags",
        "Unit test suite covering malformed JSON and timezone edge cases",
        "Short architecture note explaining data validation choices",
      ],
      rubric: [
        "Constant memory streaming across large sample files",
        "Explicit structured error reporting without unhandled stack traces",
        "Passing automated test coverage",
      ],
      mentorName: "Ananya Rao",
      mentorRole: "Staff Systems Engineer",
    },
  },
  {
    id: "course-applied-ai",
    slug: "applied-ai-evaluation",
    title: "Applied AI & Evaluation Studio",
    subtitle:
      "Build measurable LLM evaluation harnesses, golden test suites, and regression checks beyond ad-hoc prompting.",
    category: "Data & AI",
    level: "Intermediate → Studio",
    pricePaise: 149900,
    currency: "INR",
    estimatedHours: 16,
    mentorName: "Dr. Nisha Menon",
    mentorRole: "Applied AI Researcher",
    outcomes: [
      "Design curated golden datasets measuring accuracy, schema adherence, and refusal quality",
      "Replace subjective prompt tuning with repeatable regression diffs",
      "Calibrate confidence thresholds and fallback workflows for uncertain model outputs",
      "Ship a runnable Structured AI Evaluation Harness reviewed by an AI researcher",
    ],
    includes: [
      "3 applied modules with detailed evaluation engineering notes",
      "Curated YouTube deep-dives from Andrej Karpathy & 3Blue1Brown",
      "1 real-world AI Evaluation Harness project with rubric feedback",
      "Direct alignment with the Applied AI & Data Systems Internship track",
    ],
    linkedInternshipSlug: "applied-ai-data-systems",
    linkedInternshipTitle: "Applied AI & Data Systems Internship",
    internshipDisclosure:
      "Course enrollment includes full study notes, curated videos, and mentor project review. Practical internship track admission and completion certificates are clearly separated from external employer hiring guarantees.",
    isPublished: true,
    modules: [
      {
        id: "mod-ai-1",
        sortOrder: 1,
        title: "LLM Foundations & Golden Datasets",
        summary: "Understand token prediction limits and design non-leaky evaluation sets.",
        estimatedMinutes: 85,
        lessons: [
          {
            id: "les-ai-1-note",
            sortOrder: 1,
            title: "Why Demos Fail in Production Without Evals",
            lessonType: "note",
            durationLabel: "25 min read",
            summary: "Structuring labeled edge-case suites before changing prompts or model weights.",
            noteSections: [
              {
                heading: "Separating Smoke Tests from Regression Benchmarks",
                body: "Collect real failure modes—ambiguous inputs, empty contexts, adversarial formatting—into a versioned JSONL benchmark before tuning system instructions.",
                takeaway: "If you cannot measure prompt regressions deterministically, you are shipping blind.",
              },
            ],
            resources: [],
          },
          {
            id: "les-ai-1-video",
            sortOrder: 2,
            title: "Curated Lecture: Intro to Large Language Models",
            lessonType: "video",
            durationLabel: "60 min watch",
            summary: "Foundational systems lecture on pretraining, fine-tuning, tool use, and security.",
            noteSections: [
              {
                heading: "Study Prompts",
                body: "Note the distinction between base next-token prediction and instruction-following alignment.",
                takeaway: "Treat model outputs as untrusted data until verified by schema or tool checks.",
              },
            ],
            youtubeVideoId: "zjkBMFhNj_g",
            youtubeUrl: "https://www.youtube.com/watch?v=zjkBMFhNj_g",
            videoCreator: "Andrej Karpathy (YouTube)",
            resources: [],
          },
        ],
      },
      {
        id: "mod-ai-2",
        sortOrder: 2,
        title: "Rubrics, Calibration & Neural Representations",
        summary: "Measure embedding similarity, schema pass rates, and calibration errors cleanly.",
        estimatedMinutes: 70,
        lessons: [
          {
            id: "les-ai-2-video",
            sortOrder: 1,
            title: "Curated Lecture: Visual Intuition Behind Neural Networks",
            lessonType: "video",
            durationLabel: "19 min watch",
            summary: "Visual geometric explanation of weights, activations, and layered representations.",
            noteSections: [
              {
                heading: "Geometric Takeaway",
                body: "Inspecting probability calibration prevents over-confident hallucinated classifications.",
                takeaway: "Track confidence alongside accuracy on held-out test slices.",
              },
            ],
            youtubeVideoId: "aircAruvnKk",
            youtubeUrl: "https://www.youtube.com/watch?v=aircAruvnKk",
            videoCreator: "3Blue1Brown (YouTube)",
            resources: [],
          },
        ],
      },
      {
        id: "mod-ai-3",
        sortOrder: 3,
        title: "Real-World AI Evaluation Harness Project",
        summary: "Build an automated harness comparing two prompt strategies across 30 test cases.",
        estimatedMinutes: 120,
        lessons: [
          {
            id: "les-ai-3-project",
            sortOrder: 1,
            title: "Milestone Brief: Structured AI Evaluation Harness",
            lessonType: "project_milestone",
            durationLabel: "Build project",
            summary: "Assemble reproducible evaluation runner, metrics breakdown, and failure write-up.",
            noteSections: [
              {
                heading: "Project Focus",
                body: "Submit clean diffs showing precision/pass-rate shifts between baseline and revised prompts.",
                takeaway: "Document at least three real failure slices your evaluation suite caught.",
              },
            ],
            resources: [],
          },
        ],
      },
    ],
    project: {
      slug: "eval-harness-studio",
      title: "Structured AI Evaluation Harness",
      summary:
        "Design golden evaluation sets, grading rubrics, and reproducible prompt regression checks.",
      brief:
        "Build a repeatable evaluation script that scores structured outputs across accuracy, JSON schema compliance, and latency budgets without manual guessing.",
      estimatedHours: 9,
      milestones: [
        "Curate 25+ representative normal and adversarial test cases",
        "Implement deterministic schema and rubric scoring script",
        "Produce clear before/after prompt comparison report",
      ],
      deliverables: [
        "Evaluation dataset JSONL and runner script",
        "Comparison metrics summary report",
        "Short write-up on failure categorization",
      ],
      rubric: [
        "Reproducible pass/fail metrics",
        "Explicit edge-case coverage",
        "Clear separation between deterministic checks and heuristic scoring",
      ],
      mentorName: "Dr. Nisha Menon",
      mentorRole: "Applied AI Researcher",
    },
  },
  {
    id: "course-cybersecurity",
    slug: "cybersecurity-trust-boundaries",
    title: "Cybersecurity & Payment Trust Boundaries",
    subtitle:
      "Harden webhook endpoints, raw-body HMAC SHA-256 verification, replay protection, and role access boundaries.",
    category: "Infrastructure",
    level: "Intermediate",
    pricePaise: 119900,
    currency: "INR",
    estimatedHours: 14,
    mentorName: "Rhea Kulkarni",
    mentorRole: "Security & Trust Engineer",
    outcomes: [
      "Verify webhook signatures against exact raw request bytes using constant-time comparison",
      "Prevent duplicate webhook replay attacks with idempotency ledgers",
      "Enforce server-side role claims and reject client-forged payment totals",
      "Ship a hardened HMAC Webhook Verifier reviewed by a Security Engineer",
    ],
    includes: [
      "3 security engineering modules with raw-body cryptographic notes",
      "Curated backend & security engineering lectures",
      "1 applied Webhook Trust Boundary capstone with mentor audit",
      "Preparation for the Cloud & Security Engineering Internship track",
    ],
    linkedInternshipSlug: "cloud-security-engineering",
    linkedInternshipTitle: "Cloud & Security Engineering Internship",
    internshipDisclosure:
      "Course enrollment includes all written notes, curated video embeds, and mentor security review. Optional completion certificates carry a ₹299–₹599 INR fee once deliverables pass mentor critique.",
    isPublished: true,
    modules: [
      {
        id: "mod-sec-1",
        sortOrder: 1,
        title: "Server-Authoritative Pricing & Input Validation",
        summary: "Eliminate price tampering by resolving product pricing exclusively on the server.",
        estimatedMinutes: 65,
        lessons: [
          {
            id: "les-sec-1-note",
            sortOrder: 1,
            title: "Why Client-Sent Amounts Are Always Vulnerable",
            lessonType: "note",
            durationLabel: "25 min read",
            summary: "Deriving integer paise amounts directly from authoritative database records.",
            noteSections: [
              {
                heading: "Reject Client Totals",
                body: "Checkout requests must send only target IDs (such as courseId or productId). The server looks up the authoritative integer paise price and creates the Razorpay order directly.",
                codeSnippet: `const course = await findPublishedCourse(body.courseId);\nconst order = await createRazorpayOrder({\n  amountPaise: course.pricePaise,\n  currency: "INR"\n});`,
                takeaway: "Never trust price, role, or entitlement flags sent in JSON request bodies.",
              },
            ],
            resources: [],
          },
        ],
      },
      {
        id: "mod-sec-2",
        sortOrder: 2,
        title: "Raw-Body HMAC & Idempotency Guards",
        summary: "Read raw request text before JSON parsing so HMAC SHA-256 signatures verify cleanly.",
        estimatedMinutes: 85,
        lessons: [
          {
            id: "les-sec-2-note",
            sortOrder: 1,
            title: "Timing-Safe Signature Verification & Replay Prevention",
            lessonType: "note",
            durationLabel: "30 min read",
            summary: "Using crypto.timingSafeEqual and deduplicating event IDs idempotently.",
            noteSections: [
              {
                heading: "Preserve Exact Raw Bytes",
                body: "Re-stringifying parsed JSON can alter key ordering or whitespace and break legitimate provider signatures. Always read request.text() first, verify HMAC SHA-256 with timingSafeEqual, and check payment_webhook_events before applying state transitions.",
                takeaway: "Return HTTP 200 on already-processed duplicate events without re-running side effects.",
              },
            ],
            resources: [],
          },
          {
            id: "les-sec-2-video",
            sortOrder: 2,
            title: "Curated Lecture: Node.js Server Architecture & HTTP Pipelines",
            lessonType: "video",
            durationLabel: "40 min watch",
            summary: "Deep dive into HTTP request streams, middleware validation, and server boundaries.",
            noteSections: [
              {
                heading: "Key Focus",
                body: "Observe how request stream parsing behaves prior to middleware mutation.",
                takeaway: "Capture raw request buffers cleanly on webhook routes.",
              },
            ],
            youtubeVideoId: "Oe421EPjeBE",
            youtubeUrl: "https://www.youtube.com/watch?v=Oe421EPjeBE",
            videoCreator: "freeCodeCamp.org (YouTube)",
            resources: [],
          },
        ],
      },
      {
        id: "mod-sec-3",
        sortOrder: 3,
        title: "Capstone: HMAC Webhook & Idempotency Guard",
        summary: "Build and test a production-grade webhook trust boundary.",
        estimatedMinutes: 100,
        lessons: [
          {
            id: "les-sec-3-project",
            sortOrder: 1,
            title: "Milestone Brief: Harden Payment Webhook Handler",
            lessonType: "project_milestone",
            durationLabel: "Build project",
            summary: "Implement signature checks, replay protection, and automated tamper tests.",
            noteSections: [
              {
                heading: "Security Verification",
                body: "Include tests proving whitespace edits invalidate signatures and duplicate event IDs do not issue double enrollments.",
                takeaway: "Test both rejection paths and idempotent replay paths.",
              },
            ],
            resources: [],
          },
        ],
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
      mentorName: "Rhea Kulkarni",
      mentorRole: "Security & Trust Engineer",
    },
  },
  {
    id: "course-product-ux",
    slug: "product-design-accessibility",
    title: "Product Architecture & Accessible UI",
    subtitle:
      "Turn dense feature sprawl into calm, responsive multi-role navigation and mobile-friendly touch ergonomics.",
    category: "Product & design",
    level: "Foundations",
    pricePaise: 49900,
    currency: "INR",
    estimatedHours: 10,
    mentorName: "Tara Sengupta",
    mentorRole: "Design Systems Lead",
    outcomes: [
      "Audit sticky headers and bottom bars to stay compact (<15% height) on 390px viewports",
      "Design unboxed typographic metadata and high-contrast interactive controls",
      "Build synchronized keyboard and screen-reader alternatives for interactive visual tools",
      "Complete an Accessible Multi-Role Interface Critique reviewed by a Design Systems Lead",
    ],
    includes: [
      "3 concise modules on layout math, typography, and mobile touch ergonomics",
      "Curated frontend craft lectures with creator attribution",
      "1 practical UX architecture critique & specification project",
      "Connects into the Full-Stack Product Engineering Internship track",
    ],
    linkedInternshipSlug: "full-stack-product-engineering",
    linkedInternshipTitle: "Full-Stack Product Engineering Internship",
    internshipDisclosure:
      "Course enrollment unlocks all notes, curated videos, and mentor design critique. Optional completion certificates carry a ₹299–₹599 INR fee after mentor approval.",
    isPublished: true,
    modules: [
      {
        id: "mod-ux-1",
        sortOrder: 1,
        title: "Information Hierarchy & Role Clarity",
        summary: "Give learners, mentors, and admins focused controls without visual clutter.",
        estimatedMinutes: 55,
        lessons: [
          {
            id: "les-ux-1-note",
            sortOrder: 1,
            title: "Separating Static Metadata from Interactive Actions",
            lessonType: "note",
            durationLabel: "20 min read",
            summary: "Keeping cards scannable with typographic discipline and single-line controls.",
            noteSections: [
              {
                heading: "Unboxed Metadata vs. Action Controls",
                body: "Reserve bordered pills and high-contrast fills exclusively for interactive buttons and filter tabs. Display durations, levels, and categories cleanly with inline middot separators.",
                takeaway: "Users spot actionable buttons instantaneously when static metadata stays quiet.",
              },
            ],
            resources: [],
          },
          {
            id: "les-ux-1-video",
            sortOrder: 2,
            title: "Curated Lecture: JavaScript Event Loop & UI Responsiveness",
            lessonType: "video",
            durationLabel: "26 min watch",
            summary: "Why non-blocking rendering keeps interactive selectors and scroll animations crisp.",
            noteSections: [
              {
                heading: "UI Budget Takeaway",
                body: "Keep routine interactions below 200ms and animate transform/opacity cleanly.",
                takeaway: "Never block main-thread paint cycles inside pointer handlers.",
              },
            ],
            youtubeVideoId: "8aGhZQkoFbQ",
            youtubeUrl: "https://www.youtube.com/watch?v=8aGhZQkoFbQ",
            videoCreator: "JSConf / Philip Roberts (YouTube)",
            resources: [],
          },
        ],
      },
      {
        id: "mod-ux-2",
        sortOrder: 2,
        title: "Mobile Touch Ergonomics & Accessible Fallbacks",
        summary: "Pair spatial/rotational UI controls with keyboard buttons and 44px touch targets.",
        estimatedMinutes: 60,
        lessons: [
          {
            id: "les-ux-2-note",
            sortOrder: 1,
            title: "Dual Input Support for Interactive Selectors",
            lessonType: "note",
            durationLabel: "20 min read",
            summary: "Ensuring wheels, sliders, and canvases always work smoothly with keyboards and thumbs.",
            noteSections: [
              {
                heading: "Keyboard & Click Parity",
                body: "Any draggable dial or slide control must also expose Arrow/Home/End keyboard handlers and direct clickable fallback tabs on compact screens.",
                takeaway: "Delightful physics should enhance—never replace—direct keyboard and touch clarity.",
              },
            ],
            resources: [],
          },
        ],
      },
      {
        id: "mod-ux-3",
        sortOrder: 3,
        title: "Capstone: Multi-Role Interface Critique",
        summary: "Deliver a responsive UI audit and interactive navigation specification.",
        estimatedMinutes: 85,
        lessons: [
          {
            id: "les-ux-3-project",
            sortOrder: 1,
            title: "Milestone Brief: Accessible Multi-Role Critique",
            lessonType: "project_milestone",
            durationLabel: "Build project",
            summary: "Audit desktop (1440px) and mobile (390px) flows and propose measurable improvements.",
            noteSections: [
              {
                heading: "Deliverable Checklist",
                body: "Capture before/after viewport measurements, contrast ratios, and keyboard tab order notes.",
                takeaway: "Pair every aesthetic critique with a concrete DOM/CSS fix.",
              },
            ],
            resources: [],
          },
        ],
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
      mentorName: "Tara Sengupta",
      mentorRole: "Design Systems Lead",
    },
  },
  {
    id: "course-cloud-devops",
    slug: "cloud-reliability-devops",
    title: "Cloud Reliability & Zero-Downtime Delivery",
    subtitle:
      "Containerize services, configure health checks, and ship reproducible CI gates for dependable deployments.",
    category: "Infrastructure",
    level: "Advanced Studio",
    pricePaise: 199900,
    currency: "INR",
    estimatedHours: 22,
    mentorName: "Siddharth Iyer",
    mentorRole: "Platform Reliability Mentor",
    outcomes: [
      "Package deterministic multi-stage Docker builds with minimal runtime attack surface",
      "Implement graceful degradation when external APIs or databases time out",
      "Enforce type checks, linting, and integration tests in automated CI gates",
      "Ship a Resilient Service Architecture blueprint reviewed by a Platform Reliability Mentor",
    ],
    includes: [
      "3 production infrastructure modules with failure-mode study notes",
      "Curated YouTube DevOps & containerization lectures",
      "1 applied Resilient Service Architecture capstone project",
      "Direct alignment with the Cloud & Security Engineering Internship track",
    ],
    linkedInternshipSlug: "cloud-security-engineering",
    linkedInternshipTitle: "Cloud & Security Engineering Internship",
    internshipDisclosure:
      "Course enrollment includes full study notes, curated videos, and mentor review. Optional completion certificates carry a ₹299–₹599 INR fee upon verified completion.",
    isPublished: true,
    modules: [
      {
        id: "mod-cloud-1",
        sortOrder: 1,
        title: "Containerization & Deterministic Builds",
        summary: "Isolate build toolchains from runtime images and pin dependency locks.",
        estimatedMinutes: 85,
        lessons: [
          {
            id: "les-cloud-1-video",
            sortOrder: 1,
            title: "Curated Lecture: Docker & Container Architecture",
            lessonType: "video",
            durationLabel: "50 min watch",
            summary: "Practical container networking, multi-stage Dockerfiles, and volume discipline.",
            noteSections: [
              {
                heading: "Production Takeaway",
                body: "Keep build secrets out of image layers and inject environment config strictly at runtime.",
                takeaway: "Use non-root runtime users and minimal base layers.",
              },
            ],
            youtubeVideoId: "3c-iBn73dDE",
            youtubeUrl: "https://www.youtube.com/watch?v=3c-iBn73dDE",
            videoCreator: "TechWorld with Nana (YouTube)",
            resources: [],
          },
        ],
      },
      {
        id: "mod-cloud-2",
        sortOrder: 2,
        title: "Graceful Degradation & Health Endpoints",
        summary: "Design fallback modes and predictable error surfacing without silent failure.",
        estimatedMinutes: 70,
        lessons: [
          {
            id: "les-cloud-2-note",
            sortOrder: 1,
            title: "Degraded Mode Runbooks & Explicit Banners",
            lessonType: "note",
            durationLabel: "25 min read",
            summary: "Distinguishing expected test/sandbox configurations from broken live services.",
            noteSections: [
              {
                heading: "Fail Loudly on Misconfiguration, Degrade Intentionally in Sandbox",
                body: "When an optional payment key is absent locally, expose a clear sandbox banner; when signature validation fails in production, reject loudly and log the trace cleanly.",
                takeaway: "Never conflate silent errors with safe fallback modes.",
              },
            ],
            resources: [],
          },
        ],
      },
      {
        id: "mod-cloud-3",
        sortOrder: 3,
        title: "Capstone: Zero-Downtime Service Blueprint",
        summary: "Deliver an incident-ready rollout, health check, and rollback runbook.",
        estimatedMinutes: 120,
        lessons: [
          {
            id: "les-cloud-3-project",
            sortOrder: 1,
            title: "Milestone Brief: Zero-Downtime Rollout & Runbook",
            lessonType: "project_milestone",
            durationLabel: "Build project",
            summary: "Document readiness probes, migration backward compatibility, and rollback steps.",
            noteSections: [
              {
                heading: "Migration Safety",
                body: "Expand-and-contract SQL migrations prevent breaking running containers during rollouts.",
                takeaway: "Always pair schema additions with non-destructive rollback notes.",
              },
            ],
            resources: [],
          },
        ],
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
      mentorName: "Siddharth Iyer",
      mentorRole: "Platform Reliability Mentor",
    },
  },
];
