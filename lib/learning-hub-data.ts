import { DEMO_STUDENT_ID, getAdminFirestore, isFirestoreConfigured } from "@/lib/firebase/server";

export type LearningHubPath = {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  difficulty: string;
  estimated_hours: number | null;
  sort_order: number;
};

export type LearningHubModule = {
  id: string;
  learning_path_id: string;
  title: string;
  description: string;
  sort_order: number;
  estimated_minutes: number | null;
};

export type LearningHubResource = {
  id: string;
  learning_path_id: string | null;
  title: string;
  provider: string;
  topic: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  estimated_minutes: number | null;
  language: string | null;
  url: string;
  learning_objectives: string[];
  prerequisites: string[];
  related_projects: string[];
};

export type ResourceProgressStatus = "not_started" | "in_progress" | "completed";

export type LearningHubModuleProgress = {
  module_id: string;
  status: ResourceProgressStatus;
  completed_at: string | null;
};

export type LearningHubUserState = {
  savedIds: string[];
  resourceStatuses: Record<string, ResourceProgressStatus>;
  enrolledPathIds: string[];
  moduleProgress: Record<string, LearningHubModuleProgress>;
};

export const LEARNING_HUB_PATHS: LearningHubPath[] = [
  {
    id: "lh-path-web-foundations",
    slug: "web-architecture-foundations",
    title: "Web Architecture Foundations",
    description:
      "Master semantic HTML, responsive layout math, TypeScript fundamentals, and clean state architecture before jumping into production builds.",
    category: "Web Systems",
    difficulty: "beginner",
    estimated_hours: 18,
    sort_order: 1,
  },
  {
    id: "lh-path-data-sql",
    slug: "practical-sql-and-data-modeling",
    title: "Practical Data Modeling & Query Design",
    description:
      "Design clean document and relational schemas, index hot query paths, and eliminate N+1 bottlenecks with free interactive tutorials.",
    category: "Data & Backend",
    difficulty: "intermediate",
    estimated_hours: 14,
    sort_order: 2,
  },
  {
    id: "lh-path-applied-ai",
    slug: "applied-ai-and-prompt-engineering",
    title: "Applied AI & Structured Outputs",
    description:
      "Explore deterministic prompt design, tool-calling patterns, retrieval evaluation, and grounded API integration using open curriculum.",
    category: "Artificial Intelligence",
    difficulty: "intermediate",
    estimated_hours: 16,
    sort_order: 3,
  },
];

export const LEARNING_HUB_MODULES: LearningHubModule[] = [
  {
    id: "lh-mod-web-1",
    learning_path_id: "lh-path-web-foundations",
    title: "Semantic HTML & Document Landmarks",
    description: "Structure accessible pages with native forms, landmarks, and keyboard-first controls.",
    sort_order: 1,
    estimated_minutes: 45,
  },
  {
    id: "lh-mod-web-2",
    learning_path_id: "lh-path-web-foundations",
    title: "Modern CSS Layout & Responsive Grids",
    description: "Build fluid 390px-to-1440px layouts with Grid, Flexbox, and container discipline.",
    sort_order: 2,
    estimated_minutes: 60,
  },
  {
    id: "lh-mod-web-3",
    learning_path_id: "lh-path-web-foundations",
    title: "TypeScript & Async State Flows",
    description: "Catch data mismatches early and model loading, empty, and error states cleanly.",
    sort_order: 3,
    estimated_minutes: 75,
  },
  {
    id: "lh-mod-data-1",
    learning_path_id: "lh-path-data-sql",
    title: "Document vs Relational Modeling",
    description: "Choose between embedded subdocuments, top-level collections, and normalized keys.",
    sort_order: 1,
    estimated_minutes: 50,
  },
  {
    id: "lh-mod-data-2",
    learning_path_id: "lh-path-data-sql",
    title: "Security Rules & Least-Privilege Access",
    description: "Write verifiable field-level validation and owner-only read/write guards.",
    sort_order: 2,
    estimated_minutes: 65,
  },
  {
    id: "lh-mod-ai-1",
    learning_path_id: "lh-path-applied-ai",
    title: "Prompt Grounding & JSON Schemas",
    description: "Constrain model outputs to predictable, verifiable application contracts.",
    sort_order: 1,
    estimated_minutes: 55,
  },
  {
    id: "lh-mod-ai-2",
    learning_path_id: "lh-path-applied-ai",
    title: "Evaluation Datasets & Regression Checks",
    description: "Measure output quality across edge cases instead of relying on vibes.",
    sort_order: 2,
    estimated_minutes: 70,
  },
];

