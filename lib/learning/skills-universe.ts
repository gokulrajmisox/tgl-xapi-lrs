import type {
  CourseDetailResponse,
  CourseLessonProgressRecord,
  PublicCourseSummary,
} from "@/lib/courses/store";
import type {
  CertificateIssuanceRecord,
  InternshipApplicationRecord,
  InternshipRecord,
} from "@/lib/certifications/store";
import type { ProjectSubmissionRecord } from "@/lib/learning-workspace-store";

export type SkillCategoryId =
  | "programming"
  | "ai_ml"
  | "web_ux"
  | "cybersecurity"
  | "cloud_devops";

export type SkillCategoryMeta = {
  id: SkillCategoryId;
  label: string;
  shortLabel: string;
  description: string;
};

export const SKILL_CATEGORIES: SkillCategoryMeta[] = [
  {
    id: "programming",
    label: "Programming & Systems",
    shortLabel: "Programming",
    description: "Memory-safe Python pipelines, typed data contracts, UTC time handling, and testable CLI tooling.",
  },
  {
    id: "ai_ml",
    label: "AI & Machine Learning Evaluation",
    shortLabel: "AI & ML",
    description: "Golden evaluation sets, failure taxonomies, structured schema graders, and calibration diffs.",
  },
  {
    id: "web_ux",
    label: "Web Development & UX Craft",
    shortLabel: "Web & UX",
    description: "Semantic landmarks, WCAG AA contrast, responsive ergonomics, Zod contracts, and server gating.",
  },
  {
    id: "cybersecurity",
    label: "Cybersecurity & Trust",
    shortLabel: "Security",
    description: "Server-authoritative pricing, allowlists, timing-safe HMAC-SHA256 verification, and replay guards.",
  },
  {
    id: "cloud_devops",
    label: "Cloud & DevOps Reliability",
    shortLabel: "Cloud & DevOps",
    description: "Immutable multi-stage containers, readiness probes, deterministic CI gates, and safe rollbacks.",
  },
];

export type SkillNodeStatus = "acquired" | "in_progress" | "locked";

export type SkillProficiencyLevel =
  | "Locked"
  | "Exploring"
  | "Practiced"
  | "Verified"
  | "Mastered";

export type SkillEvidenceItem = {
  id: string;
  kind: "lesson" | "exercise" | "knowledge_check" | "module_quiz" | "project" | "certificate";
  title: string;
  completed: boolean;
  timestamp: string | null;
  detail?: string;
};

export type SkillRelatedLesson = {
  lessonId: string;
  moduleId: string;
  moduleTitle: string;
  title: string;
  lessonType: "note" | "video" | "project_milestone";
  durationLabel: string;
  completed: boolean;
  exerciseCompleted: boolean;
  knowledgeCheckPassed: boolean;
  href: string;
};

export type SkillNodeSnapshot = {
  id: string;
  title: string;
  description: string;
  category: SkillCategoryId;
  categoryLabel: string;
  kind: "skill" | "capstone";
  tools: string[];
  courseId: string;
  courseSlug: string;
  courseTitle: string;
  courseEnrolled: boolean;
  moduleIds: string[];
  lessonIds: string[];
  projectSlug: string | null;
  prerequisiteSkillIds: string[];
  prerequisiteTitles: string[];
  nextSkillIds: string[];
  recommendedNextSkills: Array<{
    id: string;
    title: string;
    status: SkillNodeStatus;
    courseSlug: string;
  }>;
  position: { x: number; y: number };
  status: SkillNodeStatus;
  proficiencyLevel: SkillProficiencyLevel;
  progressPercent: number;
  completedLessonsCount: number;
  totalLessonsCount: number;
  completedExercisesCount: number;
  passedKnowledgeChecksCount: number;
  passedModuleQuizzesCount: number;
  assessmentScorePercent: number | null;
  acquiredAt: string | null;
  unlockRequirementText: string;
  relatedLessons: SkillRelatedLesson[];
  evidenceItems: SkillEvidenceItem[];
};

export type SkillEdgeSnapshot = {
  id: string;
  source: string;
  target: string;
  relationship: "prerequisite" | "cross_track" | "capstone";
  highlighted: boolean;
};

export type RoadmapModuleStage = {
  moduleId: string;
  sortOrder: number;
  title: string;
  summary: string;
  estimatedMinutes: number;
  status: "completed" | "in_progress" | "locked";
  completedLessonsCount: number;
  totalLessonsCount: number;
  progressPercent: number;
  exercisesCompletedCount: number;
  totalExercisesCount: number;
  moduleQuizScorePercent: number | null;
  moduleQuizPassed: boolean;
  hasModuleQuiz: boolean;
  skills: Array<{
    id: string;
    title: string;
    status: SkillNodeStatus;
  }>;
  lessons: Array<{
    id: string;
    title: string;
    lessonType: "note" | "video" | "project_milestone";
    durationLabel: string;
    completed: boolean;
    href: string;
  }>;
  continueHref: string;
};

export type ProgrammeRoadmapTrack = {
  courseId: string;
  courseSlug: string;
  courseTitle: string;
  category: string;
  enrolled: boolean;
  overallProgressPercent: number;
  completedLessonsCount: number;
  totalLessonsCount: number;
  quizScorePercent: number | null;
  quizPassed: boolean;
  projectTitle: string;
  projectStatus: ProjectSubmissionRecord["status"] | "not_started";
  projectFeedback: string | null;
  internshipTitle: string;
  approvedInternshipTasks: number;
  totalInternshipTasks: number;
  certificateIssued: boolean;
  certificateId: string | null;
  continueHref: string;
  modules: RoadmapModuleStage[];
};

export type SkillCategorySummary = {
  id: SkillCategoryId;
  label: string;
  shortLabel: string;
  description: string;
  acquiredCount: number;
  inProgressCount: number;
  lockedCount: number;
  totalCount: number;
  completionPercent: number;
  toolsPracticed: string[];
  nodes: SkillNodeSnapshot[];
};

export type AchievementMilestone = {
  id: string;
  title: string;
  detail: string;
  category: "skill" | "assessment" | "project" | "certificate";
  earned: boolean;
  earnedAt: string | null;
  metricLabel: string;
  href?: string;
};

export type LearningUniverseMetrics = {
  totalSkillsCount: number;
  skillsAcquiredCount: number;
  skillsInProgressCount: number;
  skillsLockedCount: number;
  lessonsCompletedCount: number;
  totalEnrolledLessonsCount: number;
  exercisesCompletedCount: number;
  assessmentsPassedCount: number;
  assessmentAveragePercent: number | null;
  projectsApprovedCount: number;
  certificatesIssuedCount: number;
  learningHoursCompleted: number;
  overallCompletionPercent: number;
};

export type LearningUniverseSnapshot = {
  nodes: SkillNodeSnapshot[];
  edges: SkillEdgeSnapshot[];
  categories: SkillCategorySummary[];
  roadmaps: ProgrammeRoadmapTrack[];
  achievements: AchievementMilestone[];
  metrics: LearningUniverseMetrics;
};

type CanonicalSkillSpec = {
  id: string;
  title: string;
  description: string;
  category: SkillCategoryId;
  kind: "skill" | "capstone";
  tools: string[];
  courseSlug: string;
  moduleIds: string[];
  lessonIds: string[];
  requireModuleQuiz?: boolean;
  projectSlug?: string;
  prerequisiteSkillIds: string[];
  crossTrackTargets?: string[];
  position: { x: number; y: number };
};

