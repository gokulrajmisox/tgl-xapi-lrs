"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Eye, MessageSquare, RotateCcw, Users } from "lucide-react";
import type {
  CohortRecord,
  MentorMessageRecord,
  ProjectSubmissionRecord,
  ProjectSubmissionStatus,
} from "@/lib/learning-workspace-store";

type AssignedLearner = {
  userId: string;
  name: string;
  email: string;
  cohort: string;
  completedNodes: number;
  submissionsCount: number;
  approvedCount: number;
  openQuestions: number;
};

export function MentorConsoleClient({
  initialCohorts,
  initialLearners,
  initialSubmissions,
  initialMessages,
}: {
  initialCohorts: CohortRecord[];
  initialLearners: AssignedLearner[];
  initialSubmissions: ProjectSubmissionRecord[];
  initialMessages: MentorMessageRecord[];
}) {
  const [learners] = useState(initialLearners);
  const [submissions, setSubmissions] = useState(initialSubmissions);
  const [messages, setMessages] = useState(initialMessages);
  const [queueFilter, setQueueFilter] = useState<"all" | ProjectSubmissionStatus>("all");
  const [feedbackDrafts, setFeedbackDrafts] = useState<Record<string, string>>({});
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const handleReview = async (
    submissionId: string,
    decision: "under_review" | "approved" | "revision_required",
  ) => {
    const feedback =
      feedbackDrafts[submissionId]?.trim() ||
      (decision === "approved"
        ? "Approved project implementation, deployment evidence, and verification tests."
        : decision === "under_review"
          ? "Mentor is currently reviewing repository architecture and verification evidence."
          : "Revision required: please refine edge-case tests and resubmit your build.");
    setBusyId(submissionId);
    setNotice("");
    setError("");
    try {
      const res = await fetch("/api/workspace/mentor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "review_submission",
          submissionId,
          decision,
          mentorFeedback: feedback,
          mentorName: "Kabir Malhotra",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Review update failed.");
      setSubmissions(data.submissions ?? []);
      setNotice(
        decision === "approved"
          ? "Project approved. Pathway progress updated (internships require separate task completion)."
          : decision === "under_review"
            ? "Marked submission Under Review."
            : "Revision feedback sent to learner.",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save review.");
    } finally {
      setBusyId("");
    }
  };

  const handleReply = async (msg: MentorMessageRecord) => {
    const body = replyDrafts[msg.id]?.trim();
    if (!body) {
      setError("Write a reply message before sending.");
      return;
    }
    setBusyId(msg.id);
    setNotice("");
    setError("");
    try {
      const res = await fetch("/api/workspace/mentor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reply_thread",
          userId: msg.userId,
          learnerName: msg.learnerName,
          projectSlug: msg.projectSlug,
          nodeId: msg.nodeId,
          topic: msg.topic,
          body,
          mentorName: "Kabir Malhotra",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Reply failed.");
      setMessages(data.messages ?? []);
      setReplyDrafts((prev) => ({ ...prev, [msg.id]: "" }));
      setNotice(`Reply posted to ${msg.learnerName}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not post reply.");
    } finally {
      setBusyId("");
    }
  };

  const filteredSubmissions =
    queueFilter === "all"
      ? submissions
      : submissions.filter((s) => s.status === queueFilter);

  const pendingReviews = submissions.filter(
    (s) => s.status === "submitted" || s.status === "under_review",
  ).length;
  const openQuestions = messages.filter((m) => m.authorRole === "student" && !m.resolved).length;

  return (
    <div className="space-y-8">
      {/* Summary Metrics */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="tgl-glass rounded-2xl p-5">
          <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
            Pending project reviews
          </p>
          <p className="mt-2 text-2xl font-medium tabular-nums text-foreground">
            {pendingReviews}
          </p>
        </div>
        <div className="tgl-glass rounded-2xl p-5">
          <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
            Open learner questions
          </p>
          <p className="mt-2 text-2xl font-medium tabular-nums text-[var(--accent)]">
            {openQuestions}
          </p>
        </div>
        <div className="tgl-glass rounded-2xl p-5">
          <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
            Active cohorts &amp; internship queue
          </p>
          <div className="mt-2 flex items-baseline justify-between gap-2">
            <p className="text-2xl font-medium tabular-nums text-foreground">
              {initialCohorts.length}
            </p>
            <Link
              href="/admin?section=payments"
              className="text-xs font-medium text-[var(--accent)] hover:underline"
            >
              Evaluate internship tasks →
            </Link>
          </div>
        </div>
      </div>

      {notice && (
        <p role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-700 dark:text-emerald-200">
          {notice}
        </p>
      )}
      {error && (
        <p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs text-rose-700 dark:text-rose-200">
          {error}
        </p>
      )}

      {/* Review Queue */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-lg font-medium text-foreground">Project review queue</h2>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter submissions">
            {(
              [
                "all",
                "in_progress",
                "submitted",
                "under_review",
                "approved",
                "revision_required",
              ] as const
            ).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setQueueFilter(status)}
                className={`shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs capitalize transition-colors ${
                  queueFilter === status
                    ? "bg-primary text-primary-foreground"
                    : "border border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {status.replaceAll("_", " ")}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          {filteredSubmissions.map((sub) => (
            <article
              key={sub.id}
              className="tgl-glass rounded-2xl p-6 text-xs"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-medium text-[var(--accent)]">
                    {sub.learnerName} ({sub.cohortName})
                  </p>
                  <h3 className="mt-1 text-base font-medium text-foreground">
                    {sub.projectTitle}
                  </h3>
                  <div className="mt-1 flex flex-wrap gap-3 font-mono text-[11px] text-muted-foreground">
                    {(sub.githubUrl || sub.artifactUrl) && (
                      <a
                        href={sub.githubUrl || sub.artifactUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline hover:text-foreground"
                      >
                        GitHub: {sub.githubUrl || sub.artifactUrl}
                      </a>
                    )}
                    {sub.deploymentUrl && (
                      <a
                        href={sub.deploymentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[var(--accent)] underline hover:opacity-80"
                      >
                        Live demo
                      </a>
                    )}
                  </div>
                </div>
                <span
                  className={`font-medium capitalize ${
                    sub.status === "approved"
                      ? "text-emerald-600 dark:text-emerald-300"
                      : sub.status === "revision_required"
                        ? "text-amber-700 dark:text-amber-300"
                        : "text-[var(--accent)]"
                  }`}
                >
                  {sub.status.replaceAll("_", " ")}
                </span>
              </div>

              <p className="mt-3 leading-5 text-muted-foreground">{sub.summary}</p>
              {sub.supportingEvidence && (
                <p className="mt-1.5 text-muted-foreground">Notes: {sub.supportingEvidence}</p>
              )}
              {sub.supportingFiles && sub.supportingFiles.length > 0 && (
                <p className="mt-1.5 text-muted-foreground">
                  Attached files: {sub.supportingFiles.map((f) => f.name).join(", ")}
                </p>
              )}
              {sub.reflection && (
                <p className="mt-1.5 text-muted-foreground">Student note: {sub.reflection}</p>
              )}

              {sub.mentorFeedback && (
                <div className="tgl-subsurface mt-3 rounded-xl p-3 text-foreground/85">
                  Recorded feedback: {sub.mentorFeedback}
                </div>
              )}

              <div className="mt-4 space-y-3 border-t border-border pt-4">
                <textarea
                  rows={2}
                  value={feedbackDrafts[sub.id] ?? ""}
                  onChange={(e) =>
                    setFeedbackDrafts((prev) => ({ ...prev, [sub.id]: e.target.value }))
                  }
                  placeholder="Write rubric feedback for the learner..."
                  className="w-full rounded-xl border border-border bg-input px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={busyId === sub.id}
                    onClick={() => void handleReview(sub.id, "under_review")}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border px-3.5 py-2 text-xs text-foreground transition-colors hover:bg-muted/40 disabled:opacity-45"
                  >
                    <Eye size={13} aria-hidden="true" /> Mark Under Review
                  </button>
                  <button
                    type="button"
                    disabled={busyId === sub.id}
                    onClick={() => void handleReview(sub.id, "approved")}
                    className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground disabled:opacity-45"
                  >
                    <CheckCircle2 size={13} aria-hidden="true" /> Approve work
                  </button>
                  <button
                    type="button"
                    disabled={busyId === sub.id}
                    onClick={() => void handleReview(sub.id, "revision_required")}
                    className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/35 px-4 py-2 text-xs text-amber-700 transition-colors hover:bg-amber-500/10 disabled:opacity-45 dark:text-amber-200"
                  >
                    <RotateCcw size={13} aria-hidden="true" /> Request revision
                  </button>
                  <Link
                    href={`/projects/${sub.projectSlug}`}
                    className="ml-auto text-muted-foreground hover:text-foreground"
                  >
                    View project brief
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Assigned Learners & Questions */}
      <div id="learners" className="grid gap-6 lg:grid-cols-2">
        <section className="tgl-glass rounded-2xl p-6">
          <h2 className="flex items-center gap-2 text-base font-medium text-foreground">
            <Users size={15} className="text-[var(--accent)]" aria-hidden="true" />
            <span>Assigned learners ({learners.length})</span>
          </h2>
          <div className="mt-4 space-y-2.5 text-xs">
            {learners.map((learner) => (
              <div
                key={learner.userId}
                className="tgl-subsurface flex items-center justify-between rounded-xl p-4"
              >
                <div>
                  <p className="font-medium text-foreground">{learner.name}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {learner.cohort} · {learner.email}
                  </p>
                </div>
                <div className="text-right font-mono text-[11px] tabular-nums text-muted-foreground">
                  <p>{learner.approvedCount}/{learner.submissionsCount} approved</p>
                  <p>{learner.completedNodes} nodes done</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="tgl-glass rounded-2xl p-6">
          <h2 className="flex items-center gap-2 text-base font-medium text-foreground">
            <MessageSquare size={15} className="text-[var(--accent)]" aria-hidden="true" />
            <span>Learner questions &amp; touchpoints</span>
          </h2>
          <div className="mt-4 space-y-3 text-xs">
            {messages
              .filter((m) => m.authorRole === "student")
              .map((msg) => (
                <article
                  key={msg.id}
                  className="tgl-subsurface rounded-xl p-4"
                >
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>
                      {msg.learnerName} · {msg.topic}
                    </span>
                    <span>{msg.resolved ? "Answered" : "Needs reply"}</span>
                  </div>
                  <p className="mt-2 text-foreground/85">{msg.body}</p>
                  <div className="mt-3 flex gap-2">
                    <input
                      type="text"
                      value={replyDrafts[msg.id] ?? ""}
                      onChange={(e) =>
                        setReplyDrafts((prev) => ({ ...prev, [msg.id]: e.target.value }))
                      }
                      placeholder="Reply directly to learner..."
                      className="h-9 flex-1 rounded-lg border border-border bg-input px-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <button
                      type="button"
                      disabled={busyId === msg.id}
                      onClick={() => void handleReply(msg)}
                      className="rounded-full bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground"
                    >
                      Reply
                    </button>
                  </div>
                </article>
              ))}
          </div>
        </section>
      </div>
    </div>
  );
}
