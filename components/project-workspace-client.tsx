"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  ArrowUpRight,
  Bookmark,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Compass,
  ExternalLink,
  FileUp,
  FolderGit2,
  MessageSquare,
  Play,
  RotateCcw,
  Send,
  Users,
  X,
} from "lucide-react";
import {
  getProjectGuidance,
  type LearningNode,
  type ProjectBrief,
} from "@/lib/learning-graph";
import type {
  MentorMessageRecord,
  ProjectSubmissionRecord,
  ProjectSubmissionStatus,
  SupportingFileMeta,
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

function StatusBadge({ status }: { status: "not_started" | ProjectSubmissionStatus }) {
  if (status === "approved") {
    return (
      <span className="inline-flex items-center gap-1.5 font-medium text-emerald-300">
        <CheckCircle2 size={13} aria-hidden="true" />
        Approved
      </span>
    );
  }
  if (status === "revision_required") {
    return (
      <span className="inline-flex items-center gap-1.5 font-medium text-amber-300">
        <AlertCircle size={13} aria-hidden="true" />
        Revision Required
      </span>
    );
  }
  if (status === "under_review" || status === "submitted") {
    return (
      <span className="inline-flex items-center gap-1.5 font-medium text-[#b9a9d6]">
        <Clock3 size={13} aria-hidden="true" />
        {status === "under_review" ? "Under Review" : "Submitted"}
      </span>
    );
  }
  if (status === "in_progress") {
    return (
      <span className="inline-flex items-center gap-1.5 font-medium text-[#b9a9d6]">
        <Play size={12} aria-hidden="true" />
        In Progress
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 font-medium text-white/65">
      <Clock3 size={12} aria-hidden="true" />
      Not Started
    </span>
  );
}

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

  const guidance = useMemo(() => getProjectGuidance(project), [project]);

  const latestSubmission: ProjectSubmissionRecord | null =
    submissions.length > 0 ? submissions[0] : null;
  const currentStatus: "not_started" | ProjectSubmissionStatus =
    latestSubmission?.status ?? "not_started";

  const [githubUrl, setGithubUrl] = useState(latestSubmission?.githubUrl ?? "");
  const [deploymentUrl, setDeploymentUrl] = useState(latestSubmission?.deploymentUrl ?? "");
  const [supportingEvidence, setSupportingEvidence] = useState(
    latestSubmission?.supportingEvidence ?? "",
  );
  const [supportingFiles, setSupportingFiles] = useState<SupportingFileMeta[]>(
    latestSubmission?.supportingFiles ?? [],
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

  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? []).slice(0, 5);
    if (picked.length === 0) return;
    setSupportingFiles((prev) => {
      const merged = [...prev];
      for (const file of picked) {
        if (!merged.some((f) => f.name === file.name && f.sizeBytes === file.size)) {
          merged.push({
            name: file.name,
            sizeBytes: file.size,
            mimeType: file.type || "application/octet-stream",
          });
        }
      }
      return merged.slice(0, 5);
    });
  };

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
      setNotice("Project started. Follow the steps below and submit your GitHub link when ready.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start project.");
    } finally {
      setBusy(false);
    }
  };

  const canSubmitWork = githubUrl.trim().length > 0 && summary.trim().length >= 10;

  const submitWorkAsync = async () => {
    if (!canSubmitWork) {
      const msg = "Please enter your GitHub repository link and write at least 10 characters explaining what you built.";
      setError(msg);
      throw new Error(msg);
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
          supportingFiles,
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
          ? "Updated project submitted! Your mentor will review your changes soon."
          : "Project submitted! Your mentor will review it and share feedback here.",
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
          href={`/courses`}
          className="inline-flex min-h-11 items-center gap-2 text-xs text-white/70 hover:text-white"
        >
          <ArrowLeft size={14} aria-hidden="true" /> Explore Courses
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void toggleSave()}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-white/15 px-4 py-2 text-xs text-white/85 hover:border-white/35"
          >
            <Bookmark size={13} aria-hidden="true" />
            {saved ? "Saved project" : "Save project"}
          </button>
          <Link
            href="/learn/portfolio"
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-[#f4f3ef] px-4 py-2 text-xs font-medium text-[#111111]"
          >
            My Portfolio <ArrowUpRight size={13} aria-hidden="true" />
          </Link>
        </div>
      </div>

      {/* Clear 5-Stage Lifecycle Tracker */}
      <section className="rounded-2xl border border-white/10 bg-[#111111] p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-[#b9a9d6]">
              Project Progress
            </p>
            <div className="mt-1 flex items-center gap-2 text-sm">
              <span className="text-white/65">Current status:</span>
              <StatusBadge status={currentStatus} />
            </div>
          </div>

          {currentStatus === "not_started" && (
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleStartProject()}
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#f4f3ef] px-5 py-2.5 text-xs font-medium text-[#111111] disabled:opacity-45"
            >
              <Play size={13} aria-hidden="true" />
              Start Project
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
                      : "border-white/10 bg-black/20 text-white/45"
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
                : `Mentor feedback (${latestSubmission.mentorName}):`}
            </p>
            <p className="mt-1 leading-5 opacity-95">{latestSubmission.mentorFeedback}</p>
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

      {/* Brief, Step-by-Step Instructions, Skills, Deadline, Evaluation Criteria & Submission Form */}
      <div className="grid gap-6 lg:grid-cols-[1.15fr_.85fr]">
        <section className="space-y-6 rounded-2xl border border-white/10 bg-[#111111] p-6">
          <div>
            <p className="text-xs text-[#b9a9d6]">
              {project.category} · {project.difficulty} · {project.estimatedHours} hours · {project.cohortName}
            </p>
            <h2 className="mt-2 text-2xl font-medium tracking-[-0.04em] text-[#f4f3ef]">
              What you need to build: {project.title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-white/75">{project.brief}</p>
          </div>

          <div className="grid gap-4 rounded-xl border border-white/10 bg-black/30 p-4 text-xs sm:grid-cols-2">
            <div>
              <p className="font-medium text-[#b9a9d6]">Why this project matters</p>
              <p className="mt-1 leading-5 text-white/70">{guidance.whyItMatters}</p>
            </div>
            <div>
              <p className="flex items-center gap-1.5 font-medium text-[#b9a9d6]">
                <CalendarClock size={13} aria-hidden="true" />
                Submission deadline &amp; method
              </p>
              <p className="mt-1 leading-5 text-white/70">
                <strong className="text-white">{guidance.submissionDeadline}</strong> ·{" "}
                {guidance.submissionMethod}
              </p>
            </div>
          </div>

          {guidance.requiredSkills.length > 0 && (
            <div className="border-t border-white/10 pt-4 text-xs">
              <h3 className="font-medium uppercase tracking-[0.14em] text-white/55">
                Required skills
              </h3>
              <p className="mt-2 text-white/80">{guidance.requiredSkills.join(" · ")}</p>
            </div>
          )}

          <div className="border-t border-white/10 pt-4">
            <h3 className="text-xs font-medium uppercase tracking-[0.14em] text-white/55">
              Step-by-step instructions
            </h3>
            <ol className="mt-3 list-decimal space-y-2 pl-4 text-xs leading-5 text-white/75">
              {guidance.stepByStep.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </div>

          <div className="border-t border-white/10 pt-4">
            <h3 className="text-xs font-medium uppercase tracking-[0.14em] text-white/55">
              Evaluation criteria
            </h3>
            <ul className="mt-3 space-y-2 text-xs text-white/75">
              {guidance.evaluationCriteria.map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-emerald-300" aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {project.resources.length > 0 && (
            <div className="border-t border-white/10 pt-4">
              <h3 className="text-xs font-medium uppercase tracking-[0.14em] text-white/55">
                Helpful guides &amp; examples
              </h3>
              <div className="mt-3 space-y-2">
                {project.resources.map((res) => (
                  <a
                    key={res.id}
                    href={res.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex min-h-11 items-center justify-between rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-xs hover:border-white/25"
                  >
                    <div>
                      <p className="font-medium text-[#f4f3ef]">{res.title}</p>
                      <p className="text-[11px] text-white/50">
                        {res.provider} · {res.duration}
                      </p>
                    </div>
                    <ExternalLink size={13} className="text-white/55" aria-hidden="true" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Submit / Resubmit Work Form */}
        <section className="self-start space-y-4 rounded-2xl border border-white/10 bg-[#111111] p-6">
          <div className="flex items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 text-base font-medium">
              {currentStatus === "revision_required" ? (
                <RotateCcw size={15} className="text-amber-300" aria-hidden="true" />
              ) : (
                <FolderGit2 size={15} className="text-[#b9a9d6]" aria-hidden="true" />
              )}
              <span>
                {currentStatus === "revision_required" ? "Resubmit Project" : "Submit Project"}
              </span>
            </h3>
          </div>
          <p className="text-xs leading-5 text-white/60">
            Mentor <strong className="text-white/90">{project.mentorName}</strong> ({project.mentorRole}) will check your repository link, live demo, and notes, then share feedback here.
          </p>

          <form onSubmit={handleSubmitWork} className="space-y-3.5">
            <label className="block text-xs text-white/70">
              GitHub repository link (required)
              <input
                type="url"
                required
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                placeholder="https://github.com/username/project"
                className="mt-1.5 h-11 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-xs text-white"
              />
            </label>

            <label className="block text-xs text-white/70">
              Live website or demo link (optional)
              <input
                type="url"
                value={deploymentUrl}
                onChange={(e) => setDeploymentUrl(e.target.value)}
                placeholder="https://your-demo.vercel.app"
                className="mt-1.5 h-11 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-xs text-white"
              />
            </label>

            <label className="block text-xs text-white/70">
              Test notes or evidence (optional)
              <input
                type="text"
                value={supportingEvidence}
                onChange={(e) => setSupportingEvidence(e.target.value)}
                placeholder="e.g. All tests passed, screenshots included in /docs"
                className="mt-1.5 h-11 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-xs text-white"
              />
            </label>

            <div className="space-y-2 rounded-xl border border-white/10 bg-black/25 p-3.5 text-xs">
              <label className="flex cursor-pointer items-center justify-between gap-3 text-white/75">
                <span className="flex items-center gap-2 font-medium">
                  <FileUp size={14} className="text-[#b9a9d6]" aria-hidden="true" />
                  Attach supporting files (optional)
                </span>
                <input
                  type="file"
                  multiple
                  accept=".pdf,.png,.jpg,.jpeg,.md,.txt,.json,.zip"
                  onChange={handleFilesSelected}
                  className="sr-only"
                />
                <span className="rounded-full border border-white/15 px-3 py-1.5 text-[11px] text-white/85 hover:border-white/35">
                  Choose files
                </span>
              </label>
              {supportingFiles.length > 0 && (
                <ul className="space-y-1.5 pt-1">
                  {supportingFiles.map((file) => (
                    <li
                      key={file.name}
                      className="flex items-center justify-between rounded-lg border border-white/10 bg-black/30 px-3 py-1.5 text-[11px]"
                    >
                      <span className="truncate text-white/85">{file.name}</span>
                      <button
                        type="button"
                        aria-label={`Remove ${file.name}`}
                        onClick={() =>
                          setSupportingFiles((prev) =>
                            prev.filter((f) => f.name !== file.name),
                          )
                        }
                        className="ml-2 text-white/55 hover:text-white"
                      >
                        <X size={13} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <label className="block text-xs text-white/70">
              What did you build? (10+ characters)
              <textarea
                required
                rows={3}
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Explain what your project does and what you tested..."
                className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-white"
              />
            </label>

            <label className="block text-xs text-white/70">
              Question for your mentor (optional)
              <textarea
                rows={2}
                value={reflection}
                onChange={(e) => setReflection(e.target.value)}
                placeholder="Anything you would like extra feedback on?"
                className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-white"
              />
            </label>

            <div className="pt-2">
              <div className="flex flex-col items-center gap-3">
                <SlideCommit
                  label={
                    currentStatus === "revision_required"
                      ? "Slide to Resubmit Project"
                      : "Slide to Submit Project"
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
                <button
                  type="submit"
                  disabled={busy || !canSubmitWork}
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-[#f4f3ef] px-5 py-2.5 text-xs font-medium text-[#111111] hover:bg-white disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <Send size={13} aria-hidden="true" />
                  {currentStatus === "revision_required" ? "Resubmit Project" : "Submit Project"}
                </button>
                <p className="text-center text-[11px] text-white/50">
                  {canSubmitWork
                    ? "Slide the bar above or click Submit Project to send your work for review."
                    : "Add your GitHub link and a 10+ character summary above to submit."}
                </p>
              </div>
            </div>
          </form>
        </section>
      </div>

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
                    <StatusBadge status={sub.status} />
                  </div>
                  {sub.deploymentUrl && (
                    <p className="mt-1 font-mono text-[11px] text-white/60">
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
                  <p className="mt-2 text-white/70">{sub.summary}</p>
                  {sub.supportingEvidence && (
                    <p className="mt-1.5 text-[11px] text-white/55">
                      Notes: {sub.supportingEvidence}
                    </p>
                  )}
                  {sub.supportingFiles && sub.supportingFiles.length > 0 && (
                    <p className="mt-1.5 text-[11px] text-white/60">
                      Attached files: {sub.supportingFiles.map((f) => f.name).join(", ")}
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
              <p className="rounded-xl border border-dashed border-white/15 p-5 text-xs text-white/50">
                No submissions for this project yet. Click &ldquo;Start Project&rdquo; or submit your GitHub link above when ready.
              </p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#111111] p-6">
          <h3 className="flex items-center gap-2 text-base font-medium">
            <MessageSquare size={15} className="text-[#b9a9d6]" aria-hidden="true" />
            <span>Ask your mentor ({messages.length})</span>
          </h3>

          <form onSubmit={handleAskMentor} className="mt-4 flex flex-wrap gap-2">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder={`Ask ${project.mentorName} a question about this project...`}
              className="h-11 min-w-[200px] flex-1 rounded-xl border border-white/10 bg-black/30 px-3 text-xs text-white"
            />
            <button
              type="submit"
              disabled={busy || question.trim().length < 5}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-[#f4f3ef] px-4 py-2 text-xs font-medium text-[#111111] disabled:opacity-45 whitespace-nowrap shrink-0"
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
                  <div className="flex items-center justify-between text-[11px] text-white/50">
                    <span>
                      {msg.authorName} ({msg.authorRole})
                    </span>
                    <span>{msg.resolved ? "Answered" : "Awaiting reply"}</span>
                  </div>
                  <p className="mt-1.5 text-white/80">{msg.body}</p>
                </article>
              ))
            ) : (
              <p className="text-xs text-white/50">No questions posted on this project yet.</p>
            )}
          </div>
        </div>
      </section>

      {/* Related Concepts & Cross-Linked Projects */}
      <section className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-[#111111] p-6">
          <h3 className="flex items-center gap-2 text-sm font-medium">
            <Compass size={15} className="text-[#b9a9d6]" aria-hidden="true" />
            <span>Related topics to review</span>
          </h3>
          <div className="mt-4 space-y-2">
            {relatedConcepts.map((c) => (
              <Link
                key={c.id}
                href={`/pathways/${c.pathwaySlug}`}
                className="flex min-h-11 items-center justify-between rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-xs hover:border-white/25"
              >
                <div>
                  <p className="font-medium text-[#f4f3ef]">{c.title}</p>
                  <p className="text-[11px] text-white/50">{c.summary}</p>
                </div>
                <ArrowUpRight size={13} className="shrink-0 text-white/55" aria-hidden="true" />
              </Link>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#111111] p-6">
          <h3 className="flex items-center gap-2 text-sm font-medium">
            <Users size={15} className="text-[#b9a9d6]" aria-hidden="true" />
            <span>Example work from peers</span>
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
                      View example
                    </a>
                  </div>
                  <p className="mt-1.5 text-white/65">{peer.summary}</p>
                  <p className="mt-1.5 text-[11px] text-emerald-300">{peer.mentorHighlight}</p>
                </article>
              ))
            ) : (
              <p className="text-xs text-white/50">Be the first student to publish an example for this project.</p>
            )}

            {relatedProjects.length > 0 && (
              <div className="flex flex-wrap gap-2 border-t border-white/10 pt-3">
                {relatedProjects.map((rp) => (
                  <Link
                    key={rp.slug}
                    href={`/projects/${rp.slug}`}
                    className="inline-flex min-h-11 items-center rounded-full border border-white/15 px-3.5 py-1.5 text-xs text-white/80 hover:border-white/35"
                  >
                    Next: {rp.title}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
