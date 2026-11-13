import { NextResponse } from "next/server";
import { z } from "zod";
import { actorHash, validateStatement } from "@/lib/xapi/validation";
import { requireLrsAdmin, serviceClient } from "@/lib/xapi/server";

const MappingSchema = z.object({ registrationId: z.string().uuid(), userId: z.string().uuid(), actor: z.record(z.string(), z.unknown()), verificationMethod: z.string().trim().min(8).max(500) });

export async function GET() {
  const { user, error: authError } = await requireLrsAdmin();
  if (authError || !user) return authError!;
  const { data, error } = await serviceClient().from("lrs_unmatched_statements")
    .select("id,registration_id,statement_id,actor_hash,actor_json,review_status,created_at")
    .eq("review_status", "unmatched").order("created_at", { ascending: true }).limit(200);
  if (error) return NextResponse.json({ error: "Could not load unmatched statement queue." }, { status: 500 });
  return NextResponse.json({ unmatched: data ?? [] }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const { user, error: authError } = await requireLrsAdmin();
  if (authError || !user) return authError!;
  const parsed = MappingSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid actor mapping request." }, { status: 400 });
  try { validateStatement({ actor: parsed.data.actor, verb: { id: "https://example.invalid/verb" }, object: { id: "https://example.invalid/activity" } }); }
  catch { return NextResponse.json({ error: "Actor is not a valid xAPI Agent or Group." }, { status: 400 }); }
  const hash = actorHash(parsed.data.actor);
  const client = serviceClient();
  const { data: existing, error: lookupError } = await client.from("learning_actor_mappings").select("id,user_id").eq("provider_registration_id", parsed.data.registrationId).eq("actor_hash", hash).maybeSingle();
  if (lookupError) return NextResponse.json({ error: "Could not verify current actor mapping." }, { status: 500 });
  if (existing && existing.user_id !== parsed.data.userId) return NextResponse.json({ error: "This actor is already linked to another student." }, { status: 409 });
  const { data: existingConnection } = await client.from("learning_provider_connections").select("user_id").eq("registration_id", parsed.data.registrationId).eq("external_identity_hash", hash).maybeSingle();
  if (existingConnection && existingConnection.user_id !== parsed.data.userId) return NextResponse.json({ error: "This provider identity is already connected to another student." }, { status: 409 });
  const { data: registration } = await client.from("lrs_registrations").select("id,name").eq("id", parsed.data.registrationId).maybeSingle();
  if (!registration) return NextResponse.json({ error: "Provider registration not found." }, { status: 404 });
  const { error } = await client.from("learning_actor_mappings").upsert({
    user_id: parsed.data.userId,
    actor_hash: hash,
    actor_json: parsed.data.actor,
    provider_registration_id: parsed.data.registrationId,
    verified: true,
    verification_method: parsed.data.verificationMethod,
  }, { onConflict: "provider_registration_id,actor_hash" });
  if (error) return NextResponse.json({ error: "Actor mapping could not be saved." }, { status: 500 });
  const { error: connectionError } = await client.from("learning_provider_connections").upsert({
    user_id: parsed.data.userId,
    registration_id: registration.id,
    provider_name: registration.name,
    external_identity_hash: hash,
    external_identity_json: parsed.data.actor,
    status: "connected",
    verified_at: new Date().toISOString(),
    disconnected_at: null,
  }, { onConflict: "registration_id,external_identity_hash" });
  if (connectionError) return NextResponse.json({ error: "Actor was mapped, but provider connection state could not be updated." }, { status: 500 });
  const { data: pendingStatements } = await client.from("lrs_unmatched_statements").select("statement_id").eq("registration_id", registration.id).eq("actor_hash", hash).eq("review_status", "unmatched").limit(1000);
  await Promise.all((pendingStatements ?? []).map((item) => client.rpc("aggregate_lrs_statement", { p_statement_id: item.statement_id })));
  await client.from("lrs_unmatched_statements").update({ review_status: "mapped", resolved_at: new Date().toISOString() }).eq("registration_id", registration.id).eq("actor_hash", hash).eq("review_status", "unmatched");
  await client.from("lrs_audit_logs").insert({ actor_user_id: user.id, registration_id: registration.id, action: "actor.verified", resource_type: "actor_mapping", resource_id: hash, metadata: { userId: parsed.data.userId, verificationMethod: parsed.data.verificationMethod } });
  return NextResponse.json({ mapped: true, replayedStatements: (pendingStatements ?? []).length }, { status: 201, headers: { "Cache-Control": "no-store" } });
}
