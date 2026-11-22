"use client";

import Link from "next/link";
import { ArrowLeft, CheckCircle2, PlayCircle, ShieldCheck } from "lucide-react";
import type { PublicCourseSummary } from "@/lib/courses/store";
import type { UnifiedProgrammeProgression } from "@/lib/learning/progression";

export function LearningWorkspaceHeader({
  course,
  progression,
  enrolledAt,
  hasInternshipApplication,
  onContinueLearning,
}: {
  course: PublicCourseSummary;
  progression: UnifiedProgrammeProgression;
  enrolledAt: string | null;
  hasInternshipApplication: boolean;
  onContinueLearning: () => void;
}) {
  const joinedLabel = enrolledAt
    ? new Date(enrolledAt).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "Active enrolment";

  return (
    <header className="tgl-glass rounded-3xl p-6 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/learn"
          className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft size={14} aria-hidden="true" />
          Back to My Learning
        </Link>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
          <span className="font-medium text-accent">
            {course.category} · Course + {course.internshipDurationWeeks}-Week Internship
          </span>
          <span className="inline-flex items-center gap-1 font-medium text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 size={12} aria-hidden="true" />
            Enrolled {hasInternshipApplication ? "· Internship Active" : ""}
          </span>
        </div>
      </div>

      <div className="mt-5 grid gap-6 lg:grid-cols-[1.25fr_.75fr] lg:items-end">
        <div className="space-y-2.5">
          <h1 className="text-2xl font-semibold tracking-[-0.04em] text-foreground sm:text-4xl">
            {course.title}
          </h1>
          <p className="max-w-2xl text-xs leading-6 text-muted-foreground sm:text-sm">
            {course.subtitle}
          </p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span>
              Joined On: <strong className="tabular-nums text-foreground">{joinedLabel}</strong>
            </span>
            <span>
              Lead Mentor: <strong className="text-foreground">{course.mentorName}</strong>
            </span>
            <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-300">
              <ShieldCheck size={13} aria-hidden="true" />
              Certificate included (₹0 extra)
            </span>
          </div>
        </div>

        <div className="tgl-subsurface flex flex-col justify-between gap-4 rounded-2xl p-5">
          <div>
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-muted-foreground">Overall progress</span>
              <span className="font-mono text-base font-semibold tabular-nums text-accent">
                {progression.overallProgressPercent}%
              </span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-foreground/10">
              <div
                className="h-full rounded-full bg-accent transition-all duration-300"
                style={{ width: `${progression.overallProgressPercent}%` }}
              />
            </div>
            <p className="mt-2 text-[11px] tabular-nums text-muted-foreground">
              {progression.completedStepsCount}/{progression.totalStepsCount} stages ·{" "}
              {course.completedLessonCount}/{course.lessonCount} lessons ·{" "}
              {course.completedExerciseCount}/{course.totalExerciseCount} labs ·{" "}
              {course.passedModuleQuizCount}/{course.totalModuleQuizCount} module quizzes
            </p>
          </div>

          <button
            type="button"
            onClick={onContinueLearning}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-accent px-5 py-2.5 text-xs font-medium text-accent-foreground shadow-sm transition-opacity hover:opacity-90"
          >
            <PlayCircle size={15} aria-hidden="true" />
            {progression.completedStepsCount === progression.totalStepsCount
              ? "Review Completed Workspace"
              : "Continue Learning"}
          </button>
        </div>
      </div>
    </header>
  );
}
