"use client";

import {
  CalendarClock,
  CheckCircle2,
  FileUp,
  FolderGit2,
  Lock,
  Play,
  RotateCcw,
  Send,
  X,
} from "lucide-react";
import type { CourseProjectDefinition } from "@/lib/courses/catalog";
import { getProjectGuidance } from "@/lib/learning-graph";
import type { ProjectStageStatus } from "@/lib/learning/progression";
import type {
  ProjectSubmissionRecord,
  SupportingFileMeta,
} from "@/lib/learning-workspace-store";
import SlideCommit from "@/components/react-bits/SlideCommit";

const STAGE_BADGE: Record<
  ProjectStageStatus,
  { label: string; tone: string }
> = {
  locked: {
    label: "Locked",
    tone: "bg-foreground/[0.06] text-muted-foreground",
  },
  available: {
    label: "Available",
    tone: "bg-accent/12 text-accent",
  },
  not_submitted: {
    label: "Not submitted",
    tone: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  },
  submitted: {
    label: "Submitted",
    tone: "bg-accent/12 text-accent",
  },
  under_review: {
    label: "Under review",
    tone: "bg-accent/12 text-accent",
  },
  revision_required: {
    label: "Changes requested",
    tone: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  },
  approved: {
    label: "Approved",
    tone: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  },
};

