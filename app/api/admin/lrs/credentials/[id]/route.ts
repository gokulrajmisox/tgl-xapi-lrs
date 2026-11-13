import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { deriveCredential, requireLrsAdmin, serviceClient } from "@/lib/xapi/server";

const RotationSchema = z.object({ name: z.string().trim().min(1).max(120).optional(), expiresAt: z.string().datetime().nullable().optional() });

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { user, error: authError } = await requireLrsAdmin();
  if (authError || !user) return authError!;
  const { id } = await context.params;
  const parsed = RotationSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid credential rotation request." }, { status: 400 });
  const client = serviceClient();
  const { data: old, error } = await client.from("lrs_credentials").select("id,registration_id,credential_name,scopes,revoked_at").eq("id", id).maybeSingle();
  if (error || !old || old.revoked_at) return NextResponse.json({ error: "Credential not found or already revoked." }, { status: 404 });
  const key = randomBytes(18).toString("base64url");
  const secret = randomBytes(32).toString("base64url");
  const salt = randomBytes(16).toString("hex");
  const hash = (await deriveCredential(secret, salt)).toString("hex");
  const { data: replacement, error: insertError } = await client.from("lrs_credentials").insert({
    registration_id: old.registration_id,
    credential_name: parsed.data.name ?? old.credential_name,
    credential_key: key,
    credential_salt: salt,
    credential_hash: hash,
    scopes: old.scopes,
    expires_at: parsed.data.expiresAt ?? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
  }).select("id,registration_id,credential_name,credential_key,scopes,expires_at,created_at").single();
  if (insertError || !replacement) return NextResponse.json({ error: "Credential rotation failed." }, { status: 500 });
  await client.from("lrs_credentials").update({ revoked_at: new Date().toISOString() }).eq("id", old.id);
  await client.from("lrs_audit_logs").insert({ actor_user_id: user.id, registration_id: old.registration_id, action: "credential.rotated", resource_type: "lrs_credential", resource_id: old.id, metadata: { replacementId: replacement.id } });
  return NextResponse.json({ credential: replacement, secret }, { headers: { "Cache-Control": "no-store" } });
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { user, error: authError } = await requireLrsAdmin();
  if (authError || !user) return authError!;
  const { id } = await context.params;
  const client = serviceClient();
  const { data: credential } = await client.from("lrs_credentials").select("id,registration_id,revoked_at").eq("id", id).maybeSingle();
  if (!credential) return NextResponse.json({ error: "Credential not found." }, { status: 404 });
  if (!credential.revoked_at) {
    await client.from("lrs_credentials").update({ revoked_at: new Date().toISOString() }).eq("id", id);
    await client.from("lrs_audit_logs").insert({ actor_user_id: user.id, registration_id: credential.registration_id, action: "credential.revoked", resource_type: "lrs_credential", resource_id: id, metadata: {} });
  }
  return NextResponse.json({ revoked: true }, { headers: { "Cache-Control": "no-store" } });
}
