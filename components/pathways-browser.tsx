"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Clock3 } from "lucide-react";
import { pathways, pathwayCategories } from "@/lib/pathways";

export function PathwaysBrowser() {
  const [activeCategory, setActiveCategory] = useState("All pathways");
  const visiblePathways = useMemo(() => activeCategory === "All pathways" ? pathways : pathways.filter((pathway) => pathway.category === activeCategory), [activeCategory]);

  return <>
    <div className="mb-9 flex flex-wrap gap-2" role="group" aria-label="Filter learning pathways">
      {pathwayCategories.map((category) => <button key={category} type="button" onClick={() => setActiveCategory(category)} aria-pressed={activeCategory === category} className={`rounded-full border px-4 py-2.5 text-xs transition-colors ${activeCategory === category ? "border-[#f4f3ef] bg-[#f4f3ef] text-[#111]" : "border-white/10 text-white/55 hover:border-white/25 hover:text-white"}`}>{category}</button>)}
    </div>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-live="polite">
      {visiblePathways.map((pathway) => <article key={pathway.number} className="group relative flex min-h-[290px] flex-col overflow-hidden rounded-[22px] border border-white/[0.09] bg-[#111]/80 p-6 transition-all duration-300 hover:-translate-y-1 hover:border-white/20 hover:bg-[#151515] md:p-7">
        <div className="absolute -right-14 -top-16 size-48 rounded-full opacity-[0.08] blur-[45px] transition-opacity group-hover:opacity-[0.16]" style={{ backgroundColor: pathway.accent }} />
        <div className="relative flex items-center justify-between"><span className="font-mono text-[10px] tracking-[0.15em] text-white/35">PATHWAY {pathway.number}</span><span className="rounded-full border border-white/10 px-2.5 py-1 text-[9px] text-white/45">{pathway.category}</span></div>
        <div className="relative mt-8"><h2 className="max-w-[280px] text-[26px] font-medium leading-tight tracking-[-0.055em] text-[#f4f3ef]">{pathway.title}</h2><p className="mt-3 max-w-[340px] text-[13px] leading-6 text-white/48">{pathway.description}</p></div>
        <div className="relative mt-auto flex flex-wrap gap-1.5 pt-7">{pathway.skills.map((skill) => <span key={skill} className="rounded-full bg-white/[0.055] px-2.5 py-1.5 text-[9px] text-white/55">{skill}</span>)}</div>
        <div className="relative mt-6 flex items-center justify-between border-t border-white/[0.08] pt-4"><span className="flex items-center gap-2 text-[10px] text-white/40"><Clock3 size={12} /> {pathway.level}</span><Link href={`/learning-pathways/${pathway.number}`} aria-label={`Explore ${pathway.title} pathway`} className="grid size-8 place-items-center rounded-full border border-white/10 text-white/70 transition-all hover:border-white/40 hover:text-white"><ArrowUpRight size={15} /></Link></div>
      </article>)}
    </div>
    <p className="mt-6 text-xs text-white/35">Pathway overviews are learning guides, not enrollment or internship listings. Detailed curriculum and availability will be published as programs are established.</p>
  </>;
}
