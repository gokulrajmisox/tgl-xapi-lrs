import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("approved_learning_domains").select("domain,provider").eq("is_enabled", true).order("provider");
  if (error) return NextResponse.json({ domains: [] }, { status: 503, headers: { "Cache-Control": "no-store" } });
  return NextResponse.json({ domains: data ?? [] }, { headers: { "Cache-Control": "public, max-age=300" } });
}
