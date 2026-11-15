"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Bookmark,
  CheckCircle2,
  CircleDot,
  Compass,
  FolderGit2,
  List,
  MessageSquare,
  Network,
  Users,
} from "lucide-react";
import type { LearningNode, ProjectBrief } from "@/lib/learning-graph";
import type { NodeProgressState } from "@/lib/learning-workspace-store";

type ViewMode = "map" | "list";

export function PathwayMapExplorer({
  nodes,
  allNodes,
  projects,
  initialNodeStates,
  initialSavedItems,
  heading,
  subheading,
}: {
  nodes: LearningNode[];
  allNodes: LearningNode[];
  projects: ProjectBrief[];
  initialNodeStates: Record<string, NodeProgressState>;
  initialSavedItems: string[];
  heading?: string;
  subheading?: string;
}) {
  const [viewMode, setViewMode] = useState<ViewMode>("map");
  const [statusFilter, setStatusFilter] = useState<"all" | NodeProgressState>("all");
  const [nodeStates, setNodeStates] = useState<Record<string, NodeProgressState>>(initialNodeStates);
  const [savedItems, setSavedItems] = useState<string[]>(initialSavedItems);
  const [selectedId, setSelectedId] = useState<string>(nodes[0]?.id ?? "");
  const [busyId, setBusyId] = useState<string>("");
  const [questionText, setQuestionText] = useState("");
  const [feedbackBanner, setFeedbackBanner] = useState("");

  const filteredNodes = useMemo(() => {
    if (statusFilter === "all") return nodes;
    return nodes.filter((n) => (nodeStates[n.id] ?? "not_started") === statusFilter);
  }, [nodes, statusFilter, nodeStates]);

  const selectedNode =
    nodes.find((n) => n.id === selectedId) ?? filteredNodes[0] ?? nodes[0] ?? null;

  const setNodeState = async (nodeId: string, nextState: NodeProgressState) => {
    setBusyId(nodeId);
    setFeedbackBanner("");
    try {
      const res = await fetch("/api/workspace/learner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle_node", nodeId, state: nextState }),
      });
      const data = await res.json();
      if (res.ok && data.workspace) {
        setNodeStates(data.workspace.nodeStates ?? {});
        setFeedbackBanner(
          nextState === "completed"
            ? "Node marked completed and logged to your verified activity timeline."
            : nextState === "active"
              ? "Node marked active on your learning map."
              : "Node reset to suggested.",
        );
      }
    } finally {
      setBusyId("");
    }
  };

  const toggleSave = async (itemKey: string) => {
    setBusyId(itemKey);
    try {
      const res = await fetch("/api/workspace/learner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle_save", itemKey }),
      });
      const data = await res.json();
      if (res.ok && data.savedItems) {
        setSavedItems(data.savedItems);
      }
    } finally {
      setBusyId("");
    }
  };

  const askMentor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNode || !questionText.trim()) return;
    setBusyId("ask-mentor");
    setFeedbackBanner("");
    try {
      const res = await fetch("/api/workspace/learner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ask_mentor",
          projectSlug: selectedNode.projectSlug ?? null,
          nodeId: selectedNode.id,
          topic: `Question on ${selectedNode.title}`,
          body: questionText.trim(),
        }),
      });
      if (res.ok) {
        setQuestionText("");
        setFeedbackBanner(`Sent directly to ${selectedNode.mentorName}. You can track replies in Work & Portfolio.`);
      }
    } finally {
      setBusyId("");
    }
  };

  const relatedNodes = selectedNode
    ? selectedNode.relatedNodeIds
        .map((id) => allNodes.find((n) => n.id === id))
        .filter((n): n is LearningNode => Boolean(n))
    : [];

  const linkedProject = selectedNode?.projectSlug
    ? projects.find((p) => p.slug === selectedNode.projectSlug) ?? null
    : null;

  // Build SVG edge pairs between nodes visible in the current map
  const edges = useMemo(() => {
    const visibleMap = new Map(filteredNodes.map((n) => [n.id, n]));
    const pairs: Array<{ from: LearningNode; to: LearningNode }> = [];
    const seen = new Set<string>();
    for (const node of filteredNodes) {
      for (const relId of [...node.prerequisites, ...node.relatedNodeIds]) {
        const target = visibleMap.get(relId);
        if (!target || target.id === node.id) continue;
        const key = [node.id, target.id].sort().join("--");
        if (seen.has(key)) continue;
        seen.add(key);
        pairs.push({ from: node, to: target });
      }
    }
    return pairs;
  }, [filteredNodes]);

  const handleMapKeyDown = (e: React.KeyboardEvent, idx: number) => {
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      const next = filteredNodes[(idx + 1) % filteredNodes.length];
      if (next) setSelectedId(next.id);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      const prev = filteredNodes[(idx - 1 + filteredNodes.length) % filteredNodes.length];
      if (prev) setSelectedId(prev.id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          {heading && <h2 className="text-lg font-medium tracking-[-0.03em] text-foreground">{heading}</h2>}
          {subheading && <p className="mt-1 text-xs text-muted-foreground">{subheading}</p>}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div
            role="group"
            aria-label="Filter nodes by progress"
            className="tgl-subsurface flex items-center gap-1 rounded-xl p-1"
          >
            {(["all", "completed", "active", "not_started"] as const).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-colors whitespace-nowrap shrink-0 ${
                  statusFilter === status
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {status === "not_started" ? "Suggested" : status}
              </button>
            ))}
          </div>

          <div
            role="group"
            aria-label="Switch map or list view"
            className="tgl-subsurface flex items-center gap-1 rounded-xl p-1"
          >
            <button
              type="button"
              onClick={() => setViewMode("map")}
              aria-pressed={viewMode === "map"}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                viewMode === "map"
                  ? "bg-[var(--accent)] text-white dark:text-[#111111]"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Network size={13} aria-hidden="true" /> Spatial map
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              aria-pressed={viewMode === "list"}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                viewMode === "list"
                  ? "bg-[var(--accent)] text-white dark:text-[#111111]"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <List size={13} aria-hidden="true" /> Accessible list
            </button>
          </div>
        </div>
      </div>

      {feedbackBanner && (
        <p
          role="status"
          className="rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-700 dark:text-emerald-200"
        >
          {feedbackBanner}
        </p>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.25fr_.75fr]">
        {/* Left: Spatial Map or List View */}
        {viewMode === "map" ? (
          <div
            aria-label="Interactive learning node map"
            className="tgl-glass relative min-h-[460px] overflow-hidden rounded-2xl p-4"
          >
            <p className="mb-3 text-[11px] text-muted-foreground">
              Open any concept, project, or mentor touchpoint in any order. Use Tab or Arrow keys to navigate nodes.
            </p>

            {filteredNodes.length === 0 ? (
              <div className="grid h-80 place-items-center text-center">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">No nodes match this filter.</p>
                  <button
                    type="button"
                    onClick={() => setStatusFilter("all")}
                    className="rounded-full border border-border px-4 py-2 text-xs text-foreground"
                  >
                    Reset filter
                  </button>
                </div>
              </div>
            ) : (
              <div className="relative h-[400px] w-full">
                <svg
                  className="pointer-events-none absolute inset-0 h-full w-full"
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  {edges.map(({ from, to }) => (
                    <line
                      key={`${from.id}-${to.id}`}
                      x1={from.x}
                      y1={from.y}
                      x2={to.x}
                      y2={to.y}
                      stroke="rgba(128,128,128,0.35)"
                      strokeWidth="0.45"
                      strokeDasharray={from.kind === "touchpoint" || to.kind === "touchpoint" ? "1.2 1.2" : undefined}
                    />
                  ))}
                </svg>

                {filteredNodes.map((node, idx) => {
                  const state = nodeStates[node.id] ?? "not_started";
                  const selected = selectedNode?.id === node.id;

                  return (
                    <button
                      key={node.id}
                      type="button"
                      onClick={() => setSelectedId(node.id)}
                      onKeyDown={(e) => handleMapKeyDown(e, idx)}
                      aria-current={selected ? "true" : undefined}
                      style={{
                        left: `${Math.min(82, Math.max(8, node.x))}%`,
                        top: `${Math.min(84, Math.max(10, node.y))}%`,
                      }}
                      className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-xl border px-3.5 py-2.5 text-left backdrop-blur-md transition-all focus-visible:outline-2 focus-visible:outline-[var(--accent)] ${
                        selected
                          ? "z-20 border-[var(--accent)] bg-white/95 shadow-lg dark:bg-[#1e1b24]"
                          : state === "completed"
                            ? "z-10 border-emerald-500/40 bg-emerald-500/12 hover:border-emerald-500 dark:bg-[#121a16]"
                            : state === "active"
                              ? "z-10 border-[var(--accent)]/45 bg-white/85 hover:border-[var(--accent)] dark:bg-[#17151c]"
                              : "z-10 border-border bg-white/75 hover:border-foreground/35 dark:bg-[#141416]"
                      }`}
                    >
                      <span className="block text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                        {node.kind} ·{" "}
                        {state === "completed"
                          ? "Done"
                          : state === "active"
                            ? "Active"
                            : "Suggested"}
                      </span>
                      <span className="mt-0.5 block max-w-[165px] truncate text-xs font-medium text-foreground">
                        {node.title}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredNodes.length === 0 ? (
              <div className="tgl-glass rounded-2xl border-dashed p-8 text-center text-xs text-muted-foreground">
                No nodes match this filter.{" "}
                <button
                  type="button"
                  onClick={() => setStatusFilter("all")}
                  className="underline"
                >
                  Show all nodes
                </button>
              </div>
            ) : (
              filteredNodes.map((node) => {
                const state = nodeStates[node.id] ?? "not_started";
                const selected = selectedNode?.id === node.id;
                return (
                  <button
                    key={node.id}
                    type="button"
                    onClick={() => setSelectedId(node.id)}
                    className={`flex w-full items-center justify-between gap-4 rounded-2xl border p-4 text-left transition-colors ${
                      selected
                        ? "border-[var(--accent)] bg-[var(--accent)]/10 dark:bg-[#191620]"
                        : "tgl-glass hover:border-foreground/25"
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="text-[11px] text-muted-foreground">
                        {node.kind.toUpperCase()} · <span className="tabular-nums">{node.estimatedMinutes} min</span> ·{" "}
                        <span
                          className={
                            state === "completed"
                              ? "text-emerald-600 dark:text-emerald-300"
                              : state === "active"
                                ? "text-[var(--accent)]"
                                : "text-muted-foreground"
                          }
                        >
                          {state === "not_started" ? "Suggested" : state}
                        </span>
                      </p>
                      <p className="mt-1 truncate text-sm font-medium text-foreground">
                        {node.title}
                      </p>
                    </div>
                    <ArrowUpRight size={14} className="shrink-0 text-muted-foreground" aria-hidden="true" />
                  </button>
                );
              })
            )}
          </div>
        )}

        {/* Right: Non-Linear Action Deck (Related Concept, Apply in Project, Ask Mentor, Peer Work) */}
        <aside className="tgl-glass rounded-2xl p-6">
          {selectedNode ? (
            <div className="space-y-6">
              <div>
                <div className="flex items-start justify-between gap-3">
                  <p className="text-[11px] uppercase tracking-[0.15em] text-[var(--accent)]">
                    {selectedNode.kind} · <span className="tabular-nums">{selectedNode.estimatedMinutes} min</span>
                  </p>
                  <button
                    type="button"
                    disabled={busyId === `node:${selectedNode.id}`}
                    onClick={() => void toggleSave(`node:${selectedNode.id}`)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-[11px] text-foreground hover:border-foreground/35 whitespace-nowrap shrink-0"
                  >
                    <Bookmark size={12} aria-hidden="true" />
                    {savedItems.includes(`node:${selectedNode.id}`) ? "Saved" : "Save"}
                  </button>
                </div>

                <h3 className="mt-2 text-xl font-medium tracking-[-0.03em] text-foreground">
                  {selectedNode.title}
                </h3>
                <p className="mt-2 text-xs leading-6 text-muted-foreground">
                  {selectedNode.summary}
                </p>

                {/* Non-linear status actions */}
                <div className="mt-4 flex flex-wrap gap-2">
                  {(["active", "completed", "not_started"] as const).map((state) => {
                    const current = nodeStates[selectedNode.id] ?? "not_started";
                    const isCurrent = current === state;
                    return (
                      <button
                        key={state}
                        type="button"
                        disabled={busyId === selectedNode.id}
                        onClick={() => void setNodeState(selectedNode.id, state)}
                        className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                          isCurrent
                            ? "bg-primary text-primary-foreground"
                            : "border border-border text-foreground hover:border-foreground/35"
                        }`}
                      >
                        {state === "completed" ? (
                          <CheckCircle2 size={13} aria-hidden="true" />
                        ) : (
                          <CircleDot size={13} aria-hidden="true" />
                        )}
                        {state === "completed"
                          ? "Mark complete"
                          : state === "active"
                            ? "Set active"
                            : "Reset"}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Multi-choice Non-Linear Next Paths */}
              <div className="space-y-3 border-t border-border pt-5">
                <p className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
                  Connected actions
                </p>

                {linkedProject && (
                  <Link
                    href={`/projects/${linkedProject.slug}`}
                    className="tgl-subsurface flex items-center justify-between rounded-xl border border-[var(--accent)]/35 p-3.5 text-xs hover:border-[var(--accent)]"
                  >
                    <div className="flex items-center gap-2.5">
                      <FolderGit2 size={15} className="text-[var(--accent)]" aria-hidden="true" />
                      <div>
                        <p className="font-medium text-foreground">
                          Apply in project: {linkedProject.title}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          Submit work &amp; inspect {linkedProject.peerWork.length} peer showcase
                        </p>
                      </div>
                    </div>
                    <ArrowUpRight size={14} className="text-[var(--accent)]" aria-hidden="true" />
                  </Link>
                )}

                {relatedNodes.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-[11px] text-muted-foreground">Related concepts &amp; touchpoints:</p>
                    <div className="flex flex-wrap gap-2">
                      {relatedNodes.map((rel) => {
                        const inCurrentMap = nodes.some((n) => n.id === rel.id);
                        return inCurrentMap ? (
                          <button
                            key={rel.id}
                            type="button"
                            onClick={() => setSelectedId(rel.id)}
                            className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-[11px] text-foreground hover:border-foreground/35"
                          >
                            <Compass size={11} aria-hidden="true" /> {rel.title}
                          </button>
                        ) : (
                          <Link
                            key={rel.id}
                            href={`/pathways/${rel.pathwaySlug}`}
                            className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-[11px] text-foreground hover:border-foreground/35"
                          >
                            <Compass size={11} aria-hidden="true" /> {rel.title}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Ask Mentor Inline Touchpoint */}
              <form onSubmit={askMentor} className="space-y-3 border-t border-border pt-5">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 font-medium text-foreground">
                    <MessageSquare size={14} className="text-[var(--accent)]" aria-hidden="true" />
                    Ask mentor ({selectedNode.mentorName})
                  </span>
                  <span className="text-[11px] text-muted-foreground">{selectedNode.mentorRole}</span>
                </div>
                <textarea
                  rows={2}
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                  placeholder={`Ask ${selectedNode.mentorName} about ${selectedNode.title}...`}
                  className="w-full rounded-xl border border-border bg-input px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40"
                />
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <button
                    type="submit"
                    disabled={busyId === "ask-mentor" || questionText.trim().length < 5}
                    className="rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground disabled:opacity-45"
                  >
                    {busyId === "ask-mentor" ? "Sending…" : "Send to mentor"}
                  </button>
                  <Link
                    href="/learn/portfolio"
                    className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
                  >
                    <Users size={12} aria-hidden="true" /> View portfolio &amp; evidence
                  </Link>
                </div>
              </form>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Select a node on the map to inspect resources, linked projects, and mentor support.</p>
          )}
        </aside>
      </div>
    </div>
  );
}