export const LEARNING_HUB_RESOURCES: LearningHubResource[] = [
  {
    id: "lh-res-mdn-html",
    learning_path_id: "lh-path-web-foundations",
    title: "MDN Structuring the Web with HTML",
    provider: "MDN Web Docs",
    topic: "Web Systems",
    difficulty: "beginner",
    estimated_minutes: 180,
    language: "English",
    url: "https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Structuring_content",
    learning_objectives: [
      "Author accessible forms and semantic section landmarks",
      "Improve keyboard focus and screen-reader navigation",
      "Validate inputs before client submission",
    ],
    prerequisites: ["Basic computer literacy"],
    related_projects: ["Campus Event Showcase", "Responsive Portfolio Layout"],
  },
  {
    id: "lh-res-webdev-css",
    learning_path_id: "lh-path-web-foundations",
    title: "Learn Responsive Design & CSS Grid",
    provider: "web.dev",
    topic: "Web Systems",
    difficulty: "beginner",
    estimated_minutes: 210,
    language: "English",
    url: "https://web.dev/learn/design",
    learning_objectives: [
      "Eliminate horizontal overflow across mobile and desktop viewports",
      "Use intrinsic sizing with clamp(), minmax(), and subgrid",
      "Respect prefers-reduced-motion and dark mode preferences",
    ],
    prerequisites: ["Basic HTML & CSS selectors"],
    related_projects: ["Glassmorphic Component Library"],
  },
  {
    id: "lh-res-ts-handbook",
    learning_path_id: "lh-path-web-foundations",
    title: "TypeScript Handbook for JS Developers",
    provider: "TypeScript Docs",
    topic: "Web Systems",
    difficulty: "intermediate",
    estimated_minutes: 240,
    language: "English",
    url: "https://www.typescriptlang.org/docs/handbook/intro.html",
    learning_objectives: [
      "Model API payloads with discriminated unions",
      "Narrow unknown network errors safely",
      "Eliminate undefined runtime crashes at compile time",
    ],
    prerequisites: ["JavaScript ES6 fundamentals"],
    related_projects: ["Order & Webhook Verifier"],
  },
  {
    id: "lh-res-firebase-rules",
    learning_path_id: "lh-path-data-sql",
    title: "Firestore Data Modeling & Security Rules Guide",
    provider: "Firebase Documentation",
    topic: "Data & Backend",
    difficulty: "intermediate",
    estimated_minutes: 150,
    language: "English",
    url: "https://firebase.google.com/docs/firestore/security/get-started",
    learning_objectives: [
      "Isolate PII from public user profiles",
      "Write field-level schema assertions inside rules",
      "Prevent mass assignment and privilege escalation",
    ],
    prerequisites: ["JSON objects and async fetch calls"],
    related_projects: ["Student Progress Ledger"],
  },
  {
    id: "lh-res-postgres-tutorial",
    learning_path_id: "lh-path-data-sql",
    title: "Interactive SQL & Indexing Foundations",
    provider: "SQLBolt",
    topic: "Data & Backend",
    difficulty: "beginner",
    estimated_minutes: 120,
    language: "English",
    url: "https://sqlbolt.com/",
    learning_objectives: [
      "Write clean joins, aggregations, and filtered queries",
      "Understand primary keys and foreign key integrity",
      "Spot expensive full-collection scans early",
    ],
    prerequisites: ["None"],
    related_projects: ["Cohort Analytics View"],
  },
  {
    id: "lh-res-gemini-guides",
    learning_path_id: "lh-path-applied-ai",
    title: "Structured Prompting & Function Calling Guides",
    provider: "Google AI for Developers",
    topic: "Artificial Intelligence",
    difficulty: "intermediate",
    estimated_minutes: 165,
    language: "English",
    url: "https://ai.google.dev/gemini-api/docs/structured-output",
    learning_objectives: [
      "Constrain model output to strict JSON schemas",
      "Separate server-side API keys from client bundles",
      "Handle retries and rate limits gracefully",
    ],
    prerequisites: ["REST APIs & JSON"],
    related_projects: ["Syllabus Summarizer API"],
  },
];

