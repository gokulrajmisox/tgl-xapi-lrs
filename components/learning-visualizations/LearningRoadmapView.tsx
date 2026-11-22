"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import {
  ArrowRight,
  Award,
  BookOpen,
  Briefcase,
  CheckCircle2,
  Compass,
  FolderGit2,
  Lock,
  PlayCircle,
  Sparkles,
} from "lucide-react";
import type { ProgrammeRoadmapTrack } from "@/lib/learning/skills-universe";

export function LearningRoadmapView({
  roadmaps,
  onInspectSkill,
}: {
  roadmaps: ProgrammeRoadmapTrack[];
  onInspectSkill?: (skillId: string) => void;
}) {
  const prefersReducedMotion = useReducedMotion();
  const [selectedCourseSlug, setSelectedCourseSlug] = useState<string>(
    roadmaps[0]?.courseSlug ?? "",
  );

  const activeRoadmap =
    roadmaps.find((r) => r.courseSlug === selectedCourseSlug) ?? roadmaps[0] ?? null;

  if (!activeRoadmap) {
    return (
      <div className="tgl-glass rounded-3xl p-8 text-center text-xs text-muted-foreground">
        No programmes loaded yet. Explore the catalog to begin a structured roadmap.
      </div>
    );
  }

  const projectDone = activeRoadmap.projectStatus === "approved";

  return (
    <div className="space-y-6">
      {/* Programme Selector Strip */}
      <div className="tgl-glass space-y-4 rounded-3xl p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold tracking-[-0.03em] text-foreground">
              Interactive Learning Roadmap
            </h2>
            <p className="text-xs text-muted-foreground">
              Select a programme to inspect every module milestone, quiz result, skill unlocked, capstone review, and certificate path.
            </p>
          </div>
          <Link
            href={activeRoadmap.continueHref}
            className="inline-flex min-h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-accent px-4 py-2 text-xs font-medium text-accent-foreground transition-opacity hover:opacity-90"
          >
            <PlayCircle size={13} aria-hidden="true" />
            {activeRoadmap.enrolled ? "Open Full Workspace" : "Preview & Enrol"}
          </Link>
        </div>

        <div
          role="group"
          aria-label="Select programme roadmap"
          className="tgl-subsurface grid gap-1.5 rounded-2xl p-1.5 sm:grid-cols-2 lg:grid-cols-3"
        >
          {roadmaps.map((rm) => {
            const selected = rm.courseSlug === activeRoadmap.courseSlug;
            return (
              <button
                key={rm.courseId}
                type="button"
                onClick={() => setSelectedCourseSlug(rm.courseSlug)}
                aria-pressed={selected}
                className={`inline-flex min-h-9 items-center justify-between gap-2 rounded-xl px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${
                  selected
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground"
                }`}
              >
                <span className="flex min-w-0 items-center gap-1.5 truncate">
                  {rm.enrolled ? (
                    <CheckCircle2
                      size={12}
                      className={
                        rm.overallProgressPercent === 100
                          ? "shrink-0 text-emerald-400"
                          : selected
                            ? "shrink-0 text-primary-foreground"
                            : "shrink-0 text-accent"
                      }
                      aria-hidden="true"
                    />
                  ) : (
                    <Lock size={12} className="shrink-0" aria-hidden="true" />
                  )}
                  <span className="truncate">
                    {rm.courseTitle.replace(" Internship Programme", "")}
                  </span>
                </span>
                <span className="shrink-0 font-mono text-[11px] tabular-nums opacity-80">
                  {rm.enrolled ? `${rm.overallProgressPercent}%` : "Locked"}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Programme Header Metrics Bar */}
      <div className="tgl-glass rounded-3xl p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-[11px] font-medium text-accent">
              {activeRoadmap.category} · {activeRoadmap.enrolled ? "Active Enrolment" : "Locked Preview"}
            </p>
            <h3 className="text-xl font-semibold tracking-[-0.03em] text-foreground">
              {activeRoadmap.courseTitle}
            </h3>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs tabular-nums">
            <div>
              <p className="text-[11px] text-muted-foreground">Lessons</p>
              <p className="font-mono font-semibold text-foreground">
                {activeRoadmap.completedLessonsCount}/{activeRoadmap.totalLessonsCount}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">Final Quiz</p>
              <p className="font-mono font-semibold text-foreground">
                {activeRoadmap.quizScorePercent !== null
                  ? `${activeRoadmap.quizScorePercent}%`
                  : "Pending"}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">Internship Sprints</p>
              <p className="font-mono font-semibold text-foreground">
                {activeRoadmap.approvedInternshipTasks}/{activeRoadmap.totalInternshipTasks}
              </p>
            </div>
          </div>
        </div>

        {/* Animated Full Track Bar */}
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-foreground/10">
          <motion.div
            className="h-full rounded-full bg-accent"
            initial={{ width: prefersReducedMotion ? `${activeRoadmap.overallProgressPercent}%` : "0%" }}
            animate={{ width: `${activeRoadmap.overallProgressPercent}%` }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.65, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
      </div>

      {/* Connected Vertical Animated Path of Modules -> Project -> Certificate */}
      <div className="relative pl-6 sm:pl-9">
        {/* Background static vertical line */}
        <div
          aria-hidden="true"
          className="absolute bottom-6 left-3 top-6 w-0.5 rounded-full bg-border sm:left-4"
        />
        {/* Animated vertical progress fill */}
        <motion.div
          aria-hidden="true"
          className="absolute left-3 top-6 w-0.5 origin-top rounded-full bg-accent sm:left-4"
          style={{ height: "calc(100% - 3rem)" }}
          initial={{
            scaleY: prefersReducedMotion ? activeRoadmap.overallProgressPercent / 100 : 0,
          }}
          animate={{ scaleY: Math.max(0.05, activeRoadmap.overallProgressPercent / 100) }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.75, ease: [0.22, 1, 0.36, 1] }}
        />

        <ol className="space-y-5">
          {activeRoadmap.modules.map((mod) => {
            const nodeTone =
              mod.status === "completed"
                ? "border-emerald-500 bg-emerald-500 text-white"
                : mod.status === "in_progress"
                  ? "border-accent bg-accent text-accent-foreground"
                  : "border-border bg-card text-muted-foreground";

            return (
              <li key={mod.moduleId} className="relative">
                {/* Node Circle */}
                <span
                  aria-hidden="true"
                  className={`absolute -left-[22px] top-6 grid size-6 place-items-center rounded-full border-2 text-[10px] font-bold shadow-sm sm:-left-[29px] ${nodeTone}`}
                >
                  {mod.status === "completed" ? (
                    <CheckCircle2 size={13} />
                  ) : mod.status === "in_progress" ? (
                    <Compass size={13} />
                  ) : (
                    <Lock size={11} />
                  )}
                </span>

                <article className="tgl-glass rounded-3xl p-5 sm:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="font-mono text-[11px] font-semibold text-accent tabular-nums">
                        Module 0{mod.sortOrder} · {mod.estimatedMinutes} min ·{" "}
                        {mod.completedLessonsCount}/{mod.totalLessonsCount} lessons
                      </p>
                      <h4 className="text-base font-semibold tracking-[-0.02em] text-foreground">
                        {mod.title}
                      </h4>
                      <p className="text-xs leading-5 text-muted-foreground">{mod.summary}</p>
                    </div>

                    <Link
                      href={mod.continueHref}
                      className="inline-flex min-h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-medium text-foreground hover:border-foreground/30"
                    >
                      {activeRoadmap.enrolled
                        ? mod.status === "completed"
                          ? "Review Module"
                          : "Study Module"
                        : "Preview"}
                      <ArrowRight size={12} aria-hidden="true" />
                    </Link>
                  </div>

                  {/* Lesson Checklist */}
                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    {mod.lessons.map((les) => (
                      <Link
                        key={les.id}
                        href={les.href}
                        className="tgl-subsurface flex items-center justify-between gap-2.5 rounded-xl px-3 py-2 text-xs transition-colors hover:border-foreground/25"
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          {les.completed ? (
                            <CheckCircle2
                              size={13}
                              className="shrink-0 text-emerald-600 dark:text-emerald-300"
                              aria-hidden="true"
                            />
                          ) : activeRoadmap.enrolled ? (
                            <BookOpen
                              size={13}
                              className="shrink-0 text-accent"
                              aria-hidden="true"
                            />
                          ) : (
                            <Lock
                              size={12}
                              className="shrink-0 text-muted-foreground"
                              aria-hidden="true"
                            />
                          )}
                          <span className="truncate font-medium text-foreground">{les.title}</span>
                        </span>
                        <span className="shrink-0 text-[10px] text-muted-foreground">
                          {les.durationLabel}
                        </span>
                      </Link>
                    ))}
                  </div>

                  {/* Footer Metadata: Checkpoint Quiz, Exercises & Associated Skills */}
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3 text-[11px]">
                    <div className="flex flex-wrap items-center gap-3 text-muted-foreground tabular-nums">
                      <span>
                        Exercises:{" "}
                        <strong className="text-foreground">
                          {mod.exercisesCompletedCount}/{mod.totalExercisesCount}
                        </strong>
                      </span>
                      {mod.hasModuleQuiz && (
                        <span>
                          Module quiz:{" "}
                          <strong
                            className={
                              mod.moduleQuizPassed
                                ? "text-emerald-700 dark:text-emerald-300"
                                : "text-foreground"
                            }
                          >
                            {mod.moduleQuizScorePercent !== null
                              ? `${mod.moduleQuizScorePercent}%`
                              : "Pending"}
                          </strong>
                        </span>
                      )}
                    </div>

                    {mod.skills.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Sparkles size={11} className="text-accent" aria-hidden="true" />
                        {mod.skills.map((s) => (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => onInspectSkill?.(s.id)}
                            className={`rounded-lg border px-2.5 py-0.5 text-[11px] font-medium transition-colors ${
                              s.status === "acquired"
                                ? "border-emerald-500/35 bg-emerald-500/12 text-emerald-800 dark:text-emerald-200"
                                : s.status === "in_progress"
                                  ? "border-accent/35 bg-accent/12 text-accent"
                                  : "border-border bg-card/60 text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            {s.title}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </article>
              </li>
            );
          })}

          {/* Project Milestone Node */}
          <li className="relative">
            <span
              aria-hidden="true"
              className={`absolute -left-[22px] top-6 grid size-6 place-items-center rounded-full border-2 shadow-sm sm:-left-[29px] ${
                projectDone
                  ? "border-emerald-500 bg-emerald-500 text-white"
                  : activeRoadmap.enrolled
                    ? "border-accent bg-card text-accent"
                    : "border-border bg-card text-muted-foreground"
              }`}
            >
              <FolderGit2 size={12} />
            </span>

            <article className="tgl-glass flex flex-wrap items-center justify-between gap-4 rounded-3xl p-5 sm:p-6">
              <div className="space-y-1">
                <p className="font-mono text-[11px] font-semibold text-accent">
                  Capstone Milestone · {activeRoadmap.projectStatus.replaceAll("_", " ")}
                </p>
                <h4 className="text-base font-semibold text-foreground">
                  {activeRoadmap.projectTitle}
                </h4>
                {activeRoadmap.projectFeedback ? (
                  <p className="text-xs text-muted-foreground">
                    Mentor review: {activeRoadmap.projectFeedback}
                  </p>
                ) : (
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Briefcase size={12} className="text-accent" aria-hidden="true" />
                    Pairs with {activeRoadmap.internshipTitle} (
                    {activeRoadmap.approvedInternshipTasks}/{activeRoadmap.totalInternshipTasks}{" "}
                    tasks approved)
                  </p>
                )}
              </div>

              <Link
                href={`/programmes/${activeRoadmap.courseSlug}#project-build`}
                className="inline-flex min-h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground"
              >
                {projectDone ? "View Approved Project" : "Open Project Brief"}
                <ArrowRight size={12} aria-hidden="true" />
              </Link>
            </article>
          </li>

          {/* Official Certificate Milestone Node */}
          <li className="relative">
            <span
              aria-hidden="true"
              className={`absolute -left-[22px] top-6 grid size-6 place-items-center rounded-full border-2 shadow-sm sm:-left-[29px] ${
                activeRoadmap.certificateIssued
                  ? "border-emerald-500 bg-emerald-500 text-white"
                  : "border-border bg-card text-muted-foreground"
              }`}
            >
              <Award size={12} />
            </span>

            <article className="tgl-glass flex flex-wrap items-center justify-between gap-4 rounded-3xl p-5 sm:p-6">
              <div className="space-y-1">
                <p className="font-mono text-[11px] font-semibold text-accent">
                  Final Credential · {activeRoadmap.certificateIssued ? "Issued" : "Locked until approval"}
                </p>
                <h4 className="text-base font-semibold text-foreground">
                  Included Internship Completion Certificate (₹0 extra)
                </h4>
                <p className="text-xs text-muted-foreground">
                  {activeRoadmap.certificateIssued && activeRoadmap.certificateId
                    ? `Credential ${activeRoadmap.certificateId} verified and ready for PDF download.`
                    : "Unlocks automatically upon module completion, project approval, and internship review."}
                </p>
              </div>

              <Link
                href={
                  activeRoadmap.certificateIssued
                    ? "/certificates"
                    : `/programmes/${activeRoadmap.courseSlug}#certificate-claim`
                }
                className="inline-flex min-h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-border bg-card px-4 py-2 text-xs font-medium text-foreground hover:border-foreground/30"
              >
                {activeRoadmap.certificateIssued ? "View Certificate" : "Inspect Requirements"}
                <ArrowRight size={12} aria-hidden="true" />
              </Link>
            </article>
          </li>
        </ol>
      </div>
    </div>
  );
}
