import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const TickSchema = z.object({
  eventId: z.string().uuid(),
  resourceUrl: z.string().url().max(2048),
  startedAt: z.string().datetime(),
  endedAt: z.string().datetime(),
  activeSeconds: z.number().int().min(15).max(60),
});
const hash = (value: string) => createHash("sha256").update(value).digest("hex");
const serviceClient = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });

export async function POST(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token || token.length < 40) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = TickSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid activity event" }, { status: 400 });

  const item = parsed.data;
  const resource = new URL(item.resourceUrl);
  const endMs = Date.parse(item.endedAt);
  const startMs = Date.parse(item.startedAt);
  const elapsed = Math.floor((endMs - startMs) / 1000);
  if (resource.protocol !== "https:" || elapsed < 15 || elapsed > 60 || Math.abs(Date.now() - endMs) > 120_000 || item.activeSeconds > elapsed) {
    return NextResponse.json({ error: "Activity interval is outside the accepted range" }, { status: 400 });
  }

  const supabase = serviceClient();
  const { data: device } = await supabase.from("browser_extension_devices").select("id,student_id").eq("token_hash", hash(token)).is("revoked_at", null).maybeSingle();
  if (!device) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: domains } = await supabase.from("approved_learning_domains").select("domain").eq("is_enabled", true);
  const hostname = resource.hostname.toLowerCase();
  const approved = (domains ?? []).some(({ domain }) => hostname === domain || hostname.endsWith(`.${domain}`));
  if (!approved) return NextResponse.json({ error: "This learning domain is not approved for activity tracking." }, { status: 403 });

  const safeUrl = `${resource.origin}${resource.pathname}`;
  const session = {
    id: item.eventId,
    student_id: device.student_id,
    source: "browser_extension",
    resource_url: safeUrl,
    started_at: item.startedAt,
    ended_at: item.endedAt,
    active_seconds: item.activeSeconds,
  };
  const { error: sessionError } = await supabase.from("learning_sessions").insert(session);
  if (sessionError && sessionError.code !== "23505") return NextResponse.json({ error: "Could not record this activity." }, { status: 500 });

  const { error: eventError } = await supabase.from("learning_activity_events").upsert({
    student_id: device.student_id,
    session_id: item.eventId,
    source: "browser_extension",
    source_event_id: item.eventId,
    event_type: "active_time_recorded",
    occurred_at: item.endedAt,
    details: { domain: hostname, pathname: resource.pathname },
  }, { onConflict: "source,source_event_id", ignoreDuplicates: true });
  if (eventError) return NextResponse.json({ error: "Could not record this activity." }, { status: 500 });
  await supabase.from("browser_extension_devices").update({ last_seen_at: new Date().toISOString() }).eq("id", device.id);
  return NextResponse.json({ accepted: true });
}
