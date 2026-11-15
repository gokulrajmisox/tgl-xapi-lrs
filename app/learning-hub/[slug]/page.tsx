import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { Header } from "@/components/header";
import { LearningPathwayWorkspace } from "@/components/learning-pathway-workspace";
import { SaveResourceButton } from "@/components/learning-catalog";
import { ResourceProgressControl } from "@/components/resource-progress-control";
import { createClient } from "@/lib/supabase/server";

export default async function LearningPathPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: path } = await supabase.from("learning_paths").select("id,slug,title,description,category,difficulty,estimated_hours").eq("slug", slug).eq("is_published", true).maybeSingle();
  if (!path) notFound();
  const { data: { user } } = await supabase.auth.getUser();
  const [{ data: modules }, { data: resources }, { data: enrollment }, { data: progress }] = await Promise.all([
    supabase.from("learning_modules").select("id,title,description,sort_order,estimated_minutes").eq("learning_path_id", path.id).order("sort_order"),
    supabase.from("learning_resources").select("id,title,provider,topic,difficulty,url,learning_objectives,prerequisites,related_projects").eq("learning_path_id", path.id).eq("is_published", true).eq("is_free", true),
    user ? supabase.from("student_enrollments").select("id").eq("student_id", user.id).eq("learning_path_id", path.id).maybeSingle() : Promise.resolve({ data: null, error: null }),
    user ? supabase.from("lesson_progress").select("module_id,status,completed_at").eq("student_id", user.id) : Promise.resolve({ data: [], error: null }),
  ]);
  let savedIds: string[] = [];
  let resourceStatuses: Record<string, "not_started" | "in_progress" | "completed"> = {};
  if (user) {
    const [{ data: saved }, { data: resourceProgress }] = await Promise.all([
      supabase.from("saved_resources").select("resource_id").eq("student_id", user.id),
      supabase.from("learning_resource_progress").select("resource_id,status").eq("student_id", user.id),
    ]);
    savedIds = (saved ?? []).map((resource) => resource.resource_id);
    resourceStatuses = Object.fromEntries((resourceProgress ?? []).map((item) => [item.resource_id, item.status]));
  }
  const pathProgress = (progress ?? []).filter((item) => (modules ?? []).some((module) => module.id === item.module_id));

  return <main className="min-h-screen bg-background text-foreground"><Header /><section className="px-6 pb-24 pt-36 md:px-12 md:pb-32 md:pt-48 lg:px-20"><div className="mx-auto max-w-[1100px]"><Link href="/learning-hub" className="mb-12 inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"><ArrowLeft size={13} /> Learning hub</Link><div className="grid gap-8 border-b border-border pb-10 md:grid-cols-[1.2fr_.8fr] md:items-end md:pb-14"><div><p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{path.category} / {path.difficulty}</p><h1 className="mt-6 text-[clamp(3rem,7vw,6.4rem)] font-medium leading-[0.88] tracking-[-0.08em]">{path.title}</h1><p className="mt-6 max-w-xl text-sm leading-7 text-muted-foreground">{path.description}</p></div><div className="tgl-glass rounded-2xl p-5"><p className="text-[9px] uppercase tracking-[0.17em] text-muted-foreground">A self-guided learning path</p><p className="mt-3 text-sm leading-6 text-muted-foreground">{path.estimated_hours ? `Approximately ${path.estimated_hours} hours of suggested practice.` : "Learn at your own pace."} No progress is recorded until you choose to enroll.</p></div></div><div className="py-12"><LearningPathwayWorkspace pathId={path.id} modules={modules ?? []} initialProgress={pathProgress} enrolled={Boolean(enrollment)} signedIn={Boolean(user)} /></div>{resources && resources.length > 0 && <section className="border-t border-border pt-10"><p className="text-[10px] uppercase tracking-[0.19em] text-muted-foreground">Free resources for this path</p><div className="mt-5 grid gap-3 md:grid-cols-2">{resources.map((resource) => <article key={resource.id} className="tgl-glass flex items-center justify-between gap-4 rounded-2xl p-5"><div><h2 className="text-sm font-medium text-foreground">{resource.title}</h2><p className="mt-1 text-xs text-muted-foreground">{resource.provider} · {resource.difficulty}</p></div><div className="flex flex-wrap items-center gap-2"><SaveResourceButton resourceId={resource.id} initiallySaved={savedIds.includes(resource.id)} /><ResourceProgressControl resourceId={resource.id} initialStatus={resourceStatuses[resource.id] ?? "not_started"} /><a href={resource.url} target="_blank" rel="noopener noreferrer" aria-label={`Open ${resource.title} in a new tab`} className="grid size-9 place-items-center rounded-full border border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground"><ArrowUpRight size={14} /></a></div></article>)}</div></section>}</div></section></main>;
}
