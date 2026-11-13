import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowUpRight, BookOpen, Clock3, Layers3 } from "lucide-react";
import { Header } from "@/components/header";
import { createClient } from "@/lib/supabase/server";
import { serviceClient } from "@/lib/xapi/server";
import { CompanionControls } from "@/components/companion-controls";
import { SignOutButton } from "@/components/sign-out-button";
import { LearningActivityChart } from "@/components/learning-activity-chart";
import { ConnectedLearningPanel } from "@/components/connected-learning-panel";
import { StudentCertificationsPanel } from "@/components/student-certifications-panel";
import { isSupabaseConfigured, resolveCurrentActor } from "@/lib/certifications/store";

export const metadata = { title: "My learning — TGL", description: "Your learning paths, self-reported progress, certifications, and saved resources." };

export default async function LearningDashboardPage() {
  const configured = isSupabaseConfigured();
  const supabase = await createClient();
  const { data: { user: supabaseUser } } = await supabase.auth.getUser();
  if (configured && !supabaseUser) redirect("/auth/login?next=/dashboard/learning");

  const actorResult = await resolveCurrentActor();
  const user = supabaseUser ?? (actorResult.user ? { id: actorResult.user.id, user_metadata: { display_name: actorResult.user.name } } : null);
  if (!user) redirect("/auth/login?next=/dashboard/learning");

  const { data: availableProviders } = await serviceClient().from("lrs_registrations").select("id,name,provider_type,source_identifier,description,actor_mapping_policy").eq("enabled", true).neq("provider_type", "tgl-native").order("name");
  const activityStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const [{ data: enrollments }, { data: allProgress }, { data: sessions }, { data: saved }, { data: devices }, { data: resourceProgress }, { data: providerConnections }, { data: providerEvidence }, { data: xapiProgress }] = await Promise.all([
    supabase.from("student_enrollments").select("learning_path_id,enrolled_at").eq("student_id", user.id).order("enrolled_at", { ascending: false }),
    supabase.from("lesson_progress").select("module_id,status,completed_at").eq("student_id", user.id),
    supabase.from("learning_sessions").select("active_seconds,started_at,source").eq("student_id", user.id).gte("started_at", activityStart).order("started_at", { ascending: false }),
    supabase.from("saved_resources").select("resource_id").eq("student_id", user.id),
    supabase.from("browser_extension_devices").select("id,device_name,last_seen_at,consented_at,revoked_at").eq("student_id", user.id).order("created_at", { ascending: false }),
    supabase.from("learning_resource_progress").select("id").eq("student_id", user.id),
    supabase.from("learning_provider_connections").select("id,registration_id,provider_name,status,verified_at,created_at").eq("user_id", user.id).order("created_at", { ascending: false }),
    supabase.from("learning_evidence").select("id,statement_id,evidence_type,source_provider,verification_status,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(30),
    supabase.from("learning_progress").select("id,activity_iri,learning_path_id,provider_registration_id,completed_at,progress_percentage,success,score,completion,last_activity_at,evidence_count,verification_status").eq("user_id", user.id).order("updated_at", { ascending: false }).limit(20),
  ]);
  const xapiActivityIds = [...new Set((xapiProgress ?? []).map((item) => item.activity_iri))];
  const { data: requiredActivityMappings } = xapiActivityIds.length ? await serviceClient().from("lrs_activity_mappings").select("activity_iri,learning_path_id").eq("is_required", true).in("activity_iri", xapiActivityIds) : { data: [] };
  const xapiPathIds = [...new Set((requiredActivityMappings ?? []).map((item) => item.learning_path_id))];
  const [{ data: xapiPaths }] = xapiPathIds.length ? await Promise.all([supabase.from("learning_paths").select("id,title").in("id", xapiPathIds)]) : [{ data: [] }];
  const progressByActivity = new Map((xapiProgress ?? []).map((item) => [item.activity_iri, item]));
  const mappedPathProgress = (xapiPaths ?? []).map((path) => {
    const required = (requiredActivityMappings ?? []).filter((mapping) => mapping.learning_path_id === path.id);
    const completedCount = required.filter((mapping) => progressByActivity.get(mapping.activity_iri)?.completion === true).length;
    return { pathId: path.id, pathTitle: path.title, requiredCount: required.length, completedCount, percent: required.length ? Math.round(completedCount / required.length * 100) : 0 };
  });
  const pathIds = (enrollments ?? []).map((item) => item.learning_path_id);
  const [{ data: paths }, { data: modules }] = pathIds.length ? await Promise.all([
    supabase.from("learning_paths").select("id,slug,title,description,category").in("id", pathIds),
    supabase.from("learning_modules").select("id,learning_path_id,title,sort_order").in("learning_path_id", pathIds).order("sort_order"),
  ]) : [{ data: [] }, { data: [] }];
  const completed = (allProgress ?? []).filter((item) => item.status === "completed").length;
  const activeMinutes = Math.floor((sessions ?? []).reduce((total, session) => total + session.active_seconds, 0) / 60);
  const savedIds = (saved ?? []).map((item) => item.resource_id);
  const progressById = new Map((allProgress ?? []).map((item) => [item.module_id, item]));
  const displayName = typeof user.user_metadata?.display_name === "string" ? user.user_metadata.display_name : "learner";

  return <main className="min-h-screen bg-[#090909] text-[#f4f3ef]"><Header /><section className="px-6 pb-24 pt-36 md:px-12 md:pb-32 md:pt-48 lg:px-20"><div className="mx-auto max-w-[1200px]"><div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end"><div><p className="text-[10px] uppercase tracking-[0.2em] text-white/40">Your learning / student workspace</p><h1 className="mt-5 text-5xl font-medium tracking-[-0.08em] sm:text-6xl">Keep going, <span className="font-serif font-normal italic text-[#b9a9d6]">{displayName}.</span></h1><p className="mt-4 max-w-xl text-sm leading-6 text-white/45">A record of the progress you choose to save. External course completion is not independently verified by TGL.</p></div><Link href="/learning-hub" className="inline-flex items-center gap-2 self-start rounded-full bg-[#f4f3ef] px-5 py-3 text-xs font-medium text-[#111] sm:self-auto">Explore learning hub <ArrowUpRight size={14} /></Link></div>
    <div className="mt-10 grid gap-3 sm:grid-cols-3"><div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5"><BookOpen size={16} className="text-[#b9a9d6]"/><p className="mt-4 text-3xl font-medium tracking-[-0.06em]">{pathIds.length}</p><p className="mt-1 text-xs text-white/40">Enrolled learning paths</p></div><div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5"><Layers3 size={16} className="text-[#b9a9d6]"/><p className="mt-4 text-3xl font-medium tracking-[-0.06em]">{completed}</p><p className="mt-1 text-xs text-white/40">Stages self-reported complete</p></div><div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5"><Clock3 size={16} className="text-[#b9a9d6]"/><p className="mt-4 text-3xl font-medium tracking-[-0.06em]">{activeMinutes}</p><p className="mt-1 text-xs text-white/40">Active minutes · last 7 days</p></div></div>
    <div className="mt-6 grid gap-6 lg:grid-cols-[1.3fr_.7fr]"><LearningActivityChart sessions={sessions ?? []}/><section className="rounded-2xl border border-white/10 bg-white/[0.025] p-5"><p className="text-[9px] uppercase tracking-[0.17em] text-white/40">Resource progress</p><p className="mt-3 text-3xl font-medium tracking-[-0.06em]">{resourceProgress?.length ?? 0}</p><p className="mt-1 text-xs text-white/40">Resources with a saved status</p><p className="mt-3 text-[10px] text-white/35">Statuses are self-reported, including external learning.</p></section></div><div className="mt-6"><ConnectedLearningPanel connections={providerConnections ?? []} evidence={providerEvidence ?? []} progress={xapiProgress ?? []} pathProgress={mappedPathProgress} availableProviders={availableProviders ?? []}/></div>
    <StudentCertificationsPanel />
    <div className="mt-12 grid gap-10 lg:grid-cols-[1.3fr_.7fr]"><section><div className="mb-5 flex items-end justify-between"><div><p className="text-[9px] uppercase tracking-[0.2em] text-white/40">My learning paths</p><h2 className="mt-2 text-2xl font-medium tracking-[-0.05em]">Your current directions</h2></div><Link href="/learning-hub" className="text-xs text-white/45 hover:text-white">Browse all</Link></div>{paths?.length ? <div className="grid gap-3">{paths.map((path) => { const pathModules = (modules ?? []).filter((module) => module.learning_path_id === path.id); const pathDone = pathModules.filter((module) => progressById.get(module.id)?.status === "completed").length; const percent = pathModules.length ? Math.round(pathDone / pathModules.length * 100) : 0; return <Link key={path.id} href={`/learning-hub/${path.slug}`} className="rounded-2xl border border-white/10 bg-white/[0.025] p-5 transition-colors hover:border-white/20"><div className="flex items-start justify-between gap-5"><div><p className="text-[9px] uppercase tracking-[0.15em] text-[#b9a9d6]">{path.category}</p><h3 className="mt-2 text-lg font-medium tracking-[-0.04em]">{path.title}</h3><p className="mt-1 text-xs text-white/40">{pathDone} of {pathModules.length} stages marked complete</p></div><ArrowUpRight size={15} className="text-white/40"/></div><div className="mt-5 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-[#b9a9d6]" style={{ width: `${percent}%` }}/></div><p className="mt-2 text-right text-[10px] text-white/40">{percent}% self-reported</p></Link>; })}</div> : <div className="rounded-2xl border border-dashed border-white/15 p-8"><p className="text-sm text-white/65">Your learning workspace is ready.</p><p className="mt-2 text-xs leading-5 text-white/40">Choose a pathway to start saving your progress.</p><Link href="/learning-hub" className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-xs font-medium text-black">Browse free learning <ArrowUpRight size={13}/></Link></div>}</section>
      <aside className="space-y-4"><section className="rounded-2xl border border-white/10 bg-white/[0.025] p-5"><p className="text-[9px] uppercase tracking-[0.17em] text-white/40">Saved resources</p><p className="mt-3 text-3xl font-medium tracking-[-0.06em]">{savedIds.length}</p><Link href="/learning-hub" className="mt-3 inline-flex items-center gap-2 text-xs text-white/55 hover:text-white">View resource library <ArrowUpRight size={13}/></Link></section><section className="rounded-2xl border border-white/10 bg-white/[0.025] p-5"><p className="text-[9px] uppercase tracking-[0.17em] text-white/40">Activity record</p><p className="mt-3 text-xs leading-5 text-white/55">{sessions?.length ? `${sessions.length} recent session record${sessions.length === 1 ? "" : "s"}. Time is activity only, not proof of course completion.` : "No active learning time has been recorded yet. Browser activity tracking is opt-in and requires the companion extension."}</p></section><CompanionControls initialDevices={devices ?? []}/><div className="rounded-2xl border border-white/10 p-5"><p className="mb-3 text-[9px] uppercase tracking-[0.17em] text-white/40">Account</p><SignOutButton/></div></aside></div></div></section></main>;
}
