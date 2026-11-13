import { randomUUID } from "node:crypto";
import {
  enrichedPathways,
  learningNodes,
  learningProjects,
  findNodeById,
  findProjectBySlug,
} from "./learning-graph";
import { DEMO_STUDENT_ID, getMemoryStore } from "./certifications/store";

export type NodeProgressState = "not_started" | "active" | "completed";

export type ProjectSubmissionStatus =
  | "in_progress"
  | "submitted"
  | "under_review"
  | "approved"
  | "revision_required";

export type ProjectSubmissionRecord = {
  id: string;
  userId: string;
  learnerName: string;
  learnerEmail: string;
  projectSlug: string;
  projectTitle: string;
  pathwaySlug: string;
  cohortName: string;
  githubUrl: string;
  deploymentUrl: string | null;
  supportingEvidence: string | null;
  artifactUrl: string;
  summary: string;
  reflection: string;
  status: ProjectSubmissionStatus;
  mentorName: string;
  mentorFeedback: string | null;
  reviewedAt: string | null;
  submittedAt: string;
};

export type MentorMessageRecord = {
  id: string;
  userId: string;
  learnerName: string;
  projectSlug: string | null;
  nodeId: string | null;
  topic: string;
  authorRole: "student" | "mentor";
  authorName: string;
  body: string;
  resolved: boolean;
  createdAt: string;
};

export type LearningEvidenceRecord = {
  id: string;
  userId: string;
  title: string;
  kind: "concept" | "project_submission" | "mentor_approval" | "certificate";
  pathwayTitle: string;
  relatedSlug: string;
  recordedAt: string;
};

export type CohortRecord = {
  id: string;
  name: string;
  pathwaySlug: string;
  mentorName: string;
  mentorEmail: string;
  learnerCount: number;
  status: "active" | "upcoming" | "archived";
};

type WorkspaceStore = {
  nodeStatesByUser: Record<string, Record<string, NodeProgressState>>;
  savedItemsByUser: Record<string, string[]>;
  submissions: ProjectSubmissionRecord[];
  messages: MentorMessageRecord[];
  evidence: LearningEvidenceRecord[];
  cohorts: CohortRecord[];
};

const globalWorkspace = globalThis as unknown as { __tglWorkspaceStore?: WorkspaceStore };

