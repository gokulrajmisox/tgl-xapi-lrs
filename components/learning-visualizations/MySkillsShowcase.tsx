"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  CheckCircle2,
  Compass,
  Lock,
  Network,
  Wrench,
} from "lucide-react";
import type {
  SkillCategorySummary,
  SkillNodeSnapshot,
} from "@/lib/learning/skills-universe";
import { SkillDetailPanel } from "./SkillDetailPanel";

export function MySkillsShowcase({
  categories,
  nodes,
  selectedNodeId,
  onSelectNodeId,
  onOpenConstellation,
}: {
  categories: SkillCategorySummary[];
  nodes: SkillNodeSnapshot[];
  selectedNodeId: string;
  onSelectNodeId: (id: string) => void;
  onOpenConstellation: (nodeId?: string) => void;
}) {
  const chartData = useMemo(
    () =>
      categories.map((c) => ({
        name: c.shortLabel,
        Acquired: c.acquiredCount,
        "In Progress": c.inProgressCount,
        Locked: c.lockedCount,
      })),
    [categories],
  );

  const selectedNode =
    nodes.find((n) => n.id === selectedNodeId) ?? nodes[0] ?? null;

  return (
    <div className="space-y-6">
      {/* Category Distribution Chart */}
      <section className="tgl-glass rounded-3xl p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold tracking-[-0.03em] text-foreground">
              What I Have Learned · Domain Skill Matrix
            </h2>
            <p className="text-xs text-muted-foreground">
              Every skill listed below reflects verified lessons, practical exercises, quizzes, and approved project deliverables — never enrollment alone.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onOpenConstellation(selectedNode?.id)}
            className="inline-flex min-h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-accent px-4 py-2 text-xs font-medium text-accent-foreground transition-opacity hover:opacity-90"
          >
            <Network size={13} aria-hidden="true" />
            Explore in Constellation
          </button>
        </div>

        <div className="mt-5 h-[220px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 8, right: 16, left: -18, bottom: 4 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="rgba(128,128,128,0.18)"
              />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: "currentColor" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11, fill: "currentColor" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                cursor={{ fill: "rgba(128,128,128,0.08)" }}
                contentStyle={{
                  borderRadius: "14px",
                  border: "1px solid var(--border)",
                  backgroundColor: "var(--popover)",
                  color: "var(--popover-foreground)",
                  fontSize: "12px",
                }}
              />
              <Bar dataKey="Acquired" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
              <Bar dataKey="In Progress" stackId="a" fill="var(--accent)" radius={[0, 0, 0, 0]} />
              <Bar
                dataKey="Locked"
                stackId="a"
                fill="rgba(128,128,128,0.28)"
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Categorized Skills Grid + Live Inspector */}
      <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr] lg:items-start">
        <div className="space-y-4">
          {categories.map((cat) => (
            <section key={cat.id} className="tgl-glass rounded-3xl p-5 sm:p-6">
              <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border pb-3">
                <div>
                  <h3 className="text-base font-semibold tracking-[-0.02em] text-foreground">
                    {cat.label}
                  </h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">{cat.description}</p>
                </div>
                <span className="font-mono text-xs font-semibold tabular-nums text-accent">
                  {cat.acquiredCount}/{cat.totalCount} acquired
                </span>
              </div>

              {cat.toolsPracticed.length > 0 && (
                <p className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Wrench size={12} className="shrink-0 text-accent" aria-hidden="true" />
                  <span>Practiced tools: {cat.toolsPracticed.slice(0, 5).join(" · ")}</span>
                </p>
              )}

              <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
                {cat.nodes.map((node) => {
                  const selected = selectedNode?.id === node.id;
                  return (
                    <button
                      key={node.id}
                      type="button"
                      onClick={() => onSelectNodeId(node.id)}
                      className={`flex flex-col justify-between gap-2 rounded-2xl border p-3.5 text-left transition-colors ${
                        selected
                          ? "border-accent bg-accent/10"
                          : "tgl-subsurface hover:border-foreground/25"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 text-[11px]">
                        <span className="text-muted-foreground">{node.proficiencyLevel}</span>
                        <span
                          className={`inline-flex items-center gap-1 font-mono font-semibold tabular-nums ${
                            node.status === "acquired"
                              ? "text-emerald-700 dark:text-emerald-300"
                              : node.status === "in_progress"
                                ? "text-accent"
                                : "text-muted-foreground"
                          }`}
                        >
                          {node.status === "acquired" ? (
                            <CheckCircle2 size={12} aria-hidden="true" />
                          ) : node.status === "in_progress" ? (
                            <Compass size={12} aria-hidden="true" />
                          ) : (
                            <Lock size={11} aria-hidden="true" />
                          )}
                          {node.status === "acquired"
                            ? "Acquired"
                            : node.status === "in_progress"
                              ? `${node.progressPercent}%`
                              : "Locked"}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-foreground">{node.title}</p>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-foreground/10">
                        <div
                          className={`h-full rounded-full ${
                            node.status === "acquired"
                              ? "bg-emerald-500"
                              : node.status === "in_progress"
                                ? "bg-accent"
                                : "bg-muted-foreground/30"
                          }`}
                          style={{ width: `${node.progressPercent}%` }}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        <div className="lg:sticky lg:top-24">
          <SkillDetailPanel
            node={selectedNode}
            onSelectNode={(id) => onSelectNodeId(id)}
          />
        </div>
      </div>
    </div>
  );
}
