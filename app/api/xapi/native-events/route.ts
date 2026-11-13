import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient as createUserClient } from "@/lib/supabase/server";
import { actorHash, prepareStatement } from "@/lib/xapi/validation";
import { secretHmac, serviceClient } from "@/lib/xapi/server";

const NativeEventSchema = z.object({ kind: z.enum(["module", "resource"]), id: z.string().uuid(), status: z.enum(["in_progress", "completed"]) });

async function getNativeRegistration() {
  const client = serviceClient();
  const { data: existing, error } = await client.from("lrs_registrations").select("id,name,provider_type,source_identifier,description,enabled,scopes,allowed_origins,actor_mapping_policy").eq("provider_type", "tgl-native").eq("name", "TGL Native Learning").maybeSingle();
  if (error) throw new Error("Could not read native LRS registration.");
  if (existing) return existing;
  const { data, error: insertError } = await client.from("lrs_registrations").insert({ name: "TGL Native Learning", provider_type: "tgl-native", source_identifier: "urn:touchgrasslater:xapi:native", description: "Server-generated xAPI evidence for authenticated TGL learning actions.", enabled: true, scopes: ["statements.read", "statements.write", "documents.read", "documents.write", "agents.read", "activities.read"], allowed_origins: [], actor_mapping_policy: "verified-link-only" }).select("id,name,provider_type,source_identifier,description,enabled,scopes,allowed_origins,actor_mapping_policy").single();
  if (data) return data;
  if (insertError?.code === "23505") {
    const { data: raced } = await client.from("lrs_registrations").select("id,name,provider_type,source_identifier,description,enabled,scopes,allowed_origins,actor_mapping_policy").eq("provider_type", "tgl-native").eq("name", "TGL Native Learning").maybeSingle();
    if (raced) return raced;
  }
  throw new Error("Could not initialize native xAPI registration.");
}

