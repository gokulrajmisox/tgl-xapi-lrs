"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, CheckCircle2, Clock3, Send } from "lucide-react";

type Internship = {
  id: string;
  slug: string;
  title: string;
  track: string;
  description: string;
  duration_weeks: number;
};

type Application = {
  id: string;
  internship_id: string;
  applicant_name: string;
  applicant_email: string;
  status: string;
  submission_url: string | null;
  submission_summary: string | null;
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
  const [user, setUser] = useState<Actor>(null);
  const [selectedInternshipId, setSelectedInternshipId] = useState<string>("");
  const [motivation, setMotivation] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [submissionUrl, setSubmissionUrl] = useState<Record<string, string>>({});
  const [submissionSummary, setSubmissionSummary] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/internships", { cache: "no-store" });
    if (!res.ok) return;
    const data = await res.json();
    setInternships(data.internships ?? []);
    setApplications(data.applications ?? []);
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
      setNotice("Free internship application saved. You can participate and submit work without purchasing any certificate.");
      setMotivation("");
      setPortfolioUrl("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit application.");
    } finally {
      setBusy(false);
    }
  };

  const handleSubmitWork = async (applicationId: string) => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const res = await fetch("/api/internships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "submit",
          applicationId,
          submissionUrl: submissionUrl[applicationId] ?? "",
          submissionSummary: submissionSummary[applicationId] ?? "",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Submission failed.");
      setNotice("Project submission recorded for mentor review.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not record submission.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-12">
      <div className="rounded-2xl border border-white/10 bg-[#111111] p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-5">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-[#b9a9d6]">
              Free Participation · Merit Based
            </p>
            <h2 className="mt-2 text-2xl font-medium tracking-[-0.04em]">
              Internship participation is separate from certification
            </h2>
          </div>
          <span className="text-xs font-medium text-emerald-300">
            100% Free to Apply &amp; Complete
          </span>
        </div>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-white/60">
          Apply to any internship track, build real projects, and receive mentor feedback without paying any fee. Optional <strong className="text-white">INTERNSHIP CERTIFICATE</strong> issuance is available only after you complete your work and receive mentor approval.
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

      <div className="grid gap-8 lg:grid-cols-[1.1fr_.9fr]">
        <section className="space-y-4">
          <h3 className="text-lg font-medium tracking-[-0.03em]">Open internship tracks</h3>
          <div className="grid gap-4">
            {internships.map((track) => {
              const existingApp = applications.find((a) => a.internship_id === track.id);
              return (
                <article
                  key={track.id}
                  className="rounded-2xl border border-white/10 bg-[#111111] p-6"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-white/45">
                    <span>{track.track}</span>
                    <span>{track.duration_weeks} weeks · Free participation</span>
                  </div>
                  <h4 className="mt-2 text-lg font-medium tracking-[-0.03em] text-[#f4f3ef]">
                    {track.title}
                  </h4>
                  <p className="mt-2 text-xs leading-6 text-white/55">{track.description}</p>

                  {existingApp ? (
                    <div className="mt-5 space-y-4 border-t border-white/10 pt-4">
                      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                        <span className="inline-flex items-center gap-1.5 text-[#b9a9d6]">
                          {existingApp.mentor_approved ? (
                            <CheckCircle2 size={14} aria-hidden="true" />
                          ) : (
                            <Clock3 size={14} aria-hidden="true" />
                          )}
                          Status: <strong className="capitalize">{existingApp.status.replaceAll("_", " ")}</strong>
                        </span>
                        <span className="text-white/50">
                          Mentor approval: {existingApp.mentor_approved ? "Approved" : "Pending review"}
                        </span>
                      </div>

                      {existingApp.submission_url ? (
                        <div className="rounded-xl border border-white/10 bg-black/25 p-4 text-xs">
                          <p className="text-white/50">Submitted project link</p>
                          <a
                            href={existingApp.submission_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1 inline-flex items-center gap-1 text-[#b9a9d6] underline underline-offset-4"
                          >
                            {existingApp.submission_url} <ArrowUpRight size={12} />
                          </a>
                          {existingApp.mentor_notes && (
                            <p className="mt-2 text-white/60">Mentor note: {existingApp.mentor_notes}</p>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-3 rounded-xl border border-white/10 bg-black/25 p-4">
                          <p className="text-xs font-medium text-white/85">Submit internship work for mentor review</p>
                          <label className="block text-[11px] text-white/55">
                            Project repository or demo URL
                            <input
                              type="url"
                              placeholder="https://github.com/your-handle/project"
                              value={submissionUrl[existingApp.id] ?? ""}
                              onChange={(e) =>
                                setSubmissionUrl((prev) => ({
                                  ...prev,
                                  [existingApp.id]: e.target.value,
                                }))
                              }
                              className="mt-1 h-10 w-full rounded-lg border border-white/10 bg-[#151515] px-3 text-xs text-white"
                            />
                          </label>
                          <label className="block text-[11px] text-white/55">
                            Work summary
                            <textarea
                              rows={2}
                              placeholder="Summarize what you built, tested, and documented..."
                              value={submissionSummary[existingApp.id] ?? ""}
                              onChange={(e) =>
                                setSubmissionSummary((prev) => ({
                                  ...prev,
                                  [existingApp.id]: e.target.value,
                                }))
                              }
                              className="mt-1 w-full rounded-lg border border-white/10 bg-[#151515] px-3 py-2 text-xs text-white"
                            />
                          </label>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void handleSubmitWork(existingApp.id)}
                            className="inline-flex items-center gap-2 rounded-full bg-[#f4f3ef] px-4 py-2 text-xs font-medium text-[#111111] disabled:opacity-40"
                          >
                            <Send size={13} aria-hidden="true" />
                            Submit work for approval
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="mt-5 border-t border-white/10 pt-4">
                      <button
                        type="button"
                        onClick={() => setSelectedInternshipId(track.id)}
                        className="rounded-full border border-white/15 px-4 py-2 text-xs text-white/80 hover:border-white/35 hover:text-white"
                      >
                        Select track to apply (Free)
                      </button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-[#111111] p-6 sm:p-7 self-start">
          <p className="text-[10px] uppercase tracking-[0.2em] text-white/45">
            Free Internship Application
          </p>
          <h3 className="mt-2 text-xl font-medium tracking-[-0.03em]">
            Apply without any fee
          </h3>
          <p className="mt-2 text-xs leading-5 text-white/50">
            Selection and participation never require payment. Optional certification is offered only after completion.
          </p>

          {user ? (
            <form onSubmit={handleApply} className="mt-5 space-y-4">
              <label className="block text-xs text-white/60">
                Internship track
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

              <label className="block text-xs text-white/60">
                Why do you want to join this track?
                <textarea
                  required
                  minLength={10}
                  rows={3}
                  value={motivation}
                  onChange={(e) => setMotivation(e.target.value)}
                  placeholder="Share what you want to build and learn..."
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
                disabled={busy || !selectedInternshipId}
                className="w-full rounded-full bg-[#f4f3ef] px-5 py-3 text-xs font-medium text-[#111111] transition-colors hover:bg-white disabled:opacity-45"
              >
                {busy ? "Submitting…" : "Submit free internship application"}
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
