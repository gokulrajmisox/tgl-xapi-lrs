import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { deriveCredential, requireLrsAdmin, serviceClient } from "@/lib/xapi/server";

const SCOPES = ["statements.read", "statements.write", "statements.void", "documents.read", "documents.write", "agents.read", "activities.read"] as const;
const RegistrationSchema = z.object({
  name: z.string().trim().min(1).max(120),
  providerType: z.string().trim().min(1).max(80),
  sourceIdentifier: z.string().trim().min(1).max(256).regex(/^[a-z][a-z0-9+.-]*:[^ ]+$/i),
  actorMappingPolicy: z.enum(["manual", "verified-link-only"]).default("manual"),
  description: z.string().trim().max(2000).default(""),
  enabled: z.boolean().default(false),
  allowedOrigins: z.array(z.string().url()).max(20).default([]),
  scopes: z.array(z.enum(SCOPES)).min(1),
  credentialName: z.string().trim().min(1).max(120).default("Initial credential"),
  credentialScopes: z.array(z.enum(SCOPES)).min(1),
  expiresAt: z.string().datetime().nullable().optional(),
});

export async function GET() {
  const { user, error: authError } = await requireLrsAdmin();
  if (authError || !user) return authError!;
  const client = serviceClient();
  const [{ data: registrations, error }, { data: credentials }] = await Promise.all([
    client.from("lrs_registrations").select("id,name,provider_type,source_identifier,description,enabled,scopes,allowed_origins,actor_mapping_policy,created_at,updated_at,last_used_at").neq("provider_type", "tgl-native").order("created_at", { ascending: false }),
    client.from("lrs_credentials").select("id,registration_id,credential_name,credential_key,scopes,expires_at,revoked_at,created_at,last_used_at").order("created_at", { ascending: false }),
  ]);
  if (error) return NextResponse.json({ error: "Could not load provider registrations." }, { status: 500 });
  return NextResponse.json({ registrations: (registrations ?? []).map((registration) => ({ ...registration, credentials: (credentials ?? []).filter((credential) => credential.registration_id === registration.id) })) }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const { user, error: authError } = await requireLrsAdmin();
  if (authError || !user) return authError!;
  const parsed = RegistrationSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid provider registration." }, { status: 400 });
  const input = parsed.data;
  if (input.credentialScopes.some((scope) => !input.scopes.includes(scope))) return NextResponse.json({ error: "Credential scopes must be a subset of registration scopes." }, { status: 400 });
  const allowedOrigins: string[] = [];
  for (const raw of input.allowedOrigins) {
    const origin = new URL(raw);
    if (origin.protocol !== "https:" && origin.hostname !== "localhost" && origin.hostname !== "127.0.0.1") return NextResponse.json({ error: "Provider origins must use HTTPS except localhost development." }, { status: 400 });
    if (origin.origin !== raw.replace(/\/$/, "")) return NextResponse.json({ error: "Allowed origins must not include paths or credentials." }, { status: 400 });
    allowedOrigins.push(origin.origin);
  }

  const client = serviceClient();
  const { data: registration, error } = await client.from("lrs_registrations").insert({
    name: input.name,
    provider_type: input.providerType,
    source_identifier: input.sourceIdentifier,
    description: input.description,
    enabled: input.enabled,
    scopes: input.scopes,
    allowed_origins: [...new Set(allowedOrigins)],
    actor_mapping_policy: input.actorMappingPolicy,
  }).select("id,name,provider_type,source_identifier,enabled,scopes,allowed_origins,created_at").single();
  if (error || !registration) return NextResponse.json({ error: "Could not create provider registration." }, { status: 500 });

  const credentialKey = randomBytes(18).toString("base64url");
  const secret = randomBytes(32).toString("base64url");
  const salt = randomBytes(16).toString("hex");
  const hash = (await deriveCredential(secret, salt)).toString("hex");
  const { data: credential, error: credentialError } = await client.from("lrs_credentials").insert({
    registration_id: registration.id,
    credential_name: input.credentialName,
    credential_key: credentialKey,
    credential_salt: salt,
    credential_hash: hash,
    scopes: input.credentialScopes,
    expires_at: input.expiresAt ?? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
  }).select("id,credential_name,credential_key,scopes,expires_at,created_at").single();
  if (credentialError || !credential) {
    await client.from("lrs_registrations").delete().eq("id", registration.id);
    return NextResponse.json({ error: "Could not issue provider credentials." }, { status: 500 });
  }
  await client.from("lrs_audit_logs").insert({ actor_user_id: user.id, registration_id: registration.id, action: "provider.created", resource_type: "lrs_registration", resource_id: registration.id, metadata: { scopes: input.scopes } });
  return NextResponse.json({ registration, credential, secret, endpoint: `${new URL(request.url).origin}/api/xapi/` }, { status: 201, headers: { "Cache-Control": "no-store" } });
}