const memoryHubState = new Map<string, LearningHubUserState>();

function emptyHubState(): LearningHubUserState {
  return {
    savedIds: ["lh-res-mdn-html"],
    resourceStatuses: { "lh-res-mdn-html": "in_progress" },
    enrolledPathIds: [],
    moduleProgress: {},
  };
}

function getMemoryHubState(userId: string): LearningHubUserState {
  const existing = memoryHubState.get(userId);
  if (existing) return existing;
  const fresh = emptyHubState();
  memoryHubState.set(userId, fresh);
  return fresh;
}

export async function getLearningHubUserState(
  userId?: string | null,
): Promise<LearningHubUserState> {
  if (!userId) {
    return emptyHubState();
  }
  const targetId = userId;
  const db = getAdminFirestore();
  if (db && isFirestoreConfigured()) {
    try {
      const snap = await db
        .collection("users")
        .doc(targetId)
        .collection("private")
        .doc("learning_hub")
        .get();
      if (snap.exists) {
        const data = snap.data() as Partial<LearningHubUserState> | undefined;
        return {
          savedIds: Array.isArray(data?.savedIds) ? data.savedIds : [],
          resourceStatuses:
            data?.resourceStatuses && typeof data.resourceStatuses === "object"
              ? (data.resourceStatuses as Record<string, ResourceProgressStatus>)
              : {},
          enrolledPathIds: Array.isArray(data?.enrolledPathIds) ? data.enrolledPathIds : [],
          moduleProgress:
            data?.moduleProgress && typeof data.moduleProgress === "object"
              ? (data.moduleProgress as Record<string, LearningHubModuleProgress>)
              : {},
        };
      }
      return {
        savedIds: [],
        resourceStatuses: {},
        enrolledPathIds: [],
        moduleProgress: {},
      };
    } catch {
      return getMemoryHubState(targetId);
    }
  }
  return getMemoryHubState(targetId);
}

async function persistLearningHubUserState(
  userId: string,
  nextState: LearningHubUserState,
): Promise<LearningHubUserState> {
  memoryHubState.set(userId, nextState);
  const db = getAdminFirestore();
  if (db && isFirestoreConfigured()) {
    try {
      await db
        .collection("users")
        .doc(userId)
        .collection("private")
        .doc("learning_hub")
        .set(
          {
            ...nextState,
            updatedAt: new Date().toISOString(),
          },
          { merge: true },
        );
    } catch {
      // Keep local state consistent even if Firestore write fails transiently
    }
  }
  return nextState;
}

export async function toggleSavedHubResource(
  userId: string,
  resourceId: string,
): Promise<{ saved: boolean; state: LearningHubUserState }> {
  const current = await getLearningHubUserState(userId);
  const exists = current.savedIds.includes(resourceId);
  const savedIds = exists
    ? current.savedIds.filter((id) => id !== resourceId)
    : [...current.savedIds, resourceId];
  const state = await persistLearningHubUserState(userId, { ...current, savedIds });
  return { saved: !exists, state };
}

export async function updateHubResourceStatus(
  userId: string,
  resourceId: string,
  status: ResourceProgressStatus,
): Promise<LearningHubUserState> {
  const current = await getLearningHubUserState(userId);
  const resourceStatuses = {
    ...current.resourceStatuses,
    [resourceId]: status,
  };
  return persistLearningHubUserState(userId, { ...current, resourceStatuses });
}

export async function enrollInHubPath(
  userId: string,
  pathId: string,
): Promise<LearningHubUserState> {
  const current = await getLearningHubUserState(userId);
  if (current.enrolledPathIds.includes(pathId)) {
    return current;
  }
  return persistLearningHubUserState(userId, {
    ...current,
    enrolledPathIds: [...current.enrolledPathIds, pathId],
  });
}

export async function updateHubModuleStatus(
  userId: string,
  moduleId: string,
  status: ResourceProgressStatus,
): Promise<{ entry: LearningHubModuleProgress; state: LearningHubUserState }> {
  const current = await getLearningHubUserState(userId);
  const entry: LearningHubModuleProgress = {
    module_id: moduleId,
    status,
    completed_at: status === "completed" ? new Date().toISOString() : null,
  };
  const state = await persistLearningHubUserState(userId, {
    ...current,
    moduleProgress: {
      ...current.moduleProgress,
      [moduleId]: entry,
    },
  });
  return { entry, state };
}
