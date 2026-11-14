import { pathways, type Pathway } from "./pathways";

export type NodeKind = "concept" | "project" | "touchpoint";

export type ResourceReference = {
  id: string;
  title: string;
  provider: string;
  url: string;
  duration: string;
  kind: "reading" | "interactive" | "reference";
};

export type LearningNode = {
  id: string;
  slug: string;
  title: string;
  kind: NodeKind;
  pathwaySlug: string;
  pathwayNumber: string;
  summary: string;
  estimatedMinutes: number;
  prerequisites: string[];
  relatedNodeIds: string[];
  projectSlug?: string;
  mentorName: string;
  mentorRole: string;
  x: number; // 0-100 coordinate for spatial map view
  y: number; // 0-100 coordinate for spatial map view
  resources: ResourceReference[];
};

export type PeerWorkExample = {
  id: string;
  learnerName: string;
  cohort: string;
  summary: string;
  artifactUrl: string;
  mentorHighlight: string;
};

export type ProjectBrief = {
  slug: string;
  title: string;
  pathwaySlug: string;
  pathwayNumber: string;
  category: string;
  difficulty: string;
  estimatedHours: number;
  summary: string;
  brief: string;
  whyItMatters?: string;
  stepByStep?: string[];
  requiredSkills?: string[];
  submissionDeadline?: string;
  submissionMethod?: string;
  evaluationCriteria?: string[];
  deliverables: string[];
  relatedConceptIds: string[];
  relatedProjectSlugs: string[];
  mentorName: string;
  mentorRole: string;
  cohortName: string;
  internshipSlug?: string;
  resources: ResourceReference[];
  peerWork: PeerWorkExample[];
};

export type EnrichedPathway = Pathway & {
  slug: string;
  mentorName: string;
  mentorRole: string;
  cohortName: string;
};

const PATHWAY_SLUGS: Record<string, { slug: string; mentorName: string; mentorRole: string; cohortName: string }> = {
  "01": {
    slug: "python-programming",
    mentorName: "Ananya Rao",
    mentorRole: "Staff Systems Engineer",
    cohortName: "Autumn Engineering Cohort",
  },
  "02": {
    slug: "web-development",
    mentorName: "Kabir Malhotra",
    mentorRole: "Principal Frontend Architect",
    cohortName: "Autumn Engineering Cohort",
  },
  "03": {
    slug: "artificial-intelligence",
    mentorName: "Dr. Nisha Menon",
    mentorRole: "Applied AI Lead",
    cohortName: "Applied AI Studio",
  },
  "04": {
    slug: "machine-learning",
    mentorName: "Dr. Nisha Menon",
    mentorRole: "Applied AI Lead",
    cohortName: "Applied AI Studio",
  },
  "05": {
    slug: "data-science",
    mentorName: "Vikram Desai",
    mentorRole: "Lead Data Scientist",
    cohortName: "Applied AI Studio",
  },
  "06": {
    slug: "cybersecurity",
    mentorName: "Rhea Kulkarni",
    mentorRole: "Security & Trust Engineer",
    cohortName: "Infrastructure & Trust Cohort",
  },
  "07": {
    slug: "cloud-computing",
    mentorName: "Rhea Kulkarni",
    mentorRole: "Security & Trust Engineer",
    cohortName: "Infrastructure & Trust Cohort",
  },
  "08": {
    slug: "devops",
    mentorName: "Siddharth Iyer",
    mentorRole: "Platform Reliability Mentor",
    cohortName: "Infrastructure & Trust Cohort",
  },
  "09": {
    slug: "ui-ux-design",
    mentorName: "Tara Sengupta",
    mentorRole: "Design Systems Lead",
    cohortName: "Product Craft Cohort",
  },
};

export const enrichedPathways: EnrichedPathway[] = pathways.map((p) => {
  const meta = PATHWAY_SLUGS[p.number] ?? {
    slug: p.title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    mentorName: "TGL Mentor Guild",
    mentorRole: "Technical Mentor",
    cohortName: "Open Studio Cohort",
  };
  return { ...p, ...meta };
});

