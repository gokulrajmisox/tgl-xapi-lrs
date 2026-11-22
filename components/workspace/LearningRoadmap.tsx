"use client";

import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  Circle,
  ClipboardCheck,
  ExternalLink,
  Lock,
  Play,
  PlayCircle,
  Send,
  ShieldCheck,
} from "lucide-react";
import type {
  CourseDetailResponse,
  SanitizedCourseLesson,
} from "@/lib/courses/store";
import type {
  CertificateIssuanceRecord,
  InternshipApplicationRecord,
  InternshipRecord,
} from "@/lib/certifications/store";
import type {
  ProjectSubmissionRecord,
  SupportingFileMeta,
} from "@/lib/learning-workspace-store";
import type {
  ProgressionStep,
  ProgressionStepKey,
  UnifiedProgrammeProgression,
} from "@/lib/learning/progression";
import { LessonStudyViewer } from "./LessonStudyViewer";
import { ModuleQuizCard } from "./ModuleQuizCard";
import { WorkspaceProjectPanel } from "./WorkspaceProjectPanel";
import { WorkspaceInternshipTasksPanel } from "./WorkspaceInternshipTasksPanel";
import { WorkspaceCertificatePanel } from "./WorkspaceCertificatePanel";

type UnlockedCourseDetail = Extract<CourseDetailResponse, { locked: false }>;

