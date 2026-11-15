import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { serviceClient } from "@/lib/supabase/service";
import {
  isSupabaseConfigured,
  resolveCurrentActor,
  updateSandboxDisplayName,
} from "@/lib/certifications/store";

const ProfileSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name.").max(120),
});

export async function GET() {
  const actor = await resolveCurrentActor();
  if (actor.configured && !actor.user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  return NextResponse.json(
    { user: actor.user, isSandbox: !actor.configured },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function PUT(request: Request) {
  const parsed = ProfileSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Enter your full name." },
      { status: 400 },
    );
  }

  if (!isSupabaseConfigured()) {
    const actor = await resolveCurrentActor();
    if (!actor.user) {
      return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    }
    const updated = updateSandboxDisplayName(actor.user.id, parsed.data.fullName);
    return NextResponse.json(
      { fullName: updated, user: { ...actor.user, name: updated } },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const { data, error } = await supabase.auth.updateUser({
    data: { ...user.user_metadata, display_name: parsed.data.fullName },
  });
  if (error || !data.user) {
    return NextResponse.json(
      { error: error?.message ?? "Could not save your name." },
      { status: 400 },
    );
  }

  try {
    await serviceClient().from("student_profiles").upsert(
      {
        id: user.id,
        email: (user.email ?? "").toLowerCase(),
        full_name: parsed.data.fullName,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );
  } catch {
    // Non-fatal if student_profiles table has not been migrated yet.
  }

  return NextResponse.json(
    { fullName: parsed.data.fullName },
    { headers: { "Cache-Control": "no-store" } },
  );
}