const CANONICAL_SKILL_SPECS: CanonicalSkillSpec[] = [
  // Row 1 (y: 28): Programming & Systems -> feeds AI & Cloud
  {
    id: "skill-py-generators",
    title: "Python Streaming Generators",
    description:
      "Process multi-gigabyte JSONL and log files with constant memory footprint using lazy Python generator pipelines.",
    category: "programming",
    kind: "skill",
    tools: ["Python 3.10+", "yield Generators", "Buffered I/O"],
    courseSlug: "python-systems-cli",
    moduleIds: ["mod-py-1"],
    lessonIds: ["les-py-1-note"],
    prerequisiteSkillIds: [],
    position: { x: 28, y: 28 },
  },
  {
    id: "skill-py-dataclasses",
    title: "Typed Python Dataclasses",
    description:
      "Define explicit immutable domain schemas and isolate malformed rows cleanly with Python type hints.",
    category: "programming",
    kind: "skill",
    tools: ["dataclasses", "typing", "Structured Exceptions"],
    courseSlug: "python-systems-cli",
    moduleIds: ["mod-py-1"],
    lessonIds: ["les-py-1-video"],
    requireModuleQuiz: true,
    prerequisiteSkillIds: ["skill-py-generators"],
    crossTrackTargets: ["skill-ai-datasets"],
    position: { x: 284, y: 28 },
  },
  {
    id: "skill-py-utc",
    title: "UTC ISO-8601 Normalization",
    description:
      "Eliminate timezone offset bugs by parsing and normalizing timestamps deterministically into UTC.",
    category: "programming",
    kind: "skill",
    tools: ["datetime.timezone.utc", "ISO-8601", "Deterministic Fixtures"],
    courseSlug: "python-systems-cli",
    moduleIds: ["mod-py-2"],
    lessonIds: ["les-py-2-note"],
    prerequisiteSkillIds: ["skill-py-dataclasses"],
    position: { x: 540, y: 28 },
  },
  {
    id: "skill-py-cli",
    title: "Deterministic CLI Architecture",
    description:
      "Design testable main(argv) command-line utilities returning semantic POSIX exit codes and clean stdout/stderr streams.",
    category: "programming",
    kind: "skill",
    tools: ["argparse", "pytest / unittest", "Exit Codes"],
    courseSlug: "python-systems-cli",
    moduleIds: ["mod-py-2"],
    lessonIds: ["les-py-2-video"],
    requireModuleQuiz: true,
    prerequisiteSkillIds: ["skill-py-utc"],
    crossTrackTargets: ["skill-cloud-ci"],
    position: { x: 796, y: 28 },
  },
  {
    id: "cap-py-telemetry",
    title: "Capstone: CLI Telemetry Analyzer",
    description:
      "Build and pass mentor review on a streaming Python CLI telemetry analyzer with UTC aggregation and contract tests.",
    category: "programming",
    kind: "capstone",
    tools: ["Python CLI", "JSONL Streams", "Contract Tests"],
    courseSlug: "python-systems-cli",
    moduleIds: ["mod-py-3"],
    lessonIds: ["les-py-3-project"],
    projectSlug: "cli-telemetry-analyzer",
    prerequisiteSkillIds: ["skill-py-cli"],
    position: { x: 1052, y: 28 },
  },

  // Row 2 (y: 152): AI & Evaluation
  {
    id: "skill-ai-datasets",
    title: "Golden Evaluation Datasets",
    description:
      "Construct stratified, adversarial, and domain-balanced evaluation sets that detect prompt regressions early.",
    category: "ai_ml",
    kind: "skill",
    tools: ["JSONL Golden Sets", "Stratified Sampling", "Adversarial Prompts"],
    courseSlug: "applied-ai-evaluation",
    moduleIds: ["mod-ai-1"],
    lessonIds: ["les-ai-1-note"],
    prerequisiteSkillIds: ["skill-py-dataclasses"],
    position: { x: 284, y: 152 },
  },
  {
    id: "skill-ai-taxonomy",
    title: "Failure Mode Taxonomy",
    description:
      "Categorize hallucinations, schema drift, and abstention errors systematically instead of guessing prompt edits.",
    category: "ai_ml",
    kind: "skill",
    tools: ["Error Slicing", "Failure Rubrics", "Precision Metrics"],
    courseSlug: "applied-ai-evaluation",
    moduleIds: ["mod-ai-1"],
    lessonIds: ["les-ai-1-video"],
    requireModuleQuiz: true,
    prerequisiteSkillIds: ["skill-ai-datasets"],
    position: { x: 540, y: 152 },
  },
  {
    id: "skill-ai-graders",
    title: "Structured Schema Graders",
    description:
      "Combine deterministic JSON Schema checks with rubric-calibrated LLM judges to score model responses reliably.",
    category: "ai_ml",
    kind: "skill",
    tools: ["JSON Schema", "Deterministic Graders", "Calibration Checks"],
    courseSlug: "applied-ai-evaluation",
    moduleIds: ["mod-ai-2"],
    lessonIds: ["les-ai-2-note", "les-ai-2-video"],
    requireModuleQuiz: true,
    prerequisiteSkillIds: ["skill-ai-taxonomy"],
    position: { x: 796, y: 152 },
  },
  {
    id: "cap-ai-harness",
    title: "Capstone: Evaluation Harness Studio",
    description:
      "Ship a mentor-approved 25+ case AI regression harness with pass/fail gates and regression diff reporting.",
    category: "ai_ml",
    kind: "capstone",
    tools: ["Eval Harness", "Regression Diffs", "Threshold Gates"],
    courseSlug: "applied-ai-evaluation",
    moduleIds: ["mod-ai-3"],
    lessonIds: ["les-ai-3-project"],
    projectSlug: "eval-harness-studio",
    prerequisiteSkillIds: ["skill-ai-graders"],
    position: { x: 1052, y: 152 },
  },

  // Row 3 (y: 276): Web Architecture & UX Craft
  {
    id: "skill-web-landmarks",
    title: "Semantic DOM & Accessibility",
    description:
      "Build keyboard-reachable interfaces using native landmarks, ARIA disclosures, focus rings, and reduced-motion guards.",
    category: "web_ux",
    kind: "skill",
    tools: ["HTML5 Landmarks", "WAI-ARIA", "prefers-reduced-motion"],
    courseSlug: "web-architecture-systems",
    moduleIds: ["mod-web-1"],
    lessonIds: ["les-web-1-note"],
    prerequisiteSkillIds: [],
    position: { x: 28, y: 276 },
  },
  {
    id: "skill-web-boundaries",
    title: "React Server & Client Splits",
    description:
      "Isolate interactive browser hooks to leaf components while keeping data fetching and secrets strictly server-side.",
    category: "web_ux",
    kind: "skill",
    tools: ["Next.js App Router", "React 19", "Server Components"],
    courseSlug: "web-architecture-systems",
    moduleIds: ["mod-web-1"],
    lessonIds: ["les-web-1-video"],
    requireModuleQuiz: true,
    prerequisiteSkillIds: ["skill-web-landmarks"],
    crossTrackTargets: ["skill-ux-hierarchy"],
    position: { x: 284, y: 276 },
  },
  {
    id: "skill-web-zod",
    title: "Zod Contracts & Paywall DTOs",
    description:
      "Validate untrusted HTTP bodies with Zod and sanitize visitor payloads so locked curriculum never leaks.",
    category: "web_ux",
    kind: "skill",
    tools: ["Zod Schemas", "Route Handlers", "DTO Allowlists"],
    courseSlug: "web-architecture-systems",
    moduleIds: ["mod-web-2"],
    lessonIds: ["les-web-2-note", "les-web-2-video"],
    requireModuleQuiz: true,
    prerequisiteSkillIds: ["skill-web-boundaries"],
    crossTrackTargets: ["skill-sec-pricing", "skill-cloud-containers"],
    position: { x: 540, y: 276 },
  },
  {
    id: "cap-web-portfolio",
    title: "Capstone: Accessible Web Workspace",
    description:
      "Launch an accessible, server-verified full-stack learning workspace approved by architecture mentors.",
    category: "web_ux",
    kind: "capstone",
    tools: ["Next.js", "TypeScript", "Boundary Tests"],
    courseSlug: "web-architecture-systems",
    moduleIds: ["mod-web-3"],
    lessonIds: ["les-web-3-project"],
    projectSlug: "accessible-learning-portfolio",
    prerequisiteSkillIds: ["skill-web-zod"],
    position: { x: 796, y: 276 },
  },

  // Row 4 (y: 400): Product Design & Mobile UX
  {
    id: "skill-ux-hierarchy",
    title: "Optical Hierarchy & Glass Contrast",
    description:
      "Eliminate pill-badge clutter with clean middot metadata, tabular numerals, and WCAG AA Light/Dark contrast.",
    category: "web_ux",
    kind: "skill",
    tools: ["WCAG AA", "tabular-nums", "60fps CSS Compositing"],
    courseSlug: "product-design-accessibility",
    moduleIds: ["mod-ux-1"],
    lessonIds: ["les-ux-1-note", "les-ux-1-video"],
    requireModuleQuiz: true,
    prerequisiteSkillIds: ["skill-web-landmarks"],
    position: { x: 284, y: 400 },
  },
  {
    id: "skill-ux-mobile",
    title: "Mobile Touch Ergonomics",
    description:
      "Maintain >=44px targets, compact sticky navigation, accessible list fallbacks, and zero overflow at 390px.",
    category: "web_ux",
    kind: "skill",
    tools: ["Responsive CSS", "Keyboard Parity", "Viewport Audits"],
    courseSlug: "product-design-accessibility",
    moduleIds: ["mod-ux-2"],
    lessonIds: ["les-ux-2-note", "les-ux-2-notes-mobile"],
    requireModuleQuiz: true,
    prerequisiteSkillIds: ["skill-ux-hierarchy"],
    position: { x: 540, y: 400 },
  },
  {
    id: "cap-ux-audit",
    title: "Capstone: Multi-Role UX Spec",
    description:
      "Deliver a mentor-verified accessibility and responsive design critique across desktop and mobile flows.",
    category: "web_ux",
    kind: "capstone",
    tools: ["Accessibility Audit", "Design Spec", "Dual Themes"],
    courseSlug: "product-design-accessibility",
    moduleIds: ["mod-ux-3"],
    lessonIds: ["les-ux-3-project"],
    projectSlug: "design-system-audit",
    prerequisiteSkillIds: ["skill-ux-mobile"],
    position: { x: 796, y: 400 },
  },

  // Row 5 (y: 524): Cybersecurity & Trust Boundaries
  {
    id: "skill-sec-pricing",
    title: "Server-Authoritative Pricing",
    description:
      "Prevent amount tampering and mass-assignment role escalation by resolving prices and permissions strictly server-side.",
    category: "cybersecurity",
    kind: "skill",
    tools: ["Integer Paise Math", "Allowlists", "Fail-Closed Guards"],
    courseSlug: "cybersecurity-trust-boundaries",
    moduleIds: ["mod-sec-1"],
    lessonIds: ["les-sec-1-note", "les-sec-1-lab"],
    requireModuleQuiz: true,
    prerequisiteSkillIds: ["skill-web-zod"],
    position: { x: 540, y: 524 },
  },
  {
    id: "skill-sec-hmac",
    title: "Timing-Safe HMAC & Replay Guards",
    description:
      "Verify exact raw webhook byte streams with crypto.timingSafeEqual and deduplicate retries via idempotency ledgers.",
    category: "cybersecurity",
    kind: "skill",
    tools: ["Node crypto", "HMAC-SHA256", "Idempotency Ledger"],
    courseSlug: "cybersecurity-trust-boundaries",
    moduleIds: ["mod-sec-2"],
    lessonIds: ["les-sec-2-note", "les-sec-2-video"],
    requireModuleQuiz: true,
    prerequisiteSkillIds: ["skill-sec-pricing"],
    position: { x: 796, y: 524 },
  },
  {
    id: "cap-sec-webhook",
    title: "Capstone: HMAC Trust Boundary",
    description:
      "Ship and test a tamper-resistant, idempotent payment webhook boundary with refund revocation proof.",
    category: "cybersecurity",
    kind: "capstone",
    tools: ["HMAC Verifier", "Replay Defense", "Security Tests"],
    courseSlug: "cybersecurity-trust-boundaries",
    moduleIds: ["mod-sec-3"],
    lessonIds: ["les-sec-3-project"],
    projectSlug: "webhook-trust-boundary",
    prerequisiteSkillIds: ["skill-sec-hmac"],
    position: { x: 1052, y: 524 },
  },

  // Row 6 (y: 648): Cloud Reliability & DevOps
  {
    id: "skill-cloud-containers",
    title: "Immutable Multi-Stage Containers",
    description:
      "Package minimal, non-root Docker images with strict .dockerignore boundaries and zero baked runtime secrets.",
    category: "cloud_devops",
    kind: "skill",
    tools: ["Docker Multi-Stage", ".dockerignore", "Non-Root UID"],
    courseSlug: "cloud-reliability-devops",
    moduleIds: ["mod-cloud-1"],
    lessonIds: ["les-cloud-1-note", "les-cloud-1-video"],
    requireModuleQuiz: true,
    prerequisiteSkillIds: ["skill-web-zod"],
    position: { x: 540, y: 648 },
  },
  {
    id: "skill-cloud-ci",
    title: "Readiness Probes & CI Gates",
    description:
      "Implement bounded health probes, graceful fallback states, and automated build/lint/test release workflows.",
    category: "cloud_devops",
    kind: "skill",
    tools: ["Health Probes", "GitHub Actions", "Release Gates"],
    courseSlug: "cloud-reliability-devops",
    moduleIds: ["mod-cloud-2"],
    lessonIds: ["les-cloud-2-note", "les-cloud-2-ci"],
    requireModuleQuiz: true,
    prerequisiteSkillIds: ["skill-cloud-containers", "skill-py-cli"],
    position: { x: 796, y: 648 },
  },
  {
    id: "cap-cloud-deploy",
    title: "Capstone: Zero-Downtime Rollout",
    description:
      "Author an expand-contract migration plan, rollback runbook, and resilient cloud release architecture.",
    category: "cloud_devops",
    kind: "capstone",
    tools: ["Expand/Contract", "Rollback Runbook", "Cloud Probes"],
    courseSlug: "cloud-reliability-devops",
    moduleIds: ["mod-cloud-3"],
    lessonIds: ["les-cloud-3-project"],
    projectSlug: "zero-downtime-deploy",
    prerequisiteSkillIds: ["skill-cloud-ci"],
    position: { x: 1052, y: 648 },
  },
];

