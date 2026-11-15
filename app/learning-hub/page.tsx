import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Header } from "@/components/header";
import { LearningCatalog } from "@/components/learning-catalog";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "TGL Learning Hub — Free resources", description: "Explore curated free learning resources and practical pathways with Touch Grass Later." };

export default async function LearningHubPage() {
  const supabase = await createClient();
  const [{ data: paths }, { data: resources }, { data: { user } }] = await Promise.all([
    supabase.from("learning_paths").select("id,slug,title,description,category,difficulty,estimated_hours").eq("is_published", true).order("sort_order"),
    supabase.from("learning_resources").select("id,learning_path_id,title,provider,topic,difficulty,estimated_minutes,language,url,learning_objectives,prerequisites,related_projects").eq("is_published", true).eq("is_free", true).order("title"),
    supabase.auth.getUser(),
  ]);
  let savedIds: string[] = [];
  let resourceStatuses: Record<string, "not_started" | "in_progress" | "completed"> = {};
  if (user) {
    const [{ data: saved }, { data: progress }] = await Promise.all([
      supabase.from("saved_resources").select("resource_id").eq("student_id", user.id),
      supabase.from("learning_resource_progress").select("resource_id,status").eq("student_id", user.id),
    ]);
    savedIds = (saved ?? []).map((item) => item.resource_id);
    resourceStatuses = Object.fromEntries((progress ?? []).map((item) => [item.resource_id, item.status]));
  }

  return <main className="min-h-screen bg-background text-foreground"><Header /><section className="px-6 pb-24 pt-36 md:px-12 md:pb-32 md:pt-48 lg:px-20"><div className="mx-auto max-w-[1280px]"><Link href="/" className="mb-10 inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"><ArrowLeft size={13} /> Back to TGL</Link><div className="grid gap-8 border-b border-border pb-10 md:grid-cols-[1.2fr_.8fr] md:items-end md:pb-14"><div><p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">TGL / Learning hub</p><h1 className="mt-6 text-[clamp(3.5rem,9vw,8rem)] font-medium leading-[0.83] tracking-[-0.09em]">Free to<br /><span className="font-serif font-normal italic text-[var(--accent)]">begin.</span></h1></div><p className="max-w-[420px] text-sm leading-7 text-muted-foreground">A curated library of genuinely free learning resources from established providers. Open a resource, learn on the provider’s site, then track your own progress here.</p></div><div className="pt-9"><LearningCatalog paths={paths ?? []} resources={resources ?? []} savedIds={savedIds} resourceStatuses={resourceStatuses} /></div></div></section><footer className="border-t border-border px-6 py-7 text-center text-[10px] text-muted-foreground">Resources are hosted by their providers. TGL does not independently verify course completion.</footer></main>;
}
