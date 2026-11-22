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
  Lock,
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
import { getFirebaseAuth } from "@/lib/firebase/client";
import { syncProjectSubmissionToFirestore } from "@/lib/firebase/firestore-sync";
import { uploadSubmissionFileToStorage } from "@/lib/firebase/storage";

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
      <span className="inline-flex items-center gap-1.5 font-medium text-emerald-700 dark:text-emerald-300">
        <CheckCircle2 size={13} aria-hidden="true" />
        Approved
      </span>
    );
  }
  if (status === "revision_required") {
    return (
      <span className="inline-flex items-center gap-1.5 font-medium text-amber-700 dark:text-amber-300">
        <AlertCircle size={13} aria-hidden="true" />
        Revision Required
      </span>
    );
  }
  if (status === "under_review" || status === "submitted") {
    return (
      <span className="inline-flex items-center gap-1.5 font-medium text-accent">
        <Clock3 size={13} aria-hidden="true" />
        {status === "under_review" ? "Under Review" : "Submitted"}
      </span>
    );
  }
  if (status === "in_progress") {
    return (
      <span className="inline-flex items-center gap-1.5 font-medium text-accent">
        <Play size={12} aria-hidden="true" />
        In Progress
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 font-medium text-muted-foreground">
      <Clock3 size={12} aria-hidden="true" />
      Not Started
    </span>
  );
}

