"use client";

import { useState } from "react";
import { Briefcase, CheckCircle2, Clock3, Lock, Send } from "lucide-react";
import type {
  InternshipApplicationRecord,
  InternshipRecord,
} from "@/lib/certifications/store";

export function WorkspaceInternshipTasksPanel({
  internshipTrack,
  internshipApplication,
  canSubmitTasks,
  lockReason,
  completedOn,
  onTaskUpdated,
}: {
  internshipTrack: InternshipRecord | null;
  internshipApplication: InternshipApplicationRecord | null;
  canSubmitTasks: boolean;
  lockReason: string | null;
  completedOn: string | null;
  onTaskUpdated: () => Promise<void>;
}) {
  const [taskUrls, setTaskUrls] = useState<Record<string, string>>({});
  const [taskSummaries, setTaskSummaries] = useState<Record<string, string>>({});
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  if (!internshipTrack) {
    return (
      <div className="tgl-subsurface rounded-2xl p-5 text-xs text-muted-foreground">
        No additional sprint tasks attached to this programme. Mentor approval of your capstone completes the programme.
      </div>
    );
  }

  const tasks = internshipTrack.tasks ?? [];
  const taskSubmissions = internshipApplication?.task_submissions ?? [];
  const isCompleted =
    internshipApplication?.status === "completed" &&
    internshipApplication?.mentor_approved;

  const handleSubmitTask = async (taskId: string) => {
    if (!internshipApplication) return;
    const submissionUrl = (taskUrls[taskId] ?? "").trim();
    const summary = (taskSummaries[taskId] ?? "").trim();
    if (!submissionUrl || summary.length < 8) {
      setError("Provide a deliverable URL and an 8+ character summary.");
      return;
    }
    setSubmittingId(taskId);
    setError("");
    setNotice("");
    try {
      const res = await fetch("/api/internships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "submit_task",
          applicationId: internshipApplication.id,
          taskId,
          submissionUrl,
          summary,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Unable to submit internship task.");
        return;
      }
      setNotice("Internship sprint task submitted for mentor evaluation.");
      await onTaskUpdated();
    } finally {
      setSubmittingId(null);
    }
  };

  if (!canSubmitTasks) {
    return (
      <div className="tgl-subsurface rounded-2xl p-6 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl bg-foreground/[0.06] text-muted-foreground">
              <Lock size={15} aria-hidden="true" />
            </span>
            <div>
              <p className="font-semibold text-foreground">{internshipTrack.title}</p>
              <p className="text-[11px] text-muted-foreground">
                {internshipTrack.duration_weeks}-week guided internship · {tasks.length} sprint tasks
              </p>
            </div>
          </div>
          <span className="rounded-full bg-foreground/[0.06] px-3 py-1 text-[11px] font-medium text-muted-foreground">
            Locked
          </span>
        </div>

        <p className="mt-4 leading-6 text-muted-foreground">
          {lockReason ??
            "Receive mentor approval on your practical project first to unlock internship sprint deliverables."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="tgl-subsurface rounded-2xl p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
          <div>
            <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.16em] text-accent">
              <Briefcase size={13} aria-hidden="true" />
              Included Internship · {internshipTrack.duration_weeks} Weeks
            </p>
            <h3 className="mt-1 text-lg font-semibold text-foreground">
              {internshipTrack.title}
            </h3>
          </div>

          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium ${
              isCompleted
                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                : "bg-accent/12 text-accent"
            }`}
          >
            {isCompleted ? (
              <>
                <CheckCircle2 size={12} aria-hidden="true" />
                Mentor Completion Confirmed
              </>
            ) : (
              <>
                <Clock3 size={12} aria-hidden="true" />
                Sprint Tasks Open
              </>
            )}
          </span>
        </div>

        {notice && (
          <p role="status" className="mt-4 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-2.5 text-xs text-emerald-700 dark:text-emerald-200">
            {notice}
          </p>
        )}
        {error && (
          <p role="alert" className="mt-4 rounded-xl border border-rose-500/25 bg-rose-500/10 px-4 py-2.5 text-xs text-rose-700 dark:text-rose-200">
            {error}
          </p>
        )}

        <div className="mt-4 space-y-4">
          {tasks.map((task) => {
            const sub = taskSubmissions.find((s) => s.taskId === task.id);
            const approved = sub?.status === "approved";
            return (
              <article
                key={task.id}
                className="rounded-2xl border border-border bg-card p-4 sm:p-5 text-xs"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-foreground">{task.title}</p>
                    <p className="mt-0.5 text-[11px] text-accent">
                      Due {task.deadlineLabel} · Deliverable: {task.deliverableFormat}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium capitalize ${
                      approved
                        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                        : sub?.status === "revision_required"
                          ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                          : sub
                            ? "bg-accent/12 text-accent"
                            : "bg-foreground/[0.06] text-muted-foreground"
                    }`}
                  >
                    {sub ? sub.status.replaceAll("_", " ") : "Pending"}
                  </span>
                </div>

                <p className="mt-2 leading-5 text-muted-foreground">{task.brief}</p>

                {sub && (
                  <div className="mt-3 rounded-xl bg-background/70 p-3">
                    <p className="truncate font-mono text-[11px] text-accent">
                      {sub.submissionUrl}
                    </p>
                    <p className="mt-1 text-foreground/85">{sub.summary}</p>
                    {sub.mentorFeedback && (
                      <p className="mt-2 font-medium text-emerald-700 dark:text-emerald-300">
                        Mentor feedback: {sub.mentorFeedback}
                        {sub.scoreLabel ? ` · ${sub.scoreLabel}` : ""}
                      </p>
                    )}
                  </div>
                )}

                {!approved && internshipApplication && (
                  <div className="mt-3 space-y-2 border-t border-border pt-3">
                    <input
                      type="url"
                      value={taskUrls[task.id] ?? sub?.submissionUrl ?? ""}
                      onChange={(e) =>
                        setTaskUrls((prev) => ({ ...prev, [task.id]: e.target.value }))
                      }
                      placeholder="https://github.com/your-handle/task-pr"
                      className="h-9 w-full rounded-xl border border-border bg-input px-3 text-xs text-foreground"
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="text"
                        value={taskSummaries[task.id] ?? sub?.summary ?? ""}
                        onChange={(e) =>
                          setTaskSummaries((prev) => ({ ...prev, [task.id]: e.target.value }))
                        }
                        placeholder="Summarize what you delivered for this task..."
                        className="h-9 flex-1 rounded-xl border border-border bg-input px-3 text-xs text-foreground"
                      />
                      <button
                        type="button"
                        disabled={submittingId === task.id}
                        onClick={() => void handleSubmitTask(task.id)}
                        className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50"
                      >
                        <Send size={12} aria-hidden="true" />
                        {submittingId === task.id
                          ? "Submitting..."
                          : sub
                            ? "Resubmit task"
                            : "Submit task"}
                      </button>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>

        {isCompleted && (
          <div className="mt-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs">
            <p className="font-semibold text-emerald-800 dark:text-emerald-200">
              Final Internship Completion Confirmed
            </p>
            <p className="mt-1 text-emerald-700 dark:text-emerald-300">
              {internshipApplication?.final_score_label
                ? `Result: ${internshipApplication.final_score_label}. `
                : ""}
              {internshipApplication?.final_evaluation_notes ??
                internshipApplication?.mentor_notes ??
                "All internship requirements approved by mentor."}
              {completedOn
                ? ` Completed on ${new Date(completedOn).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}.`
                : ""}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
