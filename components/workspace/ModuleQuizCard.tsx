"use client";

import { useState } from "react";
import { CheckCircle2, ClipboardCheck } from "lucide-react";
import type {
  ModuleQuizAttemptRecord,
  SanitizedQuizForStudent,
} from "@/lib/courses/store";

export function ModuleQuizCard({
  moduleId,
  moduleTitle,
  quiz,
  attempt,
  explanations,
  busy,
  onSubmit,
}: {
  moduleId: string;
  moduleTitle: string;
  quiz: SanitizedQuizForStudent;
  attempt?: ModuleQuizAttemptRecord;
  explanations?: Record<string, string>;
  busy: boolean;
  onSubmit: (moduleId: string, answers: Record<string, number>) => Promise<void>;
}) {
  const [answers, setAnswers] = useState<Record<string, number>>(
    () => attempt?.answers ?? {},
  );
  const [localError, setLocalError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (Object.keys(answers).length < quiz.questions.length) {
      setLocalError("Answer every question in this module check before grading.");
      return;
    }
    setLocalError("");
    await onSubmit(moduleId, answers);
  };

  return (
    <section
      aria-label={`Module quiz for ${moduleTitle}`}
      className="tgl-subsurface rounded-2xl border border-border p-5 text-xs"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-accent tabular-nums">
            Module Checkpoint Quiz · Pass mark {quiz.passingScorePercent}%
          </p>
          <h4 className="mt-1 text-base font-semibold text-foreground">{quiz.title}</h4>
        </div>

        {attempt && (
          <span
            className={`inline-flex items-center gap-1.5 font-mono text-xs font-semibold tabular-nums ${
              attempt.passed
                ? "text-emerald-700 dark:text-emerald-300"
                : "text-amber-700 dark:text-amber-300"
            }`}
          >
            {attempt.passed && <CheckCircle2 size={13} aria-hidden="true" />}
            {attempt.scorePercent}% · {attempt.passed ? "Passed" : "Retry needed"}
          </span>
        )}
      </div>

      {localError && (
        <p role="alert" className="mt-3 font-medium text-rose-700 dark:text-rose-300">
          {localError}
        </p>
      )}

      <form onSubmit={(e) => void handleSubmit(e)} className="mt-4 space-y-4">
        {quiz.questions.map((q, idx) => {
          const explanationText = explanations?.[q.id] ?? q.explanation;
          return (
            <fieldset key={q.id} className="rounded-xl border border-border bg-card p-4">
              <legend className="font-semibold text-foreground">
                {idx + 1}. {q.prompt}
              </legend>
              <div className="mt-3 space-y-2">
                {q.options.map((opt, optIdx) => {
                  const checked = answers[q.id] === optIdx;
                  return (
                    <label
                      key={opt}
                      className={`flex cursor-pointer items-start gap-2.5 rounded-xl border px-3 py-2 transition-colors ${
                        checked
                          ? "border-accent bg-accent/12 font-medium text-foreground"
                          : "border-border bg-background/50 text-foreground/85 hover:border-foreground/25"
                      }`}
                    >
                      <input
                        type="radio"
                        name={`${moduleId}-${q.id}`}
                        checked={checked}
                        onChange={() =>
                          setAnswers((prev) => ({ ...prev, [q.id]: optIdx }))
                        }
                        className="mt-0.5 accent-[var(--accent)]"
                      />
                      <span>{opt}</span>
                    </label>
                  );
                })}
              </div>
              {explanationText && (
                <p className="mt-2.5 border-t border-border pt-2 text-[11px] font-medium text-accent">
                  Explanation: {explanationText}
                </p>
              )}
            </fieldset>
          );
        })}

        <button
          type="submit"
          disabled={busy}
          className="inline-flex min-h-10 items-center gap-2 rounded-full bg-primary px-5 py-2 text-xs font-medium text-primary-foreground disabled:opacity-45"
        >
          <ClipboardCheck size={14} aria-hidden="true" />
          {busy
            ? "Grading module quiz..."
            : attempt
              ? "Retake module quiz"
              : "Grade module quiz"}
        </button>
      </form>
    </section>
  );
}
