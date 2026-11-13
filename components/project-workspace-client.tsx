"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  Bookmark,
  CheckCircle2,
  Compass,
  ExternalLink,
  FolderGit2,
  MessageSquare,
  Play,
  RotateCcw,
  Send,
  Users,
} from "lucide-react";
import type { LearningNode, ProjectBrief } from "@/lib/learning-graph";
import type {
  MentorMessageRecord,
  ProjectSubmissionRecord,
  ProjectSubmissionStatus,
} from "@/lib/learning-workspace-store";
import SlideCommit from "@/components/react-bits/SlideCommit";

const PROJECT_LIFECYCLE: Array<{
  key: "not_started" | ProjectSubmissionStatus;
  label: string;
}> = [
  { key: "not_started", label: "Not Started" },
  { key: "in_progress", label: "In Progress" },
  { key: "submitted", label: "Submitted" },
  { key: "under_review", label: "Under Review" },
  { key: "approved", label: "Approved" },
];

export function ProjectWorkspaceClient({
  project,
  relatedConcepts,
  relatedProjects,
  initialSubmissions,
  initialMessages,
  initiallySaved,
}: {
  project: ProjectBrief;
  relatedConcepts: LearningNode[];
  relatedProjects: ProjectBrief[];
  initialSubmissions: ProjectSubmissionRecord[];
  initialMessages: MentorMessageRecord[];
  initiallySaved: boolean;
}) {
  const [submissions, setSubmissions] = useState<ProjectSubmissionRecord[]>(initialSubmissions);
  const [messages, setMessages] = useState<MentorMessageRecord[]>(initialMessages);
  const [saved, setSaved] = useState(initiallySaved);

  const latestSubmission: ProjectSubmissionRecord | null =
    submissions.length > 0 ? submissions[0] : null;
  const currentStatus: "not_started" | ProjectSubmissionStatus =
    latestSubmission?.status ?? "not_started";

  const [githubUrl, setGithubUrl] = useState(latestSubmission?.githubUrl ?? "");
  const [deploymentUrl, setDeploymentUrl] = useState(latestSubmission?.deploymentUrl ?? "");
  const [supportingEvidence, setSupportingEvidence] = useState(
    latestSubmission?.supportingEvidence ?? "",
  );
  const [summary, setSummary] = useState(
    latestSubmission && latestSubmission.status === "revision_required"
      ? latestSubmission.summary
      : "",
  );
  const [reflection, setReflection] = useState(latestSubmission?.reflection ?? "");
  const [question, setQuestion] = useState("");

  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const toggleSave = async () => {
    const res = await fetch("/api/workspace/learner", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "toggle_save", itemKey: `project:${project.slug}` }),
    });
    if (res.ok) setSaved((v) => !v);
  };

  const handleStartProject = async () => {
    setBusy(true);
    setNotice("");
    setError("");
    try {
      const res = await fetch("/api/workspace/learner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start_project", projectSlug: project.slug }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not start project.");
      if (data.submission) {
        setSubmissions((prev) =>
          prev.some((s) => s.id === data.submission.id) ? prev : [data.submission, ...prev],
        );
      }
      setNotice("Project moved to In Progress. Add your GitHub repo and deliverables below.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start project.");
    } finally {
      setBusy(false);
    }
  };

  const canSubmitWork = githubUrl.trim().length > 0 && summary.trim().length >= 10;

  const submitWorkAsync = async () => {
    if (!canSubmitWork) {
      throw new Error("Provide a GitHub repository URL and at least a 10-character summary.");
    }
    setBusy(true);
    setNotice("");
    setError("");
    try {
      const res = await fetch("/api/workspace/learner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "submit_project",
          projectSlug: project.slug,
          githubUrl: githubUrl.trim(),
          artifactUrl: githubUrl.trim(),
          deploymentUrl: deploymentUrl.trim(),
          supportingEvidence: supportingEvidence.trim(),
          summary: summary.trim(),
          reflection: reflection.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Submission failed.");
      setSubmissions((prev) => {
        const filtered = prev.filter((s) => s.id !== data.submission.id);
        return [data.submission, ...filtered];
      });
      setNotice(
        currentStatus === "revision_required"
          ? "Revision resubmitted and queued for mentor re-evaluation."
          : "Project submission recorded and queued for mentor review.",
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not submit work.";
      setError(msg);
      throw err;
    } finally {
      setBusy(false);
    }
  };

  const handleSubmitWork = (e: React.FormEvent) => {
    e.preventDefault();
    void submitWorkAsync().catch(() => {});
  };

  const handleAskMentor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;
    setBusy(true);
    setNotice("");
    setError("");
    try {
      const res = await fetch("/api/workspace/learner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ask_mentor",
          projectSlug: project.slug,
          nodeId: relatedConcepts[0]?.id ?? null,
          topic: `${project.title} guidance`,
          body: question.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not send message.");
      setMessages((prev) => [data.message, ...prev]);
      setQuestion("");
      setNotice(`Question sent to ${project.mentorName}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not post message.");
    } finally {
      setBusy(false);
    }
  };

  const activeStageIndex =
    currentStatus === "revision_required"
      ? 2
      : Math.max(
          0,
          PROJECT_LIFECYCLE.findIndex((s) => s.key === currentStatus),
        );

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/pathways/${project.pathwaySlug}`}
          className="inline-flex items-center gap-2 text-xs text-white/55 hover:text-white"
        >
          <ArrowLeft size={13} aria-hidden="true" /> Return to pathway map
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void toggleSave()}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3.5 py-2 text-xs text-white/80 hover:border-white/35"
          >
            <Bookmark size={13} aria-hidden="true" />
            {saved ? "Saved project" : "Save project"}
          </button>
          <Link
            href="/learn/portfolio"
            className="inline-flex items-center gap-1.5 rounded-full bg-[#f4f3ef] px-4 py-2 text-xs font-medium text-[#111111]"
          >
            Portfolio &amp; evidence <ArrowUpRight size={13} aria-hidden="true" />
          </Link>
        </div>
      </div>

      {/* 5-Stage Lifecycle Tracker */}
      <section className="rounded-2xl border border-white/10 bg-[#111111] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-[#b9a9d6]">
              Project Status Lifecycle
            </p>
            <p className="mt-1 text-sm font-medium capitalize text-[#f4f3ef]">
              Current status:{" "}
              <span
                className={
                  currentStatus === "approved"
                    ? "text-emerald-300"
                    : currentStatus === "revision_required"
                      ? "text-amber-300"
                      : "text-[#b9a9d6]"
                }
              >
                {currentStatus.replaceAll("_", " ")}
              </span>
            </p>
          </div>

          {currentStatus === "not_started" && (
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleStartProject()}
              className="inline-flex items-center gap-2 rounded-full bg-[#f4f3ef] px-4 py-2 text-xs font-medium text-[#111111] disabled:opacity-45"
            >
              <Play size={12} aria-hidden="true" />
              Start project
            </button>
          )}
        </div>

        <ol className="mt-4 grid gap-2 sm:grid-cols-5">
          {PROJECT_LIFECYCLE.map((step, idx) => {
            const reached = idx <= activeStageIndex;
            const isRevision = currentStatus === "revision_required" && idx === 3;
            return (
              <li
                key={step.key}
                className={`rounded-xl border px-3 py-2.5 text-xs ${
                  isRevision
                    ? "border-amber-400/40 bg-amber-950/25 text-amber-200"
                    : reached
                      ? "border-[#b9a9d6]/40 bg-[#b9a9d6]/10 text-[#f4f3ef]"
                      : "border-white/10 bg-black/20 text-white/40"
                }`}
              >
                <span className="font-mono text-[10px] opacity-70">0{idx + 1}</span>
                <p className="mt-0.5 font-medium">
                  {isRevision ? "Revision Required" : step.label}
                </p>
              </li>
            );
          })}
        </ol>

        {latestSubmission?.mentorFeedback && (
          <div
            className={`mt-4 rounded-xl border p-4 text-xs ${
              latestSubmission.status === "revision_required"
                ? "border-amber-400/35 bg-amber-950/25 text-amber-100"
                : "border-emerald-400/25 bg-emerald-950/20 text-emerald-100"
            }`}
          >
            <p className="font-medium">
              {latestSubmission.status === "revision_required"
                ? `Revision requested by ${latestSubmission.mentorName}:`
                : `Mentor critique (${latestSubmission.mentorName}):`}
            </p>
            <p className="mt-1 leading-5 opacity-90">{latestSubmission.mentorFeedback}</p>
          </div>
        )}
      </section>

      {notice && (
        <p role="status" className="rounded-xl border border-emerald-400/25 bg-emerald-950/20 px-4 py-3 text-xs text-emerald-200">
          {notice}
        </p>
      )}
      {error && (
        <p role="alert" className="rounded-xl border border-rose-400/30 bg-rose-950/20 px-4 py-3 text-xs text-rose-200">
          {error}
        </p>
      )}

      {/* Brief & Deliverables */}
      <div className="grid gap-6 lg:grid-cols-[1.15fr_.85fr]">
        <section className="space-y-5 rounded-2xl border border-white/10 bg-[#111111] p-6">
          <p className="text-xs text-[#b9a9d6]">
            {project.category} · {project.difficulty} · {project.estimatedHours} hours · {project.cohortName}
          </p>
          <h2 className="text-2xl font-medium tracking-[-0.04em] text-[#f4f3ef]">
            {project.title}
          </h2>
          <p className="text-sm leading-6 text-white/65">{project.brief}</p>

          <div className="border-t border-white/10 pt-4">
            <h3 className="text-xs font-medium uppercase tracking-[0.14em] text-white/45">
              Expected deliverables
            </h3>
            <ul className="mt-3 space-y-2 text-xs text-white/75">
              {project.deliverables.map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-[#b9a9d6]" aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {project.resources.length > 0 && (
            <div className="border-t border-white/10 pt-4">
              <h3 className="text-xs font-medium uppercase tracking-[0.14em] text-white/45">
                Reference resources
              </h3>
              <div className="mt-3 space-y-2">
                {project.resources.map((res) => (
                  <a
                    key={res.id}
                    href={res.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-xs hover:border-white/25"
                  >
                    <div>
                      <p className="font-medium text-[#f4f3ef]">{res.title}</p>
                      <p className="text-[11px] text-white/45">
                        {res.provider} · {res.duration}
                      </p>
                    </div>
                    <ExternalLink size={13} className="text-white/50" aria-hidden="true" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Submit / Resubmit Work Form */}
        <section className="space-y-4 rounded-2xl border border-white/10 bg-[#111111] p-6">
          <div className="flex items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 text-base font-medium">
              {currentStatus === "revision_required" ? (
                <RotateCcw size={15} className="text-amber-300" aria-hidden="true" />
              ) : (
                <FolderGit2 size={15} className="text-[#b9a9d6]" aria-hidden="true" />
              )}
              <span>
                {currentStatus === "revision_required"
                  ? "Resubmit updated project work"
                  : "Submit project deliverables"}
              </span>
            </h3>
          </div>
          <p className="text-xs leading-5 text-white/50">
            Mentor <strong className="text-white/80">{project.mentorName}</strong> ({project.mentorRole}) reviews GitHub code, deployment verification, and evidence notes before approval.
          </p>

          <form onSubmit={handleSubmitWork} className="space-y-3">
            <label className="block text-xs text-white/60">
              GitHub repository URL
              <input
                type="url"
                required
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                placeholder="https://github.com/username/project"
                className="mt-1 h-10 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-xs text-white"
              />
            </label>

            <label className="block text-xs text-white/60">
              Live deployment URL (optional)
              <input
                type="url"
                value={deploymentUrl}
                onChange={(e) => setDeploymentUrl(e.target.value)}
                placeholder="https://your-demo.vercel.app"
                className="mt-1 h-10 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-xs text-white"
              />
            </label>

            <label className="block text-xs text-white/60">
              Supporting evidence (test logs, demo notes, PR link)
              <input
                type="text"
                value={supportingEvidence}
                onChange={(e) => setSupportingEvidence(e.target.value)}
                placeholder="e.g. Unit test run 14/14 passed, screenshots in /docs"
                className="mt-1 h-10 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-xs text-white"
              />
            </label>

            <label className="block text-xs text-white/60">
              Implementation summary
              <textarea
                required
                rows={3}
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Key design decisions, verification tests, and behavior..."
                className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-white"
              />
            </label>

            <label className="block text-xs text-white/60">
              Reflection / open question for mentor (optional)
              <textarea
                rows={2}
                value={reflection}
                onChange={(e) => setReflection(e.target.value)}
                placeholder="What tradeoffs would you like reviewed?"
                className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-white"
              />
            </label>

            <div className="pt-2">
              <div className="flex flex-col items-start gap-2">
                <SlideCommit
                  label={
                    currentStatus === "revision_required"
                      ? "Slide to resubmit work"
                      : "Slide to submit work"
                  }
                  doneLabel="Submitted"
                  errorLabel="Check fields"
                  trackColor="#1a1721"
                  handleColor="#f4f3ef"
                  successColor="#22c55e"
                  dangerColor="#e5484d"
                  width={276}
                  height={52}
                  disabled={busy || !canSubmitWork}
                  onConfirm={submitWorkAsync}
                />
                <p className="text-[11px] text-white/45">
                  {canSubmitWork
                    ? "Drag handle across or focus slider and press End to submit for mentor critique."
                    : "Enter a GitHub repository URL and a 10+ character summary to unlock submission."}
                </p>
              </div>
            </div>
          </form>
        </section>
      </div>

      {/* Related Concepts & Cross-Linked Projects */}
      <section className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-[#111111] p-6">
          <h3 className="flex items-center gap-2 text-sm font-medium">
            <Compass size={15} className="text-[#b9a9d6]" aria-hidden="true" />
            <span>Related concepts across pathways</span>
          </h3>
          <div className="mt-4 space-y-2">
            {relatedConcepts.map((c) => (
              <Link
                key={c.id}
                href={`/pathways/${c.pathwaySlug}`}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-xs hover:border-white/25"
              >
                <div>
                  <p className="font-medium text-[#f4f3ef]">{c.title}</p>
                  <p className="text-[11px] text-white/45">{c.summary}</p>
                </div>
                <ArrowUpRight size={13} className="shrink-0 text-white/50" aria-hidden="true" />
              </Link>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#111111] p-6">
          <h3 className="flex items-center gap-2 text-sm font-medium">
            <Users size={15} className="text-[#b9a9d6]" aria-hidden="true" />
            <span>Peer work &amp; adjacent projects</span>
          </h3>
          <div className="mt-4 space-y-3">
            {project.peerWork.length > 0 ? (
              project.peerWork.map((peer) => (
                <article
                  key={peer.id}
                  className="rounded-xl border border-white/10 bg-black/25 p-4 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-[#f4f3ef]">{peer.learnerName}</p>
                    <a
                      href={peer.artifactUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#b9a9d6] hover:underline"
                    >
                      Inspect work
                    </a>
                  </div>
                  <p className="mt-1.5 text-white/60">{peer.summary}</p>
                  <p className="mt-1.5 text-[11px] text-emerald-300">{peer.mentorHighlight}</p>
                </article>
              ))
            ) : (
              <p className="text-xs text-white/45">Be the first learner in this cohort to publish a peer showcase.</p>
            )}

            {relatedProjects.length > 0 && (
              <div className="flex flex-wrap gap-2 border-t border-white/10 pt-3">
                {relatedProjects.map((rp) => (
                  <Link
                    key={rp.slug}
                    href={`/projects/${rp.slug}`}
                    className="rounded-full border border-white/15 px-3 py-1.5 text-[11px] text-white/75 hover:border-white/35"
                  >
                    Next: {rp.title}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Submissions & Mentor Feedback Thread */}
      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-[#111111] p-6">
          <h3 className="text-base font-medium">Your submissions ({submissions.length})</h3>
          <div className="mt-4 space-y-3">
            {submissions.length > 0 ? (
              submissions.map((sub) => (
                <article
                  key={sub.id}
                  className="rounded-xl border border-white/10 bg-black/25 p-4 text-xs"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <a
                      href={sub.githubUrl || sub.artifactUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-[11px] text-[#b9a9d6] hover:underline"
                    >
                      {sub.githubUrl || sub.artifactUrl || "Draft started"}
                    </a>
                    <span
                      className={`capitalize font-medium ${
                        sub.status === "approved"
                          ? "text-emerald-300"
                          : sub.status === "revision_required"
                            ? "text-amber-300"
                            : "text-white/80"
                      }`}
                    >
                      {sub.status.replaceAll("_", " ")}
                    </span>
                  </div>
                  {sub.deploymentUrl && (
                    <p className="mt-1 font-mono text-[11px] text-white/55">
                      Live demo:{" "}
                      <a
                        href={sub.deploymentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline hover:text-white"
                      >
                        {sub.deploymentUrl}
                      </a>
                    </p>
                  )}
                  <p className="mt-2 text-white/65">{sub.summary}</p>
                  {sub.supportingEvidence && (
                    <p className="mt-1.5 text-[11px] text-white/50">
                      Evidence: {sub.supportingEvidence}
                    </p>
                  )}
                  {sub.mentorFeedback && (
                    <div className="mt-3 rounded-lg border border-emerald-400/20 bg-emerald-950/20 p-3 text-emerald-200">
                      <p className="font-medium">Mentor feedback ({sub.mentorName}):</p>
                      <p className="mt-1">{sub.mentorFeedback}</p>
                    </div>
                  )}
                </article>
              ))
            ) : (
              <p className="rounded-xl border border-dashed border-white/15 p-5 text-xs text-white/45">
                No submissions for this project yet. Click &ldquo;Start project&rdquo; or submit your GitHub repo above when ready.
              </p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#111111] p-6">
          <h3 className="flex items-center gap-2 text-base font-medium">
            <MessageSquare size={15} className="text-[#b9a9d6]" aria-hidden="true" />
            <span>Mentor discussion ({messages.length})</span>
          </h3>

          <form onSubmit={handleAskMentor} className="mt-4 flex gap-2">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder={`Ask ${project.mentorName} about this project...`}
              className="h-10 flex-1 rounded-xl border border-white/10 bg-black/30 px-3 text-xs text-white"
            />
            <button
              type="submit"
              disabled={busy || question.trim().length < 5}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#f4f3ef] px-4 py-2 text-xs font-medium text-[#111111] disabled:opacity-45 whitespace-nowrap shrink-0"
            >
              <Send size={12} aria-hidden="true" /> Ask mentor
            </button>
          </form>

          <div className="mt-4 space-y-2.5">
            {messages.length > 0 ? (
              messages.map((msg) => (
                <article
                  key={msg.id}
                  className="rounded-xl border border-white/10 bg-black/25 p-3.5 text-xs"
                >
                  <div className="flex items-center justify-between text-[11px] text-white/45">
                    <span>
                      {msg.authorName} ({msg.authorRole})
                    </span>
                    <span>{msg.resolved ? "Answered" : "Awaiting reply"}</span>
                  </div>
                  <p className="mt-1.5 text-white/75">{msg.body}</p>
                </article>
              ))
            ) : (
              <p className="text-xs text-white/45">No questions posted on this project yet.</p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
