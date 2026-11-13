import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to connect the companion." }, { status: 401 });

  const code = randomBytes(32).toString("base64url");
  const codeHash = createHash("sha256").update(code).digest("hex");
  const expiresAt = new Date(Date.now() + 5 * 60_000).toISOString();
  const { error } = await supabase.from("extension_pairing_codes").insert({ student_id: user.id, code_hash: codeHash, expires_at: expiresAt });
  if (error) return NextResponse.json({ error: "Could not create a connection code. Try again." }, { status: 500 });
  return NextResponse.json({ code, expiresAt }, { headers: { "Cache-Control": "no-store" } });
}