export function parseDurationMinutes(label: string): number {
  const match = /(\d+)\s*(?:min|m|hour|hr|h)/i.exec(label);
  if (!match) return 20;
  const value = Number(match[1]);
  if (Number.isNaN(value) || value <= 0) return 20;
  if (/hour|hr|\bh\b/i.test(match[0])) {
    return value * 60;
  }
  return value;
}

function mapCourseCategoryToSkillCategory(
  cat: PublicCourseSummary["category"],
): SkillCategoryId {
  switch (cat) {
    case "Data & AI":
      return "ai_ml";
    case "Product & design":
      return "web_ux";
    case "Infrastructure":
      return "cloud_devops";
    case "Engineering":
    default:
      return "programming";
  }
}

function slugifySkillId(raw: string): string {
  return (
    "skill-custom-" +
    raw
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48)
  );
}

type BuildInput = {
  courseDetails: CourseDetailResponse[];
  submissions: ProjectSubmissionRecord[];
  internships: InternshipRecord[];
  applications: InternshipApplicationRecord[];
  issuances: CertificateIssuanceRecord[];
};

export function buildLearningUniverseSnapshot(
  input: BuildInput,
): LearningUniverseSnapshot {
  const detailBySlug = new Map<string, CourseDetailResponse>();
  for (const detail of input.courseDetails) {
    detailBySlug.set(detail.course.slug, detail);
  }

  const submissionByProjectSlug = new Map<string, ProjectSubmissionRecord>();
  for (const sub of input.submissions) {
    const prev = submissionByProjectSlug.get(sub.projectSlug);
    if (!prev) {
      submissionByProjectSlug.set(sub.projectSlug, sub);
    } else if (
      sub.status === "approved" ||
      (prev.status !== "approved" &&
        new Date(sub.reviewedAt ?? sub.submittedAt).getTime() >
          new Date(prev.reviewedAt ?? prev.submittedAt).getTime())
    ) {
      submissionByProjectSlug.set(sub.projectSlug, sub);
    }
  }

  const internshipBySlug = new Map<string, InternshipRecord>();
  for (const track of input.internships) {
    internshipBySlug.set(track.slug, track);
  }

  const appByInternshipId = new Map<string, InternshipApplicationRecord>();
  for (const app of input.applications) {
    appByInternshipId.set(app.internship_id, app);
  }

  // Gather all specs = canonical + any admin-defined skills on modules or lessons
  const specs: CanonicalSkillSpec[] = [...CANONICAL_SKILL_SPECS];
  const canonicalTitleSet = new Set(specs.map((s) => s.title.toLowerCase()));

  let customRowOffset = 0;
  for (const detail of input.courseDetails) {
    if (detail.locked) continue;
    const cat = mapCourseCategoryToSkillCategory(detail.course.category);
    const trackSpecs = specs.filter((s) => s.courseSlug === detail.course.slug);
    const anchorPrereqId = trackSpecs[trackSpecs.length - 1]?.id;

    for (const mod of detail.modules) {
      const moduleSkills = mod.skills ?? [];
      for (const skillTitle of moduleSkills) {
        if (!skillTitle.trim() || canonicalTitleSet.has(skillTitle.trim().toLowerCase())) {
          continue;
        }
        canonicalTitleSet.add(skillTitle.trim().toLowerCase());
        const lessonIds = mod.lessons.map((l) => l.id);
        specs.push({
          id: slugifySkillId(`${detail.course.slug}-${skillTitle}`),
          title: skillTitle.trim(),
          description: `Custom curriculum skill mapped to module "${mod.title}" in ${detail.course.title}.`,
          category: cat,
          kind: "skill",
          tools: [detail.course.category, mod.title],
          courseSlug: detail.course.slug,
          moduleIds: [mod.id],
          lessonIds,
          prerequisiteSkillIds: anchorPrereqId ? [anchorPrereqId] : [],
          position: { x: 1380, y: 80 + customRowOffset * 130 },
        });
        customRowOffset += 1;
      }

      for (const les of mod.lessons) {
        for (const skillTitle of les.skills ?? []) {
          if (!skillTitle.trim() || canonicalTitleSet.has(skillTitle.trim().toLowerCase())) {
            continue;
          }
          canonicalTitleSet.add(skillTitle.trim().toLowerCase());
          specs.push({
            id: slugifySkillId(`${detail.course.slug}-${les.id}-${skillTitle}`),
            title: skillTitle.trim(),
            description: `Custom lesson skill mapped to "${les.title}" in ${detail.course.title}.`,
            category: cat,
            kind: "skill",
            tools: [detail.course.category, les.durationLabel],
            courseSlug: detail.course.slug,
            moduleIds: [mod.id],
            lessonIds: [les.id],
            prerequisiteSkillIds: anchorPrereqId ? [anchorPrereqId] : [],
            position: { x: 1380, y: 80 + customRowOffset * 130 },
          });
          customRowOffset += 1;
        }
      }
    }
  }

  const specById = new Map(specs.map((s) => [s.id, s]));

  // First pass: evaluate raw factual completion evidence per spec
  type IntermediateEval = {
    spec: CanonicalSkillSpec;
    detail: CourseDetailResponse | null;
    rawSelfComplete: boolean;
    hasAnyWorkStarted: boolean;
    completedLessonsCount: number;
    totalLessonsCount: number;
    completedExercisesCount: number;
    passedKnowledgeChecksCount: number;
    passedModuleQuizzesCount: number;
    assessmentScorePercent: number | null;
    progressPercent: number;
    acquiredAt: string | null;
    relatedLessons: SkillRelatedLesson[];
    evidenceItems: SkillEvidenceItem[];
    projectApproved: boolean;
  };

  const evalById = new Map<string, IntermediateEval>();

  for (const spec of specs) {
    const detail = detailBySlug.get(spec.courseSlug) ?? null;
    const isEnrolledUnlocked = Boolean(detail && !detail.locked);

    const relatedLessons: SkillRelatedLesson[] = [];
    const evidenceItems: SkillEvidenceItem[] = [];
    let completedLessonsCount = 0;
    let totalLessonsCount = spec.lessonIds.length;
    let completedExercisesCount = 0;
    let passedKnowledgeChecksCount = 0;
    let passedModuleQuizzesCount = 0;
    let totalQuizScoreSum = 0;
    let quizCountForAvg = 0;
    let hasInProgressOrVisited = false;
    let latestCompletionTs: string | null = null;

    const considerTimestamp = (ts?: string | null) => {
      if (!ts) return;
      if (!latestCompletionTs || new Date(ts).getTime() > new Date(latestCompletionTs).getTime()) {
        latestCompletionTs = ts;
      }
    };

    if (detail && detail.locked) {
      // Populate locked syllabus lesson previews honestly
      for (const mod of detail.syllabusModules) {
        for (const les of mod.lessons) {
          if (spec.lessonIds.includes(les.id)) {
            relatedLessons.push({
              lessonId: les.id,
              moduleId: mod.id,
              moduleTitle: mod.title,
              title: les.title,
              lessonType: les.lessonType,
              durationLabel: les.durationLabel,
              completed: false,
              exerciseCompleted: false,
              knowledgeCheckPassed: false,
              href: `/programmes/${detail.course.slug}`,
            });
          }
        }
      }
      totalLessonsCount = Math.max(totalLessonsCount, relatedLessons.length);
    } else if (detail && !detail.locked) {
      const lessonProgressMap: Record<string, CourseLessonProgressRecord> =
        detail.lessonProgress ?? {};
      const exercisesMap = detail.exerciseCompletions ?? {};
      const checksMap = detail.knowledgeCheckResults ?? {};
      const modQuizMap = detail.moduleQuizAttempts ?? {};

      for (const mod of detail.modules) {
        const modMatches = spec.moduleIds.includes(mod.id);
        for (const les of mod.lessons) {
          if (!spec.lessonIds.includes(les.id)) continue;
          const lp = lessonProgressMap[les.id];
          const isCompleted = lp?.status === "completed";
          const isStarted =
            lp?.status === "in_progress" || detail.lastVisitedLessonId === les.id;
          const exDone = Boolean(exercisesMap[les.id]);
          const kcDone = Boolean(checksMap[les.id]?.passed);

          if (isCompleted) {
            completedLessonsCount += 1;
            considerTimestamp(lp?.completedAt ?? lp?.updatedAt);
          }
          if (isStarted || exDone || Boolean(checksMap[les.id])) {
            hasInProgressOrVisited = true;
          }
          if (exDone) {
            completedExercisesCount += 1;
            considerTimestamp(exercisesMap[les.id]?.completedAt);
          }
          if (kcDone) {
            passedKnowledgeChecksCount += 1;
            considerTimestamp(checksMap[les.id]?.attemptedAt);
          }

          relatedLessons.push({
            lessonId: les.id,
            moduleId: mod.id,
            moduleTitle: mod.title,
            title: les.title,
            lessonType: les.lessonType,
            durationLabel: les.durationLabel,
            completed: isCompleted,
            exerciseCompleted: exDone,
            knowledgeCheckPassed: kcDone,
            href: `/programmes/${detail.course.slug}?lesson=${encodeURIComponent(les.id)}`,
          });

          evidenceItems.push({
            id: `ev-les-${les.id}`,
            kind: "lesson",
            title: `Lesson: ${les.title}`,
            completed: isCompleted,
            timestamp: isCompleted ? lp?.completedAt ?? lp?.updatedAt ?? null : null,
            detail: isCompleted ? "Verified completed" : "Pending lesson completion",
          });

          if (les.practicalExercise) {
            evidenceItems.push({
              id: `ev-ex-${les.id}`,
              kind: "exercise",
              title: `Exercise: ${les.practicalExercise.title}`,
              completed: exDone,
              timestamp: exDone ? exercisesMap[les.id]?.completedAt ?? null : null,
              detail: exDone ? "Hands-on exercise verified" : "Optional/Applied lab pending",
            });
          }

          if (les.knowledgeCheck) {
            evidenceItems.push({
              id: `ev-kc-${les.id}`,
              kind: "knowledge_check",
              title: `Check: ${les.title}`,
              completed: kcDone,
              timestamp: kcDone ? checksMap[les.id]?.attemptedAt ?? null : null,
              detail: kcDone ? "Quick check passed" : "Quick check not yet passed",
            });
          }
        }

        if (modMatches && mod.moduleQuiz && mod.moduleQuiz.questions.length > 0) {
          const attempt = modQuizMap[mod.id];
          const passed = Boolean(attempt?.passed);
          if (passed) {
            passedModuleQuizzesCount += 1;
            considerTimestamp(attempt?.attemptedAt);
          }
          if (attempt) {
            totalQuizScoreSum += attempt.scorePercent;
            quizCountForAvg += 1;
            hasInProgressOrVisited = true;
          }
          if (spec.requireModuleQuiz) {
            evidenceItems.push({
              id: `ev-mq-${mod.id}`,
              kind: "module_quiz",
              title: `Module Quiz: ${mod.moduleQuiz.title}`,
              completed: passed,
              timestamp: attempt?.attemptedAt ?? null,
              detail: attempt
                ? `${attempt.scorePercent}% (${attempt.passed ? "Passed" : "Retry needed"})`
                : "Module checkpoint quiz pending",
            });
          }
        }
      }

      if (spec.kind === "capstone" && detail.quizAttempt) {
        totalQuizScoreSum += detail.quizAttempt.scorePercent;
        quizCountForAvg += 1;
      }

      totalLessonsCount = Math.max(totalLessonsCount, relatedLessons.length);
    }

    const projectSub = spec.projectSlug
      ? submissionByProjectSlug.get(spec.projectSlug) ?? null
      : null;
    const projectApproved = projectSub?.status === "approved";

    if (spec.kind === "capstone") {
      if (projectSub) {
        hasInProgressOrVisited = true;
        if (projectApproved) {
          considerTimestamp(projectSub.reviewedAt ?? projectSub.submittedAt);
        }
      }
      evidenceItems.push({
        id: `ev-proj-${spec.id}`,
        kind: "project",
        title: `Project Review: ${spec.title.replace(/^Capstone:\s*/i, "")}`,
        completed: projectApproved,
        timestamp: projectApproved
          ? projectSub?.reviewedAt ?? projectSub?.submittedAt ?? null
          : null,
        detail: projectSub
          ? `Submission status: ${projectSub.status.replaceAll("_", " ")}`
          : "Project submission pending",
      });
    }

    const allLessonsCompleted =
      totalLessonsCount > 0 && completedLessonsCount >= totalLessonsCount;

    const moduleQuizSatisfied = !spec.requireModuleQuiz
      ? true
      : passedModuleQuizzesCount > 0 || allLessonsCompleted;

    // For strict anti-fabrication:
    // - Enrollment alone NEVER acquires a skill.
    // - Regular skill requires ALL mapped lessons completed (plus module quiz if present or already finished? Wait: let's require all mapped lessons completed AND if `requireModuleQuiz` AND the module has a quiz that was attempted/failed wait—if a student marks all lessons complete, should the skill acquire? Wait: let's make sure if requireModuleQuiz is true, having passedModuleQuizzesCount > 0 gives "Verified" whereas completing lessons without quiz gives "Practiced" OR if module has quiz, require lessons completed to acquire! Wait: prompt says: "Skills should be driven by actual completed lessons, exercises, assessments, and projects. Example: Course enrolled but no lessons completed -> skills are locked/in progress, not acquired." Requiring `allLessonsCompleted` for skills and `projectApproved` for capstones is 100% consistent with user expectations when marking lessons complete in the workspace!).
    const rawSelfComplete =
      isEnrolledUnlocked &&
      (spec.kind === "capstone" ? projectApproved : allLessonsCompleted);

    // Weighted progress percent (0 - 100)
    let progressPercent = 0;
    if (isEnrolledUnlocked) {
      if (spec.kind === "capstone") {
        const lessonRatio = totalLessonsCount > 0 ? completedLessonsCount / totalLessonsCount : 0;
        const subWeight =
          projectApproved
            ? 1
            : projectSub?.status === "submitted" || projectSub?.status === "under_review"
              ? 0.75
              : projectSub?.status === "revision_required"
                ? 0.6
                : projectSub?.status === "in_progress"
                  ? 0.4
                  : 0;
        progressPercent = Math.round((lessonRatio * 0.3 + subWeight * 0.7) * 100);
      } else {
        const lessonRatio = totalLessonsCount > 0 ? completedLessonsCount / totalLessonsCount : 0;
        progressPercent = Math.round(lessonRatio * 100);
        if (spec.requireModuleQuiz && allLessonsCompleted && passedModuleQuizzesCount === 0) {
          // Completed lessons, checkpoint quiz adds final mastery polish, or still counts 100% of lessons
          progressPercent = Math.max(progressPercent, 85);
        }
        if (rawSelfComplete && (!spec.requireModuleQuiz || passedModuleQuizzesCount > 0)) {
          progressPercent = 100;
        }
      }
    }

    const hasAnyWorkStarted =
      isEnrolledUnlocked &&
      (completedLessonsCount > 0 ||
        completedExercisesCount > 0 ||
        passedKnowledgeChecksCount > 0 ||
        passedModuleQuizzesCount > 0 ||
        hasInProgressOrVisited ||
        Boolean(projectSub));

    evalById.set(spec.id, {
      spec,
      detail,
      rawSelfComplete,
      hasAnyWorkStarted,
      completedLessonsCount,
      totalLessonsCount,
      completedExercisesCount,
      passedKnowledgeChecksCount,
      passedModuleQuizzesCount,
      assessmentScorePercent:
        quizCountForAvg > 0 ? Math.round(totalQuizScoreSum / quizCountForAvg) : null,
      progressPercent: rawSelfComplete && progressPercent === 100 ? 100 : progressPercent,
      acquiredAt: rawSelfComplete ? latestCompletionTs : null,
      relatedLessons,
      evidenceItems,
      projectApproved,
    });
  }

  // Second pass: resolve statuses respecting prerequisite DAG + build outward links
  const nextIdsMap = new Map<string, string[]>();
  for (const spec of specs) {
    for (const prereqId of spec.prerequisiteSkillIds) {
      const list = nextIdsMap.get(prereqId) ?? [];
      if (!list.includes(spec.id)) list.push(spec.id);
      nextIdsMap.set(prereqId, list);
    }
    for (const crossId of spec.crossTrackTargets ?? []) {
      const list = nextIdsMap.get(spec.id) ?? [];
      if (!list.includes(crossId)) list.push(crossId);
      nextIdsMap.set(spec.id, list);
    }
  }

  const statusById = new Map<string, SkillNodeStatus>();
  for (const spec of specs) {
    const ev = evalById.get(spec.id)!;
    const isEnrolled = Boolean(ev.detail && !ev.detail.locked);
    if (ev.rawSelfComplete) {
      statusById.set(spec.id, "acquired");
      continue;
    }

    const prereqsSatisfied =
      spec.prerequisiteSkillIds.length === 0 ||
      spec.prerequisiteSkillIds.every((pid) => evalById.get(pid)?.rawSelfComplete);

    if (isEnrolled && (ev.hasAnyWorkStarted || prereqsSatisfied)) {
      statusById.set(spec.id, "in_progress");
    } else {
      statusById.set(spec.id, "locked");
    }
  }

  // Build final SkillNodeSnapshot objects
  const nodes: SkillNodeSnapshot[] = specs.map((spec) => {
    const ev = evalById.get(spec.id)!;
    const status = statusById.get(spec.id) ?? "locked";
    const categoryMeta =
      SKILL_CATEGORIES.find((c) => c.id === spec.category) ?? SKILL_CATEGORIES[0];
    const courseTitle = ev.detail?.course.title ?? spec.courseSlug;
    const courseId = ev.detail?.course.id ?? spec.courseSlug;
    const courseEnrolled = Boolean(ev.detail && !ev.detail.locked);

    const prerequisiteTitles = spec.prerequisiteSkillIds
      .map((pid) => specById.get(pid)?.title ?? pid);

    let proficiencyLevel: SkillProficiencyLevel = "Locked";
    if (status === "acquired") {
      if (
        spec.kind === "capstone" ||
        (ev.passedModuleQuizzesCount > 0 && ev.completedExercisesCount > 0)
      ) {
        proficiencyLevel = "Mastered";
      } else if (ev.passedModuleQuizzesCount > 0 || ev.completedExercisesCount > 0) {
        proficiencyLevel = "Verified";
      } else {
        proficiencyLevel = "Practiced";
      }
    } else if (status === "in_progress") {
      proficiencyLevel = ev.completedLessonsCount > 0 ? "Practiced" : "Exploring";
    }

    let unlockRequirementText = "";
    if (status === "acquired") {
      unlockRequirementText = ev.acquiredAt
        ? `Acquired on ${ev.acquiredAt.slice(0, 10)}`
        : "Completed with verified evidence";
    } else if (!courseEnrolled) {
      unlockRequirementText = `Enrol in "${courseTitle}" to unlock these lessons and skills.`;
    } else if (status === "locked" && prerequisiteTitles.length > 0) {
      unlockRequirementText = `Complete prerequisite skill(s): ${prerequisiteTitles.join(", ")}`;
    } else if (spec.kind === "capstone") {
      unlockRequirementText = `Submit capstone "${spec.title.replace(/^Capstone:\s*/i, "")}" for mentor approval.`;
    } else {
      const remaining = Math.max(1, ev.totalLessonsCount - ev.completedLessonsCount);
      unlockRequirementText = `Finish ${remaining} remaining lesson${remaining === 1 ? "" : "s"} in this track to earn.`;
    }

    const nextIds = nextIdsMap.get(spec.id) ?? [];
    const recommendedNextSkills = nextIds
      .map((nid) => {
        const nextSpec = specById.get(nid);
        if (!nextSpec) return null;
        return {
          id: nextSpec.id,
          title: nextSpec.title,
          status: statusById.get(nid) ?? "locked",
          courseSlug: nextSpec.courseSlug,
        };
      })
      .filter((x): x is NonNullable<typeof x> => Boolean(x));

    return {
      id: spec.id,
      title: spec.title,
      description: spec.description,
      category: spec.category,
      categoryLabel: categoryMeta.label,
      kind: spec.kind,
      tools: spec.tools,
      courseId,
      courseSlug: spec.courseSlug,
      courseTitle,
      courseEnrolled,
      moduleIds: spec.moduleIds,
      lessonIds: spec.lessonIds,
      projectSlug: spec.projectSlug ?? null,
      prerequisiteSkillIds: spec.prerequisiteSkillIds,
      prerequisiteTitles,
      nextSkillIds: nextIds,
      recommendedNextSkills,
      position: spec.position,
      status,
      proficiencyLevel,
      progressPercent: status === "acquired" ? 100 : ev.progressPercent,
      completedLessonsCount: ev.completedLessonsCount,
      totalLessonsCount: ev.totalLessonsCount,
      completedExercisesCount: ev.completedExercisesCount,
      passedKnowledgeChecksCount: ev.passedKnowledgeChecksCount,
      passedModuleQuizzesCount: ev.passedModuleQuizzesCount,
      assessmentScorePercent: ev.assessmentScorePercent,
      acquiredAt: ev.acquiredAt,
      unlockRequirementText,
      relatedLessons: ev.relatedLessons,
      evidenceItems: ev.evidenceItems,
    };
  });

  const nodeById = new Map(nodes.map((n) => [n.id, n]));

  // Build Edges
  const edges: SkillEdgeSnapshot[] = [];
  const edgeKeys = new Set<string>();
  for (const spec of specs) {
    const targetNode = nodeById.get(spec.id);
    for (const pid of spec.prerequisiteSkillIds) {
      const key = `${pid}->${spec.id}`;
      if (edgeKeys.has(key) || !nodeById.has(pid)) continue;
      edgeKeys.add(key);
      const srcStatus = statusById.get(pid);
      const dstStatus = statusById.get(spec.id);
      edges.push({
        id: `edge-${key}`,
        source: pid,
        target: spec.id,
        relationship: targetNode?.kind === "capstone" ? "capstone" : "prerequisite",
        highlighted: srcStatus === "acquired" && dstStatus === "acquired",
      });
    }
    for (const crossId of spec.crossTrackTargets ?? []) {
      const key = `${spec.id}->${crossId}`;
      if (edgeKeys.has(key) || !nodeById.has(crossId)) continue;
      edgeKeys.add(key);
      edges.push({
        id: `edge-${key}`,
        source: spec.id,
        target: crossId,
        relationship: "cross_track",
        highlighted:
          statusById.get(spec.id) === "acquired" &&
          statusById.get(crossId) !== "locked",
      });
    }
  }

  // Group into Categories
  const categories: SkillCategorySummary[] = SKILL_CATEGORIES.map((catMeta) => {
    const catNodes = nodes.filter((n) => n.category === catMeta.id);
    const acquiredCount = catNodes.filter((n) => n.status === "acquired").length;
    const inProgressCount = catNodes.filter((n) => n.status === "in_progress").length;
    const lockedCount = catNodes.filter((n) => n.status === "locked").length;
    const totalCount = catNodes.length;
    const toolsSet = new Set<string>();
    for (const n of catNodes) {
      if (n.status !== "locked") {
        n.tools.forEach((t) => toolsSet.add(t));
      }
    }
    return {
      id: catMeta.id,
      label: catMeta.label,
      shortLabel: catMeta.shortLabel,
      description: catMeta.description,
      acquiredCount,
      inProgressCount,
      lockedCount,
      totalCount,
      completionPercent:
        totalCount > 0 ? Math.round((acquiredCount / totalCount) * 100) : 0,
      toolsPracticed: Array.from(toolsSet),
      nodes: catNodes,
    };
  });

  // Build Programme Roadmaps (preserving course order: enrolled first)
  const sortedDetails = [...input.courseDetails].sort((a, b) => {
    if (a.locked !== b.locked) return a.locked ? 1 : -1;
    return a.course.title.localeCompare(b.course.title);
  });

  const roadmaps: ProgrammeRoadmapTrack[] = sortedDetails.map((detail) => {
    const track = internshipBySlug.get(detail.course.linkedInternshipSlug) ?? null;
    const app = track ? appByInternshipId.get(track.id) ?? null : null;
    const sub = submissionByProjectSlug.get(detail.course.projectSlug) ?? null;
    const cert = app
      ? input.issuances.find(
          (i) =>
            i.internship_application_id === app.id &&
            i.issuance_status === "issued",
        ) ?? null
      : null;

    const tasks = track?.tasks ?? [];
    const approvedTasks = tasks.filter(
      (t) =>
        app?.task_submissions?.find((ts) => ts.taskId === t.id)?.status ===
        "approved",
    ).length;

    if (detail.locked) {
      const lockedModules: RoadmapModuleStage[] = detail.syllabusModules.map((mod) => ({
        moduleId: mod.id,
        sortOrder: mod.sortOrder,
        title: mod.title,
        summary: mod.summary,
        estimatedMinutes: mod.estimatedMinutes,
        status: "locked",
        completedLessonsCount: 0,
        totalLessonsCount: mod.lessons.length,
        progressPercent: 0,
        exercisesCompletedCount: 0,
        totalExercisesCount: 0,
        moduleQuizScorePercent: null,
        moduleQuizPassed: false,
        hasModuleQuiz: false,
        skills: nodes
          .filter((n) => n.courseSlug === detail.course.slug && n.moduleIds.includes(mod.id))
          .map((n) => ({ id: n.id, title: n.title, status: n.status })),
        lessons: mod.lessons.map((l) => ({
          id: l.id,
          title: l.title,
          lessonType: l.lessonType,
          durationLabel: l.durationLabel,
          completed: false,
          href: `/programmes/${detail.course.slug}`,
        })),
        continueHref: `/programmes/${detail.course.slug}`,
      }));

      return {
        courseId: detail.course.id,
        courseSlug: detail.course.slug,
        courseTitle: detail.course.title,
        category: detail.course.category,
        enrolled: false,
        overallProgressPercent: 0,
        completedLessonsCount: 0,
        totalLessonsCount: detail.course.lessonCount,
        quizScorePercent: null,
        quizPassed: false,
        projectTitle: detail.course.projectTitle,
        projectStatus: "not_started",
        projectFeedback: null,
        internshipTitle: detail.course.linkedInternshipTitle,
        approvedInternshipTasks: 0,
        totalInternshipTasks: tasks.length,
        certificateIssued: false,
        certificateId: null,
        continueHref: `/programmes/${detail.course.slug}`,
        modules: lockedModules,
      };
    }

    const modules: RoadmapModuleStage[] = detail.modules.map((mod, mIdx) => {
      const completedLessonsCount = mod.lessons.filter(
        (l) => detail.lessonProgress[l.id]?.status === "completed",
      ).length;
      const totalLessonsCount = mod.lessons.length;
      const totalExercisesCount = mod.lessons.filter((l) => Boolean(l.practicalExercise)).length;
      const exercisesCompletedCount = mod.lessons.filter(
        (l) => Boolean(l.practicalExercise) && Boolean(detail.exerciseCompletions[l.id]),
      ).length;
      const modAttempt = detail.moduleQuizAttempts[mod.id] ?? null;
      const hasModuleQuiz = Boolean(mod.moduleQuiz && mod.moduleQuiz.questions.length > 0);
      const moduleQuizPassed = Boolean(modAttempt?.passed);
      const firstIncompleteLesson =
        mod.lessons.find((l) => detail.lessonProgress[l.id]?.status !== "completed") ??
        mod.lessons[0];

      const isCompleted =
        totalLessonsCount > 0 && completedLessonsCount >= totalLessonsCount;

      const prevModAllDone =
        mIdx === 0 ||
        detail.modules[mIdx - 1].lessons.every(
          (l) => detail.lessonProgress[l.id]?.status === "completed",
        );

      const modStatus: RoadmapModuleStage["status"] = isCompleted
        ? "completed"
        : completedLessonsCount > 0 ||
            exercisesCompletedCount > 0 ||
            prevModAllDone ||
            mod.lessons.some((l) => detail.lastVisitedLessonId === l.id)
          ? "in_progress"
          : "locked";

      return {
        moduleId: mod.id,
        sortOrder: mod.sortOrder,
        title: mod.title,
        summary: mod.summary,
        estimatedMinutes: mod.estimatedMinutes,
        status: modStatus,
        completedLessonsCount,
        totalLessonsCount,
        progressPercent:
          totalLessonsCount > 0
            ? Math.round((completedLessonsCount / totalLessonsCount) * 100)
            : 0,
        exercisesCompletedCount,
        totalExercisesCount,
        moduleQuizScorePercent: modAttempt?.scorePercent ?? null,
        moduleQuizPassed,
        hasModuleQuiz,
        skills: nodes
          .filter((n) => n.courseSlug === detail.course.slug && n.moduleIds.includes(mod.id))
          .map((n) => ({ id: n.id, title: n.title, status: n.status })),
        lessons: mod.lessons.map((l) => ({
          id: l.id,
          title: l.title,
          lessonType: l.lessonType,
          durationLabel: l.durationLabel,
          completed: detail.lessonProgress[l.id]?.status === "completed",
          href: `/programmes/${detail.course.slug}?lesson=${encodeURIComponent(l.id)}`,
        })),
        continueHref: firstIncompleteLesson
          ? `/programmes/${detail.course.slug}?lesson=${encodeURIComponent(firstIncompleteLesson.id)}`
          : `/programmes/${detail.course.slug}`,
      };
    });

    return {
      courseId: detail.course.id,
      courseSlug: detail.course.slug,
      courseTitle: detail.course.title,
      category: detail.course.category,
      enrolled: true,
      overallProgressPercent: detail.course.progressPercent,
      completedLessonsCount: detail.course.completedLessonCount,
      totalLessonsCount: detail.course.lessonCount,
      quizScorePercent: detail.course.quizScorePercent,
      quizPassed: detail.course.quizPassed,
      projectTitle: detail.course.projectTitle,
      projectStatus: sub?.status ?? "not_started",
      projectFeedback: sub?.mentorFeedback ?? null,
      internshipTitle: detail.course.linkedInternshipTitle,
      approvedInternshipTasks: approvedTasks,
      totalInternshipTasks: tasks.length,
      certificateIssued: Boolean(cert),
      certificateId: cert?.certificate_id ?? null,
      continueHref: `/programmes/${detail.course.slug}`,
      modules,
    };
  });

  // Aggregate genuine learning metrics
  let lessonsCompletedCount = 0;
  let totalEnrolledLessonsCount = 0;
  let exercisesCompletedCount = 0;
  let assessmentsPassedCount = 0;
  let quizScoreSum = 0;
  let quizScoreCount = 0;
  let completedMinutes = 0;

  for (const detail of input.courseDetails) {
    if (detail.locked) continue;
    totalEnrolledLessonsCount += detail.course.lessonCount;
    for (const mod of detail.modules) {
      for (const les of mod.lessons) {
        if (detail.lessonProgress[les.id]?.status === "completed") {
          lessonsCompletedCount += 1;
          completedMinutes += parseDurationMinutes(les.durationLabel);
        }
        if (les.practicalExercise && detail.exerciseCompletions[les.id]) {
          exercisesCompletedCount += 1;
          completedMinutes += les.practicalExercise.estimatedMinutes || 15;
        }
      }
      const modAttempt = detail.moduleQuizAttempts[mod.id];
      if (modAttempt) {
        quizScoreSum += modAttempt.scorePercent;
        quizScoreCount += 1;
        if (modAttempt.passed) assessmentsPassedCount += 1;
      }
    }
    if (detail.quizAttempt) {
      quizScoreSum += detail.quizAttempt.scorePercent;
      quizScoreCount += 1;
      if (detail.quizAttempt.passed) assessmentsPassedCount += 1;
    }
  }

  let projectsApprovedCount = 0;
  for (const sub of submissionByProjectSlug.values()) {
    if (sub.status === "approved") {
      projectsApprovedCount += 1;
      completedMinutes += 120; // Verified capstone implementation effort
    }
  }

  const certificatesIssuedCount = input.issuances.filter(
    (i) => i.issuance_status === "issued",
  ).length;

  const skillsAcquiredCount = nodes.filter((n) => n.status === "acquired").length;
  const skillsInProgressCount = nodes.filter((n) => n.status === "in_progress").length;
  const skillsLockedCount = nodes.filter((n) => n.status === "locked").length;

  const metrics: LearningUniverseMetrics = {
    totalSkillsCount: nodes.length,
    skillsAcquiredCount,
    skillsInProgressCount,
    skillsLockedCount,
    lessonsCompletedCount,
    totalEnrolledLessonsCount,
    exercisesCompletedCount,
    assessmentsPassedCount,
    assessmentAveragePercent:
      quizScoreCount > 0 ? Math.round(quizScoreSum / quizScoreCount) : null,
    projectsApprovedCount,
    certificatesIssuedCount,
    learningHoursCompleted: Math.round((completedMinutes / 60) * 10) / 10,
    overallCompletionPercent:
      totalEnrolledLessonsCount > 0
        ? Math.round((lessonsCompletedCount / totalEnrolledLessonsCount) * 100)
        : 0,
  };

  // Achievements / Badges computed strictly from real records
  const firstAcquiredNode = nodes.find((n) => n.status === "acquired");
  const achievements: AchievementMilestone[] = [
    {
      id: "ach-first-lesson",
      title: "First Verified Concept",
      detail: "Complete your first structured study lesson with real progress saved.",
      category: "skill",
      earned: lessonsCompletedCount >= 1,
      earnedAt: firstAcquiredNode?.acquiredAt ?? null,
      metricLabel: `${lessonsCompletedCount} lesson${lessonsCompletedCount === 1 ? "" : "s"} completed`,
      href: roadmaps[0]?.continueHref,
    },
    {
      id: "ach-skill-builder",
      title: "Multi-Skill Builder",
      detail: "Acquire 3 or more technical skills through completed lessons and exercises.",
      category: "skill",
      earned: skillsAcquiredCount >= 3,
      earnedAt: null,
      metricLabel: `${skillsAcquiredCount}/3 skills acquired`,
    },
    {
      id: "ach-quiz-verified",
      title: "Assessment Verified",
      detail: "Pass a module checkpoint or final programme architecture assessment.",
      category: "assessment",
      earned: assessmentsPassedCount >= 1,
      earnedAt: null,
      metricLabel: `${assessmentsPassedCount} assessment${assessmentsPassedCount === 1 ? "" : "s"} passed`,
    },
    {
      id: "ach-capstone-approved",
      title: "Capstone Builder",
      detail: "Earn mentor rubric approval on a submitted capstone project repository.",
      category: "project",
      earned: projectsApprovedCount >= 1,
      earnedAt: null,
      metricLabel: `${projectsApprovedCount} project${projectsApprovedCount === 1 ? "" : "s"} approved`,
    },
    {
      id: "ach-certified-grad",
      title: "TGL Certified Graduate",
      detail: "Unlock and claim an official QR-verified Internship Completion Certificate.",
      category: "certificate",
      earned: certificatesIssuedCount >= 1,
      earnedAt:
        input.issuances.find((i) => i.issuance_status === "issued")?.issued_at ??
        null,
      metricLabel: `${certificatesIssuedCount} certificate${certificatesIssuedCount === 1 ? "" : "s"} issued`,
      href: "/certificates",
    },
  ];

  return {
    nodes,
    edges,
    categories,
    roadmaps,
    achievements,
    metrics,
  };
}
