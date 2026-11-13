"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Clock3 } from "lucide-react";
import { pathwayCategories } from "@/lib/pathways";
import { enrichedPathways } from "@/lib/learning-graph";

export function PathwaysBrowser() {
  const [activeCategory, setActiveCategory] = useState("All pathways");
  const visiblePathways = useMemo(() => activeCategory === "All pathways" ? enrichedPathways : enrichedPathways.filter((pathway) => pathway.category === activeCategory), [activeCategory]);

  return <>
    <div className="mb-9 flex flex-wrap gap-2" role="group" aria-label="Filter learning pathways">
      {pathwayCategories.map((category) => <button key={category} type="button" onClick={() => setActiveCategory(category)} aria-pressed={activeCategory === category} className={`rounded-full border px-4 py-2.5 text-xs transition-colors whitespace-nowrap shrink-0 ${activeCategory === category ? "border-[#f4f3ef] bg-[#f4f3ef] text-[#111]" : "border-white/10 text-white/55 hover:border-white/25 hover:text-white"}`}>{category}</button>)}
    </div>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-live="polite">
      {visiblePathways.map((pathway) => <article key={pathway.number} className="group relative flex min-h-[290px] flex-col overflow-hidden rounded-[22px] border border-white/[0.09] bg-[#111]/80 p-6 transition-all duration-300 hover:-translate-y-1 hover:border-white/20 hover:bg-[#151515] md:p-7">
        <div className="absolute -right-14 -top-16 size-48 rounded-full opacity-[0.08] blur-[45px] transition-opacity group-hover:opacity-[0.16]" style={{ backgroundColor: pathway.accent }} />
        <div className="relative flex items-center justify-between"><span className="font-mono text-[10px] tracking-[0.15em] text-white/35">PATHWAY {pathway.number}</span><span className="text-[10px] text-white/45">{pathway.category}</span></div>
        <div className="relative mt-8"><h2 className="max-w-[280px] text-[26px] font-medium leading-tight tracking-[-0.055em] text-[#f4f3ef]">{pathway.title}</h2><p className="mt-3 max-w-[340px] text-[13px] leading-6 text-white/48">{pathway.description}</p></div>
        <p className="relative mt-auto pt-7 text-[11px] text-white/50">{pathway.skills.join(" · ")}</p>
        <div className="relative mt-6 flex items-center justify-between border-t border-white/[0.08] pt-4"><span className="flex items-center gap-2 text-[10px] text-white/40"><Clock3 size={12} /> {pathway.level}</span><Link href={`/pathways/${pathway.slug}`} aria-label={`Open ${pathway.title} interactive map`} className="inline-flex items-center gap-1.5 text-xs font-medium text-white/80 hover:text-[#b9a9d6]">Open map <ArrowUpRight size={14} /></Link></div>
      </article>)}
    </div>
    <p className="mt-6 text-xs text-white/35">Select any pathway to explore concepts, projects, and mentor touchpoints in non-linear order.</p>
  </>;
}
