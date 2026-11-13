import { NextResponse } from "next/server";
import { z } from "zod";
import { requireLrsAdmin, serviceClient } from "@/lib/xapi/server";

const MappingSchema = z.object({ activityIri: z.string().url().max(2048), learningPathId: z.string().uuid(), moduleId: z.string().uuid().nullable().optional(), isRequired: z.boolean().default(true) });

export async function GET() {
  const { user, error: authError } = await requireLrsAdmin();
  if (authError || !user) return authError!;
  const { data, error } = await serviceClient().from("lrs_activity_mappings").select("id,activity_iri,learning_path_id,module_id,is_required,created_at").order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: "Could not load activity mappings." }, { status: 500 });
  return NextResponse.json({ mappings: data ?? [] }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const { user, error: authError } = await requireLrsAdmin();
  if (authError || !user) return authError!;
  const parsed = MappingSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid activity mapping." }, { status: 400 });
  const input = parsed.data;
  const client = serviceClient();
  const { data: path } = await client.from("learning_paths").select("id").eq("id", input.learningPathId).maybeSingle();
  if (!path) return NextResponse.json({ error: "Learning path not found." }, { status: 404 });
  if (input.moduleId) {
    const { data: module } = await client.from("learning_modules").select("id,learning_path_id").eq("id", input.moduleId).maybeSingle();
    if (!module || module.learning_path_id !== input.learningPathId) return NextResponse.json({ error: "Module must belong to the selected pathway." }, { status: 400 });
  }
  const { data: mapping, error } = await client.from("lrs_activity_mappings").upsert({ activity_iri: input.activityIri, learning_path_id: input.learningPathId, module_id: input.moduleId ?? null, is_required: input.isRequired }, { onConflict: "activity_iri" }).select("id,activity_iri,learning_path_id,module_id,is_required,created_at").single();
  if (error || !mapping) return NextResponse.json({ error: "Could not save activity mapping." }, { status: 500 });
  const { data: statementRows } = await client.from("lrs_statements").select("statement_id").eq("object_id", input.activityIri).eq("is_voided", false).limit(1000);
  const aggregated = await Promise.all((statementRows ?? []).map((row) => client.rpc("aggregate_lrs_statement", { p_statement_id: row.statement_id })));
  await client.from("lrs_audit_logs").insert({ actor_user_id: user.id, action: "activity.mapped", resource_type: "lrs_activity_mapping", resource_id: mapping.id, metadata: { activityIri: input.activityIri, learningPathId: input.learningPathId, moduleId: input.moduleId ?? null } });
  return NextResponse.json({ mapping, replayedStatements: aggregated.length, aggregationErrors: aggregated.filter((item) => item.error).length }, { status: 201, headers: { "Cache-Control": "no-store" } });
}
