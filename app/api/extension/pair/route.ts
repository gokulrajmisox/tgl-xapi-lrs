import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const PairSchema = z.object({ code: z.string().min(40).max(80), deviceName: z.string().trim().min(1).max(80), consent: z.literal(true) });
const hash = (value: string) => createHash("sha256").update(value).digest("hex");

export async function POST(request: Request) {
  const body = PairSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Invalid pairing request." }, { status: 400 });
  const token = randomBytes(32).toString("base64url");
  const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await client.rpc("redeem_extension_pairing", {
    p_code_hash: hash(body.data.code),
    p_device_name: body.data.deviceName,
    p_token_hash: hash(token),
  });
  if (error || !data) return NextResponse.json({ error: "That code is invalid, expired, or already used. Create a fresh code in TGL." }, { status: 400 });
  return NextResponse.json({ token, deviceId: data }, { headers: { "Cache-Control": "no-store" } });
}