function createSeedWorkspace(): WorkspaceStore {
  return {
    nodeStatesByUser: {
      [DEMO_STUDENT_ID]: {
        "web-semantic-dom": "completed",
        "web-api-boundaries": "completed",
        "node-proj-portfolio": "completed",
        "mentor-web-critique": "completed",
        "sec-input-validation": "completed",
        "sec-hmac-signatures": "active",
        "node-proj-sec": "active",
        "ux-information-hierarchy": "completed",
        "ux-keyboard-flows": "active",
        "ai-eval-rubrics": "active",
      },
    },
    savedItemsByUser: {
      [DEMO_STUDENT_ID]: [
        "pathway:web-development",
        "project:webhook-trust-boundary",
        "project:design-system-audit",
        "node:sec-hmac-signatures",
      ],
    },
    submissions: [
      {
        id: "sub-seed-1",
        userId: DEMO_STUDENT_ID,
        learnerName: "Aarav Sharma",
        learnerEmail: "aarav.sharma@example.edu",
        projectSlug: "accessible-learning-portfolio",
        projectTitle: "Accessible Learning Portfolio & Verification Workspace",
        pathwaySlug: "web-development",
        cohortName: "Autumn Engineering Cohort",
        githubUrl: "https://github.com/example/tgl-capstone-submission",
        deploymentUrl: "https://tgl-portfolio-demo.example.vercel.app",
        supportingEvidence: "Unit test logs + axe-core WCAG AA report attached in repo /docs.",
        artifactUrl: "https://github.com/example/tgl-capstone-submission",
        summary: "Implemented signed API boundaries, audit logging, and accessible React dashboard.",
        reflection: "Adding keyboard focus trapping and server-side schema verification caught two edge cases before review.",
        status: "approved",
        mentorName: "Kabir Malhotra",
        mentorFeedback: "Strong API boundaries, clean accessible landmarks, and verified unit tests. Unlocks related internship pathway.",
        reviewedAt: "2026-11-11T14:30:00.000Z",
        submittedAt: "2026-11-10T18:10:00.000Z",
      },
      {
        id: "sub-seed-2",
        userId: DEMO_STUDENT_ID,
        learnerName: "Aarav Sharma",
        learnerEmail: "aarav.sharma@example.edu",
        projectSlug: "webhook-trust-boundary",
        projectTitle: "HMAC Webhook Verifier & Idempotency Guard",
        pathwaySlug: "cybersecurity",
        cohortName: "Infrastructure & Trust Cohort",
        githubUrl: "https://github.com/example/aarav-webhook-guard",
        deploymentUrl: null,
        supportingEvidence: "HMAC replay test trace attached in README.",
        artifactUrl: "https://github.com/example/aarav-webhook-guard",
        summary: "Built raw-body HMAC SHA-256 verification handler with replay-dedup table.",
        reflection: "Testing against re-serialized JSON highlighted why reading raw bytes before parsing is essential.",
        status: "submitted",
        mentorName: "Rhea Kulkarni",
        mentorFeedback: null,
        reviewedAt: null,
        submittedAt: "2026-11-12T16:40:00.000Z",
      },
      {
        id: "sub-seed-3",
        userId: "00000000-0000-4000-8000-000000000103",
        learnerName: "Diya Nair",
        learnerEmail: "diya.nair@example.edu",
        projectSlug: "design-system-audit",
        projectTitle: "Accessible Multi-Role Interface Critique & Spec",
        pathwaySlug: "ui-ux-design",
        cohortName: "Product Craft Cohort",
        githubUrl: "https://github.com/example/diya-spatial-map",
        deploymentUrl: "https://diya-audit.example.vercel.app",
        supportingEvidence: "Mobile 390px layout measurements and VoiceOver checklist.",
        artifactUrl: "https://github.com/example/diya-spatial-map",
        summary: "Redesigned pathway overview into an open spatial map with keyboard list toggle and WCAG AA focus states.",
        reflection: "Testing with VoiceOver showed spatial coordinates need a synchronized list fallback.",
        status: "submitted",
        mentorName: "Tara Sengupta",
        mentorFeedback: null,
        reviewedAt: null,
        submittedAt: "2026-11-12T19:05:00.000Z",
      },
    ],
    messages: [
      {
        id: "msg-seed-1",
        userId: DEMO_STUDENT_ID,
        learnerName: "Aarav Sharma",
        projectSlug: "accessible-learning-portfolio",
        nodeId: "mentor-web-critique",
        topic: "Capstone API & Accessibility Review",
        authorRole: "student",
        authorName: "Aarav Sharma",
        body: "Should the student portfolio display internal audit hashes or human-readable milestone summaries?",
        resolved: true,
        createdAt: "2026-11-11T11:20:00.000Z",
      },
      {
        id: "msg-seed-2",
        userId: DEMO_STUDENT_ID,
        learnerName: "Aarav Sharma",
        projectSlug: "accessible-learning-portfolio",
        nodeId: "mentor-web-critique",
        topic: "Capstone API & Accessibility Review",
        authorRole: "mentor",
        authorName: "Kabir Malhotra",
        body: "Show learners verified milestone work, repository artifacts, and mentor notes cleanly.",
        resolved: true,
        createdAt: "2026-11-11T14:30:00.000Z",
      },
      {
        id: "msg-seed-3",
        userId: DEMO_STUDENT_ID,
        learnerName: "Aarav Sharma",
        projectSlug: "webhook-trust-boundary",
        nodeId: "sec-hmac-signatures",
        topic: "Webhook Replay Window Question",
        authorRole: "student",
        authorName: "Aarav Sharma",
        body: "If Razorpay retries a webhook after a 500 response, should event_id deduplication block retries or only block previously processed events?",
        resolved: false,
        createdAt: "2026-11-12T17:05:00.000Z",
      },
    ],
    evidence: [
      {
        id: "ev-seed-1",
        userId: DEMO_STUDENT_ID,
        title: "Mentor approved: Accessible Learning Portfolio & Verification Workspace",
        kind: "mentor_approval",
        pathwayTitle: "Web development",
        relatedSlug: "/projects/accessible-learning-portfolio",
        recordedAt: "2026-11-11T14:30:00.000Z",
      },
      {
        id: "ev-seed-2",
        userId: DEMO_STUDENT_ID,
        title: "Submitted work: HMAC Webhook Verifier & Idempotency Guard",
        kind: "project_submission",
        pathwayTitle: "Cybersecurity",
        relatedSlug: "/projects/webhook-trust-boundary",
        recordedAt: "2026-11-12T16:40:00.000Z",
      },
      {
        id: "ev-seed-3",
        userId: DEMO_STUDENT_ID,
        title: "Completed concept: Semantic HTML & Accessible Widgets",
        kind: "concept",
        pathwayTitle: "Web development",
        relatedSlug: "/pathways/web-development",
        recordedAt: "2026-11-09T10:15:00.000Z",
      },
    ],
    cohorts: [
      {
        id: "cohort-eng-autumn",
        name: "Autumn Engineering Cohort",
        pathwaySlug: "web-development",
        mentorName: "Kabir Malhotra",
        mentorEmail: "kabir.mentor@touchgrasslater.org",
        learnerCount: 24,
        status: "active",
      },
      {
        id: "cohort-ai-studio",
        name: "Applied AI Studio",
        pathwaySlug: "artificial-intelligence",
        mentorName: "Dr. Nisha Menon",
        mentorEmail: "nisha.mentor@touchgrasslater.org",
        learnerCount: 18,
        status: "active",
      },
      {
        id: "cohort-infra-trust",
        name: "Infrastructure & Trust Cohort",
        pathwaySlug: "cybersecurity",
        mentorName: "Rhea Kulkarni",
        mentorEmail: "rhea.mentor@touchgrasslater.org",
        learnerCount: 16,
        status: "active",
      },
      {
        id: "cohort-product-craft",
        name: "Product Craft Cohort",
        pathwaySlug: "ui-ux-design",
        mentorName: "Tara Sengupta",
        mentorEmail: "tara.mentor@touchgrasslater.org",
        learnerCount: 14,
        status: "active",
      },
    ],
  };
}

