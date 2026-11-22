"use client";

import Link from "next/link";
import {
  ArrowRight,
  Award,
  BookOpen,
  CalendarCheck2,
  CheckCircle2,
  Compass,
  FolderGit2,
  Lock,
  Sparkles,
  Wrench,
} from "lucide-react";
import type { SkillNodeSnapshot } from "@/lib/learning/skills-universe";

export function SkillDetailPanel({
  node,
  onSelectNode,
}: {
  node: SkillNodeSnapshot | null;
  onSelectNode?: (nodeId: string) => void;
}) {
  if (!node) {
    return (
      <aside className="tgl-glass rounded-3xl p-6 text-xs text-muted-foreground">
        Select any node in the Skill Constellation or list to inspect lessons, proficiency, verification evidence, and next steps.
      </aside>
    );
  }

  const statusMeta =
    node.status === "acquired"
      ? {
          label: "Acquired",
          icon: CheckCircle2,
          toneClass: "text-emerald-700 dark:text-emerald-300",
        }
      : node.status === "in_progress"
        ? {
            label: "In Progress",
            icon: Compass,
            toneClass: "text-accent",
          }
        : {
            label: "Locked",
            icon: Lock,
            toneClass: "text-muted-foreground",
          };

  const StatusIcon = statusMeta.icon;

  return (
    <aside
      aria-label={`Skill details for ${node.title}`}
      data-testid="skill-detail-panel"
      className="tgl-glass space-y-5 rounded-3xl p-6 text-xs"
    >
      {/* Header */}
      <div className="space-y-2 border-b border-border pb-4">
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
          <span className="font-medium text-accent">{node.categoryLabel}</span>
          <span className={`inline-flex items-center gap-1 font-semibold ${statusMeta.toneClass}`}>
            <StatusIcon size={13} aria-hidden="true" />
            {statusMeta.label} · {node.proficiencyLevel}
          </span>
        </div>

        <h3 className="text-lg font-semibold tracking-[-0.03em] text-foreground">
          {node.title}
        </h3>
        <p className="leading-5 text-muted-foreground">{node.description}</p>

        {/* Tools */}
        {node.tools.length > 0 && (
          <p className="flex items-start gap-1.5 pt-1 text-[11px] text-muted-foreground">
            <Wrench size={12} className="mt-0.5 shrink-0 text-accent" aria-hidden="true" />
            <span>Tools &amp; stack: {node.tools.join(" · ")}</span>
          </p>
        )}
      </div>

      {/* Progress & Unlock Status */}
      <div className="tgl-subsurface rounded-2xl p-4 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="font-medium text-foreground">Verified mastery</span>
          <span className="font-mono font-semibold tabular-nums text-accent">
            {node.progressPercent}%
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-foreground/10">
          <div
            className="h-full rounded-full bg-accent transition-all duration-300"
            style={{ width: `${node.progressPercent}%` }}
          />
        </div>
        <p className="text-[11px] leading-4 text-muted-foreground">
          {node.acquiredAt
            ? "All required lessons and verification evidence completed."
            : node.unlockRequirementText}
        </p>

        {node.acquiredAt && (
          <p className="flex items-center gap-1.5 pt-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
            <CalendarCheck2 size={12} aria-hidden="true" />
            Verified acquisition ·{" "}
            {new Date(node.acquiredAt).toLocaleDateString("en-IN", { dateStyle: "medium" })}
          </p>
        )}
      </div>

      {/* Course & Assessment Link */}
      <div className="tgl-subsurface rounded-2xl p-4 space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] text-muted-foreground">Related programme</p>
            <p className="mt-0.5 font-semibold text-foreground">{node.courseTitle}</p>
          </div>
          {node.assessmentScorePercent !== null && (
            <span className="shrink-0 font-mono text-xs font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">
              {node.assessmentScorePercent}% quiz
            </span>
          )}
        </div>

        <Link
          href={
            node.relatedLessons[0]?.href ?? `/programmes/${encodeURIComponent(node.courseSlug)}`
          }
          className="inline-flex min-h-9 w-full items-center justify-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          {node.courseEnrolled ? "Open in Learning Workspace" : "Preview & Enrol Programme"}
          <ArrowRight size={13} aria-hidden="true" />
        </Link>
      </div>

      {/* Lessons Contributing to Skill */}
      {node.relatedLessons.length > 0 && (
        <div className="space-y-2 border-t border-border pt-4">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            <BookOpen size={12} className="text-accent" aria-hidden="true" />
            Contributing Lessons ({node.completedLessonsCount}/{node.totalLessonsCount})
          </p>
          <ul className="space-y-1.5">
            {node.relatedLessons.map((les) => (
              <li key={les.lessonId}>
                <Link
                  href={les.href}
                  className="tgl-subsurface flex items-center justify-between gap-2.5 rounded-xl px-3 py-2 transition-colors hover:border-foreground/25"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    {les.completed ? (
                      <CheckCircle2
                        size={13}
                        className="shrink-0 text-emerald-600 dark:text-emerald-300"
                        aria-hidden="true"
                      />
                    ) : node.courseEnrolled ? (
                      <Compass size={13} className="shrink-0 text-accent" aria-hidden="true" />
                    ) : (
                      <Lock
                        size={13}
                        className="shrink-0 text-muted-foreground"
                        aria-hidden="true"
                      />
                    )}
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">{les.title}</p>
                      <p className="truncate text-[10px] text-muted-foreground">
                        {les.moduleTitle} · {les.durationLabel}
                      </p>
                    </div>
                  </div>
                  <ArrowRight size={12} className="shrink-0 text-muted-foreground" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Evidence Records */}
      {node.evidenceItems.length > 0 && (
        <div className="space-y-2 border-t border-border pt-4">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            {node.kind === "capstone" ? (
              <FolderGit2 size={12} className="text-accent" aria-hidden="true" />
            ) : (
              <Award size={12} className="text-accent" aria-hidden="true" />
            )}
            Practical &amp; Assessment Evidence
          </p>
          <ul className="space-y-1.5">
            {node.evidenceItems.slice(0, 5).map((ev) => (
              <li
                key={ev.id}
                className="flex items-start justify-between gap-2 text-[11px]"
              >
                <span className="flex items-start gap-1.5 text-foreground/85">
                  {ev.completed ? (
                    <CheckCircle2
                      size={12}
                      className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-300"
                      aria-hidden="true"
                    />
                  ) : (
                    <span
                      aria-hidden="true"
                      className="mt-1.5 size-1.5 shrink-0 rounded-full bg-muted-foreground/45"
                    />
                  )}
                  <span>{ev.title}</span>
                </span>
                <span className="shrink-0 text-[10px] text-muted-foreground">
                  {ev.completed ? "Verified" : "Pending"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Recommended Next Skills */}
      {node.recommendedNextSkills.length > 0 && (
        <div className="space-y-2 border-t border-border pt-4">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            <Sparkles size={12} className="text-accent" aria-hidden="true" />
            Recommended Next Skills
          </p>
          <div className="flex flex-wrap gap-2">
            {node.recommendedNextSkills.map((next) => (
              <button
                key={next.id}
                type="button"
                onClick={() => onSelectNode?.(next.id)}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-[11px] font-medium text-foreground transition-colors hover:border-accent"
              >
                <span>{next.title}</span>
                <ArrowRight size={11} className="text-accent" aria-hidden="true" />
              </button>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}
