import { NextResponse } from "next/server";
import { createClient as createUserClient } from "@/lib/supabase/server";
import { serviceClient } from "@/lib/xapi/server";

export async function GET() {
  const supabase = await createUserClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  const { data, error } = await serviceClient().from("lrs_registrations").select("id,name,provider_type,source_identifier,description,actor_mapping_policy").eq("enabled", true).neq("provider_type", "tgl-native").order("name");
  if (error) return NextResponse.json({ error: "Could not load providers." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  return NextResponse.json({ providers: data ?? [] }, { headers: { "Cache-Control": "private, no-store" } });
}