export function getWorkspaceStore(): WorkspaceStore {
  if (!globalWorkspace.__tglWorkspaceStore) {
    globalWorkspace.__tglWorkspaceStore = createSeedWorkspace();
  }
  return globalWorkspace.__tglWorkspaceStore;
}

export function resetWorkspaceStoreForTest() {
  globalWorkspace.__tglWorkspaceStore = createSeedWorkspace();
}

export function getProjectStatusForUser(
  userId: string,
  projectSlug: string,
): "not_started" | ProjectSubmissionStatus {
  const store = getWorkspaceStore();
  const sub = store.submissions.find(
    (s) => s.userId === userId && s.projectSlug === projectSlug,
  );
  return sub?.status ?? "not_started";
}

export function getLearnerSnapshot(userId: string) {
  const store = getWorkspaceStore();
  const nodeStates = store.nodeStatesByUser[userId] ?? {};
  const savedItems = store.savedItemsByUser[userId] ?? [];
  const submissions = store.submissions.filter((s) => s.userId === userId);
  const messages = store.messages.filter((m) => m.userId === userId);
  const evidence = store.evidence.filter((e) => e.userId === userId);

  const completedNodeCount = Object.values(nodeStates).filter((v) => v === "completed").length;
  const activeNodeCount = Object.values(nodeStates).filter((v) => v === "active").length;
  const approvedProjectsCount = submissions.filter((s) => s.status === "approved").length;

  return {
    nodeStates,
    savedItems,
    submissions,
    messages,
    evidence,
    summary: {
      completedNodeCount,
      activeNodeCount,
      totalNodes: learningNodes.length,
      approvedProjectsCount,
      totalProjects: learningProjects.length,
      evidenceCount: evidence.length,
    },
  };
}

