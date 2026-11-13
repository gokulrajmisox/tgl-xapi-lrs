import { NextResponse } from "next/server";
import { z } from "zod";
import { resolveCurrentActor } from "@/lib/certifications/store";
import {
  getLearnerSnapshot,
  postMentorMessage,
  setLearnerNodeState,
  startLearnerProjectWork,
  submitLearnerProjectWork,
  toggleLearnerSavedItem,
} from "@/lib/learning-workspace-store";

const ActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("toggle_node"),
    nodeId: z.string().min(1).max(120),
    state: z.enum(["not_started", "active", "completed"]),
  }),
  z.object({
    action: z.literal("toggle_save"),
    itemKey: z.string().min(1).max(160),
  }),
  z.object({
    action: z.literal("start_project"),
    projectSlug: z.string().min(1).max(120),
  }),
  z.object({
    action: z.literal("submit_project"),
    projectSlug: z.string().min(1).max(120),
    githubUrl: z.string().url("Provide a valid GitHub repository URL").optional(),
    artifactUrl: z.string().url("Provide a valid repository URL").optional(),
    deploymentUrl: z
      .string()
      .trim()
      .url("Provide a valid live deployment URL")
      .optional()
      .or(z.literal("")),
    supportingEvidence: z.string().trim().max(1200).optional().default(""),
    summary: z.string().trim().min(10, "Include a brief summary of what you built").max(1200),
    reflection: z.string().trim().max(1200).default(""),
  }),
  z.object({
    action: z.literal("ask_mentor"),
    projectSlug: z.string().nullable().optional(),
    nodeId: z.string().nullable().optional(),
    topic: z.string().trim().min(3).max(160),
    body: z.string().trim().min(5, "Write a clear question for your mentor").max(1500),
  }),
]);

export async function GET() {
  const { user, configured } = await resolveCurrentActor();
  if (configured && !user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  const actor = user ?? {
    id: "00000000-0000-4000-8000-000000000101",
    name: "Aarav Sharma",
    email: "aarav.sharma@example.edu",
    role: "student" as const,
    isSandbox: true,
  };

  return NextResponse.json({
    user: actor,
    workspace: getLearnerSnapshot(actor.id),
  });
}

export async function POST(request: Request) {
  const { user, configured } = await resolveCurrentActor();
  if (configured && !user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  const actor = user ?? {
    id: "00000000-0000-4000-8000-000000000101",
    name: "Aarav Sharma",
    email: "aarav.sharma@example.edu",
    role: "student" as const,
    isSandbox: true,
  };

  const parsed = ActionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid workspace action." },
      { status: 400 },
    );
  }

  const input = parsed.data;
  if (input.action === "toggle_node") {
    const workspace = setLearnerNodeState({
      userId: actor.id,
      nodeId: input.nodeId,
      state: input.state,
    });
    return NextResponse.json({ workspace });
  }

  if (input.action === "toggle_save") {
    const savedItems = toggleLearnerSavedItem({
      userId: actor.id,
      itemKey: input.itemKey,
    });
    return NextResponse.json({ savedItems, workspace: getLearnerSnapshot(actor.id) });
  }

  if (input.action === "start_project") {
    const result = startLearnerProjectWork({
      userId: actor.id,
      learnerName: actor.name,
      learnerEmail: actor.email,
      projectSlug: input.projectSlug,
    });
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }
    return NextResponse.json({
      submission: result.submission,
      workspace: getLearnerSnapshot(actor.id),
    });
  }

  if (input.action === "submit_project") {
    const githubUrl = input.githubUrl || input.artifactUrl;
    if (!githubUrl) {
      return NextResponse.json(
        { error: "Provide a valid GitHub repository URL." },
        { status: 400 },
      );
    }
    const result = submitLearnerProjectWork({
      userId: actor.id,
      learnerName: actor.name,
      learnerEmail: actor.email,
      projectSlug: input.projectSlug,
      githubUrl,
      deploymentUrl: input.deploymentUrl || null,
      supportingEvidence: input.supportingEvidence || null,
      artifactUrl: githubUrl,
      summary: input.summary,
      reflection: input.reflection,
    });
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }
    return NextResponse.json({
      submission: result.submission,
      workspace: getLearnerSnapshot(actor.id),
    });
  }

  const message = postMentorMessage({
    userId: actor.id,
    learnerName: actor.name,
    projectSlug: input.projectSlug ?? null,
    nodeId: input.nodeId ?? null,
    topic: input.topic,
    authorRole: "student",
    authorName: actor.name,
    body: input.body,
  });

  return NextResponse.json({
    message,
    workspace: getLearnerSnapshot(actor.id),
  });
}