export const learningProjects: ProjectBrief[] = [
  {
    slug: "cli-telemetry-analyzer",
    title: "CLI Telemetry & Log Analyzer",
    pathwaySlug: "python-programming",
    pathwayNumber: "01",
    category: "Engineering",
    difficulty: "Foundations",
    estimatedHours: 6,
    summary: "Parse structured JSONL activity logs in Python, compute rolling metrics, and export clean summary reports.",
    brief:
      "Build a command-line tool that ingests raw event streams, validates timestamps and malformed rows cleanly, and outputs reproducible daily summaries. Compare trade-offs between streaming generators and in-memory aggregation.",
    deliverables: [
      "Typed Python CLI accepting input log path and output format flags",
      "Unit test suite covering malformed JSON and timezone edge cases",
      "Short architecture note explaining data validation choices",
    ],
    relatedConceptIds: ["py-data-structures", "py-testing-contracts", "sec-input-validation"],
    relatedProjectSlugs: ["accessible-learning-portfolio", "eval-harness-studio"],
    mentorName: "Ananya Rao",
    mentorRole: "Staff Systems Engineer",
    cohortName: "Autumn Engineering Cohort",
    resources: [
      {
        id: "res-py-docs",
        title: "Python Standard Library: argparse & pathlib",
        provider: "Python.org",
        url: "https://docs.python.org/3/library/pathlib.html",
        duration: "25 min",
        kind: "reference",
      },
      {
        id: "res-pytest",
        title: "Property & boundary testing in Python",
        provider: "Real Python",
        url: "https://docs.python.org/3/library/unittest.html",
        duration: "35 min",
        kind: "reading",
      },
    ],
    peerWork: [
      {
        id: "peer-py-1",
        learnerName: "Meera Krishnan",
        cohort: "Autumn Engineering Cohort",
        summary: "Added streaming chunk reader handling 200k log lines under 40ms with strict ISO-8601 validation.",
        artifactUrl: "https://github.com/example/meera-cli-analyzer",
        mentorHighlight: "Mentor highlighted clean error exit codes and zero-allocation parsing.",
      },
    ],
  },
  {
    slug: "accessible-learning-portfolio",
    title: "Accessible Learning Portfolio & Verification Workspace",
    pathwaySlug: "web-development",
    pathwayNumber: "02",
    category: "Engineering",
    difficulty: "Foundations → build",
    estimatedHours: 10,
    summary: "Create an accessible React & Next.js project workspace that logs verified milestone evidence through typed API routes.",
    brief:
      "Design and implement an interactive learner workspace with keyboard-navigable views, strict TypeScript API validation, and verifiable completion records. Connects web frontend craft directly to backend trust boundaries.",
    deliverables: [
      "Keyboard-accessible UI components with loading, empty, and error states",
      "Server-side API route validating payloads and storing milestone evidence",
      "Automated test cases proving signature or schema rejection",
    ],
    relatedConceptIds: ["web-semantic-dom", "web-api-boundaries", "ux-keyboard-flows", "sec-hmac-signatures"],
    relatedProjectSlugs: ["cli-telemetry-analyzer", "design-system-audit"],
    mentorName: "Kabir Malhotra",
    mentorRole: "Principal Frontend Architect",
    cohortName: "Autumn Engineering Cohort",
    internshipSlug: "full-stack-product-engineering",
    resources: [
      {
        id: "res-mdn-aria",
        title: "MDN: Keyboard-navigable JavaScript widgets",
        provider: "MDN Web Docs",
        url: "https://developer.mozilla.org/en-US/docs/Web/Accessibility/Keyboard-navigable_JavaScript_widgets",
        duration: "30 min",
        kind: "reading",
      },
      {
        id: "res-nextjs-routes",
        title: "Next.js Route Handlers & Server Validation",
        provider: "Next.js Docs",
        url: "https://nextjs.org/docs/app/building-your-application/routing/route-handlers",
        duration: "25 min",
        kind: "reference",
      },
    ],
    peerWork: [
      {
        id: "peer-web-1",
        learnerName: "Aarav Sharma",
        cohort: "Autumn Engineering Cohort",
        summary: "Implemented signed webhook validation, audit logging, and accessible React dashboard.",
        artifactUrl: "https://github.com/example/tgl-capstone-submission",
        mentorHighlight: "Approved for Internship Certificate eligibility with full test coverage.",
      },
      {
        id: "peer-web-2",
        learnerName: "Diya Nair",
        cohort: "Autumn Engineering Cohort",
        summary: "Built keyboard-driven spatial concept explorer with ARIA live-region announcements.",
        artifactUrl: "https://github.com/example/diya-spatial-map",
        mentorHighlight: "Notable screen-reader navigation ergonomics.",
      },
    ],
  },
  {
    slug: "eval-harness-studio",
    title: "Structured AI Evaluation Harness",
    pathwaySlug: "artificial-intelligence",
    pathwayNumber: "03",
    category: "Data & AI",
    difficulty: "Explore & apply",
    estimatedHours: 8,
    summary: "Build a repeatable evaluation rubric for prompt workflows, measuring accuracy, latency, and refusal reliability.",
    brief:
      "Move past ad-hoc prompt tweaking by creating a benchmark dataset of 25 edge cases, automated grading assertions, and comparison diffs across model configurations.",
    deliverables: [
      "Versioned evaluation dataset with clear expected criteria",
      "Scoring script comparing baseline vs updated prompt strategies",
      "Brief failure-mode writeup documenting regressions found",
    ],
    relatedConceptIds: ["ai-eval-rubrics", "ml-error-analysis", "ds-metric-design"],
    relatedProjectSlugs: ["cli-telemetry-analyzer", "churn-calibration-lab"],
    mentorName: "Dr. Nisha Menon",
    mentorRole: "Applied AI Lead",
    cohortName: "Applied AI Studio",
    internshipSlug: "applied-ai-data-systems",
    resources: [
      {
        id: "res-eval-guide",
        title: "Designing Reliable AI Evaluations",
        provider: "Google AI Docs",
        url: "https://ai.google.dev/gemini-api/docs",
        duration: "35 min",
        kind: "reading",
      },
    ],
    peerWork: [
      {
        id: "peer-ai-1",
        learnerName: "Karthik Subramanian",
        cohort: "Applied AI Studio",
        summary: "Created 30-case citation verification harness catching subtle JSON schema drift.",
        artifactUrl: "https://github.com/example/karthik-ai-eval",
        mentorHighlight: "Clean confusion matrix breakdown across prompt revisions.",
      },
    ],
  },
  {
    slug: "churn-calibration-lab",
    title: "Interpretable Model Calibration & Threshold Lab",
    pathwaySlug: "machine-learning",
    pathwayNumber: "04",
    category: "Data & AI",
    difficulty: "Foundations → build",
    estimatedHours: 9,
    summary: "Train baseline classifiers, inspect precision-recall calibration curves, and document decision thresholds.",
    brief:
      "Explore why raw accuracy hides costly false negatives. Train a simple baseline, calibrate predicted probabilities, and justify an operational threshold aligned with domain cost.",
    deliverables: [
      "Reproducible notebook/script comparing logistic baseline vs tree model",
      "Calibration curve & precision-recall tradeoff report",
      "Threshold recommendation memo for stakeholders",
    ],
    relatedConceptIds: ["ml-error-analysis", "ds-metric-design", "ai-eval-rubrics"],
    relatedProjectSlugs: ["eval-harness-studio", "public-transit-story"],
    mentorName: "Dr. Nisha Menon",
    mentorRole: "Applied AI Lead",
    cohortName: "Applied AI Studio",
    resources: [
      {
        id: "res-sklearn-calib",
        title: "Probability Calibration & Evaluation Metrics",
        provider: "scikit-learn",
        url: "https://scikit-learn.org/stable/modules/calibration.html",
        duration: "30 min",
        kind: "reference",
      },
    ],
    peerWork: [],
  },
  {
    slug: "public-transit-story",
    title: "Civic Data Analysis & Decision Brief",
    pathwaySlug: "data-science",
    pathwayNumber: "05",
    category: "Data & AI",
    difficulty: "Foundations",
    estimatedHours: 7,
    summary: "Clean messy public transit timetables, surface bottleneck corridors, and publish an annotated visual brief.",
    brief:
      "Turn raw CSV ridership logs into honest questions and clear charts. Handle missing timestamps explicitly and document assumptions alongside every metric.",
    deliverables: [
      "Reproducible data cleaning script",
      "3 explanatory visualizations with sample sizes and caveats",
      "Executive 1-page findings brief",
    ],
    relatedConceptIds: ["ds-metric-design", "py-data-structures", "ux-information-hierarchy"],
    relatedProjectSlugs: ["churn-calibration-lab", "design-system-audit"],
    mentorName: "Vikram Desai",
    mentorRole: "Lead Data Scientist",
    cohortName: "Applied AI Studio",
    resources: [
      {
        id: "res-data-viz",
        title: "Fundamentals of Data Visualization",
        provider: "Claus O. Wilke (Free Online)",
        url: "https://clauswilke.com/dataviz/",
        duration: "40 min",
        kind: "reading",
      },
    ],
    peerWork: [],
  },
  {
    slug: "webhook-trust-boundary",
    title: "HMAC Webhook Verifier & Idempotency Guard",
    pathwaySlug: "cybersecurity",
    pathwayNumber: "06",
    category: "Infrastructure",
    difficulty: "Foundations",
    estimatedHours: 8,
    summary: "Implement timing-safe HMAC webhook verification, replay protection, and audit logging for payment events.",
    brief:
      "Analyze common webhook vulnerabilities (body re-serialization bugs, timing leaks, duplicate event replay) and implement a hardened verification pipeline with deterministic failure tests.",
    deliverables: [
      "Raw-body HMAC verification middleware using timing-safe comparison",
      "Idempotent event deduplication store with replay tests",
      "Threat model diagram and audit log specification",
    ],
    relatedConceptIds: ["sec-hmac-signatures", "sec-input-validation", "cloud-observability"],
    relatedProjectSlugs: ["accessible-learning-portfolio", "zero-downtime-deploy"],
    mentorName: "Rhea Kulkarni",
    mentorRole: "Security & Trust Engineer",
    cohortName: "Infrastructure & Trust Cohort",
    internshipSlug: "cloud-security-engineering",
    resources: [
      {
        id: "res-owasp-api",
        title: "OWASP API Security Top 10",
        provider: "OWASP",
        url: "https://owasp.org/API-Security/",
        duration: "35 min",
        kind: "reading",
      },
    ],
    peerWork: [],
  },
  {
    slug: "zero-downtime-deploy",
    title: "Resilient Service Architecture & Health Checks",
    pathwaySlug: "cloud-computing",
    pathwayNumber: "07",
    category: "Infrastructure",
    difficulty: "Explore & apply",
    estimatedHours: 8,
    summary: "Design stateless container topology, readiness probes, and graceful fallback strategies under dependency outages.",
    brief:
      "Map how a Next.js + PostgreSQL service behaves when external APIs stall or credentials rotate. Implement clean health boundaries and failure runbooks.",
    deliverables: [
      "Architecture diagram covering stateless compute, database, and object storage",
      "Readiness/liveness probe implementation with dependency timeout budgets",
      "Incident runbook for key rotation and degraded mode",
    ],
    relatedConceptIds: ["cloud-observability", "devops-release-pipelines", "sec-hmac-signatures"],
    relatedProjectSlugs: ["webhook-trust-boundary", "ci-verification-pipeline"],
    mentorName: "Rhea Kulkarni",
    mentorRole: "Security & Trust Engineer",
    cohortName: "Infrastructure & Trust Cohort",
    resources: [
      {
        id: "res-12factor",
        title: "The Twelve-Factor App Methodology",
        provider: "12factor.net",
        url: "https://12factor.net/",
        duration: "30 min",
        kind: "reading",
      },
    ],
    peerWork: [],
  },
  {
    slug: "ci-verification-pipeline",
    title: "Automated CI Quality & Rollback Pipeline",
    pathwaySlug: "devops",
    pathwayNumber: "08",
    category: "Infrastructure",
    difficulty: "Explore & apply",
    estimatedHours: 7,
    summary: "Wire type checks, unit tests, schema dry-runs, and artifact builds into a repeatable CI workflow.",
    brief:
      "Replace manual deployment checklists with deterministic CI stages that fail fast on broken migrations, type drift, or flaky tests.",
    deliverables: [
      "Multi-stage CI configuration with cached dependencies",
      "Automated test and build verification gate",
      "Rollback verification checklist",
    ],
    relatedConceptIds: ["devops-release-pipelines", "py-testing-contracts", "cloud-observability"],
    relatedProjectSlugs: ["zero-downtime-deploy", "accessible-learning-portfolio"],
    mentorName: "Siddharth Iyer",
    mentorRole: "Platform Reliability Mentor",
    cohortName: "Infrastructure & Trust Cohort",
    resources: [
      {
        id: "res-gh-actions",
        title: "GitHub Actions Workflow Essentials",
        provider: "GitHub Docs",
        url: "https://docs.github.com/en/actions",
        duration: "25 min",
        kind: "reference",
      },
    ],
    peerWork: [],
  },
  {
    slug: "design-system-audit",
    title: "Accessible Multi-Role Interface Critique & Spec",
    pathwaySlug: "ui-ux-design",
    pathwayNumber: "09",
    category: "Product & design",
    difficulty: "Foundations → build",
    estimatedHours: 7,
    summary: "Audit an educational workspace across desktop and mobile, then design a non-linear role-aware information architecture.",
    brief:
      "Map how learners, mentors, and administrators navigate shared concepts without drowning in linear wizard steps. Produce annotated wireframes, contrast checks, and component tokens.",
    deliverables: [
      "Information architecture map separating student, mentor, and admin goals",
      "WCAG AA contrast and keyboard focus audit",
      "Responsive mobile navigation specification",
    ],
    relatedConceptIds: ["ux-information-hierarchy", "ux-keyboard-flows", "web-semantic-dom"],
    relatedProjectSlugs: ["accessible-learning-portfolio", "public-transit-story"],
    mentorName: "Tara Sengupta",
    mentorRole: "Design Systems Lead",
    cohortName: "Product Craft Cohort",
    resources: [
      {
        id: "res-w3c-wcag",
        title: "W3C WCAG 2.2 Quick Reference",
        provider: "W3C WAI",
        url: "https://www.w3.org/WAI/WCAG22/quickref/",
        duration: "30 min",
        kind: "reference",
      },
    ],
    peerWork: [
      {
        id: "peer-ux-1",
        learnerName: "Sana Patel",
        cohort: "Product Craft Cohort",
        summary: "Redesigned pathway overview into an open spatial map + keyboard list toggle.",
        artifactUrl: "https://github.com/example/sana-ia-spec",
        mentorHighlight: "Clear separation between learner reflection and mentor critique tools.",
      },
    ],
  },
];