export function setLearnerNodeState(params: {
  userId: string;
  nodeId: string;
  state: NodeProgressState;
}) {
  const store = getWorkspaceStore();
  if (!store.nodeStatesByUser[params.userId]) {
    store.nodeStatesByUser[params.userId] = {};
  }
  store.nodeStatesByUser[params.userId][params.nodeId] = params.state;

  const node = findNodeById(params.nodeId);
  if (node && params.state === "completed") {
    const pathway = enrichedPathways.find((p) => p.slug === node.pathwaySlug);
    const alreadyLogged = store.evidence.some(
      (e) => e.userId === params.userId && e.title.includes(node.title),
    );
    if (!alreadyLogged) {
      store.evidence.unshift({
        id: randomUUID(),
        userId: params.userId,
        title: `Completed ${node.kind}: ${node.title}`,
        kind: "concept",
        pathwayTitle: pathway?.title ?? node.pathwaySlug,
        relatedSlug: `/pathways/${node.pathwaySlug}`,
        recordedAt: new Date().toISOString(),
      });
    }
  }

  return getLearnerSnapshot(params.userId);
}

export function toggleLearnerSavedItem(params: { userId: string; itemKey: string }) {
  const store = getWorkspaceStore();
  const list = store.savedItemsByUser[params.userId] ?? [];
  const exists = list.includes(params.itemKey);
  store.savedItemsByUser[params.userId] = exists
    ? list.filter((x) => x !== params.itemKey)
    : [params.itemKey, ...list];
  return store.savedItemsByUser[params.userId];
}

export function startLearnerProjectWork(params: {
  userId: string;
  learnerName: string;
  learnerEmail: string;
  projectSlug: string;
}) {
  const project = findProjectBySlug(params.projectSlug);
  if (!project) return { error: "Project not found." };

  const store = getWorkspaceStore();
  const existing = store.submissions.find(
    (s) => s.userId === params.userId && s.projectSlug === project.slug,
  );
  if (existing) {
    return { submission: existing };
  }

  const now = new Date().toISOString();
  const submission: ProjectSubmissionRecord = {
    id: `sub-${randomUUID().slice(0, 8)}`,
    userId: params.userId,
    learnerName: params.learnerName,
    learnerEmail: params.learnerEmail,
    projectSlug: project.slug,
    projectTitle: project.title,
    pathwaySlug: project.pathwaySlug,
    cohortName: project.cohortName,
    githubUrl: "",
    deploymentUrl: null,
    supportingEvidence: null,
    artifactUrl: "",
    summary: "Project started — preparing deliverables and repository.",
    reflection: "",
    status: "in_progress",
    mentorName: project.mentorName,
    mentorFeedback: null,
    reviewedAt: null,
    submittedAt: now,
  };
  store.submissions.unshift(submission);

  const matchingNode = learningNodes.find((n) => n.kind === "project" && n.projectSlug === project.slug);
  if (matchingNode) {
    if (!store.nodeStatesByUser[params.userId]) store.nodeStatesByUser[params.userId] = {};
    if (store.nodeStatesByUser[params.userId][matchingNode.id] !== "completed") {
      store.nodeStatesByUser[params.userId][matchingNode.id] = "active";
    }
  }

  return { submission };
}

