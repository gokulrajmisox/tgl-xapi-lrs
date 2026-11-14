import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const ProfileSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name.").max(120),
});

export async function PUT(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const parsed = ProfileSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Enter your full name." },
      { status: 400 },
    );
  }
  const { data, error } = await supabase.auth.updateUser({
    data: { ...user.user_metadata, display_name: parsed.data.fullName },
  });
  if (error || !data.user) {
    return NextResponse.json({ error: error?.message ?? "Could not save your name." }, { status: 400 });
  }
  return NextResponse.json(
    { fullName: parsed.data.fullName },
    { headers: { "Cache-Control": "no-store" } },
  );
}