export const learningNodes: LearningNode[] = [
  // Python (01)
  {
    id: "py-data-structures",
    slug: "py-data-structures",
    title: "Structured Parsing & Iterators",
    kind: "concept",
    pathwaySlug: "python-programming",
    pathwayNumber: "01",
    summary: "Work with generators, dictionaries, and dataclasses to transform messy event streams reliably.",
    estimatedMinutes: 45,
    prerequisites: [],
    relatedNodeIds: ["py-testing-contracts", "ds-metric-design", "node-proj-cli"],
    projectSlug: "cli-telemetry-analyzer",
    mentorName: "Ananya Rao",
    mentorRole: "Staff Systems Engineer",
    x: 20,
    y: 26,
    resources: [
      { id: "r-py-1", title: "Python Dataclasses & Typing", provider: "Python.org", url: "https://docs.python.org/3/library/dataclasses.html", duration: "20 min", kind: "reference" },
    ],
  },
  {
    id: "py-testing-contracts",
    slug: "py-testing-contracts",
    title: "Boundary Contracts & Unit Tests",
    kind: "concept",
    pathwaySlug: "python-programming",
    pathwayNumber: "01",
    summary: "Assert edge-case inputs, malformed timestamps, and deterministic outputs before shipping scripts.",
    estimatedMinutes: 40,
    prerequisites: ["py-data-structures"],
    relatedNodeIds: ["node-proj-cli", "devops-release-pipelines", "sec-input-validation"],
    projectSlug: "cli-telemetry-analyzer",
    mentorName: "Ananya Rao",
    mentorRole: "Staff Systems Engineer",
    x: 52,
    y: 24,
    resources: [
      { id: "r-py-2", title: "Unittest & Assertions Guide", provider: "Python.org", url: "https://docs.python.org/3/library/unittest.html", duration: "25 min", kind: "reading" },
    ],
  },
  {
    id: "node-proj-cli",
    slug: "node-proj-cli",
    title: "Project: CLI Telemetry Analyzer",
    kind: "project",
    pathwaySlug: "python-programming",
    pathwayNumber: "01",
    summary: "Apply parsing and test contracts in a real command-line utility reviewed by a mentor.",
    estimatedMinutes: 180,
    prerequisites: ["py-data-structures"],
    relatedNodeIds: ["py-testing-contracts", "mentor-sys-review", "node-proj-portfolio"],
    projectSlug: "cli-telemetry-analyzer",
    mentorName: "Ananya Rao",
    mentorRole: "Staff Systems Engineer",
    x: 42,
    y: 66,
    resources: [],
  },
  {
    id: "mentor-sys-review",
    slug: "mentor-sys-review",
    title: "Mentor Touchpoint: Systems Critique",
    kind: "touchpoint",
    pathwaySlug: "python-programming",
    pathwayNumber: "01",
    summary: "Walk through error handling, memory tradeoffs, and test clarity with Ananya Rao.",
    estimatedMinutes: 30,
    prerequisites: ["node-proj-cli"],
    relatedNodeIds: ["node-proj-cli", "web-api-boundaries"],
    projectSlug: "cli-telemetry-analyzer",
    mentorName: "Ananya Rao",
    mentorRole: "Staff Systems Engineer",
    x: 78,
    y: 60,
    resources: [],
  },

  // Web Development (02)
  {
    id: "web-semantic-dom",
    slug: "web-semantic-dom",
    title: "Semantic HTML & Accessible Widgets",
    kind: "concept",
    pathwaySlug: "web-development",
    pathwayNumber: "02",
    summary: "Structure landmarks, native controls, and keyboard focus flows for screen readers and power users.",
    estimatedMinutes: 45,
    prerequisites: [],
    relatedNodeIds: ["ux-keyboard-flows", "web-api-boundaries", "node-proj-portfolio"],
    projectSlug: "accessible-learning-portfolio",
    mentorName: "Kabir Malhotra",
    mentorRole: "Principal Frontend Architect",
    x: 18,
    y: 28,
    resources: [
      { id: "r-web-1", title: "MDN Accessibility Landmarks", provider: "MDN", url: "https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles", duration: "20 min", kind: "reading" },
    ],
  },
  {
    id: "web-api-boundaries",
    slug: "web-api-boundaries",
    title: "Typed Server Boundaries & State",
    kind: "concept",
    pathwaySlug: "web-development",
    pathwayNumber: "02",
    summary: "Validate requests server-side, derive verifiable state, and separate client UI from secrets.",
    estimatedMinutes: 50,
    prerequisites: ["web-semantic-dom"],
    relatedNodeIds: ["sec-hmac-signatures", "node-proj-portfolio", "py-testing-contracts"],
    projectSlug: "accessible-learning-portfolio",
    mentorName: "Kabir Malhotra",
    mentorRole: "Principal Frontend Architect",
    x: 54,
    y: 24,
    resources: [
      { id: "r-web-2", title: "Next.js App Router Data Flow", provider: "Next.js", url: "https://nextjs.org/docs/app", duration: "30 min", kind: "reference" },
    ],
  },
  {
    id: "node-proj-portfolio",
    slug: "node-proj-portfolio",
    title: "Project: Accessible Portfolio & Trust Workspace",
    kind: "project",
    pathwaySlug: "web-development",
    pathwayNumber: "02",
    summary: "Ship a real learner interface connected to verifiable project evidence and mentor feedback.",
    estimatedMinutes: 240,
    prerequisites: ["web-semantic-dom", "web-api-boundaries"],
    relatedNodeIds: ["mentor-web-critique", "ux-information-hierarchy", "sec-hmac-signatures"],
    projectSlug: "accessible-learning-portfolio",
    mentorName: "Kabir Malhotra",
    mentorRole: "Principal Frontend Architect",
    x: 44,
    y: 66,
    resources: [],
  },
  {
    id: "mentor-web-critique",
    slug: "mentor-web-critique",
    title: "Mentor Touchpoint: Architecture & A11y Review",
    kind: "touchpoint",
    pathwaySlug: "web-development",
    pathwayNumber: "02",
    summary: "Live critique on keyboard navigation, API security, and responsive layout with Kabir Malhotra.",
    estimatedMinutes: 30,
    prerequisites: ["node-proj-portfolio"],
    relatedNodeIds: ["node-proj-portfolio", "node-proj-ux"],
    projectSlug: "accessible-learning-portfolio",
    mentorName: "Kabir Malhotra",
    mentorRole: "Principal Frontend Architect",
    x: 80,
    y: 58,
    resources: [],
  },

  // AI (03), ML (04), Data Science (05)
  {
    id: "ai-eval-rubrics",
    slug: "ai-eval-rubrics",
    title: "Evaluation Rubrics & Grounded Prompts",
    kind: "concept",
    pathwaySlug: "artificial-intelligence",
    pathwayNumber: "03",
    summary: "Design verifiable grading criteria and structured output checks for LLM applications.",
    estimatedMinutes: 45,
    prerequisites: [],
    relatedNodeIds: ["ml-error-analysis", "node-proj-eval", "ds-metric-design"],
    projectSlug: "eval-harness-studio",
    mentorName: "Dr. Nisha Menon",
    mentorRole: "Applied AI Lead",
    x: 24,
    y: 30,
    resources: [],
  },
  {
    id: "node-proj-eval",
    slug: "node-proj-eval",
    title: "Project: Structured AI Evaluation Harness",
    kind: "project",
    pathwaySlug: "artificial-intelligence",
    pathwayNumber: "03",
    summary: "Benchmark prompt variants against 25 concrete edge cases and document failure modes.",
    estimatedMinutes: 180,
    prerequisites: ["ai-eval-rubrics"],
    relatedNodeIds: ["ai-eval-rubrics", "ml-error-analysis", "mentor-ai-office"],
    projectSlug: "eval-harness-studio",
    mentorName: "Dr. Nisha Menon",
    mentorRole: "Applied AI Lead",
    x: 56,
    y: 66,
    resources: [],
  },
  {
    id: "mentor-ai-office",
    slug: "mentor-ai-office",
    title: "Mentor Touchpoint: AI Evaluation Office Hours",
    kind: "touchpoint",
    pathwaySlug: "artificial-intelligence",
    pathwayNumber: "03",
    summary: "Review regression benchmarks and failure taxonomies with Dr. Nisha Menon.",
    estimatedMinutes: 30,
    prerequisites: ["node-proj-eval"],
    relatedNodeIds: ["node-proj-eval", "node-proj-ml"],
    projectSlug: "eval-harness-studio",
    mentorName: "Dr. Nisha Menon",
    mentorRole: "Applied AI Lead",
    x: 82,
    y: 34,
    resources: [],
  },
  {
    id: "ml-error-analysis",
    slug: "ml-error-analysis",
    title: "Calibration, Baselines & Error Analysis",
    kind: "concept",
    pathwaySlug: "machine-learning",
    pathwayNumber: "04",
    summary: "Compare baseline models honestly using precision-recall tradeoffs and probability calibration.",
    estimatedMinutes: 50,
    prerequisites: [],
    relatedNodeIds: ["ai-eval-rubrics", "ds-metric-design", "node-proj-ml"],
    projectSlug: "churn-calibration-lab",
    mentorName: "Dr. Nisha Menon",
    mentorRole: "Applied AI Lead",
    x: 24,
    y: 32,
    resources: [],
  },
  {
    id: "node-proj-ml",
    slug: "node-proj-ml",
    title: "Project: Calibration & Threshold Lab",
    kind: "project",
    pathwaySlug: "machine-learning",
    pathwayNumber: "04",
    summary: "Select and defend an operating classification threshold grounded in real domain costs.",
    estimatedMinutes: 200,
    prerequisites: ["ml-error-analysis"],
    relatedNodeIds: ["ml-error-analysis", "node-proj-eval"],
    projectSlug: "churn-calibration-lab",
    mentorName: "Dr. Nisha Menon",
    mentorRole: "Applied AI Lead",
    x: 64,
    y: 62,
    resources: [],
  },
  {
    id: "ds-metric-design",
    slug: "ds-metric-design",
    title: "Metric Hygiene & Visual Storytelling",
    kind: "concept",
    pathwaySlug: "data-science",
    pathwayNumber: "05",
    summary: "Avoid misleading denominators, expose uncertainty, and craft clear decision charts.",
    estimatedMinutes: 40,
    prerequisites: [],
    relatedNodeIds: ["py-data-structures", "node-proj-ds", "ux-information-hierarchy"],
    projectSlug: "public-transit-story",
    mentorName: "Vikram Desai",
    mentorRole: "Lead Data Scientist",
    x: 26,
    y: 30,
    resources: [],
  },
  {
    id: "node-proj-ds",
    slug: "node-proj-ds",
    title: "Project: Civic Data Decision Brief",
    kind: "project",
    pathwaySlug: "data-science",
    pathwayNumber: "05",
    summary: "Analyze public transit delays and deliver a reproducible visual narrative.",
    estimatedMinutes: 180,
    prerequisites: ["ds-metric-design"],
    relatedNodeIds: ["ds-metric-design", "py-data-structures"],
    projectSlug: "public-transit-story",
    mentorName: "Vikram Desai",
    mentorRole: "Lead Data Scientist",
    x: 66,
    y: 64,
    resources: [],
  },

  // Security (06), Cloud (07), DevOps (08), UI/UX (09)
  {
    id: "sec-input-validation",
    slug: "sec-input-validation",
    title: "Schema Validation & Trust Boundaries",
    kind: "concept",
    pathwaySlug: "cybersecurity",
    pathwayNumber: "06",
    summary: "Enforce server-side constraints and reject client-forged monetary or role claims.",
    estimatedMinutes: 45,
    prerequisites: [],
    relatedNodeIds: ["sec-hmac-signatures", "web-api-boundaries", "node-proj-sec"],
    projectSlug: "webhook-trust-boundary",
    mentorName: "Rhea Kulkarni",
    mentorRole: "Security & Trust Engineer",
    x: 20,
    y: 28,
    resources: [],
  },
  {
    id: "sec-hmac-signatures",
    slug: "sec-hmac-signatures",
    title: "Raw-Body HMAC & Idempotent Webhooks",
    kind: "concept",
    pathwaySlug: "cybersecurity",
    pathwayNumber: "06",
    summary: "Verify payment and event signatures against raw byte payloads with replay protection.",
    estimatedMinutes: 50,
    prerequisites: ["sec-input-validation"],
    relatedNodeIds: ["node-proj-sec", "node-proj-portfolio", "cloud-observability"],
    projectSlug: "webhook-trust-boundary",
    mentorName: "Rhea Kulkarni",
    mentorRole: "Security & Trust Engineer",
    x: 54,
    y: 26,
    resources: [],
  },
  {
    id: "node-proj-sec",
    slug: "node-proj-sec",
    title: "Project: HMAC Webhook & Idempotency Guard",
    kind: "project",
    pathwaySlug: "cybersecurity",
    pathwayNumber: "06",
    summary: "Harden a webhook endpoint against tampered signatures and duplicate delivery replays.",
    estimatedMinutes: 190,
    prerequisites: ["sec-hmac-signatures"],
    relatedNodeIds: ["sec-hmac-signatures", "node-proj-cloud"],
    projectSlug: "webhook-trust-boundary",
    mentorName: "Rhea Kulkarni",
    mentorRole: "Security & Trust Engineer",
    x: 56,
    y: 68,
    resources: [],
  },
  {
    id: "cloud-observability",
    slug: "cloud-observability",
    title: "Health Probes & Degraded Mode Design",
    kind: "concept",
    pathwaySlug: "cloud-computing",
    pathwayNumber: "07",
    summary: "Design timeouts, fallback paths, and structured health telemetry without silent failures.",
    estimatedMinutes: 45,
    prerequisites: [],
    relatedNodeIds: ["node-proj-cloud", "devops-release-pipelines", "sec-hmac-signatures"],
    projectSlug: "zero-downtime-deploy",
    mentorName: "Rhea Kulkarni",
    mentorRole: "Security & Trust Engineer",
    x: 26,
    y: 30,
    resources: [],
  },
  {
    id: "node-proj-cloud",
    slug: "node-proj-cloud",
    title: "Project: Resilient Service Architecture",
    kind: "project",
    pathwaySlug: "cloud-computing",
    pathwayNumber: "07",
    summary: "Author an incident-ready architecture blueprint and graceful fallback runbook.",
    estimatedMinutes: 180,
    prerequisites: ["cloud-observability"],
    relatedNodeIds: ["cloud-observability", "node-proj-devops"],
    projectSlug: "zero-downtime-deploy",
    mentorName: "Rhea Kulkarni",
    mentorRole: "Security & Trust Engineer",
    x: 68,
    y: 62,
    resources: [],
  },
  {
    id: "devops-release-pipelines",
    slug: "devops-release-pipelines",
    title: "Reproducible Builds & CI Gates",
    kind: "concept",
    pathwaySlug: "devops",
    pathwayNumber: "08",
    summary: "Automate linting, type checks, test suites, and deterministic container builds.",
    estimatedMinutes: 40,
    prerequisites: [],
    relatedNodeIds: ["node-proj-devops", "py-testing-contracts", "cloud-observability"],
    projectSlug: "ci-verification-pipeline",
    mentorName: "Siddharth Iyer",
    mentorRole: "Platform Reliability Mentor",
    x: 26,
    y: 28,
    resources: [],
  },
  {
    id: "node-proj-devops",
    slug: "node-proj-devops",
    title: "Project: Automated CI Verification Pipeline",
    kind: "project",
    pathwaySlug: "devops",
    pathwayNumber: "08",
    summary: "Assemble a fast CI gate covering tests, type safety, and safe rollback steps.",
    estimatedMinutes: 160,
    prerequisites: ["devops-release-pipelines"],
    relatedNodeIds: ["devops-release-pipelines", "node-proj-cloud"],
    projectSlug: "ci-verification-pipeline",
    mentorName: "Siddharth Iyer",
    mentorRole: "Platform Reliability Mentor",
    x: 66,
    y: 64,
    resources: [],
  },
  {
    id: "ux-information-hierarchy",
    slug: "ux-information-hierarchy",
    title: "Non-Linear Information Architecture",
    kind: "concept",
    pathwaySlug: "ui-ux-design",
    pathwayNumber: "09",
    summary: "Structure role-aware workspaces where concepts, projects, and mentors cross-link naturally.",
    estimatedMinutes: 45,
    prerequisites: [],
    relatedNodeIds: ["ux-keyboard-flows", "node-proj-ux", "web-semantic-dom"],
    projectSlug: "design-system-audit",
    mentorName: "Tara Sengupta",
    mentorRole: "Design Systems Lead",
    x: 22,
    y: 28,
    resources: [],
  },
  {
    id: "ux-keyboard-flows",
    slug: "ux-keyboard-flows",
    title: "Keyboard & Touch Ergonomics",
    kind: "concept",
    pathwaySlug: "ui-ux-design",
    pathwayNumber: "09",
    summary: "Ensure focus rings, list alternatives for spatial graphs, and 44px touch targets on mobile.",
    estimatedMinutes: 40,
    prerequisites: ["ux-information-hierarchy"],
    relatedNodeIds: ["web-semantic-dom", "node-proj-ux", "node-proj-portfolio"],
    projectSlug: "design-system-audit",
    mentorName: "Tara Sengupta",
    mentorRole: "Design Systems Lead",
    x: 56,
    y: 26,
    resources: [],
  },
  {
    id: "node-proj-ux",
    slug: "node-proj-ux",
    title: "Project: Multi-Role Interface Critique",
    kind: "project",
    pathwaySlug: "ui-ux-design",
    pathwayNumber: "09",
    summary: "Deliver an accessible navigation spec connecting student maps, mentor reviews, and admin ops.",
    estimatedMinutes: 180,
    prerequisites: ["ux-information-hierarchy"],
    relatedNodeIds: ["ux-keyboard-flows", "mentor-web-critique"],
    projectSlug: "design-system-audit",
    mentorName: "Tara Sengupta",
    mentorRole: "Design Systems Lead",
    x: 60,
    y: 66,
    resources: [],
  },
];