export function submitLearnerProjectWork(params: {
  userId: string;
  learnerName: string;
  learnerEmail: string;
  projectSlug: string;
  githubUrl?: string;
  deploymentUrl?: string | null;
  supportingEvidence?: string | null;
  artifactUrl?: string;
  summary: string;
  reflection: string;
}) {
  const project = findProjectBySlug(params.projectSlug);
  if (!project) return { error: "Project not found." };

  const resolvedGithub = (params.githubUrl || params.artifactUrl || "").trim();
  if (!resolvedGithub) return { error: "GitHub repository URL is required." };

  const store = getWorkspaceStore();
  const now = new Date().toISOString();

  // If learner has an in_progress or revision_required draft for this project, update it or record new submission on top
  const existingDraft = store.submissions.find(
    (s) =>
      s.userId === params.userId &&
      s.projectSlug === project.slug &&
      (s.status === "in_progress" || s.status === "revision_required"),
  );

  let submission: ProjectSubmissionRecord;
  if (existingDraft) {
    existingDraft.githubUrl = resolvedGithub;
    existingDraft.deploymentUrl = params.deploymentUrl?.trim() || null;
    existingDraft.supportingEvidence = params.supportingEvidence?.trim() || null;
    existingDraft.artifactUrl = resolvedGithub;
    existingDraft.summary = params.summary;
    existingDraft.reflection = params.reflection;
    existingDraft.status = "submitted";
    existingDraft.submittedAt = now;
    submission = existingDraft;
  } else {
    submission = {
      id: `sub-${randomUUID().slice(0, 8)}`,
      userId: params.userId,
      learnerName: params.learnerName,
      learnerEmail: params.learnerEmail,
      projectSlug: project.slug,
      projectTitle: project.title,
      pathwaySlug: project.pathwaySlug,
      cohortName: project.cohortName,
      githubUrl: resolvedGithub,
      deploymentUrl: params.deploymentUrl?.trim() || null,
      supportingEvidence: params.supportingEvidence?.trim() || null,
      artifactUrl: resolvedGithub,
      summary: params.summary,
      reflection: params.reflection,
      status: "submitted",
      mentorName: project.mentorName,
      mentorFeedback: null,
      reviewedAt: null,
      submittedAt: now,
    };
    store.submissions.unshift(submission);
  }

  const pathway = enrichedPathways.find((p) => p.slug === project.pathwaySlug);
  store.evidence.unshift({
    id: randomUUID(),
    userId: params.userId,
    title: `Submitted project work: ${project.title}`,
    kind: "project_submission",
    pathwayTitle: pathway?.title ?? project.pathwaySlug,
    relatedSlug: `/projects/${project.slug}`,
    recordedAt: now,
  });

  const matchingNode = learningNodes.find((n) => n.kind === "project" && n.projectSlug === project.slug);
  if (matchingNode) {
    if (!store.nodeStatesByUser[params.userId]) store.nodeStatesByUser[params.userId] = {};
    if (store.nodeStatesByUser[params.userId][matchingNode.id] !== "completed") {
      store.nodeStatesByUser[params.userId][matchingNode.id] = "active";
    }
  }

  return { submission };
}

export function postMentorMessage(params: {
  userId: string;
  learnerName: string;
  projectSlug: string | null;
  nodeId: string | null;
  topic: string;
  authorRole: "student" | "mentor";
  authorName: string;
  body: string;
}) {
  const store = getWorkspaceStore();
  const msg: MentorMessageRecord = {
    id: `msg-${randomUUID().slice(0, 8)}`,
    userId: params.userId,
    learnerName: params.learnerName,
    projectSlug: params.projectSlug,
    nodeId: params.nodeId,
    topic: params.topic,
    authorRole: params.authorRole,
    authorName: params.authorName,
    body: params.body,
    resolved: params.authorRole === "mentor",
    createdAt: new Date().toISOString(),
  };

  if (params.authorRole === "mentor") {
    store.messages.forEach((m) => {
      if (m.userId === params.userId && m.projectSlug === params.projectSlug) {
        m.resolved = true;
      }
    });
  }

  store.messages.unshift(msg);
  return msg;
}

