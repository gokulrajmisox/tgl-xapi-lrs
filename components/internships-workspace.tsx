"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
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
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
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
        "Internship application saved. Complete each assigned milestone task below to earn mentor evaluation.",
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
      setError("Provide a valid task deliverable URL and at least an 8-character summary.");
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
      setNotice("Task deliverable submitted and queued for mentor evaluation.");
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
            <p className="text-[11px] uppercase tracking-[0.2em] text-[#b9a9d6]">
              Structured Practice · Connected to Courses &amp; Projects
            </p>
            <h2 className="mt-2 text-2xl font-medium tracking-[-0.04em]">
              Earn eligibility through courses, complete assigned tasks, unlock your certificate
            </h2>
          </div>
          <span className="text-xs font-medium text-emerald-300">
            100% Free to Apply &amp; Complete Tasks
          </span>
        </div>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-white/60">
          Internships connect directly to our{" "}
          <Link href="/courses" className="text-[#b9a9d6] underline underline-offset-4 hover:text-white">
            paid courses (₹499–₹1,999 INR)
          </Link>{" "}
          and capstone projects. Enrolment in an internship requires prerequisite course &amp; project approval—and{" "}
          <strong className="text-white">INTERNSHIP CERTIFICATE</strong> issuance (₹299–₹599 INR optional) opens only after every assigned task is submitted and approved by mentors.
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

      <div className="grid gap-8 lg:grid-cols-[1.2fr_.8fr]">
        <section className="space-y-4">
          <h3 className="text-lg font-medium tracking-[-0.03em]">
            Internship programmes &amp; assigned tasks
          </h3>
          <div className="grid gap-5">
            {internships.map((track) => {
              const existingApp = applications.find((a) => a.internship_id === track.id);
              const eligibility = eligibilityByInternshipId[track.id];
              const tasks = track.tasks ?? [];
              const taskSubs = existingApp?.task_submissions ?? [];

              return (
                <article
                  key={track.id}
                  className="rounded-2xl border border-white/10 bg-[#111111] p-6"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-white/45">
                    <span>{track.track}</span>
                    <span>
                      {track.duration_weeks} weeks · {tasks.length} assigned tasks · Free participation
                    </span>
                  </div>
                  <h4 className="mt-2 text-lg font-medium tracking-[-0.03em] text-[#f4f3ef]">
                    {track.title}
                  </h4>
                  <p className="mt-2 text-xs leading-6 text-white/55">{track.description}</p>

                  {/* Prerequisites Box */}
                  <div className="mt-4 rounded-xl border border-white/10 bg-black/25 p-4 text-xs">
                    <p className="font-medium text-white/85">Entry Prerequisites</p>
                    <div className="mt-2 flex flex-wrap items-center gap-4 text-[11px]">
                      {track.required_course_slug && (
                        <Link
                          href={`/courses/${track.required_course_slug}`}
                          className={`inline-flex items-center gap-1.5 ${
                            eligibility?.courseEnrolled ? "text-emerald-300" : "text-[#b9a9d6] hover:underline"
                          }`}
                        >
                          {eligibility?.courseEnrolled ? (
                            <CheckCircle2 size={12} aria-hidden="true" />
                          ) : (
                            <Lock size={12} aria-hidden="true" />
                          )}
                          Paired course ({track.required_course_slug})
                        </Link>
                      )}
                      {track.required_project_slug && track.require_project_approval && (
                        <Link
                          href={`/projects/${track.required_project_slug}`}
                          className={`inline-flex items-center gap-1.5 ${
                            eligibility?.projectApproved ? "text-emerald-300" : "text-white/60 hover:underline"
                          }`}
                        >
                          {eligibility?.projectApproved ? (
                            <CheckCircle2 size={12} aria-hidden="true" />
                          ) : (
                            <Clock3 size={12} aria-hidden="true" />
                          )}
                          Mentor-approved project ({track.required_project_slug})
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
                          Programme status:{" "}
                          <strong className="capitalize text-white">
                            {existingApp.status.replaceAll("_", " ")}
                          </strong>
                        </span>
                        <span className="text-white/65">
                          Final evaluation:{" "}
                          <strong
                            className={
                              existingApp.mentor_approved ? "text-emerald-300" : "text-white/75"
                            }
                          >
                            {existingApp.mentor_approved
                              ? existingApp.final_score_label || "Approved for Certificate"
                              : "Complete tasks below"}
                          </strong>
                        </span>
                      </div>

                      {/* Assigned Tasks & Individual Task Submissions */}
                      <div className="space-y-3">
                        <p className="text-[11px] uppercase tracking-[0.16em] text-white/45">
                          Assigned Internship Tasks ({taskSubs.filter((t) => t.status === "approved").length}/{tasks.length} approved)
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
                                    Deadline: {task.deadlineLabel} · Deliverable: {task.deliverableFormat}
                                  </p>
                                </div>
                                <span
                                  className={`capitalize font-medium ${
                                    sub?.status === "approved"
                                      ? "text-emerald-300"
                                      : sub?.status === "revision_required"
                                        ? "text-amber-300"
                                        : sub?.status === "submitted"
                                          ? "text-[#b9a9d6]"
                                          : "text-white/45"
                                  }`}
                                >
                                  {sub ? sub.status.replaceAll("_", " ") : "Pending submission"}
                                </span>
                              </div>
                              <p className="mt-2 leading-5 text-white/60">{task.brief}</p>

                              {sub && (
                                <div className="mt-3 rounded-lg border border-white/10 bg-black/40 p-3 text-[11px]">
                                  <a
                                    href={sub.submissionUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="font-mono text-[#b9a9d6] underline"
                                  >
                                    {sub.submissionUrl}
                                  </a>
                                  <p className="mt-1 text-white/70">{sub.summary}</p>
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
                                    placeholder="https://github.com/your-handle/task-deliverable"
                                    value={taskUrls[fieldKey] ?? sub?.submissionUrl ?? ""}
                                    onChange={(e) =>
                                      setTaskUrls((prev) => ({
                                        ...prev,
                                        [fieldKey]: e.target.value,
                                      }))
                                    }
                                    className="h-9 w-full rounded-lg border border-white/10 bg-[#151515] px-3 text-xs text-white"
                                  />
                                  <div className="flex flex-wrap gap-2">
                                    <input
                                      type="text"
                                      placeholder="Summary of deliverable & tests verified..."
                                      value={taskSummaries[fieldKey] ?? sub?.summary ?? ""}
                                      onChange={(e) =>
                                        setTaskSummaries((prev) => ({
                                          ...prev,
                                          [fieldKey]: e.target.value,
                                        }))
                                      }
                                      className="h-9 flex-1 rounded-lg border border-white/10 bg-[#151515] px-3 text-xs text-white"
                                    />
                                    <button
                                      type="button"
                                      disabled={busy}
                                      onClick={() => void handleSubmitTask(existingApp.id, task.id)}
                                      className="inline-flex items-center gap-1.5 rounded-full bg-[#f4f3ef] px-4 py-1.5 text-xs font-medium text-[#111111] disabled:opacity-45"
                                    >
                                      {sub?.status === "revision_required" ? (
                                        <RotateCcw size={12} aria-hidden="true" />
                                      ) : (
                                        <Send size={12} aria-hidden="true" />
                                      )}
                                      {sub?.status === "revision_required"
                                        ? "Resubmit task"
                                        : "Submit task"}
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
                            <p className="mt-1 text-white/70">
                              {existingApp.final_evaluation_notes || existingApp.mentor_notes}
                            </p>
                          </div>
                          <Link
                            href="/certificates"
                            className="inline-flex items-center gap-1.5 rounded-full bg-[#f4f3ef] px-4 py-2 font-medium text-[#111111] whitespace-nowrap shrink-0"
                          >
                            <Award size={13} aria-hidden="true" />
                            Claim INTERNSHIP CERTIFICATE <ArrowUpRight size={12} aria-hidden="true" />
                          </Link>
                        </div>
                      ) : (
                        <p className="text-[11px] text-white/45">
                          Submit every assigned task above. Final internship approval unlocks once mentors approve all task deliverables.
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
                      {eligibility && !eligibility.eligible ? (
                        <span className="text-xs text-amber-200/90">
                          Locked: {eligibility.missingRequirements.join(" · ")}
                        </span>
                      ) : (
                        <span className="text-xs text-emerald-300">
                          Prerequisites satisfied · Ready to enroll
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => setSelectedInternshipId(track.id)}
                        className="rounded-full border border-white/15 px-4 py-2 text-xs text-white/85 hover:border-white/35 hover:text-white"
                      >
                        Select track
                      </button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </section>

        <section className="self-start rounded-2xl border border-white/10 bg-[#111111] p-6 sm:p-7">
          <p className="text-[10px] uppercase tracking-[0.2em] text-white/45">
            Internship Enrolment (Free)
          </p>
          <h3 className="mt-2 text-xl font-medium tracking-[-0.03em]">
            Apply once prerequisites clear
          </h3>
          <p className="mt-2 text-xs leading-5 text-white/50">
            Admission to an internship track requires completing its prerequisite course &amp; capstone project.
          </p>

          {user ? (
            <form onSubmit={handleApply} className="mt-5 space-y-4">
              <label className="block text-xs text-white/60">
                Internship programme
                <select
                  value={selectedInternshipId}
                  onChange={(e) => setSelectedInternshipId(e.target.value)}
                  required
                  className="mt-1.5 h-10 w-full rounded-lg border border-white/10 bg-[#151515] px-3 text-xs text-white"
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
                  <p className="font-medium">Prerequisites incomplete for {selectedTrack?.title}</p>
                  <ul className="mt-2 list-disc space-y-1 pl-4 text-white/75">
                    {selectedEligibility.missingRequirements.map((req) => (
                      <li key={req}>{req}</li>
                    ))}
                  </ul>
                  {selectedTrack?.required_course_slug && (
                    <Link
                      href={`/courses/${selectedTrack.required_course_slug}`}
                      className="mt-3 inline-flex items-center gap-1 font-medium text-[#b9a9d6] hover:underline"
                    >
                      Open required course <ArrowUpRight size={12} aria-hidden="true" />
                    </Link>
                  )}
                </div>
              )}

              <label className="block text-xs text-white/60">
                What deliverables do you aim to ship during this internship?
                <textarea
                  required
                  minLength={10}
                  rows={3}
                  value={motivation}
                  onChange={(e) => setMotivation(e.target.value)}
                  placeholder="Share your goals for the weekly tasks and final review..."
                  className="mt-1.5 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs text-white"
                />
              </label>

              <label className="block text-xs text-white/60">
                Portfolio or GitHub URL (optional)
                <input
                  type="url"
                  value={portfolioUrl}
                  onChange={(e) => setPortfolioUrl(e.target.value)}
                  placeholder="https://github.com/username"
                  className="mt-1.5 h-10 w-full rounded-lg border border-white/10 bg-black/30 px-3 text-xs text-white"
                />
              </label>

              <button
                type="submit"
                disabled={
                  busy ||
                  !selectedInternshipId ||
                  (selectedEligibility ? !selectedEligibility.eligible : false)
                }
                className="w-full rounded-full bg-[#f4f3ef] px-5 py-3 text-xs font-medium text-[#111111] transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-45"
              >
                {busy
                  ? "Submitting…"
                  : selectedEligibility && !selectedEligibility.eligible
                    ? "Complete course & project prerequisites first"
                    : "Enroll in internship programme"}
              </button>
            </form>
          ) : (
            <div className="mt-6 rounded-xl border border-dashed border-white/15 p-5 text-xs text-white/55">
              <p>Sign in with your TGL student account to apply for an internship.</p>
              <Link
                href="/auth/login?next=/internships"
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#f4f3ef] px-4 py-2 text-xs font-medium text-[#111111]"
              >
                Sign in to apply <ArrowUpRight size={13} />
              </Link>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
