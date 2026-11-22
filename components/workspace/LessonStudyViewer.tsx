"use client";

import { useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  Code2,
  ExternalLink,
  FileText,
  FlaskConical,
  HelpCircle,
  Lightbulb,
  Paperclip,
  Sparkles,
} from "lucide-react";
import type {
  KnowledgeCheckResultRecord,
  LessonExerciseCompletionRecord,
  LessonProgressStatus,
  SanitizedCourseLesson,
} from "@/lib/courses/store";

export function LessonStudyViewer({
  lesson,
  lessonStatus,
  exerciseCompletion,
  knowledgeCheckResult,
  busyLesson,
  busyExercise,
  busyKnowledgeCheck,
  canGoPrev,
  canGoNext,
  allLessonsDone,
  onToggleLessonComplete,
  onToggleExerciseComplete,
  onSubmitKnowledgeCheck,
  onPrevLesson,
  onNextLesson,
  onContinueToQuiz,
  readOnlyPreview = false,
}: {
  lesson: SanitizedCourseLesson;
  lessonStatus: LessonProgressStatus;
  exerciseCompletion?: LessonExerciseCompletionRecord;
  knowledgeCheckResult?: KnowledgeCheckResultRecord;
  busyLesson: boolean;
  busyExercise?: boolean;
  busyKnowledgeCheck?: boolean;
  canGoPrev: boolean;
  canGoNext: boolean;
  allLessonsDone: boolean;
  onToggleLessonComplete: () => void;
  onToggleExerciseComplete: (completed: boolean) => void;
  onSubmitKnowledgeCheck: (selectedIndex: number) => void;
  onPrevLesson: () => void;
  onNextLesson: () => void;
  onContinueToQuiz: () => void;
  readOnlyPreview?: boolean;
}) {
  const [showHints, setShowHints] = useState(false);
  const [selectedCheckIdx, setSelectedCheckIdx] = useState<number | null>(
    knowledgeCheckResult?.selectedIndex ?? null,
  );

  const kindLabel =
    lesson.lessonType === "video"
      ? "Curated Video + Study Guide"
      : lesson.lessonType === "project_milestone"
        ? "Project Milestone Guide"
        : "Written Study Notes";

  const exerciseDone = Boolean(exerciseCompletion);

  return (
    <article className="min-w-0 space-y-5">
      {/* 1. Lesson Header & Complete Toggle */}
      <div className="tgl-subsurface flex flex-wrap items-start justify-between gap-4 rounded-2xl p-5">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-accent tabular-nums">
            {kindLabel}
            <span aria-hidden="true"> · </span>
            {lesson.durationLabel}
            {lesson.isDraft ? " · Draft preview" : ""}
          </p>
          <h3 className="mt-1.5 text-xl font-semibold tracking-[-0.03em] text-foreground">
            {lesson.title}
          </h3>
          <p className="mt-1.5 text-xs leading-5 text-muted-foreground sm:text-sm">
            {lesson.summary}
          </p>
        </div>

        {!readOnlyPreview && (
          <button
            type="button"
            disabled={busyLesson}
            onClick={onToggleLessonComplete}
            className={`inline-flex min-h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-xs font-medium transition-colors ${
              lessonStatus === "completed"
                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                : "bg-primary text-primary-foreground"
            }`}
          >
            <CheckCircle2 size={14} aria-hidden="true" />
            {lessonStatus === "completed" ? "Lesson completed" : "Mark lesson complete"}
          </button>
        )}
      </div>

      {/* 2. Learning Objectives & Real-World Context */}
      {(lesson.learningObjectives?.length || lesson.realWorldContext) && (
        <section className="tgl-subsurface rounded-2xl p-5 text-xs">
          <div className="grid gap-4 md:grid-cols-2">
            {lesson.learningObjectives && lesson.learningObjectives.length > 0 && (
              <div>
                <p className="flex items-center gap-1.5 font-semibold text-foreground">
                  <Sparkles size={13} className="text-accent" aria-hidden="true" />
                  Learning Objectives
                </p>
                <ul className="mt-2.5 space-y-1.5 text-foreground/85">
                  {lesson.learningObjectives.map((obj) => (
                    <li key={obj} className="flex items-start gap-2">
                      <CheckCircle2
                        size={13}
                        className="mt-0.5 shrink-0 text-accent"
                        aria-hidden="true"
                      />
                      <span>{obj}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {lesson.realWorldContext && (
              <div className="rounded-xl border border-border bg-card p-4">
                <p className="font-semibold text-foreground">Real-World Engineering Context</p>
                <p className="mt-1.5 leading-6 text-muted-foreground">
                  {lesson.realWorldContext}
                </p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* 3. Curated YouTube Lecture */}
      {lesson.youtubeVideoId && (
        <div className="space-y-2.5">
          <div className="aspect-video w-full overflow-hidden rounded-2xl border border-border bg-black">
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${lesson.youtubeVideoId}?rel=0`}
              title={lesson.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="h-full w-full"
            />
          </div>
          <div className="tgl-subsurface flex flex-wrap items-center justify-between gap-3 rounded-xl px-4 py-2.5 text-xs text-muted-foreground">
            <span>
              Curated external lecture by{" "}
              <strong className="text-foreground">
                {lesson.videoCreator ?? "YouTube Educator"}
              </strong>
            </span>
            {lesson.youtubeUrl && (
              <a
                href={lesson.youtubeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 font-medium text-accent hover:underline"
              >
                Watch on YouTube <ExternalLink size={12} aria-hidden="true" />
              </a>
            )}
          </div>
        </div>
      )}

      {/* 4. Architecture / System Flow Visual Diagram */}
      {lesson.diagram && lesson.diagram.nodes.length > 0 && (
        <section className="tgl-subsurface rounded-2xl p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h4 className="text-sm font-semibold text-foreground">
              {lesson.diagram.title}
            </h4>
            <span className="text-[11px] text-muted-foreground">System Flow Diagram</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{lesson.diagram.caption}</p>

          <div
            className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
            role="list"
            aria-label={lesson.diagram.title}
          >
            {lesson.diagram.nodes.map((node, i) => (
              <div
                key={`${node.label}-${i}`}
                role="listitem"
                className="relative flex flex-col justify-between rounded-xl border border-border bg-card p-3.5"
              >
                <div>
                  {node.role && (
                    <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-accent">
                      {node.role}
                    </p>
                  )}
                  <p className="mt-1 text-xs font-semibold text-foreground">{node.label}</p>
                  <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
                    {node.detail}
                  </p>
                </div>
                {i < lesson.diagram!.nodes.length - 1 && (
                  <span
                    aria-hidden="true"
                    className="mt-2 inline-flex items-center gap-1 font-mono text-[10px] text-accent lg:hidden"
                  >
                    Next <ArrowRight size={11} />
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 5. Detailed Explanations & Code Examples */}
      <div className="space-y-4">
        {lesson.noteSections.map((sec) => (
          <section key={sec.heading} className="tgl-subsurface rounded-2xl p-5">
            <h4 className="text-sm font-semibold text-foreground sm:text-base">
              {sec.heading}
            </h4>
            <p className="mt-2 text-xs leading-6 text-foreground/85 sm:text-sm sm:leading-7">
              {sec.body}
            </p>
            {sec.codeSnippet && (
              <pre className="mt-3 overflow-x-auto rounded-xl border border-border bg-[#111216] p-4 font-mono text-xs leading-5 text-[#e4e4e7]">
                <code>{sec.codeSnippet}</code>
              </pre>
            )}
            <p className="mt-3 border-t border-border pt-2.5 text-xs font-medium text-accent">
              Key takeaway: {sec.takeaway}
            </p>
          </section>
        ))}
      </div>

      {/* 6. Key Concepts & Terminology */}
      {lesson.keyConcepts && lesson.keyConcepts.length > 0 && (
        <section className="tgl-subsurface rounded-2xl p-5 text-xs">
          <p className="flex items-center gap-1.5 font-semibold text-foreground">
            <BookOpen size={14} className="text-accent" aria-hidden="true" />
            Key Concepts &amp; Terminology
          </p>
          <dl className="mt-3 grid gap-3 sm:grid-cols-2">
            {lesson.keyConcepts.map((kc) => (
              <div key={kc.term} className="rounded-xl border border-border bg-card p-3.5">
                <dt className="font-semibold text-foreground">{kc.term}</dt>
                <dd className="mt-1 leading-5 text-muted-foreground">{kc.definition}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {/* 7. Hands-On Practical Exercise / Lab */}
      {lesson.practicalExercise && (
        <section className="tgl-subsurface rounded-2xl border border-accent/25 p-5 text-xs">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.14em] text-accent tabular-nums">
                <FlaskConical size={13} aria-hidden="true" />
                Hands-On Practical Exercise
                {lesson.practicalExercise.difficulty
                  ? ` · ${lesson.practicalExercise.difficulty}`
                  : ""}
                {` · ${lesson.practicalExercise.estimatedMinutes} min`}
              </p>
              <h4 className="mt-1 text-base font-semibold text-foreground">
                {lesson.practicalExercise.title}
              </h4>
              <p className="mt-1 leading-5 text-muted-foreground">
                {lesson.practicalExercise.objective}
              </p>
            </div>

            {!readOnlyPreview && (
              <button
                type="button"
                disabled={busyExercise}
                onClick={() => onToggleExerciseComplete(!exerciseDone)}
                className={`inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-xs font-medium transition-colors ${
                  exerciseDone
                    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                    : "border border-border bg-card text-foreground hover:border-foreground/30"
                }`}
              >
                <CheckCircle2 size={13} aria-hidden="true" />
                {exerciseDone ? "Exercise completed" : "Mark exercise done"}
              </button>
            )}
          </div>

          <ol className="mt-4 list-decimal space-y-1.5 pl-4 leading-5 text-foreground/85">
            {lesson.practicalExercise.instructions.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>

          {lesson.practicalExercise.starterCode && (
            <div className="mt-4">
              <p className="mb-1.5 flex items-center gap-1.5 font-semibold text-foreground">
                <Code2 size={13} className="text-accent" aria-hidden="true" />
                Starter Snippet
              </p>
              <pre className="overflow-x-auto rounded-xl border border-border bg-[#111216] p-3.5 font-mono text-xs leading-5 text-[#e4e4e7]">
                <code>{lesson.practicalExercise.starterCode}</code>
              </pre>
            </div>
          )}

          {lesson.practicalExercise.sampleData && (
            <div className="mt-3">
              <p className="mb-1.5 font-semibold text-foreground">Sample Input Data</p>
              <pre className="overflow-x-auto rounded-xl border border-border bg-[#111216] p-3.5 font-mono text-xs leading-5 text-[#e4e4e7]">
                <code>{lesson.practicalExercise.sampleData}</code>
              </pre>
            </div>
          )}

          <div className="mt-4 rounded-xl border border-border bg-card p-3.5">
            <p className="font-semibold text-foreground">Expected Verification Output</p>
            <p className="mt-1 leading-5 text-muted-foreground">
              {lesson.practicalExercise.expectedOutput}
            </p>
          </div>

          {(lesson.practicalExercise.hints.length > 0 ||
            lesson.practicalExercise.solutionOutline) && (
            <div className="mt-3">
              <button
                type="button"
                aria-expanded={showHints}
                onClick={() => setShowHints((v) => !v)}
                className="inline-flex min-h-9 items-center gap-1.5 font-medium text-accent hover:underline"
              >
                <Lightbulb size={13} aria-hidden="true" />
                {showHints ? "Hide hints & solution guide" : "Show hints & solution guide"}
                <ChevronDown
                  size={13}
                  className={`transition-transform ${showHints ? "rotate-180" : ""}`}
                />
              </button>
              {showHints && (
                <div className="mt-2.5 space-y-2 rounded-xl border border-border bg-card p-3.5 text-muted-foreground">
                  {lesson.practicalExercise.hints.map((h) => (
                    <p key={h}>Hint: {h}</p>
                  ))}
                  {lesson.practicalExercise.solutionOutline && (
                    <p className="border-t border-border pt-2 font-medium text-foreground">
                      Solution guide: {lesson.practicalExercise.solutionOutline}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* 8. Common Mistakes & Debugging Tips */}
      {lesson.commonMistakes && lesson.commonMistakes.length > 0 && (
        <section className="tgl-subsurface rounded-2xl p-5 text-xs">
          <p className="flex items-center gap-1.5 font-semibold text-foreground">
            <AlertTriangle size={14} className="text-amber-600 dark:text-amber-300" aria-hidden="true" />
            Common Mistakes &amp; Debugging Fixes
          </p>
          <div className="mt-3 space-y-2.5">
            {lesson.commonMistakes.map((cm) => (
              <div key={cm.mistake} className="rounded-xl border border-border bg-card p-3.5">
                <p className="font-semibold text-foreground">{cm.mistake}</p>
                <p className="mt-1 text-muted-foreground">Why: {cm.whyItHappens}</p>
                <p className="mt-1 font-medium text-emerald-700 dark:text-emerald-300">
                  Fix: {cm.fix}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 9. Lesson Key Takeaways Summary */}
      {lesson.keyTakeaways && lesson.keyTakeaways.length > 0 && (
        <section className="tgl-subsurface rounded-2xl p-5 text-xs">
          <p className="font-semibold text-foreground">Summary Takeaways</p>
          <ul className="mt-2.5 space-y-1.5 text-foreground/85">
            {lesson.keyTakeaways.map((tk) => (
              <li key={tk} className="flex items-start gap-2">
                <CheckCircle2
                  size={13}
                  className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-300"
                  aria-hidden="true"
                />
                <span>{tk}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 10. Quick In-Lesson Knowledge Check */}
      {lesson.knowledgeCheck && !readOnlyPreview && (
        <section className="tgl-subsurface rounded-2xl p-5 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="flex items-center gap-1.5 font-semibold text-foreground">
              <HelpCircle size={14} className="text-accent" aria-hidden="true" />
              Quick Knowledge Check
            </p>
            {knowledgeCheckResult && (
              <span
                className={`font-medium ${
                  knowledgeCheckResult.passed
                    ? "text-emerald-700 dark:text-emerald-300"
                    : "text-amber-700 dark:text-amber-300"
                }`}
              >
                {knowledgeCheckResult.passed ? "Correct answer verified" : "Try reviewing option"}
              </span>
            )}
          </div>
          <p className="mt-2 font-medium text-foreground">{lesson.knowledgeCheck.question}</p>
          <div className="mt-3 space-y-2">
            {lesson.knowledgeCheck.options.map((opt, idx) => {
              const checked =
                (selectedCheckIdx ?? knowledgeCheckResult?.selectedIndex) === idx;
              return (
                <label
                  key={opt}
                  className={`flex cursor-pointer items-start gap-2.5 rounded-xl border px-3.5 py-2.5 transition-colors ${
                    checked
                      ? "border-accent bg-accent/12 font-medium text-foreground"
                      : "border-border bg-card text-foreground/85 hover:border-foreground/25"
                  }`}
                >
                  <input
                    type="radio"
                    name={`kc-${lesson.id}`}
                    checked={checked}
                    onChange={() => setSelectedCheckIdx(idx)}
                    className="mt-0.5 accent-[var(--accent)]"
                  />
                  <span>{opt}</span>
                </label>
              );
            })}
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              disabled={busyKnowledgeCheck || selectedCheckIdx === null}
              onClick={() => {
                if (selectedCheckIdx !== null) {
                  onSubmitKnowledgeCheck(selectedCheckIdx);
                }
              }}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-45"
            >
              {busyKnowledgeCheck ? "Checking..." : "Check answer"}
            </button>
          </div>
          {knowledgeCheckResult?.explanation && (
            <p className="mt-3 border-t border-border pt-2.5 text-[11px] font-medium text-accent">
              Explanation: {knowledgeCheckResult.explanation}
            </p>
          )}
        </section>
      )}

      {/* 11. Curated Reference Docs & Attachments */}
      {(lesson.resources.length > 0 || (lesson.attachments && lesson.attachments.length > 0)) && (
        <section className="tgl-subsurface rounded-2xl p-5 text-xs">
          {lesson.resources.length > 0 && (
            <div>
              <p className="font-semibold text-foreground">Verified Reference Documentation</p>
              <ul className="mt-2.5 space-y-1.5">
                {lesson.resources.map((resLink) => (
                  <li key={resLink.id}>
                    <a
                      href={resLink.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 font-medium text-accent hover:underline"
                    >
                      {resLink.title} ({resLink.provider})
                      <ExternalLink size={12} aria-hidden="true" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {lesson.attachments && lesson.attachments.length > 0 && (
            <div className={lesson.resources.length > 0 ? "mt-4 border-t border-border pt-4" : ""}>
              <p className="flex items-center gap-1.5 font-semibold text-foreground">
                <Paperclip size={13} className="text-accent" aria-hidden="true" />
                Downloadable Study Attachments
              </p>
              <ul className="mt-2.5 space-y-1.5">
                {lesson.attachments.map((att) => (
                  <li key={att.id}>
                    <a
                      href={att.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 font-medium text-foreground hover:text-accent hover:underline"
                    >
                      <FileText size={12} className="text-accent" aria-hidden="true" />
                      <span>
                        {att.title} ({att.fileType.toUpperCase()}
                        {att.sizeLabel ? ` · ${att.sizeLabel}` : ""})
                      </span>
                      <ExternalLink size={11} aria-hidden="true" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {/* Footer Navigation */}
      {!readOnlyPreview && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
          <button
            type="button"
            disabled={!canGoPrev}
            onClick={onPrevLesson}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-border bg-card px-4 py-2 text-xs font-medium text-foreground disabled:opacity-40"
          >
            <ArrowLeft size={13} aria-hidden="true" />
            Previous lesson
          </button>

          {canGoNext ? (
            <button
              type="button"
              onClick={onNextLesson}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground"
            >
              Next lesson <ArrowRight size={13} aria-hidden="true" />
            </button>
          ) : (
            <button
              type="button"
              disabled={!allLessonsDone}
              onClick={onContinueToQuiz}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-xs font-medium text-accent-foreground disabled:opacity-45"
            >
              Continue to Graded Quiz <ArrowRight size={13} aria-hidden="true" />
            </button>
          )}
        </div>
      )}
    </article>
  );
}