export function LearningRoadmap({
  detail,
  progression,
  expandedSteps,
  onToggleStep,
  onJumpToStep,
  enrolledAt,
  completedOn,
  studentName,
  internshipTrack,
  internshipApplication,
  issuedCertificate,
  activeLessonId,
  onSelectLessonId,
  busyLessonId,
  onToggleLessonComplete,
  busyExerciseLessonId,
  onToggleExerciseComplete,
  busyKnowledgeLessonId,
  onSubmitKnowledgeCheck,
  busyModuleQuizId,
  moduleQuizExplanations,
  onSubmitModuleQuiz,
  assignmentTexts,
  assignmentUrls,
  busyAssignmentId,
  onAssignmentTextChange,
  onAssignmentUrlChange,
  onSubmitAssignment,
  quizAnswers,
  quizExplanations,
  busyQuiz,
  onQuizAnswerChange,
  onSubmitQuiz,
  submissions,
  githubUrl,
  deploymentUrl,
  supportingEvidence,
  supportingFiles,
  summary,
  reflection,
  submittingProject,
  onGithubUrlChange,
  onDeploymentUrlChange,
  onSupportingEvidenceChange,
  onSupportingFilesChange,
  onRemoveSupportingFile,
  onSummaryChange,
  onReflectionChange,
  onStartProject,
  onSubmitProject,
  claimingCert,
  onClaimCertificate,
  onDownloadCertificate,
  onRefreshWorkspace,
}: {
  detail: UnlockedCourseDetail;
  progression: UnifiedProgrammeProgression;
  expandedSteps: Record<ProgressionStepKey, boolean>;
  onToggleStep: (key: ProgressionStepKey) => void;
  onJumpToStep: (key: ProgressionStepKey) => void;
  enrolledAt: string | null;
  completedOn: string | null;
  studentName: string;
  internshipTrack: InternshipRecord | null;
  internshipApplication: InternshipApplicationRecord | null;
  issuedCertificate: CertificateIssuanceRecord | null;
  activeLessonId: string;
  onSelectLessonId: (lessonId: string) => void;
  busyLessonId: string | null;
  onToggleLessonComplete: (lessonId: string) => Promise<void>;
  busyExerciseLessonId?: string | null;
  onToggleExerciseComplete?: (lessonId: string, completed: boolean) => Promise<void>;
  busyKnowledgeLessonId?: string | null;
  onSubmitKnowledgeCheck?: (lessonId: string, selectedIndex: number) => Promise<void>;
  busyModuleQuizId?: string | null;
  moduleQuizExplanations?: Record<string, Record<string, string>>;
  onSubmitModuleQuiz?: (moduleId: string, answers: Record<string, number>) => Promise<void>;
  assignmentTexts: Record<string, string>;
  assignmentUrls: Record<string, string>;
  busyAssignmentId: string | null;
  onAssignmentTextChange: (id: string, val: string) => void;
  onAssignmentUrlChange: (id: string, val: string) => void;
  onSubmitAssignment: (id: string) => Promise<void>;
  quizAnswers: Record<string, number>;
  quizExplanations: Record<string, string>;
  busyQuiz: boolean;
  onQuizAnswerChange: (questionId: string, optionIdx: number) => void;
  onSubmitQuiz: (e: React.FormEvent) => Promise<void>;
  submissions: ProjectSubmissionRecord[];
  githubUrl: string;
  deploymentUrl: string;
  supportingEvidence: string;
  supportingFiles: SupportingFileMeta[];
  summary: string;
  reflection: string;
  submittingProject: boolean;
  onGithubUrlChange: (val: string) => void;
  onDeploymentUrlChange: (val: string) => void;
  onSupportingEvidenceChange: (val: string) => void;
  onSupportingFilesChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveSupportingFile: (name: string) => void;
  onSummaryChange: (val: string) => void;
  onReflectionChange: (val: string) => void;
  onStartProject: () => void;
  onSubmitProject: () => Promise<void>;
  claimingCert: boolean;
  onClaimCertificate: () => Promise<void>;
  onDownloadCertificate: () => void;
  onRefreshWorkspace: () => Promise<void>;
}) {
  const [showAnnouncements, setShowAnnouncements] = useState(false);

  const flatLessons: SanitizedCourseLesson[] = detail.modules.flatMap((m) => m.lessons);
  const activeLesson =
    flatLessons.find((l) => l.id === activeLessonId) ?? flatLessons[0] ?? null;
  const activeLessonIdx = activeLesson
    ? flatLessons.findIndex((l) => l.id === activeLesson.id)
    : -1;
  const activeModule = activeLesson
    ? detail.modules.find((m) => m.lessons.some((l) => l.id === activeLesson.id)) ??
      detail.modules[0]
    : detail.modules[0];

  const lessonsDone =
    detail.course.lessonCount > 0 &&
    detail.course.completedLessonCount >= detail.course.lessonCount;

  const latestSubmission = submissions[0] ?? null;

  const renderStepBadge = (step: ProgressionStep) => {
    if (step.status === "completed") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-3 py-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
          <CheckCircle2 size={12} aria-hidden="true" />
          {step.statusLabel}
        </span>
      );
    }
    if (step.status === "active") {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/14 px-3 py-1 text-[11px] font-medium text-accent">
          <span className="size-1.5 rounded-full bg-accent" aria-hidden="true" />
          {step.statusLabel}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-foreground/[0.06] px-3 py-1 text-[11px] font-medium text-muted-foreground">
        <Lock size={11} aria-hidden="true" />
        {step.statusLabel}
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {progression.steps.map((step, index) => {
        const isLocked = step.status === "locked";
        const isExpanded = Boolean(expandedSteps[step.key]) && !isLocked;
        const isLast = index === progression.steps.length - 1;

        return (
          <section
            key={step.key}
            id={`roadmap-step-${step.key}`}
            aria-labelledby={`roadmap-heading-${step.key}`}
            className="relative pl-0 sm:pl-9"
          >
            {/* Vertical timeline connector */}
            {!isLast && (
              <span
                aria-hidden="true"
                className={`hidden sm:block absolute left-[15px] top-10 -bottom-4 w-px ${
                  step.status === "completed" ? "bg-emerald-500/50" : "bg-border"
                }`}
              />
            )}

            {/* Timeline node indicator */}
            <span
              aria-hidden="true"
              className={`hidden sm:grid absolute left-0 top-6 size-8 place-items-center rounded-full border text-xs font-mono font-semibold ${
                step.status === "completed"
                  ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                  : step.status === "active"
                    ? "border-accent bg-accent text-accent-foreground shadow-sm"
                    : "border-border bg-card text-muted-foreground"
              }`}
            >
              {step.status === "completed" ? (
                <CheckCircle2 size={15} />
              ) : isLocked ? (
                <Lock size={13} />
              ) : (
                step.stepNumber
              )}
            </span>

            <div
              className={`tgl-glass rounded-3xl transition-colors ${
                step.status === "active"
                  ? "ring-1 ring-accent/35"
                  : isLocked
                    ? "opacity-80"
                    : ""
              }`}
            >
              <button
                type="button"
                disabled={isLocked}
                aria-expanded={isExpanded}
                onClick={() => onToggleStep(step.key)}
                className={`flex w-full items-start justify-between gap-4 p-5 sm:p-6 text-left ${
                  isLocked ? "cursor-not-allowed" : "cursor-pointer"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">
                      Step 0{step.stepNumber}
                    </span>
                    {renderStepBadge(step)}
                  </div>
                  <h2
                    id={`roadmap-heading-${step.key}`}
                    className="mt-1.5 text-lg font-semibold tracking-[-0.03em] text-foreground sm:text-xl"
                  >
                    {step.title}
                  </h2>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    {isLocked && step.lockReason ? step.lockReason : step.description}
                  </p>
                </div>

                {!isLocked && (
                  <ChevronDown
                    size={18}
                    aria-hidden="true"
                    className={`mt-1 shrink-0 text-muted-foreground transition-transform duration-200 ${
                      isExpanded ? "rotate-180" : ""
                    }`}
                  />
                )}
              </button>

              {isExpanded && (
                <div className="border-t border-border px-5 pb-6 pt-5 sm:px-6">
                  {/* STEP 1: ENROLLED */}
                  {step.key === "enrolled" && (
                    <div className="space-y-4 text-xs">
                      <div className="grid gap-3 sm:grid-cols-3">
                        <div className="tgl-subsurface rounded-2xl p-4">
                          <p className="text-[11px] text-muted-foreground">Enrollment confirmation</p>
                          <p className="mt-1 font-semibold text-emerald-700 dark:text-emerald-300">
                            Confirmed · Single Fee Paid
                          </p>
                          <p className="mt-1 text-[11px] text-muted-foreground tabular-nums">
                            {enrolledAt
                              ? `Joined ${new Date(enrolledAt).toLocaleDateString("en-IN", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                })}`
                              : "Active programme access"}
                          </p>
                        </div>
                        <div className="tgl-subsurface rounded-2xl p-4">
                          <p className="text-[11px] text-muted-foreground">Assigned Mentor</p>
                          <p className="mt-1 font-semibold text-foreground">{detail.course.mentorName}</p>
                          <p className="mt-1 text-[11px] text-muted-foreground">{detail.course.mentorRole}</p>
                        </div>
                        <div className="tgl-subsurface rounded-2xl p-4">
                          <p className="text-[11px] text-muted-foreground">Included Credential</p>
                          <p className="mt-1 font-semibold text-foreground">
                            {detail.course.includedCertificateTitle}
                          </p>
                          <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-emerald-700 dark:text-emerald-300">
                            <ShieldCheck size={12} aria-hidden="true" />
                            ₹0 extra fee on completion
                          </p>
                        </div>
                      </div>

                      {detail.announcements.length > 0 && (
                        <div className="tgl-subsurface rounded-2xl p-4">
                          <button
                            type="button"
                            onClick={() => setShowAnnouncements((v) => !v)}
                            className="flex w-full items-center justify-between text-left font-semibold text-foreground"
                          >
                            <span className="flex items-center gap-2">
                              <Bell size={14} className="text-accent" aria-hidden="true" />
                              Mentor announcements ({detail.announcements.length})
                            </span>
                            <ChevronDown
                              size={15}
                              className={`text-muted-foreground transition-transform ${
                                showAnnouncements ? "rotate-180" : ""
                              }`}
                            />
                          </button>
                          {showAnnouncements && (
                            <div className="mt-3 space-y-2.5 border-t border-border pt-3">
                              {detail.announcements.map((ann) => (
                                <article key={ann.id} className="rounded-xl border border-border bg-card p-3.5">
                                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                                    <span className="font-medium text-accent">
                                      {ann.pinned ? "Pinned · " : ""}
                                      {ann.authorName}
                                    </span>
                                    <span className="tabular-nums">
                                      {new Date(ann.publishedAt).toLocaleDateString("en-IN")}
                                    </span>
                                  </div>
                                  <p className="mt-1 font-semibold text-foreground">{ann.title}</p>
                                  <p className="mt-1 leading-5 text-muted-foreground">{ann.body}</p>
                                </article>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* STEP 2: LEARNING MODULES, VIDEO EMBEDS, LABS, MODULE QUIZZES & ASSIGNMENTS */}
                  {step.key === "learning_modules" && activeLesson && (
                    <div className="space-y-6">
                      <div className="grid gap-6 lg:grid-cols-[270px_1fr]">
                        {/* Module & lesson outline */}
                        <div className="tgl-subsurface self-start rounded-2xl p-4">
                          <p className="px-2 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground tabular-nums">
                            Modules &amp; Lessons ({detail.course.completedLessonCount}/
                            {detail.course.lessonCount})
                          </p>
                          <div className="mt-3 space-y-4">
                            {detail.modules.map((mod) => {
                              const modLessonsDone =
                                mod.lessons.length > 0 &&
                                mod.lessons.every(
                                  (l) => detail.lessonProgress[l.id]?.status === "completed",
                                );
                              const modQuizPassed = mod.moduleQuiz
                                ? Boolean(detail.moduleQuizAttempts[mod.id]?.passed)
                                : true;
                              const modComplete = modLessonsDone && modQuizPassed;
                              return (
                                <div key={mod.id} className="space-y-1">
                                  <div className="flex items-center justify-between gap-2 px-2">
                                    <p className="text-xs font-semibold text-accent">
                                      0{mod.sortOrder}. {mod.title}
                                    </p>
                                    {modComplete && (
                                      <CheckCircle2
                                        size={12}
                                        className="shrink-0 text-emerald-600 dark:text-emerald-300"
                                        aria-label={`Module ${mod.sortOrder} complete`}
                                      />
                                    )}
                                  </div>
                                  <ul className="space-y-1">
                                    {mod.lessons.map((lesson) => {
                                      const isDone =
                                        detail.lessonProgress[lesson.id]?.status === "completed";
                                      const isActive = activeLesson.id === lesson.id;
                                      return (
                                        <li key={lesson.id} className="flex items-center gap-1">
                                          <button
                                            type="button"
                                            aria-label={
                                              isDone
                                                ? `Mark ${lesson.title} incomplete`
                                                : `Mark ${lesson.title} complete`
                                            }
                                            disabled={busyLessonId === lesson.id}
                                            onClick={() => void onToggleLessonComplete(lesson.id)}
                                            className="grid size-7 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground"
                                          >
                                            {isDone ? (
                                              <CheckCircle2
                                                size={14}
                                                className="text-emerald-600 dark:text-emerald-300"
                                              />
                                            ) : (
                                              <Circle size={14} />
                                            )}
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => onSelectLessonId(lesson.id)}
                                            className={`flex-1 rounded-xl px-2.5 py-2 text-left text-xs transition-colors ${
                                              isActive
                                                ? "bg-accent font-medium text-accent-foreground"
                                                : "text-foreground/80 hover:bg-foreground/[0.05]"
                                            }`}
                                          >
                                            <span className="flex items-center gap-1.5">
                                              {lesson.lessonType === "video" ? (
                                                <PlayCircle
                                                  size={12}
                                                  className="shrink-0"
                                                  aria-hidden="true"
                                                />
                                              ) : (
                                                <BookOpen
                                                  size={12}
                                                  className="shrink-0"
                                                  aria-hidden="true"
                                                />
                                              )}
                                              <span className="line-clamp-2">{lesson.title}</span>
                                            </span>
                                          </button>
                                        </li>
                                      );
                                    })}
                                  </ul>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Active Lesson Study Content + Active Module Quiz */}
                        <div className="min-w-0 space-y-6">
                          <LessonStudyViewer
                            key={activeLesson.id}
                            lesson={activeLesson}
                            lessonStatus={
                              detail.lessonProgress[activeLesson.id]?.status ?? "not_started"
                            }
                            exerciseCompletion={detail.exerciseCompletions[activeLesson.id]}
                            knowledgeCheckResult={detail.knowledgeCheckResults[activeLesson.id]}
                            busyLesson={busyLessonId === activeLesson.id}
                            busyExercise={busyExerciseLessonId === activeLesson.id}
                            busyKnowledgeCheck={busyKnowledgeLessonId === activeLesson.id}
                            canGoPrev={activeLessonIdx > 0}
                            canGoNext={activeLessonIdx < flatLessons.length - 1}
                            allLessonsDone={lessonsDone}
                            onToggleLessonComplete={() => void onToggleLessonComplete(activeLesson.id)}
                            onToggleExerciseComplete={(completed) => {
                              if (onToggleExerciseComplete) {
                                void onToggleExerciseComplete(activeLesson.id, completed);
                              }
                            }}
                            onSubmitKnowledgeCheck={(selectedIndex) => {
                              if (onSubmitKnowledgeCheck) {
                                void onSubmitKnowledgeCheck(activeLesson.id, selectedIndex);
                              }
                            }}
                            onPrevLesson={() => {
                              const prev = flatLessons[activeLessonIdx - 1];
                              if (prev) onSelectLessonId(prev.id);
                            }}
                            onNextLesson={() => {
                              const next = flatLessons[activeLessonIdx + 1];
                              if (next) onSelectLessonId(next.id);
                            }}
                            onContinueToQuiz={() => onJumpToStep("modules_completed")}
                          />

                          {activeModule?.moduleQuiz && onSubmitModuleQuiz && (
                            <ModuleQuizCard
                              key={activeModule.id}
                              moduleId={activeModule.id}
                              moduleTitle={activeModule.title}
                              quiz={activeModule.moduleQuiz}
                              attempt={detail.moduleQuizAttempts[activeModule.id]}
                              explanations={moduleQuizExplanations?.[activeModule.id]}
                              busy={busyModuleQuizId === activeModule.id}
                              onSubmit={onSubmitModuleQuiz}
                            />
                          )}
                        </div>
                      </div>

                      {/* Applied Course Assignments */}
                      {detail.assignments.length > 0 && (
                        <div className="border-t border-border pt-5">
                          <h3 className="text-sm font-semibold text-foreground sm:text-base">
                            Applied Practice Assignments ({detail.assignments.length})
                          </h3>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Optional applied checkpoints to sharpen your implementation before submitting the capstone project.
                          </p>
                          <div className="mt-4 grid gap-4 md:grid-cols-2">
                            {detail.assignments.map((asgn) => {
                              const existingSub = detail.assignmentSubmissions[asgn.id];
                              return (
                                <article
                                  key={asgn.id}
                                  className="tgl-subsurface rounded-2xl p-4 sm:p-5 text-xs"
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div>
                                      <h4 className="font-semibold text-foreground">{asgn.title}</h4>
                                      <p className="mt-0.5 text-[11px] text-accent">
                                        Est. {asgn.estimatedMinutes} min · {asgn.deliverableHint}
                                      </p>
                                    </div>
                                    <span
                                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                                        existingSub
                                          ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                                          : "bg-foreground/[0.06] text-muted-foreground"
                                      }`}
                                    >
                                      {existingSub ? "Saved" : "Pending"}
                                    </span>
                                  </div>
                                  <p className="mt-2 leading-5 text-muted-foreground">{asgn.prompt}</p>
                                  <div className="mt-3 space-y-2 border-t border-border pt-3">
                                    <textarea
                                      rows={2}
                                      value={assignmentTexts[asgn.id] ?? existingSub?.submissionText ?? ""}
                                      onChange={(e) => onAssignmentTextChange(asgn.id, e.target.value)}
                                      placeholder="Write your engineering notes or solution summary..."
                                      className="w-full rounded-xl border border-border bg-input px-3 py-2 text-xs text-foreground"
                                    />
                                    <div className="flex flex-wrap items-center gap-2">
                                      <input
                                        type="url"
                                        value={assignmentUrls[asgn.id] ?? existingSub?.artifactUrl ?? ""}
                                        onChange={(e) => onAssignmentUrlChange(asgn.id, e.target.value)}
                                        placeholder="Optional Gist / PR URL"
                                        className="h-9 flex-1 rounded-xl border border-border bg-input px-3 text-xs text-foreground"
                                      />
                                      <button
                                        type="button"
                                        disabled={busyAssignmentId === asgn.id}
                                        onClick={() => void onSubmitAssignment(asgn.id)}
                                        className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-primary px-3.5 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-45"
                                      >
                                        <Send size={12} aria-hidden="true" />
                                        {existingSub ? "Update" : "Save"}
                                      </button>
                                    </div>
                                  </div>
                                </article>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* STEP 3: GRADED ASSESSMENT QUIZ */}
                  {step.key === "modules_completed" && (
                    <div className="space-y-5">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-accent">
                            Graded Module Assessment · Pass mark {detail.quiz.passingScorePercent}%
                          </p>
                          <h3 className="mt-1 text-lg font-semibold text-foreground">
                            {detail.quiz.title}
                          </h3>
                        </div>
                        {detail.quizAttempt && (
                          <span
                            className={`rounded-full px-3 py-1 font-mono text-xs font-semibold tabular-nums ${
                              detail.quizAttempt.passed
                                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                                : "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                            }`}
                          >
                            {detail.quizAttempt.scorePercent}% ·{" "}
                            {detail.quizAttempt.passed ? "Passed" : "Retry needed"}
                          </span>
                        )}
                      </div>

                      <form onSubmit={(e) => void onSubmitQuiz(e)} className="space-y-4">
                        {detail.quiz.questions.map((q, idx) => (
                          <fieldset
                            key={q.id}
                            className="tgl-subsurface rounded-2xl p-4 sm:p-5 text-xs"
                          >
                            <legend className="font-semibold text-foreground">
                              {idx + 1}. {q.prompt}
                            </legend>
                            <div className="mt-3 space-y-2">
                              {q.options.map((opt, optIdx) => {
                                const checked = quizAnswers[q.id] === optIdx;
                                return (
                                  <label
                                    key={opt}
                                    className={`flex cursor-pointer items-start gap-2.5 rounded-xl border px-3.5 py-2.5 transition-colors ${
                                      checked
                                        ? "border-accent bg-accent/12 font-medium text-foreground"
                                        : "border-border bg-card text-foreground/80 hover:border-foreground/25"
                                    }`}
                                  >
                                    <input
                                      type="radio"
                                      name={q.id}
                                      checked={checked}
                                      onChange={() => onQuizAnswerChange(q.id, optIdx)}
                                      className="mt-0.5 accent-[var(--tgl-accent)]"
                                    />
                                    <span>{opt}</span>
                                  </label>
                                );
                              })}
                            </div>
                            {quizExplanations[q.id] && (
                              <p className="mt-3 border-t border-border pt-2.5 text-[11px] font-medium text-accent">
                                Explanation: {quizExplanations[q.id]}
                              </p>
                            )}
                          </fieldset>
                        ))}

                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <button
                            type="submit"
                            disabled={busyQuiz}
                            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-xs font-medium text-accent-foreground disabled:opacity-45"
                          >
                            <ClipboardCheck size={14} aria-hidden="true" />
                            {busyQuiz
                              ? "Grading..."
                              : detail.quizAttempt
                                ? "Retake & grade quiz"
                                : "Submit quiz for grading"}
                          </button>

                          {progression.canAccessProject && (
                            <button
                              type="button"
                              onClick={() => onJumpToStep("project_unlocked")}
                              className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-border bg-card px-4 py-2 text-xs font-medium text-foreground hover:border-foreground/30"
                            >
                              Continue to Project Assignment <ArrowRight size={13} aria-hidden="true" />
                            </button>
                          )}
                        </div>
                      </form>
                    </div>
                  )}

                  {/* STEP 4: PROJECT ASSIGNMENT UNLOCKED */}
                  {step.key === "project_unlocked" && (
                    <div className="tgl-subsurface rounded-2xl p-5 text-xs">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-accent">
                            Practical Capstone Brief · {detail.project.estimatedHours} hours
                          </p>
                          <h3 className="mt-1 text-base font-semibold text-foreground">
                            {detail.project.title}
                          </h3>
                          <p className="mt-1 text-muted-foreground">{detail.project.brief}</p>
                        </div>

                        {progression.projectStageStatus === "available" ? (
                          <button
                            type="button"
                            disabled={submittingProject}
                            onClick={onStartProject}
                            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-xs font-medium text-accent-foreground disabled:opacity-50 whitespace-nowrap shrink-0"
                          >
                            <Play size={13} aria-hidden="true" />
                            Start Project Assignment
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onJumpToStep("project_submitted")}
                            className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-border bg-card px-4 py-2 text-xs font-medium text-foreground whitespace-nowrap shrink-0"
                          >
                            Open Submission Form <ArrowRight size={13} aria-hidden="true" />
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* STEP 5: PROJECT SUBMISSION WORKSPACE */}
                  {step.key === "project_submitted" && (
                    <WorkspaceProjectPanel
                      project={detail.project}
                      stageStatus={progression.projectStageStatus}
                      canAccessProject={progression.canAccessProject}
                      lockReason={progression.projectLockReason}
                      submissions={submissions}
                      githubUrl={githubUrl}
                      deploymentUrl={deploymentUrl}
                      supportingEvidence={supportingEvidence}
                      supportingFiles={supportingFiles}
                      summary={summary}
                      reflection={reflection}
                      submittingProject={submittingProject}
                      onGithubUrlChange={onGithubUrlChange}
                      onDeploymentUrlChange={onDeploymentUrlChange}
                      onSupportingEvidenceChange={onSupportingEvidenceChange}
                      onSupportingFilesChange={onSupportingFilesChange}
                      onRemoveSupportingFile={onRemoveSupportingFile}
                      onSummaryChange={onSummaryChange}
                      onReflectionChange={onReflectionChange}
                      onStartProject={onStartProject}
                      onSubmitProject={onSubmitProject}
                      onGoToModules={() => onJumpToStep("learning_modules")}
                    />
                  )}

                  {/* STEP 6: PROJECT MENTOR EVALUATION & APPROVAL */}
                  {step.key === "project_approved" && (
                    <div className="tgl-subsurface rounded-2xl p-5 text-xs">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-semibold text-foreground">
                          Mentor Evaluation ({detail.project.mentorName})
                        </p>
                        <span className="rounded-full bg-accent/12 px-3 py-1 text-[11px] font-medium text-accent capitalize">
                          {(latestSubmission?.status ?? "pending").replaceAll("_", " ")}
                        </span>
                      </div>
                      {latestSubmission?.mentorFeedback ? (
                        <div className="mt-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-800 dark:text-emerald-200">
                          <p className="font-semibold">Feedback from {latestSubmission.mentorName}</p>
                          <p className="mt-1 leading-5">{latestSubmission.mentorFeedback}</p>
                        </div>
                      ) : (
                        <p className="mt-2 leading-5 text-muted-foreground">
                          Your repository and implementation notes are queued for review in the Mentor Console. Once approved, internship sprint tasks unlock automatically below.
                        </p>
                      )}
                      {latestSubmission?.status === "revision_required" && (
                        <button
                          type="button"
                          onClick={() => onJumpToStep("project_submitted")}
                          className="mt-3 inline-flex min-h-10 items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-xs font-medium text-accent-foreground"
                        >
                          Update &amp; Resubmit Project
                        </button>
                      )}
                    </div>
                  )}

                  {/* STEP 7: INTERNSHIP SPRINT TASKS & PROGRAMME COMPLETION */}
                  {step.key === "program_completed" && (
                    <WorkspaceInternshipTasksPanel
                      internshipTrack={internshipTrack}
                      internshipApplication={internshipApplication}
                      canSubmitTasks={progression.canSubmitInternshipTasks}
                      lockReason={progression.internshipTaskLockReason}
                      completedOn={completedOn}
                      onTaskUpdated={onRefreshWorkspace}
                    />
                  )}

                  {/* STEP 8 & 9: CERTIFICATE CLAIM & VERIFIED CREDENTIAL */}
                  {(step.key === "certificate_unlocked" ||
                    step.key === "certificate_claimed") && (
                    <WorkspaceCertificatePanel
                      certificateTitle={detail.course.includedCertificateTitle}
                      programmeTitle={detail.course.title}
                      studentName={studentName}
                      joinedOn={enrolledAt}
                      completedOn={completedOn}
                      certificateState={progression.certificateState}
                      lockReason={progression.certificateLockReason}
                      issuedCertificate={issuedCertificate}
                      claiming={claimingCert}
                      onClaimCertificate={onClaimCertificate}
                      onDownloadCertificate={onDownloadCertificate}
                    />
                  )}
                </div>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
