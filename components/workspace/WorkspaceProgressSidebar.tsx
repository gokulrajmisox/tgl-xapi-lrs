"use client";

import { CheckCircle2, Lock, Sparkles } from "lucide-react";
import type {
  ProgressionStepKey,
  UnifiedProgrammeProgression,
} from "@/lib/learning/progression";

export function WorkspaceProgressSidebar({
  progression,
  completedLessons,
  totalLessons,
  quizPassed,
  onSelectStep,
}: {
  progression: UnifiedProgrammeProgression;
  completedLessons: number;
  totalLessons: number;
  quizPassed: boolean;
  onSelectStep: (key: ProgressionStepKey) => void;
}) {
  return (
    <aside
      aria-label="Programme progress tracker"
      className="tgl-glass rounded-3xl p-5 sm:p-6 lg:sticky lg:top-24"
    >
      <div className="flex items-center justify-between gap-2 border-b border-border pb-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-accent">
            Workspace Progress
          </p>
          <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-foreground">
            {progression.overallProgressPercent}%
          </p>
        </div>
        <div className="text-right text-xs">
          <p className="font-mono font-semibold tabular-nums text-foreground">
            {progression.completedStepsCount}/{progression.totalStepsCount}
          </p>
          <p className="text-[11px] text-muted-foreground">Steps done</p>
        </div>
      </div>

      <div className="mt-4 space-y-3 text-xs">
        <div className="tgl-subsurface rounded-2xl p-3.5">
          <p className="text-[11px] font-medium text-muted-foreground">Current activity</p>
          <p className="mt-1 font-semibold text-foreground">{progression.currentActivity}</p>
        </div>

        <div className="tgl-subsurface rounded-2xl p-3.5">
          <p className="flex items-center gap-1.5 text-[11px] font-medium text-accent">
            <Sparkles size={12} aria-hidden="true" />
            Next requirement
          </p>
          <p className="mt-1 leading-5 text-foreground">{progression.nextRequirement}</p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="tgl-subsurface rounded-xl p-3">
            <p className="text-[11px] text-muted-foreground">Completed steps</p>
            <p className="mt-1 font-mono text-base font-semibold tabular-nums text-emerald-600 dark:text-emerald-300">
              {progression.completedStepsCount}
            </p>
          </div>
          <div className="tgl-subsurface rounded-xl p-3">
            <p className="text-[11px] text-muted-foreground">Remaining steps</p>
            <p className="mt-1 font-mono text-base font-semibold tabular-nums text-foreground">
              {progression.remainingStepsCount}
            </p>
          </div>
        </div>

        <div className="tgl-subsurface rounded-2xl p-3.5 text-[11px]">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Lessons</span>
            <span className="font-mono font-medium tabular-nums text-foreground">
              {completedLessons}/{totalLessons}
            </span>
          </div>
          <div className="mt-1.5 flex items-center justify-between">
            <span className="text-muted-foreground">Graded quiz</span>
            <span
              className={`font-medium ${
                quizPassed
                  ? "text-emerald-600 dark:text-emerald-300"
                  : "text-muted-foreground"
              }`}
            >
              {quizPassed ? "Passed" : "Pending"}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-5 border-t border-border pt-4">
        <p className="mb-2.5 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          9-Step Roadmap
        </p>
        <ol className="space-y-1.5">
          {progression.steps.map((step) => {
            const isCompleted = step.status === "completed";
            const isActive = step.status === "active";
            const isLocked = step.status === "locked";
            return (
              <li key={step.key}>
                <button
                  type="button"
                  disabled={isLocked}
                  onClick={() => onSelectStep(step.key)}
                  title={isLocked && step.lockReason ? step.lockReason : step.title}
                  className={`flex w-full items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-left text-xs transition-colors ${
                    isActive
                      ? "bg-accent/12 font-semibold text-accent"
                      : isCompleted
                        ? "text-foreground hover:bg-foreground/[0.04]"
                        : "cursor-not-allowed text-muted-foreground opacity-65"
                  }`}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    {isCompleted ? (
                      <CheckCircle2
                        size={13}
                        className="shrink-0 text-emerald-600 dark:text-emerald-300"
                        aria-hidden="true"
                      />
                    ) : isLocked ? (
                      <Lock size={12} className="shrink-0" aria-hidden="true" />
                    ) : (
                      <span className="size-2 shrink-0 rounded-full bg-accent" aria-hidden="true" />
                    )}
                    <span className="truncate">
                      {step.stepNumber}. {step.title}
                    </span>
                  </span>
                  <span className="shrink-0 text-[10px] font-medium">
                    {isCompleted ? "Done" : isActive ? "Active" : "Locked"}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>
    </aside>
  );
}
