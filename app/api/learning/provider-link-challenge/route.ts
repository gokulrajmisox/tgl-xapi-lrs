import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient as createUserClient } from "@/lib/supabase/server";
import { serviceClient } from "@/lib/xapi/server";

const ChallengeSchema = z.object({ registrationId: z.string().uuid() });

export async function POST(request: Request) {
  const parsed = ChallengeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid provider selection." }, { status: 400 });
  const userClient = await createUserClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const service = serviceClient();
  const { data: allowed, error: rateError } = await service.rpc("consume_lrs_rate_limit", { p_rate_key: `link:${user.id}`, p_max_requests: 10, p_window_seconds: 3600 });
  if (rateError) return NextResponse.json({ error: "Provider-link service is unavailable." }, { status: 503 });
  if (!allowed) return NextResponse.json({ error: "Too many link codes requested. Try again later." }, { status: 429 });
  const { data: registration } = await service.from("lrs_registrations").select("id,name,source_identifier,actor_mapping_policy,enabled").eq("id", parsed.data.registrationId).eq("enabled", true).maybeSingle();
  if (!registration) return NextResponse.json({ error: "Provider registration is not available." }, { status: 404 });
  if (registration.actor_mapping_policy !== "verified-link-only") return NextResponse.json({ error: "This provider uses administrator-reviewed identity mapping rather than one-time linking." }, { status: 409 });
  const code = randomBytes(32).toString("base64url");
  const codeHash = createHash("sha256").update(code).digest("hex");
  const expiresAt = new Date(Date.now() + 5 * 60_000).toISOString();
  const { error } = await service.from("learning_actor_link_challenges").insert({ user_id: user.id, registration_id: registration.id, code_hash: codeHash, expires_at: expiresAt });
  if (error) return NextResponse.json({ error: "Could not create a link code." }, { status: 500 });
  const origin = new URL(request.url).origin;
  return NextResponse.json({ providerName: registration.name, sourceIdentifier: registration.source_identifier, code, expiresAt, extensionIri: `${origin}/api/xapi/extensions/actor-link-challenge` }, { headers: { "Cache-Control": "no-store" } });
}
