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
  if (status === "submitted") {
    return (
      <span className="inline-flex items-center gap-1.5 font-medium text-[#b9a9d6]">
        <Clock3 size={13} aria-hidden="true" />
        Waiting for mentor review
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 font-medium text-white/60">
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
      const res = await fetch("/api/internships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "apply",
          internshipId: selectedInternshipId,
          applicantName: user.name,
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
      <div className="rounded-2xl border border-white/10 bg-[#111111] p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-5">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-[#b9a9d6]">
              Bundled Practical Internships · Included with Programme Enrolment
            </p>
            <h2 className="mt-2 text-2xl font-medium tracking-[-0.04em]">
              Submit internship tasks and earn your included completion certificate
            </h2>
          </div>
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-300">
            <CheckCircle2 size={14} aria-hidden="true" />
            Included · ₹0 Extra Fee
          </span>
        </div>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-white/65">
          When you enrol in a{" "}
          <Link href="/programmes" className="text-[#b9a9d6] underline underline-offset-4 hover:text-white">
            TGL Internship Programme (₹499–₹1,999 INR all-inclusive)
          </Link>
          , your linked internship workspace is activated automatically. Complete the course, project, and tasks below to receive your official{" "}
          <strong className="text-white">INTERNSHIP CERTIFICATE</strong> at ₹0 additional cost.
        </p>
      </div>

      {notice && (
        <p role="status" className="rounded-xl border border-emerald-400/25 bg-emerald-400/10 p-4 text-xs text-emerald-200">
          {notice}
        </p>
      )}
      {error && (
        <p role="alert" className="rounded-xl border border-rose-400/25 bg-rose-400/10 p-4 text-xs text-rose-200">
          {error}
        </p>
      )}

      {loading ? (
        <div className="grid gap-6 lg:grid-cols-[1.2fr_.8fr]">
          <div className="h-80 animate-pulse rounded-2xl border border-white/10 bg-white/[0.03]" />
          <div className="h-80 animate-pulse rounded-2xl border border-white/10 bg-white/[0.03]" />
        </div>
      ) : (
        <div className="grid gap-8 lg:grid-cols-[1.2fr_.8fr]">
          <section className="space-y-4">
            <h3 className="text-lg font-medium tracking-[-0.03em]">
              Available internships &amp; tasks
            </h3>
            <div className="grid gap-5">
              {internships.map((track) => {
                const existingApp = applications.find((a) => a.internship_id === track.id);
                const eligibility = eligibilityByInternshipId[track.id];
                const tasks = track.tasks ?? [];
                const taskSubs = existingApp?.task_submissions ?? [];
                const requiredCourseName =
                  eligibility?.requiredCourseTitle ?? "Required Course";
                const requiredProjectName =
                  eligibility?.requiredProjectTitle ?? "Required Project";

                return (
                  <article
                    key={track.id}
                    className={`rounded-2xl border bg-[#111111] p-6 transition-colors ${
                      selectedInternshipId === track.id
                        ? "border-[#b9a9d6]/50"
                        : "border-white/10"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-white/55">
                      <span>{track.track}</span>
                      <span>
                        {track.duration_weeks} weeks · {tasks.length} tasks · Included in programme
                      </span>
                    </div>
                    <h4 className="mt-2 text-lg font-medium tracking-[-0.03em] text-[#f4f3ef]">
                      {track.title}
                    </h4>
                    <p className="mt-2 text-xs leading-6 text-white/65">{track.description}</p>

                    {eligibility?.requiredSkills && eligibility.requiredSkills.length > 0 && (
                      <p className="mt-3 text-xs text-[#b9a9d6]">
                        Required skills:{" "}
                        <span className="text-white/85">
                          {eligibility.requiredSkills.join(" · ")}
                        </span>
                      </p>
                    )}

                    {/* Eligibility Checklist Box — Plain Course & Project Titles, Zero Slugs */}
                    <div className="mt-4 rounded-xl border border-white/10 bg-black/25 p-4 text-xs">
                      <p className="font-medium text-white/90">What you need before applying</p>
                      <div className="mt-2.5 flex flex-wrap items-center gap-4 text-xs">
                        {track.required_course_slug && (
                          <Link
                            href={`/courses/${track.required_course_slug}`}
                            className={`inline-flex items-center gap-1.5 ${
                              eligibility?.courseEnrolled && eligibility?.quizPassed
                                ? "text-emerald-300"
                                : "text-[#b9a9d6] hover:underline"
                            }`}
                          >
                            {eligibility?.courseEnrolled && eligibility?.quizPassed ? (
                              <CheckCircle2 size={13} aria-hidden="true" />
                            ) : (
                              <Lock size={13} aria-hidden="true" />
                            )}
                            Course &amp; quiz: {requiredCourseName}
                          </Link>
                        )}
                        {track.required_project_slug && track.require_project_approval && (
                          <Link
                            href={`/projects/${track.required_project_slug}`}
                            className={`inline-flex items-center gap-1.5 ${
                              eligibility?.projectApproved
                                ? "text-emerald-300"
                                : "text-white/75 hover:underline"
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
                      <div className="mt-5 space-y-5 border-t border-white/10 pt-5">
                        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                          <span className="inline-flex items-center gap-1.5 text-[#b9a9d6]">
                            {existingApp.mentor_approved ? (
                              <CheckCircle2 size={14} className="text-emerald-300" aria-hidden="true" />
                            ) : (
                              <Clock3 size={14} aria-hidden="true" />
                            )}
                            Application status:{" "}
                            <strong className="capitalize text-white">
                              {existingApp.status.replaceAll("_", " ")}
                            </strong>
                          </span>
                          <span className="text-white/70">
                            Final review:{" "}
                            <strong
                              className={
                                existingApp.mentor_approved ? "text-emerald-300" : "text-white/85"
                              }
                            >
                              {existingApp.mentor_approved
                                ? existingApp.final_score_label || "Approved"
                                : "Waiting for all tasks to be approved"}
                            </strong>
                          </span>
                        </div>

                        {/* Assigned Tasks & Individual Task Submissions */}
                        <div className="space-y-3">
                          <p className="text-[11px] uppercase tracking-[0.16em] text-white/55">
                            Tasks &amp; Deadlines ({taskSubs.filter((t) => t.status === "approved").length}/{tasks.length} approved)
                          </p>
                          {tasks.map((task) => {
                            const sub = taskSubs.find((s) => s.taskId === task.id);
                            const fieldKey = `${existingApp.id}:${task.id}`;
                            const needsWork = !sub || sub.status === "revision_required";

                            return (
                              <div
                                key={task.id}
                                className="rounded-xl border border-white/10 bg-black/30 p-4 text-xs"
                              >
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                  <div>
                                    <p className="font-medium text-[#f4f3ef]">{task.title}</p>
                                    <p className="mt-1 text-[11px] text-[#b9a9d6]">
                                      Due: {task.deadlineLabel} · How to submit: {task.deliverableFormat}
                                    </p>
                                  </div>
                                  <TaskStatusPill status={sub?.status} />
                                </div>
                                <p className="mt-2 leading-5 text-white/65">{task.brief}</p>

                                {sub && (
                                  <div className="mt-3 rounded-lg border border-white/10 bg-black/40 p-3 text-xs">
                                    <a
                                      href={sub.submissionUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="font-mono text-[11px] text-[#b9a9d6] underline"
                                    >
                                      {sub.submissionUrl}
                                    </a>
                                    <p className="mt-1 text-white/75">{sub.summary}</p>
                                    {sub.mentorFeedback && (
                                      <p className="mt-1.5 text-emerald-200">
                                        Mentor feedback ({sub.scoreLabel ?? sub.status}): {sub.mentorFeedback}
                                      </p>
                                    )}
                                  </div>
                                )}

                                {needsWork && (
                                  <div className="mt-3 space-y-2 border-t border-white/10 pt-3">
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
                                      className="h-11 w-full rounded-lg border border-white/10 bg-[#151515] px-3 text-xs text-white"
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
                                        className="h-11 min-w-[200px] flex-1 rounded-lg border border-white/10 bg-[#151515] px-3 text-xs text-white"
                                      />
                                      <button
                                        type="button"
                                        disabled={busy}
                                        onClick={() => void handleSubmitTask(existingApp.id, task.id)}
                                        className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-[#f4f3ef] px-5 py-2 text-xs font-medium text-[#111111] disabled:opacity-45 whitespace-nowrap shrink-0"
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
                          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-emerald-400/30 bg-emerald-950/20 p-4 text-xs">
                            <div>
                              <p className="flex items-center gap-1.5 font-medium text-emerald-200">
                                <ShieldCheck size={14} aria-hidden="true" />
                                Internship Completed &amp; Mentor Approved
                              </p>
                              <p className="mt-1 text-white/75">
                                {existingApp.final_evaluation_notes || existingApp.mentor_notes}
                              </p>
                            </div>
                            <Link
                              href="/certificates"
                              className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-[#f4f3ef] px-5 py-2.5 font-medium text-[#111111] whitespace-nowrap shrink-0"
                            >
                              <Award size={14} aria-hidden="true" />
                              Open Included Certificate <ArrowUpRight size={13} aria-hidden="true" />
                            </Link>
                          </div>
                        ) : (
                          <p className="text-xs text-white/55">
                            Submit every task above. Once mentors approve all tasks, your included completion certificate is issued at ₹0 extra.
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
                        {eligibility && !eligibility.eligible ? (
                          <span className="inline-flex items-center gap-1.5 text-xs text-amber-200">
                            <Lock size={13} className="shrink-0" aria-hidden="true" />
                            Complete first: {eligibility.missingRequirements.join(" · ")}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs text-emerald-300">
                            <CheckCircle2 size={13} className="shrink-0" aria-hidden="true" />
                            Prerequisites complete · Ready to apply
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => setSelectedInternshipId(track.id)}
                          className="min-h-11 rounded-full border border-white/15 px-4 py-2 text-xs text-white/90 hover:border-white/35 hover:text-white"
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

          <section className="self-start rounded-2xl border border-white/10 bg-[#111111] p-6 sm:p-7">
            <p className="text-[11px] uppercase tracking-[0.18em] text-[#b9a9d6]">
              Internship Application (Free)
            </p>
            <h3 className="mt-2 text-xl font-medium tracking-[-0.03em]">
              Apply when ready
            </h3>
            <p className="mt-2 text-xs leading-5 text-white/60">
              Finish the matching course, quiz, and project review first. Participation in the internship is always free.
            </p>

            {user ? (
              <form onSubmit={handleApply} className="mt-5 space-y-4">
                <label className="block text-xs text-white/70">
                  Selected internship
                  <select
                    value={selectedInternshipId}
                    onChange={(e) => setSelectedInternshipId(e.target.value)}
                    required
                    className="mt-1.5 h-11 w-full rounded-lg border border-white/10 bg-[#151515] px-3 text-xs text-white"
                  >
                    {internships.map((track) => (
                      <option key={track.id} value={track.id}>
                        {track.title}
                      </option>
                    ))}
                  </select>
                </label>

                {selectedEligibility && !selectedEligibility.eligible && (
                  <div className="rounded-xl border border-amber-400/30 bg-amber-950/20 p-4 text-xs text-amber-100">
                    <p className="font-medium">
                      Finish these steps to unlock {selectedTrack?.title}:
                    </p>
                    <ul className="mt-2 list-disc space-y-1 pl-4 text-white/80">
                      {selectedEligibility.missingRequirements.map((req) => (
                        <li key={req}>{req}</li>
                      ))}
                    </ul>
                    {selectedTrack?.required_course_slug && (
                      <Link
                        href={`/courses/${selectedTrack.required_course_slug}`}
                        className="mt-3 inline-flex min-h-11 items-center gap-1.5 font-medium text-[#b9a9d6] hover:underline"
                      >
                        Go to {selectedEligibility.requiredCourseTitle ?? "required course"}{" "}
                        <ArrowUpRight size={13} aria-hidden="true" />
                      </Link>
                    )}
                  </div>
                )}

                <label className="block text-xs text-white/70">
                  What would you like to learn and build in this internship?
                  <textarea
                    required
                    minLength={10}
                    rows={3}
                    value={motivation}
                    onChange={(e) => setMotivation(e.target.value)}
                    placeholder="Tell us your goals for the weekly tasks and mentor reviews..."
                    className="mt-1.5 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs text-white"
                  />
                </label>

                <label className="block text-xs text-white/70">
                  Portfolio or GitHub URL (optional)
                  <input
                    type="url"
                    value={portfolioUrl}
                    onChange={(e) => setPortfolioUrl(e.target.value)}
                    placeholder="https://github.com/username"
                    className="mt-1.5 h-11 w-full rounded-lg border border-white/10 bg-black/30 px-3 text-xs text-white"
                  />
                </label>

                <button
                  type="submit"
                  disabled={
                    busy ||
                    !selectedInternshipId ||
                    (selectedEligibility ? !selectedEligibility.eligible : false)
                  }
                  className="min-h-11 w-full rounded-full bg-[#f4f3ef] px-5 py-3 text-xs font-medium text-[#111111] transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {busy
                    ? "Submitting..."
                    : selectedEligibility && !selectedEligibility.eligible
                      ? "Finish course & project first"
                      : "Apply Now (Free)"}
                </button>
              </form>
            ) : (
              <div className="mt-6 rounded-xl border border-dashed border-white/15 p-5 text-xs text-white/60">
                <p>Sign in with your TGL student account to apply for an internship.</p>
                <Link
                  href="/auth/login?next=/internships"
                  className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-[#f4f3ef] px-5 py-2.5 text-xs font-medium text-[#111111]"
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
