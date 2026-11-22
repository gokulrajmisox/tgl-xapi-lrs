"use client";

import Link from "next/link";
import {
  ArrowRight,
  Award,
  CheckCircle2,
  Download,
  FolderGit2,
  Lock,
  Sparkles,
  Trophy,
} from "lucide-react";
import type { AchievementMilestone, LearningUniverseMetrics } from "@/lib/learning/skills-universe";
import type { CertificateIssuanceRecord } from "@/lib/certifications/store";
import type { ProjectSubmissionRecord } from "@/lib/learning-workspace-store";

export function AchievementsPanel({
  achievements,
  metrics,
  issuances,
  submissions,
}: {
  achievements: AchievementMilestone[];
  metrics: LearningUniverseMetrics;
  issuances: CertificateIssuanceRecord[];
  submissions: ProjectSubmissionRecord[];
}) {
  const activeCertificates = issuances.filter((i) => i.issuance_status === "issued");
  const approvedProjects = submissions.filter((s) => s.status === "approved");

  return (
    <div className="space-y-6">
      {/* Milestone Badges Grid */}
      <section className="tgl-glass rounded-3xl p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold tracking-[-0.03em] text-foreground">
              <Trophy size={18} className="text-accent" aria-hidden="true" />
              Verified Learning Milestones
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Earned strictly from verified lesson completions, quizzes, mentor-approved capstones, and issued credentials.
            </p>
          </div>
          <span className="font-mono text-xs font-semibold tabular-nums text-accent">
            {achievements.filter((a) => a.earned).length}/{achievements.length} unlocked
          </span>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {achievements.map((ach) => (
            <article
              key={ach.id}
              className={`flex flex-col justify-between gap-4 rounded-2xl border p-4 text-xs ${
                ach.earned
                  ? "border-emerald-500/40 bg-emerald-500/[0.07]"
                  : "tgl-subsurface opacity-85"
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2 text-[11px]">
                  <span className="uppercase tracking-[0.12em] text-muted-foreground">
                    {ach.category}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 font-semibold ${
                      ach.earned
                        ? "text-emerald-700 dark:text-emerald-300"
                        : "text-muted-foreground"
                    }`}
                  >
                    {ach.earned ? (
                      <>
                        <CheckCircle2 size={12} aria-hidden="true" /> Earned
                      </>
                    ) : (
                      <>
                        <Lock size={11} aria-hidden="true" /> Locked
                      </>
                    )}
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-foreground">{ach.title}</h3>
                <p className="leading-5 text-muted-foreground">{ach.detail}</p>
              </div>

              <div className="flex items-center justify-between gap-2 border-t border-border pt-3 text-[11px]">
                <span className="font-mono font-medium tabular-nums text-foreground">
                  {ach.metricLabel}
                </span>
                {ach.href && (
                  <Link
                    href={ach.href}
                    className="inline-flex items-center gap-1 font-medium text-accent hover:underline"
                  >
                    Open <ArrowRight size={11} aria-hidden="true" />
                  </Link>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Certificates & Approved Projects */}
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="tgl-glass rounded-3xl p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <h3 className="flex items-center gap-2 text-base font-semibold text-foreground">
              <Award size={16} className="text-accent" aria-hidden="true" />
              Official Certificates ({activeCertificates.length})
            </h3>
            <Link href="/certificates" className="text-xs font-medium text-accent hover:underline">
              Verify portal
            </Link>
          </div>
          <div className="mt-4 space-y-2.5 text-xs">
            {activeCertificates.map((cert) => (
              <div
                key={cert.id}
                className="tgl-subsurface flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-[11px] text-accent">{cert.certificate_id}</p>
                  <p className="mt-0.5 truncate font-semibold text-foreground">
                    {cert.achievement_title}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={`/api/certificates/${encodeURIComponent(cert.certificate_id)}/pdf`}
                    download={`${cert.certificate_id}.pdf`}
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-accent px-3.5 py-1.5 text-[11px] font-medium text-accent-foreground hover:opacity-90"
                  >
                    <Download size={12} aria-hidden="true" />
                    PDF
                  </a>
                  <Link
                    href={`/verify/certificate/${encodeURIComponent(cert.certificate_id)}`}
                    className="inline-flex min-h-9 items-center rounded-full border border-border bg-card px-3 py-1.5 text-[11px] font-medium text-foreground"
                  >
                    Verify
                  </Link>
                </div>
              </div>
            ))}
            {activeCertificates.length === 0 && (
              <p className="text-muted-foreground">
                No certificates issued yet. Complete all programme modules, capstone review, and internship sprints to unlock your ₹0 included certificate.
              </p>
            )}
          </div>
        </section>

        <section className="tgl-glass rounded-3xl p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <h3 className="flex items-center gap-2 text-base font-semibold text-foreground">
              <FolderGit2 size={16} className="text-accent" aria-hidden="true" />
              Approved Capstone Portfolio ({approvedProjects.length})
            </h3>
            <span className="inline-flex items-center gap-1 font-mono text-xs tabular-nums text-muted-foreground">
              <Sparkles size={12} className="text-accent" aria-hidden="true" />
              {metrics.learningHoursCompleted}h verified
            </span>
          </div>
          <div className="mt-4 space-y-2.5 text-xs">
            {approvedProjects.map((sub) => (
              <div key={sub.id} className="tgl-subsurface rounded-2xl p-4 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-foreground">{sub.projectTitle}</p>
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
                    <CheckCircle2 size={12} aria-hidden="true" /> Approved
                  </span>
                </div>
                {sub.mentorFeedback && (
                  <p className="text-[11px] text-muted-foreground">
                    Mentor ({sub.mentorName}): {sub.mentorFeedback}
                  </p>
                )}
              </div>
            ))}
            {approvedProjects.length === 0 && (
              <p className="text-muted-foreground">
                Submit your GitHub capstone build inside your programme workspace to earn mentor rubric approval.
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
