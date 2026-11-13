"use client";

import { useMemo, useState } from "react";
import { GitBranchPlus } from "lucide-react";

type Path = { id: string; title: string };
type Module = { id: string; learning_path_id: string; title: string };
type Mapping = { id: string; activity_iri: string; learning_path_id: string; module_id: string | null; is_required: boolean };

export function ActivityMappingAdmin({ paths, modules, initialMappings }: { paths: Path[]; modules: Module[]; initialMappings: Mapping[] }) {
  const [mappings, setMappings] = useState(initialMappings);
  const [pathId, setPathId] = useState(paths[0]?.id ?? "");
  const [moduleId, setModuleId] = useState("");
  const [activityIri, setActivityIri] = useState("");
  const [required, setRequired] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const availableModules = useMemo(() => modules.filter((module) => module.learning_path_id === pathId), [modules, pathId]);

  const createMapping = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const response = await fetch("/api/admin/lrs/activity-mappings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ activityIri, learningPathId: pathId, moduleId: moduleId || null, isRequired: required }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not save mapping.");
      setMappings((current) => [result.mapping, ...current.filter((mapping) => mapping.activity_iri !== result.mapping.activity_iri)]);
      setActivityIri("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unexpected error."); }
    finally { setBusy(false); }
  };

  return <section className="mt-8 rounded-2xl border border-white/10 bg-white/[0.025] p-5 sm:p-6"><div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-full border border-[#b9a9d6]/20 bg-[#b9a9d6]/10 text-[#d1c4e4]"><GitBranchPlus size={15}/></span><div><p className="text-[9px] uppercase tracking-[0.18em] text-white/40">Progress configuration</p><h2 className="mt-1 text-lg font-medium">Activity-to-pathway mappings</h2></div></div><p className="mt-3 text-xs leading-5 text-white/45">Only mapped xAPI activity IRIs contribute to pathway progress. A mapped activity is marked complete only by an accepted completed verb or <code>result.completion=true</code>.</p><form onSubmit={createMapping} className="mt-5 grid gap-3 md:grid-cols-[1.4fr_1fr_1fr_auto]"><label className="text-[10px] text-white/55">Activity IRI<input type="url" required value={activityIri} onChange={(event) => setActivityIri(event.target.value)} placeholder="https://provider.example/course/123" className="mt-1.5 h-10 w-full rounded-lg border border-white/10 bg-black/20 px-3 text-xs text-white"/></label><label className="text-[10px] text-white/55">Learning path<select value={pathId} onChange={(event) => { setPathId(event.target.value); setModuleId(""); }} required className="mt-1.5 h-10 w-full rounded-lg border border-white/10 bg-[#151515] px-3 text-xs text-white">{paths.map((path) => <option key={path.id} value={path.id}>{path.title}</option>)}</select></label><label className="text-[10px] text-white/55">Module (optional)<select value={moduleId} onChange={(event) => setModuleId(event.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-white/10 bg-[#151515] px-3 text-xs text-white"><option value="">Path level</option>{availableModules.map((module) => <option key={module.id} value={module.id}>{module.title}</option>)}</select></label><button type="submit" disabled={busy || !pathId} className="self-end rounded-full bg-[#f4f3ef] px-4 py-3 text-xs font-medium text-[#111] disabled:opacity-40">{busy ? "Saving…" : "Map"}</button><label className="flex items-center gap-2 text-[10px] text-white/50 md:col-span-4"><input type="checkbox" checked={required} onChange={(event) => setRequired(event.target.checked)}/>Required activity for the mapped path</label></form>{error && <p role="alert" className="mt-3 text-xs text-rose-300">{error}</p>}
    <div className="mt-6 flex flex-col gap-2">{mappings.map((mapping) => <div key={mapping.id} className="grid gap-2 rounded-xl border border-white/[0.08] bg-black/20 p-3 text-[10px] sm:grid-cols-[1.3fr_1fr_auto] sm:items-center"><code className="break-all text-white/70">{mapping.activity_iri}</code><span className="text-white/45">{paths.find((path) => path.id === mapping.learning_path_id)?.title ?? "Path"}{mapping.module_id ? ` · ${modules.find((module) => module.id === mapping.module_id)?.title ?? "Module"}` : " · Path level"}</span><span className="text-white/35">{mapping.is_required ? "Required" : "Optional"}</span></div>)}{mappings.length === 0 && <p className="rounded-xl border border-dashed border-white/15 p-5 text-xs text-white/40">No activity mappings are configured. Provider statements are retained but won&apos;t be aggregated to a pathway until mapped.</p>}</div>
  </section>;
}