export function findPathwayByParam(param: string): EnrichedPathway | undefined {
  return enrichedPathways.find(
    (p) => p.slug === param || p.number === param,
  );
}

export function getNodesForPathway(pathwaySlug: string): LearningNode[] {
  return learningNodes.filter((n) => n.pathwaySlug === pathwaySlug);
}

export function getProjectsForPathway(pathwaySlug: string): ProjectBrief[] {
  return learningProjects.filter((p) => p.pathwaySlug === pathwaySlug);
}

export function findProjectBySlug(slug: string): ProjectBrief | undefined {
  return learningProjects.find((p) => p.slug === slug);
}

export function findNodeById(id: string): LearningNode | undefined {
  return learningNodes.find((n) => n.id === id);
}

export type ResolvedProjectGuidance = {
  whyItMatters: string;
  stepByStep: string[];
  requiredSkills: string[];
  submissionDeadline: string;
  submissionMethod: string;
  evaluationCriteria: string[];
};

export type ProjectGuidanceInput = {
  slug: string;
  title: string;
  estimatedHours: number;
  deliverables: string[];
  pathwaySlug?: string;
  category?: string;
  relatedConceptIds?: string[];
  milestones?: string[];
  rubric?: string[];
  whyItMatters?: string;
  stepByStep?: string[];
  requiredSkills?: string[];
  submissionDeadline?: string;
  submissionMethod?: string;
  evaluationCriteria?: string[];
};

