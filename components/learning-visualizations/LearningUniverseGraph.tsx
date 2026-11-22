"use client";

import { useMemo, useState } from "react";
import {
  Background,
  BaseEdge,
  Controls,
  Handle,
  Position,
  ReactFlow,
  getBezierPath,
  type Edge,
  type EdgeProps,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useReducedMotion } from "motion/react";
import {
  Award,
  CheckCircle2,
  Compass,
  List,
  Lock,
  Network,
} from "lucide-react";
import {
  SKILL_CATEGORIES,
  type SkillCategoryId,
  type SkillEdgeSnapshot,
  type SkillNodeSnapshot,
  type SkillNodeStatus,
} from "@/lib/learning/skills-universe";
import { SkillDetailPanel } from "./SkillDetailPanel";

type ConstellationNodeData = {
  skill: SkillNodeSnapshot;
  selected: boolean;
  onSelect: (id: string) => void;
  onHover: (skill: SkillNodeSnapshot | null) => void;
};

type ConstellationNode = Node<ConstellationNodeData, "skillNode">;

function SkillConstellationNode({ data }: NodeProps<ConstellationNode>) {
  const { skill, selected, onSelect, onHover } = data;
  const prefersReducedMotion = useReducedMotion();

  const statusConfig =
    skill.status === "acquired"
      ? {
          ring: "border-emerald-500/60 bg-emerald-500/12 dark:bg-emerald-950/55",
          text: "text-emerald-700 dark:text-emerald-300",
          label: "Acquired",
          icon: skill.kind === "capstone" ? Award : CheckCircle2,
        }
      : skill.status === "in_progress"
        ? {
            ring: "border-accent/65 bg-white/90 dark:bg-[#191624]",
            text: "text-accent",
            label: `${skill.progressPercent}%`,
            icon: Compass,
          }
        : {
            ring: "border-border bg-white/60 opacity-85 dark:bg-[#141416]",
            text: "text-muted-foreground",
            label: "Locked",
            icon: Lock,
          };

  const Icon = statusConfig.icon;

  return (
    <div className="relative">
      <Handle
        type="target"
        position={Position.Left}
        className="!h-2 !w-2 !border-0 !bg-border opacity-70"
      />
      <button
        type="button"
        onClick={() => onSelect(skill.id)}
        onMouseEnter={() => onHover(skill)}
        onMouseLeave={() => onHover(null)}
        aria-pressed={selected}
        aria-label={`${skill.title} (${skill.status.replace("_", " ")})`}
        className={`w-[228px] rounded-2xl border p-3.5 text-left shadow-sm backdrop-blur-md transition-all focus-visible:outline-2 focus-visible:outline-accent ${
          statusConfig.ring
        } ${
          selected
            ? "ring-2 ring-accent shadow-lg scale-[1.02]"
            : "hover:-translate-y-0.5 hover:border-foreground/35"
        }`}
      >
        <div className="flex items-center justify-between gap-2 text-[10px] font-medium">
          <span className="truncate uppercase tracking-[0.12em] text-muted-foreground">
            {skill.kind === "capstone" ? "Capstone" : skill.category.replace("_", " ")}
          </span>
          <span
            className={`inline-flex shrink-0 items-center gap-1 font-mono font-semibold tabular-nums ${statusConfig.text}`}
          >
            <Icon
              size={11}
              className={
                skill.status === "in_progress" && !prefersReducedMotion
                  ? "transition-transform"
                  : undefined
              }
              aria-hidden="true"
            />
            {statusConfig.label}
          </span>
        </div>

        <p className="mt-1.5 line-clamp-2 text-xs font-semibold leading-4 text-foreground">
          {skill.title}
        </p>

        <div className="mt-2.5 flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-foreground/10">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                skill.status === "acquired"
                  ? "bg-emerald-500"
                  : skill.status === "in_progress"
                    ? "bg-accent"
                    : "bg-muted-foreground/30"
              }`}
              style={{ width: `${skill.progressPercent}%` }}
            />
          </div>
          <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
            {skill.completedLessonsCount}/{skill.totalLessonsCount}
          </span>
        </div>
      </button>
      <Handle
        type="source"
        position={Position.Right}
        className="!h-2 !w-2 !border-0 !bg-border opacity-70"
      />
    </div>
  );
}

type ConstellationEdgeData = {
  highlighted: boolean;
  relationship: SkillEdgeSnapshot["relationship"];
};

function ConstellationEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
}: EdgeProps<Edge<ConstellationEdgeData>>) {
  const prefersReducedMotion = useReducedMotion();
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const highlighted = Boolean(data?.highlighted);
  const isCross = data?.relationship === "cross_track";

  return (
    <BaseEdge
      id={id}
      path={edgePath}
      style={{
        stroke: highlighted
          ? "var(--accent)"
          : "color-mix(in srgb, var(--foreground) 22%, transparent)",
        strokeWidth: highlighted ? 2.4 : 1.4,
        strokeDasharray: isCross ? "5 4" : highlighted && !prefersReducedMotion ? "8 4" : undefined,
      }}
    />
  );
}

const nodeTypes = {
  skillNode: SkillConstellationNode,
};

const edgeTypes = {
  constellation: ConstellationEdge,
};

export function LearningUniverseGraph({
  nodes: allSkillNodes,
  edges: allSkillEdges,
  selectedNodeId,
  onSelectNodeId,
}: {
  nodes: SkillNodeSnapshot[];
  edges: SkillEdgeSnapshot[];
  selectedNodeId: string;
  onSelectNodeId: (id: string) => void;
}) {
  const [viewMode, setViewMode] = useState<"graph" | "list">("graph");
  const [categoryFilter, setCategoryFilter] = useState<"all" | SkillCategoryId>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | SkillNodeStatus>("all");
  const [hoveredSkill, setHoveredSkill] = useState<SkillNodeSnapshot | null>(null);

  const filteredNodes = useMemo(() => {
    return allSkillNodes.filter((n) => {
      if (categoryFilter !== "all" && n.category !== categoryFilter) return false;
      if (statusFilter !== "all" && n.status !== statusFilter) return false;
      return true;
    });
  }, [allSkillNodes, categoryFilter, statusFilter]);

  const activeSelectedNode =
    allSkillNodes.find((n) => n.id === selectedNodeId) ??
    filteredNodes[0] ??
    allSkillNodes[0] ??
    null;

  const visibleNodeIds = useMemo(
    () => new Set(filteredNodes.map((n) => n.id)),
    [filteredNodes],
  );

  const flowNodes = useMemo<ConstellationNode[]>(() => {
    return filteredNodes.map((skill) => ({
      id: skill.id,
      type: "skillNode",
      position: skill.position,
      data: {
        skill,
        selected: activeSelectedNode?.id === skill.id,
        onSelect: onSelectNodeId,
        onHover: setHoveredSkill,
      },
      draggable: false,
      selectable: false,
    }));
  }, [filteredNodes, activeSelectedNode?.id, onSelectNodeId]);

  const flowEdges = useMemo<Edge<ConstellationEdgeData>[]>(() => {
    return allSkillEdges
      .filter((e) => visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target))
      .map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        type: "constellation",
        animated: e.highlighted,
        data: {
          highlighted: e.highlighted,
          relationship: e.relationship,
        },
      }));
  }, [allSkillEdges, visibleNodeIds]);

  return (
    <div className="space-y-5">
      {/* Constellation Header & Filters */}
      <div className="tgl-glass flex flex-wrap items-center justify-between gap-4 rounded-3xl p-5">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold tracking-[-0.03em] text-foreground">
            Learning Universe · Skill Constellation
          </h2>
          <p className="text-xs text-muted-foreground">
            Explore how every lesson, quiz, and capstone builds connected skills across disciplines. Click any node to inspect verified evidence.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* View Toggle: Spatial Graph vs Accessible List */}
          <div
            role="group"
            aria-label="Switch constellation view mode"
            className="tgl-subsurface flex items-center gap-1 rounded-full p-1"
          >
            <button
              type="button"
              onClick={() => setViewMode("graph")}
              aria-pressed={viewMode === "graph"}
              className={`inline-flex min-h-8 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                viewMode === "graph"
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Network size={13} aria-hidden="true" />
              Constellation
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              aria-pressed={viewMode === "list"}
              className={`inline-flex min-h-8 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                viewMode === "list"
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <List size={13} aria-hidden="true" />
              Accessible list
            </button>
          </div>
        </div>
      </div>

      {/* Category & Status Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          role="group"
          aria-label="Filter skills by domain"
          className="tgl-subsurface flex max-w-full items-center gap-1 overflow-x-auto rounded-xl p-1"
        >
          <button
            type="button"
            onClick={() => setCategoryFilter("all")}
            aria-pressed={categoryFilter === "all"}
            className={`min-h-8 rounded-lg px-3 py-1 text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
              categoryFilter === "all"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            All domains
          </button>
          {SKILL_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCategoryFilter(cat.id)}
              aria-pressed={categoryFilter === cat.id}
              className={`min-h-8 rounded-lg px-3 py-1 text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                categoryFilter === cat.id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {cat.shortLabel}
            </button>
          ))}
        </div>

        <div
          role="group"
          aria-label="Filter skills by status"
          className="tgl-subsurface flex items-center gap-1 overflow-x-auto rounded-xl p-1"
        >
          {(["all", "acquired", "in_progress", "locked"] as const).map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              aria-pressed={statusFilter === status}
              className={`min-h-8 rounded-lg px-3 py-1 text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                statusFilter === status
                  ? "bg-accent text-accent-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {status === "all"
                ? "All states"
                : status === "acquired"
                  ? "Acquired"
                  : status === "in_progress"
                    ? "In Progress"
                    : "Locked"}
            </button>
          ))}
        </div>
      </div>

      {/* Graph + Side Inspector */}
      <div className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr] lg:items-start">
        {viewMode === "graph" ? (
          <div
            data-testid="learning-universe-canvas"
            className="tgl-glass relative h-[500px] min-w-0 overflow-hidden rounded-3xl sm:h-[580px]"
          >
            {flowNodes.length === 0 ? (
              <div className="grid h-full place-items-center p-6 text-center text-xs text-muted-foreground">
                <div className="space-y-3">
                  <p>No skill nodes match these active filters.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setCategoryFilter("all");
                      setStatusFilter("all");
                    }}
                    className="rounded-xl bg-primary px-4 py-2 text-xs font-medium text-primary-foreground"
                  >
                    Reset filters
                  </button>
                </div>
              </div>
            ) : (
              <>
                <ReactFlow
                  nodes={flowNodes}
                  edges={flowEdges}
                  nodeTypes={nodeTypes}
                  edgeTypes={edgeTypes}
                  fitView
                  fitViewOptions={{ padding: 0.08, maxZoom: 1.05 }}
                  minZoom={0.45}
                  maxZoom={1.5}
                  nodesDraggable={false}
                  nodesConnectable={false}
                  elementsSelectable={false}
                >
                  <Background gap={26} size={1} color="rgba(128,128,128,0.16)" />
                  <Controls
                    showInteractive={false}
                    className="!rounded-2xl !border !border-border !bg-card !shadow-sm"
                  />
                </ReactFlow>

                {/* Subtle Legend & Hover Quick Preview */}
                <div className="pointer-events-none absolute inset-x-4 bottom-3 z-10 flex flex-wrap items-end justify-between gap-2">
                  {hoveredSkill ? (
                    <div className="tgl-glass-strong max-w-sm rounded-2xl px-4 py-2.5 text-xs">
                      <p className="font-semibold text-foreground">{hoveredSkill.title}</p>
                      <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">
                        {hoveredSkill.unlockRequirementText}
                      </p>
                    </div>
                  ) : (
                    <div className="tgl-glass-strong inline-flex flex-wrap items-center gap-3 rounded-xl px-3.5 py-1.5 text-[11px] text-muted-foreground">
                      <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-300">
                        <CheckCircle2 size={11} aria-hidden="true" /> Acquired
                      </span>
                      <span className="inline-flex items-center gap-1 text-accent">
                        <Compass size={11} aria-hidden="true" /> In Progress
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Lock size={11} aria-hidden="true" /> Locked
                      </span>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        ) : (
          <div
            data-testid="learning-universe-accessible-list"
            className="space-y-2.5"
          >
            {filteredNodes.length === 0 ? (
              <div className="tgl-glass rounded-3xl p-8 text-center text-xs text-muted-foreground">
                No skills match these filters.
              </div>
            ) : (
              filteredNodes.map((skill) => {
                const selected = activeSelectedNode?.id === skill.id;
                return (
                  <button
                    key={skill.id}
                    type="button"
                    onClick={() => onSelectNodeId(skill.id)}
                    className={`flex w-full items-center justify-between gap-4 rounded-2xl border p-4 text-left transition-colors ${
                      selected
                        ? "border-accent bg-accent/10"
                        : "tgl-glass hover:border-foreground/25"
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="text-[11px] text-muted-foreground">
                        {skill.categoryLabel} · {skill.courseTitle}
                      </p>
                      <p className="mt-1 truncate text-sm font-semibold text-foreground">
                        {skill.title}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {skill.unlockRequirementText}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-semibold ${
                          skill.status === "acquired"
                            ? "text-emerald-700 dark:text-emerald-300"
                            : skill.status === "in_progress"
                              ? "text-accent"
                              : "text-muted-foreground"
                        }`}
                      >
                        {skill.status === "acquired" ? (
                          <CheckCircle2 size={13} aria-hidden="true" />
                        ) : skill.status === "in_progress" ? (
                          <Compass size={13} aria-hidden="true" />
                        ) : (
                          <Lock size={13} aria-hidden="true" />
                        )}
                        {skill.status === "acquired"
                          ? "Acquired"
                          : skill.status === "in_progress"
                            ? `${skill.progressPercent}%`
                            : "Locked"}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        )}

        {/* Right Detail Inspector */}
        <div className="lg:sticky lg:top-24">
          <SkillDetailPanel
            node={activeSelectedNode}
            onSelectNode={(id) => onSelectNodeId(id)}
          />
        </div>
      </div>
    </div>
  );
}