export function ProjectWorkspaceClient({
  project,
  linkedCourseSlug = null,
  linkedCourseTitle = null,
  accessAllowed = true,
  accessLockReason = null,
  relatedConcepts,
  relatedProjects,
  initialSubmissions,
  initialMessages,
  initiallySaved,
}: {
  project: ProjectBrief;
  linkedCourseSlug?: string | null;
  linkedCourseTitle?: string | null;
  accessAllowed?: boolean;
  accessLockReason?: string | null;
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
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? []).slice(0, 5);
    if (picked.length === 0) return;

    setUploadingFiles(true);
    setError("");
    const currentUser = getFirebaseAuth().currentUser;
    const uploadedMeta: SupportingFileMeta[] = [];

    try {
      for (const file of picked) {
        if (currentUser) {
          const uploaded = await uploadSubmissionFileToStorage(file);
          uploadedMeta.push(uploaded);
        } else {
          uploadedMeta.push({
            name: file.name,
            sizeBytes: file.size,
            mimeType: file.type || "application/octet-stream",
          });
        }
      }
      setSupportingFiles((prev) => {
        const merged = [...prev];
        for (const item of uploadedMeta) {
          if (!merged.some((f) => f.name === item.name && f.sizeBytes === item.sizeBytes)) {
            merged.push(item);
          }
        }
        return merged.slice(0, 5);
      });
      if (currentUser) {
        setNotice("Deliverable file uploaded to Firebase Storage.");
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not upload deliverable file to Firebase Storage.",
      );
    } finally {
      setUploadingFiles(false);
    }
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
      const msg =
        "Please enter your GitHub repository link and write at least 10 characters explaining what you built.";
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
      void syncProjectSubmissionToFirestore({
        id: data.submission.id,
        projectSlug: project.slug,
        pathwaySlug: data.submission.pathwaySlug,
        cohortName: data.submission.cohortName,
        learnerName: data.submission.learnerName,
        githubUrl: githubUrl.trim(),
        deploymentUrl: deploymentUrl.trim(),
        supportingEvidence: supportingEvidence.trim(),
        supportingFiles,
        summary: summary.trim(),
        reflection: reflection.trim(),
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
    <div className="space-y-8 text-foreground">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={linkedCourseSlug ? `/programmes/${linkedCourseSlug}` : "/learn"}
          className="inline-flex min-h-11 items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={14} aria-hidden="true" />
          {linkedCourseTitle ? `Back to ${linkedCourseTitle}` : "Back to My Learning"}
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void toggleSave()}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-border bg-card px-4 py-2 text-xs text-foreground hover:border-foreground/30"
          >
            <Bookmark size={13} aria-hidden="true" />
            {saved ? "Saved project" : "Save project"}
          </button>
          <Link
            href="/learn/portfolio"
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground"
          >
            My Portfolio <ArrowUpRight size={13} aria-hidden="true" />
          </Link>
        </div>
      </div>

      {!accessAllowed ? (
        <section className="tgl-glass rounded-3xl p-6 sm:p-8">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-foreground/[0.06] text-muted-foreground">
              <Lock size={18} aria-hidden="true" />
            </span>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-accent">
                Project Assignment Locked
              </p>
              <h2 className="mt-1 text-xl font-semibold text-foreground">{project.title}</h2>
              <p className="mt-2 max-w-2xl text-xs leading-6 text-muted-foreground sm:text-sm">
                {accessLockReason ??
                  "Complete all prerequisite learning modules and pass the graded quiz in the unified learning workspace before starting or submitting this project."}
              </p>
              <Link
                href={linkedCourseSlug ? `/programmes/${linkedCourseSlug}` : "/learn"}
                className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-xs font-medium text-accent-foreground"
              >
                Open Unified Programme Workspace
                <ArrowUpRight size={14} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>
      ) : (
        <>
          {/* Clear 5-Stage Lifecycle Tracker */}
          <section className="tgl-glass rounded-3xl p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-accent">
                  Project Progress
                </p>
                <div className="mt-1 flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Current status:</span>
                  <StatusBadge status={currentStatus} />
                </div>
              </div>

              {currentStatus === "not_started" && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleStartProject()}
                  className="inline-flex min-h-11 items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-xs font-medium text-accent-foreground disabled:opacity-45"
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
                        ? "border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-200"
                        : reached
                          ? "border-accent/40 bg-accent/10 text-foreground"
                          : "border-border bg-card text-muted-foreground"
                    }`}
                  >
                    <span className="font-mono text-[10px] opacity-70">0{idx + 1}</span>
                    <p className="mt-0.5 font-semibold">
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
                    ? "border-amber-500/35 bg-amber-500/10 text-amber-800 dark:text-amber-100"
                    : "border-emerald-500/25 bg-emerald-500/10 text-emerald-800 dark:text-emerald-100"
                }`}
              >
                <p className="font-semibold">
                  {latestSubmission.status === "revision_required"
                    ? `Revision requested by ${latestSubmission.mentorName}:`
                    : `Mentor feedback (${latestSubmission.mentorName}):`}
                </p>
                <p className="mt-1 leading-5 opacity-95">{latestSubmission.mentorFeedback}</p>
              </div>
            )}
          </section>

          {notice && (
            <p
              role="status"
              className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-xs font-medium text-emerald-800 dark:text-emerald-200"
            >
              {notice}
            </p>
          )}
          {error && (
            <p
              role="alert"
              className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs font-medium text-rose-800 dark:text-rose-200"
            >
              {error}
            </p>
          )}

          <div className="grid gap-6 lg:grid-cols-[1.15fr_.85fr]">
            <section className="tgl-glass space-y-6 rounded-3xl p-6">
              <div>
                <p className="text-xs font-medium text-accent">
                  {project.category} · {project.difficulty} · {project.estimatedHours} hours ·{" "}
                  {project.cohortName}
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-foreground">
                  What you need to build: {project.title}
                </h2>
                <p className="mt-2 text-sm leading-6 text-foreground/85">{project.brief}</p>
              </div>

              <div className="tgl-subsurface grid gap-4 rounded-2xl p-4 text-xs sm:grid-cols-2">
                <div>
                  <p className="font-semibold text-accent">Why this project matters</p>
                  <p className="mt-1 leading-5 text-muted-foreground">{guidance.whyItMatters}</p>
                </div>
                <div>
                  <p className="flex items-center gap-1.5 font-semibold text-accent">
                    <CalendarClock size={13} aria-hidden="true" />
                    Submission deadline &amp; method
                  </p>
                  <p className="mt-1 leading-5 text-muted-foreground">
                    <strong className="text-foreground">{guidance.submissionDeadline}</strong> ·{" "}
                    {guidance.submissionMethod}
                  </p>
                </div>
              </div>

              {guidance.requiredSkills.length > 0 && (
                <div className="border-t border-border pt-4 text-xs">
                  <h3 className="font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Required skills
                  </h3>
                  <p className="mt-2 text-foreground/85">{guidance.requiredSkills.join(" · ")}</p>
                </div>
              )}

              <div className="border-t border-border pt-4">
                <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Step-by-step instructions
                </h3>
                <ol className="mt-3 list-decimal space-y-2 pl-4 text-xs leading-5 text-foreground/85">
                  {guidance.stepByStep.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
              </div>

              <div className="border-t border-border pt-4">
                <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Evaluation criteria
                </h3>
                <ul className="mt-3 space-y-2 text-xs text-foreground/85">
                  {guidance.evaluationCriteria.map((item) => (
                    <li key={item} className="flex items-start gap-2.5">
                      <CheckCircle2
                        size={14}
                        className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-300"
                        aria-hidden="true"
                      />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {project.resources.length > 0 && (
                <div className="border-t border-border pt-4">
                  <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Helpful guides &amp; examples
                  </h3>
                  <div className="mt-3 space-y-2">
                    {project.resources.map((res) => (
                      <a
                        key={res.id}
                        href={res.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="tgl-subsurface flex min-h-11 items-center justify-between rounded-xl px-4 py-3 text-xs hover:border-foreground/25"
                      >
                        <div>
                          <p className="font-semibold text-foreground">{res.title}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {res.provider} · {res.duration}
                          </p>
                        </div>
                        <ExternalLink size={13} className="text-muted-foreground" aria-hidden="true" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* Submit / Resubmit Work Form */}
            <section className="tgl-glass self-start space-y-4 rounded-3xl p-6">
              <div className="flex items-center justify-between gap-2">
                <h3 className="flex items-center gap-2 text-base font-semibold text-foreground">
                  {currentStatus === "revision_required" ? (
                    <RotateCcw size={15} className="text-amber-600 dark:text-amber-300" aria-hidden="true" />
                  ) : (
                    <FolderGit2 size={15} className="text-accent" aria-hidden="true" />
                  )}
                  <span>
                    {currentStatus === "revision_required" ? "Resubmit Project" : "Submit Project"}
                  </span>
                </h3>
              </div>
              <p className="text-xs leading-5 text-muted-foreground">
                Mentor <strong className="text-foreground">{project.mentorName}</strong> ({project.mentorRole}) will check your repository link, live demo, and notes, then share feedback here.
              </p>

              <form onSubmit={handleSubmitWork} className="space-y-3.5">
                <label className="block text-xs font-medium text-foreground">
                  GitHub repository link (required)
                  <input
                    type="url"
                    required
                    value={githubUrl}
                    onChange={(e) => setGithubUrl(e.target.value)}
                    placeholder="https://github.com/username/project"
                    className="mt-1.5 h-11 w-full rounded-xl border border-border bg-input px-3 text-xs text-foreground"
                  />
                </label>

                <label className="block text-xs font-medium text-foreground">
                  Live website or demo link (optional)
                  <input
                    type="url"
                    value={deploymentUrl}
                    onChange={(e) => setDeploymentUrl(e.target.value)}
                    placeholder="https://your-demo.vercel.app"
                    className="mt-1.5 h-11 w-full rounded-xl border border-border bg-input px-3 text-xs text-foreground"
                  />
                </label>

                <label className="block text-xs font-medium text-foreground">
                  Test notes or evidence (optional)
                  <input
                    type="text"
                    value={supportingEvidence}
                    onChange={(e) => setSupportingEvidence(e.target.value)}
                    placeholder="e.g. All tests passed, screenshots included in /docs"
                    className="mt-1.5 h-11 w-full rounded-xl border border-border bg-input px-3 text-xs text-foreground"
                  />
                </label>

                <div className="tgl-subsurface space-y-2 rounded-xl p-3.5 text-xs">
                  <label className="flex cursor-pointer items-center justify-between gap-3 text-foreground">
                    <span className="flex items-center gap-2 font-medium">
                      <FileUp size={14} className="text-accent" aria-hidden="true" />
                      Attach supporting files (optional)
                    </span>
                    <input
                      type="file"
                      multiple
                      accept=".pdf,.png,.jpg,.jpeg,.md,.txt,.json,.zip"
                      onChange={handleFilesSelected}
                      className="sr-only"
                    />
                    <span className="rounded-full border border-border bg-card px-3 py-1.5 text-[11px] font-medium text-foreground">
                      {uploadingFiles ? "Uploading…" : "Choose files"}
                    </span>
                  </label>
                  {supportingFiles.length > 0 && (
                    <ul className="space-y-1.5 pt-1">
                      {supportingFiles.map((file) => (
                        <li
                          key={file.name}
                          className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-1.5 text-[11px]"
                        >
                          <span className="truncate text-foreground">{file.name}</span>
                          <button
                            type="button"
                            aria-label={`Remove ${file.name}`}
                            onClick={() =>
                              setSupportingFiles((prev) =>
                                prev.filter((f) => f.name !== file.name),
                              )
                            }
                            className="ml-2 text-muted-foreground hover:text-foreground"
                          >
                            <X size={13} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <label className="block text-xs font-medium text-foreground">
                  What did you build? (10+ characters)
                  <textarea
                    required
                    rows={3}
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    placeholder="Explain what your project does and what you tested..."
                    className="mt-1.5 w-full rounded-xl border border-border bg-input px-3 py-2 text-xs text-foreground"
                  />
                </label>

                <label className="block text-xs font-medium text-foreground">
                  Question for your mentor (optional)
                  <textarea
                    rows={2}
                    value={reflection}
                    onChange={(e) => setReflection(e.target.value)}
                    placeholder="Anything you would like extra feedback on?"
                    className="mt-1.5 w-full rounded-xl border border-border bg-input px-3 py-2 text-xs text-foreground"
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
                      trackColor="#27272a"
                      handleColor="#ffffff"
                      successColor="#34C759"
                      dangerColor="#DC2626"
                      width={276}
                      height={50}
                      disabled={busy || !canSubmitWork}
                      onConfirm={submitWorkAsync}
                    />
                    <button
                      type="submit"
                      disabled={busy || !canSubmitWork}
                      className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 text-xs font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      <Send size={13} aria-hidden="true" />
                      {currentStatus === "revision_required" ? "Resubmit Project" : "Submit Project"}
                    </button>
                  </div>
                </div>
              </form>
            </section>
          </div>
        </>
      )}

      {/* Submissions & Mentor Feedback Thread */}
      <section className="grid gap-6 lg:grid-cols-2">
        <div className="tgl-glass rounded-3xl p-6">
          <h3 className="text-base font-semibold text-foreground">
            Your submissions ({submissions.length})
          </h3>
          <div className="mt-4 space-y-3">
            {submissions.length > 0 ? (
              submissions.map((sub) => (
                <article key={sub.id} className="tgl-subsurface rounded-2xl p-4 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <a
                      href={sub.githubUrl || sub.artifactUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-[11px] text-accent hover:underline"
                    >
                      {sub.githubUrl || sub.artifactUrl || "Draft started"}
                    </a>
                    <StatusBadge status={sub.status} />
                  </div>
                  {sub.deploymentUrl && (
                    <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                      Live demo:{" "}
                      <a
                        href={sub.deploymentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline hover:text-foreground"
                      >
                        {sub.deploymentUrl}
                      </a>
                    </p>
                  )}
                  <p className="mt-2 text-foreground/85">{sub.summary}</p>
                  {sub.mentorFeedback && (
                    <div className="mt-3 rounded-lg border border-emerald-500/25 bg-emerald-500/10 p-3 text-emerald-800 dark:text-emerald-200">
                      <p className="font-semibold">Mentor feedback ({sub.mentorName}):</p>
                      <p className="mt-1">{sub.mentorFeedback}</p>
                    </div>
                  )}
                </article>
              ))
            ) : (
              <p className="rounded-xl border border-dashed border-border p-5 text-xs text-muted-foreground">
                No submissions for this project yet.
              </p>
            )}
          </div>
        </div>

        <div className="tgl-glass rounded-3xl p-6">
          <h3 className="flex items-center gap-2 text-base font-semibold text-foreground">
            <MessageSquare size={15} className="text-accent" aria-hidden="true" />
            <span>Ask your mentor ({messages.length})</span>
          </h3>

          <form onSubmit={handleAskMentor} className="mt-4 flex flex-wrap gap-2">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder={`Ask ${project.mentorName} a question about this project...`}
              className="h-11 min-w-[200px] flex-1 rounded-xl border border-border bg-input px-3 text-xs text-foreground"
            />
            <button
              type="submit"
              disabled={busy || question.trim().length < 5}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground disabled:opacity-45 whitespace-nowrap shrink-0"
            >
              <Send size={12} aria-hidden="true" /> Ask mentor
            </button>
          </form>

          <div className="mt-4 space-y-2.5">
            {messages.length > 0 ? (
              messages.map((msg) => (
                <article key={msg.id} className="tgl-subsurface rounded-2xl p-3.5 text-xs">
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>
                      {msg.authorName} ({msg.authorRole})
                    </span>
                    <span>{msg.resolved ? "Answered" : "Awaiting reply"}</span>
                  </div>
                  <p className="mt-1.5 text-foreground/90">{msg.body}</p>
                </article>
              ))
            ) : (
              <p className="text-xs text-muted-foreground">No questions posted on this project yet.</p>
            )}
          </div>
        </div>
      </section>

      {/* Related Concepts & Cross-Linked Projects */}
      <section className="grid gap-6 md:grid-cols-2">
        <div className="tgl-glass rounded-3xl p-6">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Compass size={15} className="text-accent" aria-hidden="true" />
            <span>Related topics to review</span>
          </h3>
          <div className="mt-4 space-y-2">
            {relatedConcepts.map((c) => (
              <Link
                key={c.id}
                href={`/pathways/${c.pathwaySlug}`}
                className="tgl-subsurface flex min-h-11 items-center justify-between rounded-xl px-4 py-3 text-xs hover:border-foreground/25"
              >
                <div>
                  <p className="font-semibold text-foreground">{c.title}</p>
                  <p className="text-[11px] text-muted-foreground">{c.summary}</p>
                </div>
                <ArrowUpRight size={13} className="shrink-0 text-muted-foreground" aria-hidden="true" />
              </Link>
            ))}
          </div>
        </div>

        <div className="tgl-glass rounded-3xl p-6">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Users size={15} className="text-accent" aria-hidden="true" />
            <span>Example work from peers</span>
          </h3>
          <div className="mt-4 space-y-3">
            {project.peerWork.length > 0 ? (
              project.peerWork.map((peer) => (
                <article key={peer.id} className="tgl-subsurface rounded-2xl p-4 text-xs">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-foreground">{peer.learnerName}</p>
                    <a
                      href={peer.artifactUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-accent hover:underline"
                    >
                      View example
                    </a>
                  </div>
                  <p className="mt-1.5 text-muted-foreground">{peer.summary}</p>
                  <p className="mt-1.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
                    {peer.mentorHighlight}
                  </p>
                </article>
              ))
            ) : (
              <p className="text-xs text-muted-foreground">
                Be the first student to publish an example for this project.
              </p>
            )}

            {relatedProjects.length > 0 && (
              <div className="flex flex-wrap gap-2 border-t border-border pt-3">
                {relatedProjects.map((rp) => (
                  <Link
                    key={rp.slug}
                    href={`/projects/${rp.slug}`}
                    className="inline-flex min-h-10 items-center rounded-full border border-border bg-card px-3.5 py-1.5 text-xs text-foreground hover:border-foreground/30"
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