export function getProjectGuidance(project: ProjectGuidanceInput): ResolvedProjectGuidance {
  const enriched = findProjectBySlug(project.slug);
  const pathwaySlug = project.pathwaySlug ?? enriched?.pathwaySlug;
  const pathway = pathwaySlug
    ? enrichedPathways.find((p) => p.slug === pathwaySlug)
    : undefined;
  const conceptIds = project.relatedConceptIds ?? enriched?.relatedConceptIds ?? [];
  const conceptTitles = conceptIds
    .map((id) => learningNodes.find((n) => n.id === id)?.title)
    .filter((t): t is string => Boolean(t));

  const deliverables =
    project.deliverables.length > 0
      ? project.deliverables
      : (enriched?.deliverables ?? []);

  const defaultSteps =
    project.milestones && project.milestones.length > 0
      ? [
          `Click "Start Project" to register your work in progress and unlock submission inputs.`,
          ...project.milestones,
          `Push clean code to a public GitHub repository and attach any test logs or screenshots before clicking "Submit Project".`,
        ]
      : [
          `Click "Start Project" to register your work in progress and unlock submission inputs.`,
          `Build your solution step by step (${deliverables[0] ?? "working implementation"}).`,
          `Verify every edge case locally (${deliverables[1] ?? "automated checks and manual walkthrough"}).`,
          `Push clean code to a public GitHub repository and attach any test logs or screenshots before clicking "Submit Project".`,
        ];

  return {
    whyItMatters:
      project.whyItMatters ??
      enriched?.whyItMatters ??
      `Building "${project.title}" turns passive study into verified engineering proof. It prepares you directly for mentor critique and related practical internship work in ${pathway?.title ?? project.category ?? enriched?.category ?? "your chosen track"}.`,
    stepByStep: project.stepByStep ?? enriched?.stepByStep ?? defaultSteps,
    requiredSkills:
      project.requiredSkills ??
      enriched?.requiredSkills ??
      Array.from(new Set([...(pathway?.skills ?? []), ...conceptTitles])).slice(0, 5),
    submissionDeadline:
      project.submissionDeadline ??
      enriched?.submissionDeadline ??
      `Recommended within 2 weeks of starting (~${project.estimatedHours} hrs effort)`,
    submissionMethod:
      project.submissionMethod ??
      enriched?.submissionMethod ??
      "Public GitHub Repository URL + Optional Live Demo URL + Supporting Files or Evidence Notes",
    evaluationCriteria:
      project.evaluationCriteria ??
      enriched?.evaluationCriteria ??
      (project.rubric && project.rubric.length > 0
        ? project.rubric
        : [
            ...deliverables,
            "Clear explanation of design decisions, edge cases tested, and reproducible setup steps",
          ]),
  };
}

