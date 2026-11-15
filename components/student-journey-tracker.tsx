"use client";

import Link from "next/link";
import { motion } from "motion/react";
import {
  ArrowRight,
  Award,
  BookOpen,
  Briefcase,
  CheckCircle2,
  Circle,
  Clock3,
  FolderGit2,
} from "lucide-react";

export type JourneyStageState = {
  step: number;
  key:
    | "enrolled"
    | "learning"
    | "project"
    | "internship"
    | "completed"
    | "certificate";
  label: string;
  detail: string;
  status: "completed" | "active" | "upcoming";
  href: string;
};

const STAGE_ICONS = {
  enrolled: CheckCircle2,
  learning: BookOpen,
  project: FolderGit2,
  internship: Briefcase,
  completed: Clock3,
  certificate: Award,
} as const;

export function StudentJourneyTracker({ stages }: { stages: JourneyStageState[] }) {
  const completedCount = stages.filter((s) => s.status === "completed").length;

  return (
    <section
      aria-labelledby="journey-tracker-heading"
      className="tgl-glass rounded-3xl p-5 sm:p-7"
    >
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-accent">
            Your Programme Journey
          </p>
          <h2
            id="journey-tracker-heading"
            className="mt-1.5 text-lg font-semibold tracking-[-0.03em] text-foreground sm:text-xl"
          >
            Enrolled → Learning → Project → Internship → Completed → Certificate Issued
          </h2>
        </div>
        <span className="font-mono text-xs tabular-nums text-accent">
          {completedCount} of {stages.length} stages completed
        </span>
      </div>

      <ol className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {stages.map((stage, index) => {
          const Icon = STAGE_ICONS[stage.key];
          const isCompleted = stage.status === "completed";
          const isActive = stage.status === "active";

          return (
            <motion.li
              key={stage.key}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: index * 0.04 }}
              className="relative min-w-0"
            >
              <Link
                href={stage.href}
                className={`flex h-full min-h-[136px] flex-col justify-between rounded-2xl border p-4 transition-colors ${
                  isCompleted
                    ? "border-emerald-500/35 bg-emerald-500/10 hover:border-emerald-500/60"
                    : isActive
                      ? "border-accent/55 bg-accent/10 hover:border-accent"
                      : "border-border bg-background/50 hover:border-foreground/25"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[11px] text-muted-foreground">
                      0{stage.step}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 text-[11px] font-medium ${
                        isCompleted
                          ? "text-emerald-600 dark:text-emerald-300"
                          : isActive
                            ? "text-accent"
                            : "text-muted-foreground"
                      }`}
                    >
                      {isCompleted ? (
                        <>
                          <CheckCircle2 size={12} aria-hidden="true" />
                          Done
                        </>
                      ) : isActive ? (
                        <>
                          <Clock3 size={12} aria-hidden="true" />
                          Active
                        </>
                      ) : (
                        <>
                          <Circle size={11} aria-hidden="true" />
                          Next
                        </>
                      )}
                    </span>
                  </div>

                  <p className="mt-2.5 flex items-center gap-2 text-sm font-semibold text-foreground">
                    <Icon size={14} className="shrink-0 text-accent" aria-hidden="true" />
                    <span className="truncate">{stage.label}</span>
                  </p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{stage.detail}</p>
                </div>

                <span
                  className={`mt-3 inline-flex items-center gap-1 text-xs font-medium ${
                    isCompleted
                      ? "text-emerald-600 dark:text-emerald-300"
                      : isActive
                        ? "text-accent"
                        : "text-foreground/75"
                  }`}
                >
                  {isCompleted ? "View" : isActive ? "Open" : "Preview"}
                  <ArrowRight size={12} aria-hidden="true" />
                </span>
              </Link>
            </motion.li>
          );
        })}
      </ol>
    </section>
  );
}