export function reviewLearnerSubmission(params: {
  submissionId: string;
  decision: "under_review" | "approved" | "revision_required" | "needs_revision";
  mentorFeedback: string;
  mentorName: string;
}) {
  const store = getWorkspaceStore();
  const sub = store.submissions.find((s) => s.id === params.submissionId);
  if (!sub) return { error: "Submission not found." };

  const normalizedDecision: ProjectSubmissionStatus =
    params.decision === "needs_revision" ? "revision_required" : params.decision;

  const now = new Date().toISOString();
  sub.status = normalizedDecision;
  sub.mentorFeedback = params.mentorFeedback;
  sub.mentorName = params.mentorName;
  sub.reviewedAt = now;

  if (normalizedDecision === "approved") {
    const pathway = enrichedPathways.find((p) => p.slug === sub.pathwaySlug);
    store.evidence.unshift({
      id: randomUUID(),
      userId: sub.userId,
      title: `Mentor approved: ${sub.projectTitle}`,
      kind: "mentor_approval",
      pathwayTitle: pathway?.title ?? sub.pathwaySlug,
      relatedSlug: `/projects/${sub.projectSlug}`,
      recordedAt: now,
    });

    // Update matching project graph node to completed (pathway progress)
    const matchingNode = learningNodes.find(
      (n) => n.kind === "project" && n.projectSlug === sub.projectSlug,
    );
    if (matchingNode) {
      if (!store.nodeStatesByUser[sub.userId]) store.nodeStatesByUser[sub.userId] = {};
      store.nodeStatesByUser[sub.userId][matchingNode.id] = "completed";
    }

    // Approving a project updates pathway/course-project completion — NOT auto-completing any internship!
    // Internships require submitting real internship tasks + final mentor/admin evaluation.
    const certStore = getMemoryStore();
    certStore.pathwayCompletedUserIds.add(sub.userId);
  }

  return { submission: sub };
}

export function getMentorConsoleData() {
  const store = getWorkspaceStore();
  const learnersMap = new Map<
    string,
    {
      userId: string;
      name: string;
      email: string;
      cohort: string;
      completedNodes: number;
      submissionsCount: number;
      approvedCount: number;
      openQuestions: number;
    }
  >();

  for (const sub of store.submissions) {
    const cur = learnersMap.get(sub.userId) ?? {
      userId: sub.userId,
      name: sub.learnerName,
      email: sub.learnerEmail,
      cohort: sub.cohortName,
      completedNodes: Object.values(store.nodeStatesByUser[sub.userId] ?? {}).filter(
        (s) => s === "completed",
      ).length,
      submissionsCount: 0,
      approvedCount: 0,
      openQuestions: 0,
    };
    cur.submissionsCount += 1;
    if (sub.status === "approved") cur.approvedCount += 1;
    learnersMap.set(sub.userId, cur);
  }

  for (const msg of store.messages) {
    if (msg.authorRole === "student" && !msg.resolved) {
      const cur = learnersMap.get(msg.userId);
      if (cur) cur.openQuestions += 1;
    }
  }

  return {
    cohorts: store.cohorts,
    learners: Array.from(learnersMap.values()),
    submissions: store.submissions,
    messages: store.messages,
  };
}

export function addAdminCohort(params: {
  name: string;
  pathwaySlug: string;
  mentorName: string;
  mentorEmail: string;
}) {
  const store = getWorkspaceStore();
  const cohort: CohortRecord = {
    id: `cohort-${randomUUID().slice(0, 6)}`,
    name: params.name,
    pathwaySlug: params.pathwaySlug,
    mentorName: params.mentorName,
    mentorEmail: params.mentorEmail,
    learnerCount: 0,
    status: "active",
  };
  store.cohorts.unshift(cohort);
  return cohort;
}
