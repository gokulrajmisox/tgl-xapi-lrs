import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient as createUserClient } from "@/lib/supabase/server";
import { serviceClient } from "@/lib/xapi/server";
import { AdminLrsPanel } from "@/components/admin-lrs-panel";
import { ActivityMappingAdmin } from "@/components/activity-mapping-admin";

export const metadata = { title: "LRS administration — TGL", description: "Manage xAPI provider registrations, credentials, and unmatched actor review." };

export default async function LrsAdminPage() {
  const supabase = await createUserClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?next=/admin/lrs");
  if (user.app_metadata?.role !== "admin") return <main className="flex min-h-screen items-center justify-center bg-[#090909] px-6 text-[#f4f3ef]"><section className="max-w-lg rounded-2xl border border-white/10 bg-white/[0.025] p-8"><p className="text-[10px] uppercase tracking-[0.18em] text-white/40">TGL / LRS</p><h1 className="mt-4 text-3xl font-medium tracking-[-0.06em]">Administrator claim required.</h1><p className="mt-4 text-sm leading-6 text-white/50">This user is not an LRS administrator. An existing trusted project operator must set the server-managed Supabase app metadata claim <code className="text-[#cbbde0]">role=admin</code>. User-editable metadata and self-service promotion are intentionally not accepted.</p><Link href="/" className="mt-6 inline-flex text-xs text-white/70 underline underline-offset-4">Return to TGL</Link></section></main>;

  const client = serviceClient();
  const [{ data: registrations }, { data: credentials }, { data: unmatched }, { data: paths }, { data: modules }, { data: activityMappings }] = await Promise.all([
    client.from("lrs_registrations").select("id,name,provider_type,source_identifier,description,enabled,scopes,allowed_origins,actor_mapping_policy,created_at,last_used_at").neq("provider_type", "tgl-native").order("created_at", { ascending: false }),
    client.from("lrs_credentials").select("id,registration_id,credential_name,credential_key,scopes,expires_at,revoked_at,created_at,last_used_at").order("created_at", { ascending: false }),
    client.from("lrs_unmatched_statements").select("id,registration_id,statement_id,actor_hash,actor_json,review_status,created_at").eq("review_status", "unmatched").order("created_at", { ascending: true }).limit(200),
    client.from("learning_paths").select("id,title").order("sort_order"),
    client.from("learning_modules").select("id,learning_path_id,title").order("sort_order"),
    client.from("lrs_activity_mappings").select("id,activity_iri,learning_path_id,module_id,is_required").order("created_at", { ascending: false }),
  ]);
  const requestHeaders = await headers();
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "https";
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const endpoint = `${protocol}://${host}/api/xapi/`;
  const providers = (registrations ?? []).map((registration) => ({ ...registration, credentials: (credentials ?? []).filter((credential) => credential.registration_id === registration.id) }));

  return <main className="min-h-screen bg-[#090909]"><AdminLrsPanel initialRegistrations={providers} initialUnmatched={unmatched ?? []} endpoint={endpoint} /><div className="mx-auto max-w-[1180px] px-6 pb-20 md:px-12"><ActivityMappingAdmin paths={paths ?? []} modules={modules ?? []} initialMappings={activityMappings ?? []}/></div></main>;
}