export function WorkspaceProjectPanel({
  project,
  stageStatus,
  canAccessProject,
  lockReason,
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
  onGoToModules,
}: {
  project: CourseProjectDefinition;
  stageStatus: ProjectStageStatus;
  canAccessProject: boolean;
  lockReason: string | null;
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
  onGoToModules: () => void;
}) {
  const guidance = getProjectGuidance(project);
  const badge = STAGE_BADGE[stageStatus];

  if (!canAccessProject) {
    return (
      <div className="tgl-subsurface rounded-2xl p-6 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl bg-foreground/[0.06] text-muted-foreground">
              <Lock size={16} aria-hidden="true" />
            </span>
            <div>
              <p className="font-semibold text-foreground">{project.title}</p>
              <p className="text-[11px] text-muted-foreground">
                Practical Capstone Project · {project.estimatedHours} hours
              </p>
            </div>
          </div>
          <span className={`rounded-full px-3 py-1 text-[11px] font-medium ${badge.tone}`}>
            {badge.label}
          </span>
        </div>

        <p className="mt-4 leading-6 text-muted-foreground">
          {lockReason ??
            "Complete all learning modules and pass the graded quiz first to unlock project brief instructions and mentor submission."}
        </p>

        <button
          type="button"
          onClick={onGoToModules}
          className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground"
        >
          Complete Modules &amp; Quiz First
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Brief & Evaluation Criteria */}
      <div className="tgl-subsurface rounded-2xl p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-accent">
              Practical Project Assignment · {project.estimatedHours} hours
            </p>
            <h3 className="mt-1.5 text-xl font-semibold tracking-[-0.03em] text-foreground">
              {project.title}
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-3 py-1 text-[11px] font-medium ${badge.tone}`}>
              {badge.label}
            </span>
            {stageStatus === "available" && (
              <button
                type="button"
                disabled={submittingProject}
                onClick={onStartProject}
                className="inline-flex min-h-10 items-center gap-2 rounded-full bg-accent px-4 py-2 text-xs font-medium text-accent-foreground disabled:opacity-50"
              >
                <Play size={13} aria-hidden="true" />
                Start Project
              </button>
            )}
          </div>
        </div>

        <p className="mt-3 text-xs leading-6 text-foreground/85 sm:text-sm">{project.brief}</p>

        <div className="mt-5 grid gap-4 border-t border-border pt-4 text-xs sm:grid-cols-2">
          <div>
            <p className="font-semibold text-foreground">Why this project matters</p>
            <p className="mt-1 leading-5 text-muted-foreground">{guidance.whyItMatters}</p>
          </div>
          <div>
            <p className="flex items-center gap-1.5 font-semibold text-foreground">
              <CalendarClock size={13} className="text-accent" aria-hidden="true" />
              Deadline &amp; Submission Format
            </p>
            <p className="mt-1 leading-5 text-muted-foreground">
              <strong className="text-foreground">{guidance.submissionDeadline}</strong> ·{" "}
              {guidance.submissionMethod}
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-4 text-xs">
            <p className="font-semibold text-foreground">Step-by-step instructions</p>
            <ol className="mt-2.5 list-decimal space-y-1.5 pl-4 text-muted-foreground">
              {guidance.stepByStep.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ol>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 text-xs">
            <p className="font-semibold text-foreground">Mentor evaluation rubric</p>
            <ul className="mt-2.5 space-y-1.5 text-muted-foreground">
              {guidance.evaluationCriteria.map((c) => (
                <li key={c} className="flex items-start gap-2">
                  <CheckCircle2
                    size={13}
                    className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-300"
                    aria-hidden="true"
                  />
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Submission Form + History Grid */}
      <div className="grid gap-6 lg:grid-cols-[1.05fr_.95fr]">
        <div className="tgl-subsurface rounded-2xl p-5 sm:p-6">
          <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            {stageStatus === "revision_required" ? (
              <RotateCcw size={15} className="text-amber-600 dark:text-amber-300" aria-hidden="true" />
            ) : (
              <FolderGit2 size={15} className="text-accent" aria-hidden="true" />
            )}
            {stageStatus === "approved"
              ? `Approved by ${project.mentorName}`
              : stageStatus === "revision_required"
                ? `Resubmit Revision to ${project.mentorName}`
                : `Submit Project to ${project.mentorName}`}
          </h4>

          {stageStatus === "approved" ? (
            <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs text-emerald-800 dark:text-emerald-200">
              Your capstone project deliverables passed mentor evaluation. Internship tasks below are now unlocked.
            </div>
          ) : (
            <div className="mt-4 space-y-3.5 text-xs">
              <label className="block text-foreground">
                GitHub repository URL
                <input
                  type="url"
                  value={githubUrl}
                  onChange={(e) => onGithubUrlChange(e.target.value)}
                  placeholder="https://github.com/your-handle/project"
                  className="mt-1.5 h-10 w-full rounded-xl border border-border bg-input px-3 text-foreground"
                />
              </label>

              <label className="block text-foreground">
                Live deployment URL (optional)
                <input
                  type="url"
                  value={deploymentUrl}
                  onChange={(e) => onDeploymentUrlChange(e.target.value)}
                  placeholder="https://your-demo.vercel.app"
                  className="mt-1.5 h-10 w-full rounded-xl border border-border bg-input px-3 text-foreground"
                />
              </label>

              <label className="block text-foreground">
                Supporting test summary / notes
                <input
                  type="text"
                  value={supportingEvidence}
                  onChange={(e) => onSupportingEvidenceChange(e.target.value)}
                  placeholder="e.g. Unit tests passing, screenshots verified"
                  className="mt-1.5 h-10 w-full rounded-xl border border-border bg-input px-3 text-foreground"
                />
              </label>

              <div className="rounded-xl border border-border bg-card p-3">
                <label className="flex cursor-pointer items-center justify-between gap-3 text-foreground">
                  <span className="flex items-center gap-2 font-medium">
                    <FileUp size={14} className="text-accent" aria-hidden="true" />
                    Attach supporting files (PDF, PNG, MD, ZIP)
                  </span>
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.png,.jpg,.jpeg,.md,.txt,.json,.zip"
                    onChange={onSupportingFilesChange}
                    className="sr-only"
                  />
                  <span className="rounded-full border border-border px-3 py-1 text-[11px] font-medium">
                    Choose files
                  </span>
                </label>
                {supportingFiles.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {supportingFiles.map((file) => (
                      <li
                        key={file.name}
                        className="flex items-center justify-between rounded-lg bg-background/60 px-2.5 py-1 text-[11px]"
                      >
                        <span className="truncate">{file.name}</span>
                        <button
                          type="button"
                          aria-label={`Remove ${file.name}`}
                          onClick={() => onRemoveSupportingFile(file.name)}
                          className="ml-2 text-muted-foreground hover:text-foreground"
                        >
                          <X size={12} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <label className="block text-foreground">
                Implementation summary (10+ characters)
                <textarea
                  rows={3}
                  value={summary}
                  onChange={(e) => onSummaryChange(e.target.value)}
                  placeholder="Describe what you built and how you tested it..."
                  className="mt-1.5 w-full rounded-xl border border-border bg-input px-3 py-2 text-foreground"
                />
              </label>

              <label className="block text-foreground">
                Questions for mentor (optional)
                <textarea
                  rows={2}
                  value={reflection}
                  onChange={(e) => onReflectionChange(e.target.value)}
                  placeholder="Any specific feedback requests?"
                  className="mt-1.5 w-full rounded-xl border border-border bg-input px-3 py-2 text-foreground"
                />
              </label>

              <div className="flex flex-col items-center gap-2.5 pt-2">
                <SlideCommit
                  label={
                    stageStatus === "revision_required"
                      ? "Slide to Resubmit Project"
                      : "Slide to Submit Project"
                  }
                  doneLabel="Submitted"
                  errorLabel="Check required fields"
                  trackColor="#27272a"
                  handleColor="#ffffff"
                  successColor="#34C759"
                  dangerColor="#DC2626"
                  width={260}
                  height={46}
                  disabled={submittingProject}
                  onConfirm={onSubmitProject}
                />
                <button
                  type="button"
                  disabled={submittingProject}
                  onClick={() => void onSubmitProject().catch(() => {})}
                  className="inline-flex min-h-10 items-center gap-2 rounded-full border border-border bg-card px-5 py-2 text-xs font-medium text-foreground hover:border-foreground/30 disabled:opacity-50"
                >
                  <Send size={13} aria-hidden="true" />
                  {stageStatus === "revision_required"
                    ? "Resubmit Project"
                    : "Submit Project"}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="tgl-subsurface rounded-2xl p-5 sm:p-6">
          <h4 className="text-sm font-semibold text-foreground">
            Submission history &amp; review ({submissions.length})
          </h4>
          <div className="mt-4 space-y-3 text-xs">
            {submissions.map((sub) => (
              <article key={sub.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-foreground">{sub.learnerName}</span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium capitalize ${
                      sub.status === "approved"
                        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                        : sub.status === "revision_required"
                          ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                          : "bg-accent/12 text-accent"
                    }`}
                  >
                    {sub.status.replaceAll("_", " ")}
                  </span>
                </div>
                {(sub.githubUrl || sub.artifactUrl) && (
                  <p className="mt-1.5 truncate font-mono text-[11px] text-accent">
                    {sub.githubUrl || sub.artifactUrl}
                  </p>
                )}
                <p className="mt-1.5 leading-5 text-muted-foreground">{sub.summary}</p>
                {sub.supportingFiles && sub.supportingFiles.length > 0 && (
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Files: {sub.supportingFiles.map((f) => f.name).join(", ")}
                  </p>
                )}
                {sub.mentorFeedback && (
                  <div className="mt-2.5 rounded-lg border border-emerald-500/25 bg-emerald-500/10 p-3 text-emerald-800 dark:text-emerald-200">
                    Mentor ({sub.mentorName}): {sub.mentorFeedback}
                  </div>
                )}
              </article>
            ))}
            {submissions.length === 0 && (
              <p className="text-muted-foreground">
                No project submissions yet. Review the brief and submit your GitHub repository above.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
