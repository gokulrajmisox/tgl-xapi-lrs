import { NextResponse } from "next/server";
import { z } from "zod";
import { requireLrsAdmin, serviceClient } from "@/lib/xapi/server";

const SCOPES = ["statements.read", "statements.write", "statements.void", "documents.read", "documents.write", "agents.read", "activities.read"] as const;
const UpdateSchema = z.object({ name: z.string().trim().min(1).max(120).optional(), providerType: z.string().trim().min(1).max(80).optional(), sourceIdentifier: z.string().trim().min(1).max(256).regex(/^[a-z][a-z0-9+.-]*:[^ ]+$/i).optional(), description: z.string().trim().max(2000).optional(), enabled: z.boolean().optional(), allowedOrigins: z.array(z.string().url()).max(20).optional(), scopes: z.array(z.enum(SCOPES)).min(1).optional(), actorMappingPolicy: z.enum(["manual", "verified-link-only"]).optional() });

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { user, error: authError } = await requireLrsAdmin();
  if (authError || !user) return authError!;
  const { id } = await context.params;
  const parsed = UpdateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid registration update." }, { status: 400 });
  const input = parsed.data;
  const updates: Record<string, unknown> = {};
  if (input.name !== undefined) updates.name = input.name;
  if (input.providerType !== undefined) updates.provider_type = input.providerType;
  if (input.sourceIdentifier !== undefined) updates.source_identifier = input.sourceIdentifier;
  if (input.description !== undefined) updates.description = input.description;
  if (input.enabled !== undefined) updates.enabled = input.enabled;
  if (input.scopes !== undefined) updates.scopes = input.scopes;
  if (input.actorMappingPolicy !== undefined) updates.actor_mapping_policy = input.actorMappingPolicy;
  if (input.allowedOrigins !== undefined) {
    const origins: string[] = [];
    for (const raw of input.allowedOrigins) {
      const origin = new URL(raw);
      if (origin.protocol !== "https:" && origin.hostname !== "localhost" && origin.hostname !== "127.0.0.1") return NextResponse.json({ error: "Provider origins must use HTTPS except localhost development." }, { status: 400 });
      if (origin.origin !== raw.replace(/\/$/, "")) return NextResponse.json({ error: "Allowed origins must not include paths or credentials." }, { status: 400 });
      origins.push(origin.origin);
    }
    updates.allowed_origins = [...new Set(origins)];
  }
  updates.updated_at = new Date().toISOString();
  const client = serviceClient();
  const { data, error } = await client.from("lrs_registrations").update(updates).eq("id", id).select("id,name,provider_type,source_identifier,description,enabled,scopes,allowed_origins,actor_mapping_policy,updated_at").maybeSingle();
  if (error) return NextResponse.json({ error: "Could not update provider registration." }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Provider registration not found." }, { status: 404 });
  await client.from("lrs_audit_logs").insert({ actor_user_id: user.id, registration_id: id, action: input.enabled === false ? "provider.disabled" : "provider.updated", resource_type: "lrs_registration", resource_id: id, metadata: { changedFields: Object.keys(input) } });
  return NextResponse.json({ registration: data }, { headers: { "Cache-Control": "no-store" } });
}