export async function POST(request: Request) {
  if (Number(request.headers.get("content-length") ?? 0) > 8192) return NextResponse.json({ error: "Event payload is too large." }, { status: 413 });
  const text = await request.text();
  if (Buffer.byteLength(text, "utf8") > 8192) return NextResponse.json({ error: "Event payload is too large." }, { status: 413 });
  let body: unknown;
  try { body = JSON.parse(text); } catch { return NextResponse.json({ error: "Invalid event JSON." }, { status: 400 }); }
  const parsed = NativeEventSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid learning event." }, { status: 400 });
  const userClient = await createUserClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const service = serviceClient();
  const { data: allowed, error: limitError } = await service.rpc("consume_lrs_rate_limit", { p_rate_key: `native:${user.id}`, p_max_requests: 120, p_window_seconds: 60 });
  if (limitError) return NextResponse.json({ error: "Learning record service is unavailable." }, { status: 503 });
  if (!allowed) return NextResponse.json({ error: "Too many learning events. Try again shortly." }, { status: 429 });
  const event = parsed.data;
  if (event.kind === "module") {
    const { data: module } = await userClient.from("learning_modules").select("id,slug,title,learning_path_id").eq("id", event.id).maybeSingle();
    if (!module) return NextResponse.json({ error: "Learning module not found." }, { status: 404 });
    const [{ data: enrollment }, { data: progress }, { data: path }] = await Promise.all([
      userClient.from("student_enrollments").select("id").eq("student_id", user.id).eq("learning_path_id", module.learning_path_id).maybeSingle(),
      userClient.from("lesson_progress").select("status").eq("student_id", user.id).eq("module_id", module.id).maybeSingle(),
      userClient.from("learning_paths").select("slug").eq("id", module.learning_path_id).maybeSingle(),
    ]);
    if (!enrollment || !progress || progress.status !== event.status || !path) return NextResponse.json({ error: "The saved progress does not match an enrolled learning action." }, { status: 409 });
    const origin = new URL(request.url).origin;
    const actor = { objectType: "Agent", account: { homePage: origin, name: `tgl-user:${secretHmac(user.id)}` } };
    const statement = {
      id: randomUUID(), actor,
      verb: { id: event.status === "in_progress" ? "http://adlnet.gov/expapi/verbs/experienced" : "http://adlnet.gov/expapi/verbs/progressed", display: { "en-US": event.status === "in_progress" ? "experienced" : "reported progress on" } },
      object: { id: `${origin}/learning-paths/${path.slug}/modules/${module.slug}`, objectType: "Activity", definition: { name: { "en-US": module.title } } },
      context: { extensions: { [`${origin}/api/xapi/extensions/self-reported`]: { status: event.status, source: "student-action" } } },
      timestamp: new Date().toISOString(),
    };
    const registration = await getNativeRegistration();
    const hash = actorHash(actor);
    const service = serviceClient();
    const { error: mapError } = await service.from("learning_actor_mappings").upsert({ user_id: user.id, actor_hash: hash, actor_json: actor, provider_registration_id: registration.id, verified: true, verification_method: "authenticated TGL account session" }, { onConflict: "provider_registration_id,actor_hash" });
    if (mapError) return NextResponse.json({ error: "Learning activity was saved, but its xAPI record could not be linked." }, { status: 503 });
    const prepared = prepareStatement(statement, { registrationId: registration.id, registrationName: registration.name, sourceIdentifier: registration.source_identifier, baseUrl: origin });
    const { data: storedIds, error: storeError } = await service.rpc("store_lrs_statement_batch", { p_registration_id: registration.id, p_rows: [{
      statement_id: prepared.statementId,
      actor_hash: prepared.actorHash,
      actor_json: prepared.actorJson,
      object_hash: prepared.objectHash,
      direct_agent_hashes: prepared.directAgentHashes,
      related_agent_hashes: prepared.relatedAgentHashes,
      related_activity_ids: prepared.relatedActivityIds,
      verb_id: prepared.verbId,
      object_id: prepared.objectId,
      registration_uuid: prepared.registrationUuid,
      statement_timestamp: prepared.statementTimestamp,
      stored_at: prepared.storedAt,
      statement_version: prepared.statementVersion,
      lrs_timestamp_assigned: prepared.timestampWasAssigned,
      statement_hash: prepared.statementHash,
      statement_json: prepared.statementJson,
    }] });
    if (storeError) return NextResponse.json({ error: "Learning activity was saved, but xAPI storage failed." }, { status: 503 });
    await service.rpc("aggregate_lrs_statement", { p_statement_id: prepared.statementId });
    await service.from("lrs_audit_logs").insert({ actor_user_id: user.id, registration_id: registration.id, action: "native_xapi.statement_created", resource_type: "lrs_statement", resource_id: prepared.statementId, metadata: { kind: event.kind, status: event.status, verification: "self-reported" } });
    return NextResponse.json({ accepted: true, statementId: storedIds?.[0], verification: "self-reported" }, { status: 201, headers: { "Cache-Control": "no-store" } });
  }

  const { data: resource } = await userClient.from("learning_resources").select("id,title,url,is_free,is_published").eq("id", event.id).eq("is_free", true).eq("is_published", true).maybeSingle();
  const { data: progress } = await userClient.from("learning_resource_progress").select("status").eq("student_id", user.id).eq("resource_id", event.id).maybeSingle();
  if (!resource || !progress || progress.status !== event.status) return NextResponse.json({ error: "The saved resource status could not be confirmed." }, { status: 409 });
  const origin = new URL(request.url).origin;
  const actor = { objectType: "Agent", account: { homePage: origin, name: `tgl-user:${secretHmac(user.id)}` } };
  const statement = {
    id: randomUUID(), actor,
    verb: { id: event.status === "in_progress" ? "http://adlnet.gov/expapi/verbs/experienced" : "http://adlnet.gov/expapi/verbs/progressed", display: { "en-US": event.status === "in_progress" ? "experienced" : "reported progress on" } },
    object: { id: resource.url, objectType: "Activity", definition: { name: { "en-US": resource.title } } },
    context: { extensions: { [`${origin}/api/xapi/extensions/self-reported`]: { status: event.status, source: "student-action" } } },
    timestamp: new Date().toISOString(),
  };
  const registration = await getNativeRegistration();
  const hash = actorHash(actor);
  const { error: mapError } = await service.from("learning_actor_mappings").upsert({ user_id: user.id, actor_hash: hash, actor_json: actor, provider_registration_id: registration.id, verified: true, verification_method: "authenticated TGL account session" }, { onConflict: "provider_registration_id,actor_hash" });
  if (mapError) return NextResponse.json({ error: "Resource progress was saved, but its xAPI record could not be linked." }, { status: 503 });
  const prepared = prepareStatement(statement, { registrationId: registration.id, registrationName: registration.name, sourceIdentifier: registration.source_identifier, baseUrl: origin });
  const { data: storedIds, error: storeError } = await service.rpc("store_lrs_statement_batch", { p_registration_id: registration.id, p_rows: [{
    statement_id: prepared.statementId, actor_hash: prepared.actorHash, actor_json: prepared.actorJson, object_hash: prepared.objectHash,
    direct_agent_hashes: prepared.directAgentHashes, related_agent_hashes: prepared.relatedAgentHashes, related_activity_ids: prepared.relatedActivityIds, verb_id: prepared.verbId, object_id: prepared.objectId,
    registration_uuid: prepared.registrationUuid, statement_timestamp: prepared.statementTimestamp, stored_at: prepared.storedAt,
    statement_version: prepared.statementVersion, lrs_timestamp_assigned: prepared.timestampWasAssigned, statement_hash: prepared.statementHash, statement_json: prepared.statementJson,
  }] });
  if (storeError) return NextResponse.json({ error: "Resource progress was saved, but xAPI storage failed." }, { status: 503 });
  await service.rpc("aggregate_lrs_statement", { p_statement_id: prepared.statementId });
  await service.from("lrs_audit_logs").insert({ actor_user_id: user.id, registration_id: registration.id, action: "native_xapi.statement_created", resource_type: "lrs_statement", resource_id: prepared.statementId, metadata: { kind: event.kind, status: event.status, verification: "self-reported" } });
  return NextResponse.json({ accepted: true, statementId: storedIds?.[0], verification: "self-reported" }, { status: 201, headers: { "Cache-Control": "no-store" } });
}
