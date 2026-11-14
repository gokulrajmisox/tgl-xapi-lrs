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
      className="rounded-3xl border border-white/10 bg-[#111111] p-5 sm:p-7"
    >
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-[#b9a9d6]">
            Your Programme Journey
          </p>
          <h2
            id="journey-tracker-heading"
            className="mt-1.5 text-lg font-medium tracking-[-0.03em] text-[#f4f3ef] sm:text-xl"
          >
            Enrolled → Learning → Project → Internship → Completed → Certificate Issued
          </h2>
        </div>
        <span className="font-mono text-xs tabular-nums text-[#b9a9d6]">
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
                className={`flex min-h-[136px] h-full flex-col justify-between rounded-2xl border p-4 transition-colors ${
                  isCompleted
                    ? "border-emerald-400/35 bg-emerald-950/20 hover:border-emerald-400/60"
                    : isActive
                      ? "border-[#b9a9d6]/55 bg-[#b9a9d6]/12 hover:border-[#b9a9d6]"
                      : "border-white/10 bg-black/25 hover:border-white/25"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[11px] text-white/55">
                      0{stage.step}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 text-[11px] font-medium ${
                        isCompleted
                          ? "text-emerald-300"
                          : isActive
                            ? "text-[#b9a9d6]"
                            : "text-white/55"
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

                  <p className="mt-2.5 flex items-center gap-2 text-sm font-medium text-[#f4f3ef]">
                    <Icon size={14} className="shrink-0 text-[#b9a9d6]" aria-hidden="true" />
                    <span className="truncate">{stage.label}</span>
                  </p>
                  <p className="mt-1 text-xs leading-5 text-white/65">{stage.detail}</p>
                </div>

                <span
                  className={`mt-3 inline-flex items-center gap-1 text-xs font-medium ${
                    isCompleted
                      ? "text-emerald-300"
                      : isActive
                        ? "text-[#b9a9d6]"
                        : "text-white/70"
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
