"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowUpRight,
  Award,
  CheckCircle2,
  Clock3,
  Lock,
  RotateCcw,
  Send,
  ShieldCheck,
} from "lucide-react";
import type {
  InternshipEligibilityEvaluation,
  InternshipTaskDefinition,
  InternshipTaskSubmission,
} from "@/lib/internships/eligibility";

type Internship = {
  id: string;
  slug: string;
  title: string;
  track: string;
  description: string;
  duration_weeks: number;
  required_course_slug?: string | null;
  required_project_slug?: string | null;
  require_project_approval?: boolean;
  tasks?: InternshipTaskDefinition[];
};

type Application = {
  id: string;
  internship_id: string;
  applicant_name: string;
  applicant_email: string;
  status: string;
  submission_url: string | null;
  submission_summary: string | null;
  task_submissions?: InternshipTaskSubmission[];
  final_evaluation_notes?: string | null;
  final_score_label?: string | null;
  assessment_passed: boolean;
  mentor_approved: boolean;
  mentor_notes: string | null;
};

type Actor = {
  id: string;
  name: string;
  email: string;
} | null;

function TaskStatusPill({ status }: { status?: InternshipTaskSubmission["status"] }) {
  if (status === "approved") {
    return (
      <span className="inline-flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-300">
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
  if (status === "submitted") {
    return (
      <span className="inline-flex items-center gap-1.5 font-medium text-[var(--accent)]">
        <Clock3 size={13} aria-hidden="true" />
        Waiting for mentor review
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 font-medium text-muted-foreground">
      <Clock3 size={13} aria-hidden="true" />
      Ready to complete
    </span>
  );
}

export function InternshipsWorkspace() {
  const [internships, setInternships] = useState<Internship[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [eligibilityByInternshipId, setEligibilityByInternshipId] = useState<
    Record<string, InternshipEligibilityEvaluation>
  >({});
  const [user, setUser] = useState<Actor>(null);
  const [selectedInternshipId, setSelectedInternshipId] = useState<string>("");
  const [motivation, setMotivation] = useState("");
  const [fullName, setFullName] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [taskUrls, setTaskUrls] = useState<Record<string, string>>({});
  const [taskSummaries, setTaskSummaries] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/internships", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setInternships(data.internships ?? []);
      setApplications(data.applications ?? []);
      setEligibilityByInternshipId(data.eligibilityByInternshipId ?? {});
      setUser(data.user ?? null);
      if (!selectedInternshipId && data.internships?.[0]?.id) {
        setSelectedInternshipId(data.internships[0].id);
      }
    } finally {
      setLoading(false);
    }
  }, [selectedInternshipId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleApply = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user || !selectedInternshipId) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      if (!user.name && !fullName.trim()) {
        setError("Please enter your full name before applying.");
        return;
      }
      if (!user.name && fullName.trim()) {
        const profileRes = await fetch("/api/profile", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fullName: fullName.trim() }),
        });
        if (!profileRes.ok) throw new Error((await profileRes.json()).error ?? "Could not save your name.");
      }
      const res = await fetch("/api/internships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "apply",
          internshipId: selectedInternshipId,
          applicantName: fullName.trim() || user.name,
          applicantEmail: user.email,
          motivation,
          portfolioUrl,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Application could not be submitted.");
      setNotice(
        "You have joined the internship! Complete each assigned task below to earn your mentor review.",
      );
      setMotivation("");
      setPortfolioUrl("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit application.");
    } finally {
      setBusy(false);
    }
  };

  const handleSubmitTask = async (applicationId: string, taskId: string) => {
    const key = `${applicationId}:${taskId}`;
    const url = (taskUrls[key] ?? "").trim();
    const summary = (taskSummaries[key] ?? "").trim();
    if (!url || summary.length < 8) {
      setError("Add a link to your work and write at least 8 characters describing what you completed.");
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const res = await fetch("/api/internships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "submit_task",
          applicationId,
          taskId,
          submissionUrl: url,
          summary,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Task submission failed.");
      setNotice("Task submitted! A mentor will review your work soon.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit task.");
    } finally {
      setBusy(false);
    }
  };

  const selectedTrack = internships.find((i) => i.id === selectedInternshipId);
  const selectedEligibility = selectedInternshipId
    ? eligibilityByInternshipId[selectedInternshipId]
    : undefined;

  return (
    <div className="space-y-12">
      <div className="tgl-glass rounded-2xl p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-5">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--accent)]">
              Bundled Practical Internships · Included with Programme Enrolment
            </p>
            <h2 className="mt-2 text-2xl font-medium tracking-[-0.04em] text-foreground">
              Submit internship tasks and earn your included completion certificate
            </h2>
          </div>
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-300">
            <CheckCircle2 size={14} aria-hidden="true" />
            Included · ₹0 Extra Fee
          </span>
        </div>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-muted-foreground">
          When you enrol in a{" "}
          <Link href="/programmes" className="font-medium text-[var(--accent)] underline underline-offset-4 hover:opacity-80">
            TGL Internship Programme (₹499–₹1,999 INR all-inclusive)
          </Link>
          , your linked internship workspace is activated inside your unified learning page. Complete the course, project, and tasks below to receive your official{" "}
          <strong className="text-foreground">INTERNSHIP CERTIFICATE</strong> at ₹0 additional cost.
        </p>
      </div>

      {notice && (
        <p role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs text-emerald-700 dark:text-emerald-200">
          {notice}
        </p>
      )}
      {error && (
        <p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-700 dark:text-rose-200">
          {error}
        </p>
      )}

      {loading ? (
        <div className="grid gap-6 lg:grid-cols-[1.2fr_.8fr]">
          <div className="tgl-glass h-80 rounded-2xl opacity-60" />
          <div className="tgl-glass h-80 rounded-2xl opacity-60" />
        </div>
      ) : (
        <div className="grid gap-8 lg:grid-cols-[1.2fr_.8fr]">
          <section className="space-y-4">
            <h3 className="text-lg font-medium tracking-[-0.03em] text-foreground">
              Available internships &amp; tasks
            </h3>
            <div className="grid gap-5">
              {internships.map((track) => {
                const existingApp = applications.find((a) => a.internship_id === track.id);
                const eligibility = eligibilityByInternshipId[track.id];
                const tasks = track.tasks ?? [];
                const taskSubs = existingApp?.task_submissions ?? [];
                const requiredCourseName =
                  eligibility?.requiredCourseTitle ?? "Required Programme";
                const requiredProjectName =
                  eligibility?.requiredProjectTitle ?? "Required Project";
                const courseReady = Boolean(
                  eligibility?.courseEnrolled && eligibility?.quizPassed,
                );

                return (
                  <article
                    key={track.id}
                    className={`tgl-glass rounded-2xl p-6 transition-colors ${
                      selectedInternshipId === track.id
                        ? "border-[var(--accent)]/55"
                        : ""
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
                      <span>{track.track}</span>
                      <span className="tabular-nums">
                        {track.duration_weeks} weeks · {tasks.length} tasks · Included in programme
                      </span>
                    </div>
                    <h4 className="mt-2 text-lg font-medium tracking-[-0.03em] text-foreground">
                      {track.title}
                    </h4>
                    <p className="mt-2 text-xs leading-6 text-muted-foreground">{track.description}</p>

                    {eligibility?.requiredSkills && eligibility.requiredSkills.length > 0 && (
                      <p className="mt-3 text-xs text-[var(--accent)]">
                        Required skills:{" "}
                        <span className="text-foreground">
                          {eligibility.requiredSkills.join(" · ")}
                        </span>
                      </p>
                    )}

                    <div className="tgl-subsurface mt-4 rounded-xl p-4 text-xs">
                      <p className="font-medium text-foreground">What you need before applying</p>
                      <div className="mt-2.5 flex flex-wrap items-center gap-4 text-xs">
                        {track.required_course_slug && (
                          <Link
                            href={`/programmes/${track.required_course_slug}`}
                            className={`inline-flex items-center gap-1.5 ${
                              courseReady
                                ? "text-emerald-600 dark:text-emerald-300"
                                : "text-[var(--accent)] hover:underline"
                            }`}
                          >
                            {courseReady ? (
                              <CheckCircle2 size={13} aria-hidden="true" />
                            ) : (
                              <Lock size={13} aria-hidden="true" />
                            )}
                            Modules &amp; quiz: {requiredCourseName}
                          </Link>
                        )}
                        {track.required_project_slug && track.require_project_approval && (
                          <Link
                            href={
                              track.required_course_slug
                                ? `/programmes/${track.required_course_slug}`
                                : `/projects/${track.required_project_slug}`
                            }
                            className={`inline-flex items-center gap-1.5 ${
                              eligibility?.projectApproved
                                ? "text-emerald-600 dark:text-emerald-300"
                                : "text-muted-foreground hover:text-foreground hover:underline"
                            }`}
                          >
                            {eligibility?.projectApproved ? (
                              <CheckCircle2 size={13} aria-hidden="true" />
                            ) : (
                              <Clock3 size={13} aria-hidden="true" />
                            )}
                            Approved project: {requiredProjectName}
                          </Link>
                        )}
                      </div>
                    </div>

                    {existingApp ? (
                      <div className="mt-5 space-y-5 border-t border-border pt-5">
                        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                          <span className="inline-flex items-center gap-1.5 text-[var(--accent)]">
                            {existingApp.mentor_approved ? (
                              <CheckCircle2 size={14} className="text-emerald-600 dark:text-emerald-300" aria-hidden="true" />
                            ) : (
                              <Clock3 size={14} aria-hidden="true" />
                            )}
                            Application status:{" "}
                            <strong className="capitalize text-foreground">
                              {existingApp.status.replaceAll("_", " ")}
                            </strong>
                          </span>
                          <span className="text-muted-foreground">
                            Final review:{" "}
                            <strong
                              className={
                                existingApp.mentor_approved
                                  ? "text-emerald-600 dark:text-emerald-300"
                                  : "text-foreground"
                              }
                            >
                              {existingApp.mentor_approved
                                ? existingApp.final_score_label || "Approved"
                                : "Waiting for all tasks to be approved"}
                            </strong>
                          </span>
                        </div>

                        <div className="space-y-3">
                          <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground tabular-nums">
                            Tasks &amp; Deadlines ({taskSubs.filter((t) => t.status === "approved").length}/{tasks.length} approved)
                          </p>
                          {tasks.map((task) => {
                            const sub = taskSubs.find((s) => s.taskId === task.id);
                            const fieldKey = `${existingApp.id}:${task.id}`;
                            const needsWork = !sub || sub.status === "revision_required";

                            return (
                              <div
                                key={task.id}
                                className="tgl-subsurface rounded-xl p-4 text-xs"
                              >
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                  <div>
                                    <p className="font-medium text-foreground">{task.title}</p>
                                    <p className="mt-1 text-[11px] text-[var(--accent)]">
                                      Due: {task.deadlineLabel} · How to submit: {task.deliverableFormat}
                                    </p>
                                  </div>
                                  <TaskStatusPill status={sub?.status} />
                                </div>
                                <p className="mt-2 leading-5 text-muted-foreground">{task.brief}</p>

                                {sub && (
                                  <div className="mt-3 rounded-lg border border-border bg-background/60 p-3 text-xs">
                                    <a
                                      href={sub.submissionUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="font-mono text-[11px] text-[var(--accent)] underline"
                                    >
                                      {sub.submissionUrl}
                                    </a>
                                    <p className="mt-1 text-foreground/85">{sub.summary}</p>
                                    {sub.mentorFeedback && (
                                      <p className="mt-1.5 text-emerald-700 dark:text-emerald-200">
                                        Mentor feedback ({sub.scoreLabel ?? sub.status}): {sub.mentorFeedback}
                                      </p>
                                    )}
                                  </div>
                                )}

                                {needsWork && (
                                  <div className="mt-3 space-y-2 border-t border-border pt-3">
                                    <input
                                      type="url"
                                      placeholder="Paste your link (GitHub, doc, or demo URL)"
                                      value={taskUrls[fieldKey] ?? sub?.submissionUrl ?? ""}
                                      onChange={(e) =>
                                        setTaskUrls((prev) => ({
                                          ...prev,
                                          [fieldKey]: e.target.value,
                                        }))
                                      }
                                      className="h-11 w-full rounded-lg border border-border bg-input px-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                    />
                                    <div className="flex flex-wrap gap-2">
                                      <input
                                        type="text"
                                        placeholder="Describe what you built and tested (8+ chars)..."
                                        value={taskSummaries[fieldKey] ?? sub?.summary ?? ""}
                                        onChange={(e) =>
                                          setTaskSummaries((prev) => ({
                                            ...prev,
                                            [fieldKey]: e.target.value,
                                          }))
                                        }
                                        className="h-11 min-w-[200px] flex-1 rounded-lg border border-border bg-input px-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                      />
                                      <button
                                        type="button"
                                        disabled={busy}
                                        onClick={() => void handleSubmitTask(existingApp.id, task.id)}
                                        className="inline-flex min-h-11 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-primary px-5 py-2 text-xs font-medium text-primary-foreground disabled:opacity-45"
                                      >
                                        {sub?.status === "revision_required" ? (
                                          <RotateCcw size={13} aria-hidden="true" />
                                        ) : (
                                          <Send size={13} aria-hidden="true" />
                                        )}
                                        {sub?.status === "revision_required"
                                          ? "Resubmit Task"
                                          : "Complete Task"}
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {existingApp.mentor_approved && existingApp.status === "completed" ? (
                          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs">
                            <div>
                              <p className="flex items-center gap-1.5 font-medium text-emerald-700 dark:text-emerald-200">
                                <ShieldCheck size={14} aria-hidden="true" />
                                Internship Completed &amp; Mentor Approved
                              </p>
                              <p className="mt-1 text-foreground/85">
                                {existingApp.final_evaluation_notes || existingApp.mentor_notes}
                              </p>
                            </div>
                            <Link
                              href="/certificates"
                              className="inline-flex min-h-11 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-primary px-5 py-2.5 font-medium text-primary-foreground"
                            >
                              <Award size={14} aria-hidden="true" />
                              Open Included Certificate <ArrowUpRight size={13} aria-hidden="true" />
                            </Link>
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground">
                            Submit every task above. Once mentors approve all tasks, your included completion certificate is issued at ₹0 extra.
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                        {eligibility && !eligibility.eligible ? (
                          <span className="inline-flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-200">
                            <Lock size={13} className="shrink-0" aria-hidden="true" />
                            Complete first: {eligibility.missingRequirements.join(" · ")}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-300">
                            <CheckCircle2 size={13} className="shrink-0" aria-hidden="true" />
                            Prerequisites complete · Ready to apply
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => setSelectedInternshipId(track.id)}
                          className="min-h-11 rounded-full border border-border px-4 py-2 text-xs text-foreground transition-colors hover:bg-muted/40"
                        >
                          View Internship
                        </button>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </section>

          <section className="tgl-glass self-start rounded-2xl p-6 sm:p-7">
            <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--accent)]">
              Internship Application (Free)
            </p>
            <h3 className="mt-2 text-xl font-medium tracking-[-0.03em] text-foreground">
              Apply when ready
            </h3>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              Finish the matching course, quiz, and project review first. Participation in the internship is always free.
            </p>

            {user ? (
              <form onSubmit={handleApply} className="mt-5 space-y-4">
                {!user.name && (
                  <label className="block text-xs text-foreground">
                    Full name <span className="text-muted-foreground">required for your learner record</span>
                    <input
                      type="text"
                      autoComplete="name"
                      required
                      minLength={2}
                      maxLength={120}
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Your full name as it should appear on records"
                      className="mt-1.5 h-11 w-full rounded-lg border border-border bg-input px-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </label>
                )}
                <label className="block text-xs text-foreground">
                  Selected internship
                  <select
                    value={selectedInternshipId}
                    onChange={(e) => setSelectedInternshipId(e.target.value)}
                    required
                    className="mt-1.5 h-11 w-full rounded-lg border border-border bg-input px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {internships.map((track) => (
                      <option key={track.id} value={track.id}>
                        {track.title}
                      </option>
                    ))}
                  </select>
                </label>

                {selectedEligibility && !selectedEligibility.eligible && (
                  <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-900 dark:text-amber-100">
                    <p className="font-medium">
                      Finish these steps to unlock {selectedTrack?.title}:
                    </p>
                    <ul className="mt-2 list-disc space-y-1 pl-4 opacity-90">
                      {selectedEligibility.missingRequirements.map((req) => (
                        <li key={req}>{req}</li>
                      ))}
                    </ul>
                    {selectedTrack?.required_course_slug && (
                      <Link
                        href={`/programmes/${selectedTrack.required_course_slug}`}
                        className="mt-3 inline-flex min-h-11 items-center gap-1.5 font-medium text-[var(--accent)] hover:underline"
                      >
                        Go to {selectedEligibility.requiredCourseTitle ?? "required programme"}{" "}
                        <ArrowUpRight size={13} aria-hidden="true" />
                      </Link>
                    )}
                  </div>
                )}

                <label className="block text-xs text-foreground">
                  What would you like to learn and build in this internship?
                  <textarea
                    required
                    minLength={10}
                    rows={3}
                    value={motivation}
                    onChange={(e) => setMotivation(e.target.value)}
                    placeholder="Tell us your goals for the weekly tasks and mentor reviews..."
                    className="mt-1.5 w-full rounded-lg border border-border bg-input px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </label>

                <label className="block text-xs text-foreground">
                  Portfolio or GitHub URL (optional)
                  <input
                    type="url"
                    value={portfolioUrl}
                    onChange={(e) => setPortfolioUrl(e.target.value)}
                    placeholder="https://github.com/username"
                    className="mt-1.5 h-11 w-full rounded-lg border border-border bg-input px-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </label>

                <button
                  type="submit"
                  disabled={
                    busy ||
                    !selectedInternshipId ||
                    (selectedEligibility ? !selectedEligibility.eligible : false)
                  }
                  className="min-h-11 w-full rounded-full bg-primary px-5 py-3 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {busy
                    ? "Submitting..."
                    : selectedEligibility && !selectedEligibility.eligible
                      ? "Finish course & project first"
                      : "Apply Now (Free)"}
                </button>
              </form>
            ) : (
              <div className="mt-6 rounded-xl border border-dashed border-border p-5 text-xs text-muted-foreground">
                <p>Sign in with your TGL student account to apply for an internship.</p>
                <Link
                  href="/auth/login?next=/internships"
                  className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-xs font-medium text-primary-foreground"
                >
                  Sign in to apply <ArrowUpRight size={13} />
                </Link>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
