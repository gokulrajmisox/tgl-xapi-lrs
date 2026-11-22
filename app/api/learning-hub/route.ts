import { NextRequest, NextResponse } from "next/server";
import { DEMO_STUDENT_ID } from "@/lib/firebase/server";
import { resolveCurrentActor } from "@/lib/certifications/store";
import {
  enrollInHubPath,
  getLearningHubUserState,
  toggleSavedHubResource,
  updateHubModuleStatus,
  updateHubResourceStatus,
  type ResourceProgressStatus,
} from "@/lib/learning-hub-data";

function isValidStatus(value: unknown): value is ResourceProgressStatus {
  return value === "not_started" || value === "in_progress" || value === "completed";
}

export async function GET(request: NextRequest) {
  const { user, configured } = await resolveCurrentActor({ request });
  if (configured && !user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  const actorId = user?.id ?? DEMO_STUDENT_ID;
  const state = await getLearningHubUserState(actorId);
  return NextResponse.json({ state }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  const { user, configured } = await resolveCurrentActor({ request });
  if (configured && !user) {
    return NextResponse.json({ error: "Sign in required to save learning hub progress." }, { status: 401 });
  }
  const actorId = user?.id ?? DEMO_STUDENT_ID;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
  }

  const action = typeof body.action === "string" ? body.action : "";

  if (action === "toggle_save") {
    const resourceId = typeof body.resourceId === "string" ? body.resourceId.trim() : "";
    if (!resourceId) {
      return NextResponse.json({ error: "Missing resourceId." }, { status: 400 });
    }
    const result = await toggleSavedHubResource(actorId, resourceId);
    return NextResponse.json({ ok: true, saved: result.saved, state: result.state });
  }

  if (action === "set_resource_status") {
    const resourceId = typeof body.resourceId === "string" ? body.resourceId.trim() : "";
    if (!resourceId || !isValidStatus(body.status)) {
      return NextResponse.json({ error: "Invalid resource status payload." }, { status: 400 });
    }
    const state = await updateHubResourceStatus(actorId, resourceId, body.status);
    return NextResponse.json({ ok: true, status: body.status, state });
  }

  if (action === "join_path") {
    const pathId = typeof body.pathId === "string" ? body.pathId.trim() : "";
    if (!pathId) {
      return NextResponse.json({ error: "Missing pathId." }, { status: 400 });
    }
    const state = await enrollInHubPath(actorId, pathId);
    return NextResponse.json({ ok: true, enrolled: true, state });
  }

  if (action === "set_module_status") {
    const moduleId = typeof body.moduleId === "string" ? body.moduleId.trim() : "";
    if (!moduleId || !isValidStatus(body.status)) {
      return NextResponse.json({ error: "Invalid module status payload." }, { status: 400 });
    }
    const result = await updateHubModuleStatus(actorId, moduleId, body.status);
    return NextResponse.json({ ok: true, entry: result.entry, state: result.state });
  }

  return NextResponse.json({ error: "Unsupported Learning Hub action." }, { status: 400 });
}
