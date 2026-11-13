"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Bookmark, Compass, FolderGit2, Network, Search } from "lucide-react";
import type { EnrichedPathway, LearningNode, ProjectBrief } from "@/lib/learning-graph";
import GradientASCII from "@/components/react-bits/GradientASCII";

type FilterKind = "all" | "pathways" | "projects" | "concepts";

export function ExploreNetwork({
  pathways,
  projects,
  nodes,
  initialSavedItems,
}: {
  pathways: EnrichedPathway[];
  projects: ProjectBrief[];
  nodes: LearningNode[];
  initialSavedItems: string[];
}) {
  const [query, setQuery] = useState("");
  const [kindFilter, setKindFilter] = useState<FilterKind>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("All");
  const [savedItems, setSavedItems] = useState<string[]>(initialSavedItems);

  const categories = ["All", "Engineering", "Data & AI", "Infrastructure", "Product & design"];
  const normalized = query.trim().toLowerCase();

  const toggleSave = async (itemKey: string) => {
    const res = await fetch("/api/workspace/learner", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "toggle_save", itemKey }),
    });
    const data = await res.json();
    if (res.ok && data.savedItems) setSavedItems(data.savedItems);
  };

  const filteredPathways = useMemo(() => {
    if (kindFilter !== "all" && kindFilter !== "pathways") return [];
    return pathways.filter((p) => {
      if (categoryFilter !== "All" && p.category !== categoryFilter) return false;
      if (!normalized) return true;
      return (
        p.title.toLowerCase().includes(normalized) ||
        p.description.toLowerCase().includes(normalized) ||
        p.skills.some((s) => s.toLowerCase().includes(normalized))
      );
    });
  }, [pathways, kindFilter, categoryFilter, normalized]);

  const filteredProjects = useMemo(() => {
    if (kindFilter !== "all" && kindFilter !== "projects") return [];
    return projects.filter((p) => {
      if (categoryFilter !== "All" && p.category !== categoryFilter) return false;
      if (!normalized) return true;
      return (
        p.title.toLowerCase().includes(normalized) ||
        p.summary.toLowerCase().includes(normalized) ||
        p.cohortName.toLowerCase().includes(normalized)
      );
    });
  }, [projects, kindFilter, categoryFilter, normalized]);

  const filteredConcepts = useMemo(() => {
    if (kindFilter !== "all" && kindFilter !== "concepts") return [];
    return nodes.filter((n) => {
      const parentPath = pathways.find((p) => p.slug === n.pathwaySlug);
      if (categoryFilter !== "All" && parentPath?.category !== categoryFilter) return false;
      if (!normalized) return true;
      return (
        n.title.toLowerCase().includes(normalized) ||
        n.summary.toLowerCase().includes(normalized)
      );
    });
  }, [nodes, pathways, kindFilter, categoryFilter, normalized]);

  const totalCount =
    filteredPathways.length + filteredProjects.length + filteredConcepts.length;

  return (
    <div className="space-y-8">
      {/* Interactive GradientASCII Network Header */}
      <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0d0c11]">
        <div className="h-[220px] sm:h-[250px]">
          <GradientASCII
            colors={["#2d233d", "#b9a9d6", "#f4f3ef", "#7b689c"]}
            shape="horizon"
            characters=" .:-=+xX0#@"
            cellSize={16}
            density={0.74}
            glyphOpacity={0.78}
            gradientOpacity={0.55}
            glow={0.18}
            flicker={0.14}
            speed={0.65}
            clickEffect="wave"
            dpr={1.25}
          />
        </div>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#090909]/92 via-[#090909]/68 to-[#090909]/25" />
        <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-5 sm:p-8">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#b9a9d6]">
            Connected Knowledge Graph · Interactive ASCII Field
          </p>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-xl">
              <h2 className="text-lg font-medium tracking-[-0.04em] text-[#f4f3ef] sm:text-2xl">
                Move across pathways, live projects, and mentor critique.
              </h2>
              <p className="mt-1.5 text-xs leading-5 text-white/75">
                Hover or click across the horizon field, or jump directly into a live project brief or pathway map below.
              </p>
            </div>
            <div className="pointer-events-auto flex flex-wrap gap-2">
              <Link
                href="/courses"
                className="inline-flex items-center gap-1.5 rounded-full bg-[#f4f3ef] px-4 py-2 text-xs font-medium text-[#111111] transition-colors hover:bg-white whitespace-nowrap shrink-0"
              >
                Browse paid courses <ArrowUpRight size={13} aria-hidden="true" />
              </Link>
              <Link
                href="/projects/accessible-learning-portfolio"
                className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-black/50 px-4 py-2 text-xs text-white/90 backdrop-blur-sm transition-colors hover:border-white/40 whitespace-nowrap shrink-0"
              >
                Open capstone project
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Search & Filters */}
      <div className="space-y-4 rounded-2xl border border-white/10 bg-[#111111] p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <label className="relative flex-1">
            <span className="sr-only">Search pathways, projects, and concepts</span>
            <Search
              size={15}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40"
              aria-hidden="true"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search pathways, projects, skills, or concepts..."
              className="h-10 w-full rounded-xl border border-white/10 bg-black/35 pl-10 pr-4 text-xs text-white placeholder:text-white/40"
            />
          </label>

          <div
            role="group"
            aria-label="Filter by content type"
            className="flex flex-wrap gap-1 rounded-xl border border-white/10 bg-black/30 p-1"
          >
            {(["all", "pathways", "projects", "concepts"] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setKindFilter(k)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-colors whitespace-nowrap shrink-0 ${
                  kindFilter === k
                    ? "bg-[#f4f3ef] text-[#111111]"
                    : "text-white/55 hover:text-white"
                }`}
              >
                {k}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-3">
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by domain">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`rounded-full px-3 py-1.5 text-xs transition-colors whitespace-nowrap shrink-0 ${
                  categoryFilter === cat
                    ? "bg-[#b9a9d6] font-medium text-[#111111]"
                    : "border border-white/10 text-white/60 hover:border-white/30"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
          <p className="font-mono text-[11px] tabular-nums text-white/45">
            {totalCount} matching items
          </p>
        </div>
      </div>

      {totalCount === 0 && (
        <div className="rounded-2xl border border-dashed border-white/15 p-10 text-center">
          <p className="text-sm text-white/70">No pathways, projects, or concepts match your search.</p>
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setKindFilter("all");
              setCategoryFilter("All");
            }}
            className="mt-4 rounded-full border border-white/20 px-4 py-2 text-xs text-white/80"
          >
            Clear all filters
          </button>
        </div>
      )}

      {/* Projects Section First (Work & Building Primary) */}
      {filteredProjects.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-base font-medium">
              <FolderGit2 size={16} className="text-[#b9a9d6]" aria-hidden="true" />
              <span>Applied projects ({filteredProjects.length})</span>
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredProjects.map((project) => {
              const saved = savedItems.includes(`project:${project.slug}`);
              return (
                <article
                  key={project.slug}
                  className="flex flex-col justify-between rounded-2xl border border-white/10 bg-[#111111] p-6"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 text-xs text-white/45">
                      <span>{project.category} · {project.estimatedHours}h</span>
                      <button
                        type="button"
                        onClick={() => void toggleSave(`project:${project.slug}`)}
                        aria-label={saved ? `Unsave ${project.title}` : `Save ${project.title}`}
                        className="inline-flex items-center gap-1 text-[11px] text-white/60 hover:text-white"
                      >
                        <Bookmark size={12} aria-hidden="true" />
                        {saved ? "Saved" : "Save"}
                      </button>
                    </div>
                    <h3 className="mt-3 text-lg font-medium tracking-[-0.03em] text-[#f4f3ef]">
                      {project.title}
                    </h3>
                    <p className="mt-2 text-xs leading-5 text-white/55">{project.summary}</p>
                    <p className="mt-3 text-[11px] text-white/40">
                      Mentor: {project.mentorName} · {project.peerWork.length} peer showcase
                    </p>
                  </div>

                  <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-4 text-xs">
                    <Link
                      href={`/projects/${project.slug}`}
                      className="inline-flex items-center gap-1.5 font-medium text-[#b9a9d6] hover:text-white"
                    >
                      Open project <ArrowUpRight size={13} aria-hidden="true" />
                    </Link>
                    <Link
                      href={`/pathways/${project.pathwaySlug}`}
                      className="text-white/50 hover:text-white"
                    >
                      Pathway map
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {/* Pathways Section */}
      {filteredPathways.length > 0 && (
        <section className="space-y-4">
          <h2 className="flex items-center gap-2 text-base font-medium">
            <Network size={16} className="text-[#b9a9d6]" aria-hidden="true" />
            <span>Interactive pathway maps ({filteredPathways.length})</span>
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredPathways.map((pathway) => {
              const saved = savedItems.includes(`pathway:${pathway.slug}`);
              return (
                <article
                  key={pathway.number}
                  className="flex flex-col justify-between rounded-2xl border border-white/10 bg-[#111111] p-6"
                >
                  <div>
                    <div className="flex items-center justify-between text-xs text-white/45">
                      <span>{pathway.number} · {pathway.category}</span>
                      <button
                        type="button"
                        onClick={() => void toggleSave(`pathway:${pathway.slug}`)}
                        aria-label={saved ? `Unsave ${pathway.title}` : `Save ${pathway.title}`}
                        className="inline-flex items-center gap-1 text-[11px] text-white/60 hover:text-white"
                      >
                        <Bookmark size={12} aria-hidden="true" />
                        {saved ? "Saved" : "Save"}
                      </button>
                    </div>
                    <h3 className="mt-3 text-lg font-medium tracking-[-0.03em] text-[#f4f3ef]">
                      {pathway.title}
                    </h3>
                    <p className="mt-2 text-xs leading-5 text-white/55">{pathway.description}</p>
                    <p className="mt-3 text-[11px] text-white/40">
                      {pathway.skills.join(" · ")}
                    </p>
                  </div>

                  <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4 text-xs">
                    <span className="text-white/45">{pathway.cohortName}</span>
                    <Link
                      href={`/pathways/${pathway.slug}`}
                      className="inline-flex items-center gap-1.5 font-medium text-[#f4f3ef] hover:text-[#b9a9d6]"
                    >
                      Open map <ArrowUpRight size={13} aria-hidden="true" />
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {/* Concepts & Touchpoints */}
      {filteredConcepts.length > 0 && (
        <section className="space-y-4">
          <h2 className="flex items-center gap-2 text-base font-medium">
            <Compass size={16} className="text-[#b9a9d6]" aria-hidden="true" />
            <span>Concepts &amp; mentor touchpoints ({filteredConcepts.length})</span>
          </h2>
          <div className="grid gap-3 md:grid-cols-2">
            {filteredConcepts.map((node) => (
              <article
                key={node.id}
                className="flex items-start justify-between gap-4 rounded-2xl border border-white/10 bg-[#111111] p-5"
              >
                <div>
                  <p className="text-[11px] uppercase tracking-[0.12em] text-white/45">
                    {node.kind} · {node.estimatedMinutes} min
                  </p>
                  <h3 className="mt-1.5 text-sm font-medium text-[#f4f3ef]">{node.title}</h3>
                  <p className="mt-1 text-xs leading-5 text-white/55">{node.summary}</p>
                </div>
                <Link
                  href={`/pathways/${node.pathwaySlug}`}
                  className="rounded-full border border-white/15 px-3 py-1.5 text-[11px] text-white/80 hover:border-white/35 whitespace-nowrap shrink-0"
                >
                  View on map
                </Link>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
