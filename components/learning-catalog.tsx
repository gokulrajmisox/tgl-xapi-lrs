"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Bookmark, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ResourceProgressControl } from "@/components/resource-progress-control";

type Path = { id: string; slug: string; title: string; description: string; category: string; difficulty: string; estimated_hours: number | null };
type Resource = { id: string; learning_path_id: string | null; title: string; provider: string; topic: string; difficulty: string; estimated_minutes: number | null; language: string | null; url: string; learning_objectives: string[]; prerequisites: string[]; related_projects: string[] };

export function SaveResourceButton({ resourceId, initiallySaved = false }: { resourceId: string; initiallySaved?: boolean }) {
  const [saved, setSaved] = useState(initiallySaved);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const toggle = async () => {
    setBusy(true);
    setNotice("");
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      window.location.assign("/auth/login?next=/learning-hub");
      return;
    }
    const result = saved
      ? await supabase.from("saved_resources").delete().eq("resource_id", resourceId).eq("student_id", user.id)
      : await supabase.from("saved_resources").insert({ resource_id: resourceId, student_id: user.id });
    if (result.error) setNotice("Could not update your saved list. Please try again.");
    else setSaved(!saved);
    setBusy(false);
  };
  return <div className="flex items-center gap-2"><button type="button" onClick={toggle} disabled={busy} aria-pressed={saved} aria-label={saved ? "Remove saved resource" : "Save resource"} className={`grid size-9 place-items-center rounded-full border transition-colors ${saved ? "border-[var(--accent)]/50 bg-[var(--accent)]/12 text-[var(--accent)]" : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground"}`}><Bookmark size={15} fill={saved ? "currentColor" : "none"} /></button>{notice && <span role="status" className="text-[10px] text-rose-500 dark:text-rose-300">{notice}</span>}</div>;
}

export function LearningCatalog({ paths, resources, savedIds = [], resourceStatuses = {} }: { paths: Path[]; resources: Resource[]; savedIds?: string[]; resourceStatuses?: Record<string, "not_started" | "in_progress" | "completed"> }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All topics");
  const [difficulty, setDifficulty] = useState("All levels");
  const [status, setStatus] = useState("All statuses");
  const [savedFilter, setSavedFilter] = useState("All resources");
  const saved = useMemo(() => new Set(savedIds), [savedIds]);
  const categories = ["All topics", ...new Set(paths.map((path) => path.category))];
  const pathById = useMemo(() => new Map(paths.map((path) => [path.id, path])), [paths]);
  const visible = useMemo(() => resources.filter((resource) => {
    const path = resource.learning_path_id ? pathById.get(resource.learning_path_id) : undefined;
    const termMatches = `${resource.title} ${resource.provider} ${resource.topic} ${path?.title ?? ""}`.toLowerCase().includes(query.toLowerCase());
    const resourceStatus = resourceStatuses[resource.id] ?? "not_started";
    return termMatches && (category === "All topics" || path?.category === category || resource.topic === category) && (difficulty === "All levels" || resource.difficulty === difficulty.toLowerCase()) && (status === "All statuses" || resourceStatus === status) && (savedFilter === "All resources" || (savedFilter === "Saved" ? saved.has(resource.id) : !saved.has(resource.id)));
  }), [resources, query, category, difficulty, status, savedFilter, resourceStatuses, pathById, saved]);

  return <><div className="tgl-glass mb-8 rounded-2xl p-3 md:p-4"><label className="flex h-11 items-center gap-3 rounded-xl border border-border bg-input px-4 text-muted-foreground"><Search size={15} /><span className="sr-only">Search resources</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search free learning resources" className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground" /></label><div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4"><select aria-label="Filter by topic" value={category} onChange={(event) => setCategory(event.target.value)} className="h-10 rounded-lg border border-border bg-input px-3 text-xs text-foreground"><option>All topics</option>{categories.slice(1).map((item) => <option key={item}>{item}</option>)}</select><select aria-label="Filter by difficulty" value={difficulty} onChange={(event) => setDifficulty(event.target.value)} className="h-10 rounded-lg border border-border bg-input px-3 text-xs text-foreground"><option>All levels</option><option>beginner</option><option>intermediate</option><option>advanced</option></select><select aria-label="Filter by learning status" value={status} onChange={(event) => setStatus(event.target.value)} className="h-10 rounded-lg border border-border bg-input px-3 text-xs text-foreground"><option value="All statuses">All learning statuses</option><option value="not_started">Not started</option><option value="in_progress">In progress</option><option value="completed">Self-reported complete</option></select><select aria-label="Filter by saved status" value={savedFilter} onChange={(event) => setSavedFilter(event.target.value)} className="h-10 rounded-lg border border-border bg-input px-3 text-xs text-foreground"><option>All resources</option><option>Saved</option><option>Not saved</option></select></div></div>
    <div className="mb-4 flex items-center justify-between text-[10px] text-muted-foreground"><span>{visible.length} free resources</span><span>External providers open in a new tab</span></div>
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{visible.map((resource) => { const path = resource.learning_path_id ? pathById.get(resource.learning_path_id) : undefined; return <article key={resource.id} className="tgl-glass flex min-h-[292px] flex-col rounded-[22px] p-6 transition-colors hover:border-foreground/20"><div className="flex items-start justify-between gap-3"><div><p className="text-[9px] uppercase tracking-[0.17em] text-[var(--accent)]">{resource.topic}</p><h2 className="mt-3 text-lg font-medium leading-snug tracking-[-0.04em] text-foreground">{resource.title}</h2></div><SaveResourceButton resourceId={resource.id} initiallySaved={saved.has(resource.id)} /></div><p className="mt-2 text-xs text-muted-foreground">{resource.provider} <span className="px-1">·</span> {resource.difficulty}</p><div className="mt-5 flex-1"><p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground/80">You&apos;ll explore</p><p className="mt-2 text-xs leading-5 text-muted-foreground">{resource.learning_objectives.slice(0, 3).join(" · ")}</p>{resource.prerequisites.length > 0 && <p className="mt-3 text-[10px] text-muted-foreground/80">Before you start: {resource.prerequisites.join(", ")}</p>}{resource.related_projects.length > 0 && <p className="mt-2 text-[10px] text-muted-foreground/80">Try building: {resource.related_projects.join(", ")}</p>}</div><div className="mt-4"><ResourceProgressControl resourceId={resource.id} initialStatus={resourceStatuses[resource.id] ?? "not_started"} /></div><div className="mt-5 flex items-end justify-between border-t border-border pt-4"><div><p className="text-[10px] text-muted-foreground">{path?.title ?? "Open resource"}</p><p className="mt-1 text-[9px] text-muted-foreground/80">{resource.estimated_minutes ? `${Math.round(resource.estimated_minutes / 60)}+ hr estimate` : "Self-paced · duration varies"} {resource.language ? `· ${resource.language}` : ""}</p></div><a href={resource.url} target="_blank" rel="noopener noreferrer" className="grid size-9 place-items-center rounded-full border border-border text-foreground/80 hover:border-foreground/30" aria-label={`Open ${resource.title} at ${resource.provider}`}><ArrowUpRight size={15} /></a></div></article>; })}</div>{visible.length === 0 && <p className="tgl-glass rounded-2xl p-8 text-center text-sm text-muted-foreground">No resources match these filters yet.</p>}
  </>;
}
