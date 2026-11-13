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
  CreditCard,
  FolderGit2,
} from "lucide-react";

export type JourneyStageState = {
  step: number;
  key: "pay" | "enrol" | "learn" | "project" | "internship" | "certificate";
  label: string;
  detail: string;
  status: "completed" | "active" | "upcoming";
  href: string;
};

const STAGE_ICONS = {
  pay: CreditCard,
  enrol: BookOpen,
  learn: BookOpen,
  project: FolderGit2,
  internship: Briefcase,
  certificate: Award,
} as const;

export function StudentJourneyTracker({ stages }: { stages: JourneyStageState[] }) {
  const completedCount = stages.filter((s) => s.status === "completed").length;

  return (
    <section
      aria-labelledby="journey-tracker-heading"
      className="rounded-3xl border border-white/10 bg-[#111111] p-6 sm:p-8"
    >
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#b9a9d6]">
            End-to-End Student Journey Tracker
          </p>
          <h2
            id="journey-tracker-heading"
            className="mt-2 text-2xl font-medium tracking-[-0.04em] text-[#f4f3ef]"
          >
            Pay → Enrol → Learn → Build Project → Complete Internship → Receive Certificate
          </h2>
        </div>
        <span className="font-mono text-xs tabular-nums text-[#b9a9d6]">
          {completedCount}/6 stages verified
        </span>
      </div>

      <ol className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
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
              className="relative"
            >
              <Link
                href={stage.href}
                className={`flex h-full flex-col justify-between rounded-2xl border p-4 transition-colors ${
                  isCompleted
                    ? "border-emerald-400/35 bg-emerald-950/20 hover:border-emerald-400/60"
                    : isActive
                      ? "border-[#b9a9d6]/50 bg-[#b9a9d6]/10 hover:border-[#b9a9d6]"
                      : "border-white/10 bg-black/25 hover:border-white/25"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[10px] text-white/50">
                      0{stage.step}
                    </span>
                    {isCompleted ? (
                      <CheckCircle2
                        size={14}
                        className="text-emerald-300"
                        aria-hidden="true"
                      />
                    ) : isActive ? (
                      <Icon size={14} className="text-[#b9a9d6]" aria-hidden="true" />
                    ) : (
                      <Circle size={13} className="text-white/25" aria-hidden="true" />
                    )}
                  </div>
                  <p className="mt-2.5 text-sm font-medium text-[#f4f3ef]">
                    {stage.label}
                  </p>
                  <p className="mt-1 text-[11px] leading-4 text-white/55">
                    {stage.detail}
                  </p>
                </div>

                <span
                  className={`mt-3 inline-flex items-center gap-1 text-[11px] font-medium ${
                    isCompleted
                      ? "text-emerald-300"
                      : isActive
                        ? "text-[#b9a9d6]"
                        : "text-white/45"
                  }`}
                >
                  {isCompleted ? "Done" : isActive ? "In progress" : "Open step"}
                  <ArrowRight size={11} aria-hidden="true" />
                </span>
              </Link>
            </motion.li>
          );
        })}
      </ol>
    </section>
  );
}
