"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  Award,
  BookOpen,
  Clock,
  FolderGit2,
  Sparkles,
  Target,
} from "lucide-react";
import type { LearningUniverseMetrics } from "@/lib/learning/skills-universe";

function AnimatedCounter({
  value,
  suffix = "",
  decimals = 0,
}: {
  value: number;
  suffix?: string;
  decimals?: number;
}) {
  const prefersReducedMotion = useReducedMotion();
  const [display, setDisplay] = useState(value);
  const [lastTarget, setLastTarget] = useState(value);

  useEffect(() => {
    if (prefersReducedMotion || value === lastTarget) {
      setDisplay(value);
      setLastTarget(value);
      return;
    }
    const from = lastTarget;
    const delta = value - from;
    const start = performance.now();
    const durationMs = 560;
    let raf = 0;

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(from + delta * eased);
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        setDisplay(value);
        setLastTarget(value);
      }
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, lastTarget, prefersReducedMotion]);

  const formatted =
    decimals > 0 ? display.toFixed(decimals) : Math.round(display).toString();

  return (
    <span className="tabular-nums">
      {formatted}
      {suffix}
    </span>
  );
}

function ProgressRing({
  percent,
  size = 38,
  strokeWidth = 3.5,
}: {
  percent: number;
  size?: number;
  strokeWidth?: number;
}) {
  const prefersReducedMotion = useReducedMotion();
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, percent));
  const targetOffset = circumference - (clamped / 100) * circumference;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="shrink-0 -rotate-90"
      aria-hidden="true"
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeOpacity={0.14}
        strokeWidth={strokeWidth}
      />
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="var(--accent)"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        initial={{ strokeDashoffset: prefersReducedMotion ? targetOffset : circumference }}
        animate={{ strokeDashoffset: targetOffset }}
        transition={{ duration: prefersReducedMotion ? 0 : 0.75, ease: [0.22, 1, 0.36, 1] }}
      />
    </svg>
  );
}

export function AnimatedLearningMetrics({
  metrics,
}: {
  metrics: LearningUniverseMetrics;
}) {
  const skillsPct =
    metrics.totalSkillsCount > 0
      ? Math.round((metrics.skillsAcquiredCount / metrics.totalSkillsCount) * 100)
      : 0;
  const lessonsPct =
    metrics.totalEnrolledLessonsCount > 0
      ? Math.round(
          (metrics.lessonsCompletedCount / metrics.totalEnrolledLessonsCount) * 100,
        )
      : 0;

  return (
    <section
      aria-label="Verified learning performance metrics"
      className="grid grid-cols-2 gap-3 lg:grid-cols-5"
    >
      {/* 1. Skills Acquired */}
      <div className="tgl-glass flex items-center justify-between gap-2 rounded-2xl p-3.5 sm:p-4">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-[11px] font-medium leading-tight text-muted-foreground">
            <Sparkles size={12} className="shrink-0 text-accent" aria-hidden="true" />
            <span>Skills acquired</span>
          </p>
          <p className="mt-1.5 font-mono text-2xl font-semibold tabular-nums text-foreground">
            <AnimatedCounter value={metrics.skillsAcquiredCount} />
            <span className="text-sm font-normal text-muted-foreground">
              /{metrics.totalSkillsCount}
            </span>
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground tabular-nums">
            {metrics.skillsInProgressCount} in progress
          </p>
        </div>
        <ProgressRing percent={skillsPct} />
      </div>

      {/* 2. Lessons Completed */}
      <div className="tgl-glass flex items-center justify-between gap-2 rounded-2xl p-3.5 sm:p-4">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-[11px] font-medium leading-tight text-muted-foreground">
            <BookOpen size={12} className="shrink-0 text-accent" aria-hidden="true" />
            <span>Lessons completed</span>
          </p>
          <p className="mt-1.5 font-mono text-2xl font-semibold tabular-nums text-foreground">
            <AnimatedCounter value={metrics.lessonsCompletedCount} />
            <span className="text-sm font-normal text-muted-foreground">
              /{metrics.totalEnrolledLessonsCount}
            </span>
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground tabular-nums">
            {metrics.exercisesCompletedCount} exercises done
          </p>
        </div>
        <ProgressRing percent={lessonsPct} />
      </div>

      {/* 3. Projects Approved */}
      <div className="tgl-glass flex flex-col justify-between rounded-2xl p-3.5 sm:p-4">
        <p className="flex items-center gap-1.5 text-[11px] font-medium leading-tight text-muted-foreground">
          <FolderGit2 size={12} className="shrink-0 text-accent" aria-hidden="true" />
          <span>Projects approved</span>
        </p>
        <p className="mt-1.5 font-mono text-2xl font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">
          <AnimatedCounter value={metrics.projectsApprovedCount} />
        </p>
        <p className="mt-0.5 text-[11px] text-muted-foreground tabular-nums">
          {metrics.certificatesIssuedCount} certificate
          {metrics.certificatesIssuedCount === 1 ? "" : "s"} issued
        </p>
      </div>

      {/* 4. Learning Hours */}
      <div className="tgl-glass flex flex-col justify-between rounded-2xl p-3.5 sm:p-4">
        <p className="flex items-center gap-1.5 text-[11px] font-medium leading-tight text-muted-foreground">
          <Clock size={12} className="shrink-0 text-accent" aria-hidden="true" />
          <span>Verified study time</span>
        </p>
        <p className="mt-1.5 font-mono text-2xl font-semibold tabular-nums text-foreground">
          <AnimatedCounter value={metrics.learningHoursCompleted} decimals={1} suffix="h" />
        </p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          From completed work
        </p>
      </div>

      {/* 5. Assessment Score */}
      <div className="tgl-glass col-span-2 flex flex-col justify-between rounded-2xl p-3.5 sm:p-4 lg:col-span-1">
        <p className="flex items-center gap-1.5 text-[11px] font-medium leading-tight text-muted-foreground">
          {metrics.assessmentsPassedCount > 0 ? (
            <Award size={12} className="shrink-0 text-accent" aria-hidden="true" />
          ) : (
            <Target size={12} className="shrink-0 text-accent" aria-hidden="true" />
          )}
          <span>Quiz performance</span>
        </p>
        <p className="mt-1.5 font-mono text-2xl font-semibold tabular-nums text-foreground">
          {metrics.assessmentAveragePercent !== null ? (
            <AnimatedCounter value={metrics.assessmentAveragePercent} suffix="%" />
          ) : (
            "—"
          )}
        </p>
        <p className="mt-0.5 text-[11px] text-muted-foreground tabular-nums">
          {metrics.assessmentsPassedCount} quiz
          {metrics.assessmentsPassedCount === 1 ? "" : "zes"} passed
        </p>
      </div>
    </section>
  );
}
