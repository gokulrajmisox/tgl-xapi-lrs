import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowUpRight, CheckCircle2, FolderGit2 } from "lucide-react";
import { RoleShell } from "@/components/role-shell";
import { StudentCertificationsPanel } from "@/components/student-certifications-panel";
import { getLearnerSnapshot } from "@/lib/learning-workspace-store";
import {
  DEMO_STUDENT_ID,
  isSupabaseConfigured,
  resolveCurrentActor,
} from "@/lib/certifications/store";

export const metadata = {
  title: "Work, Portfolio & Certificates — Touch Grass Later",
  description:
    "Review project submissions, mentor feedback, verified activity evidence, and included QR-verified Internship Certificates.",
};

export default async function StudentPortfolioPage() {
  const configured = isSupabaseConfigured();
  const { user } = await resolveCurrentActor();

  if (configured && !user) {
    redirect("/auth/login?next=/learn/portfolio");
  }

  const actorId = user?.id ?? DEMO_STUDENT_ID;
  const workspace = getLearnerSnapshot(actorId);

  return (
    <RoleShell
      role="student"
      title="Work, evidence & credentials"
      subtitle="Verified project submissions, mentor critiques, and included QR-verified Internship Certificates"
      primaryAction={{ label: "Open learning map", href: "/learn/map" }}
    >
      <div className="space-y-10">
        {/* Work Submissions & Mentor Reviews */}
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="flex items-center gap-2 text-lg font-medium text-foreground">
              <FolderGit2 size={17} className="text-[var(--accent)]" aria-hidden="true" />
              <span>Project submissions &amp; mentor reviews ({workspace.submissions.length})</span>
            </h2>
            <Link
              href="/explore"
              className="text-xs font-medium text-[var(--accent)] hover:underline"
            >
              Start another project
            </Link>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {workspace.submissions.map((sub) => (
              <article
                key={sub.id}
                className="tgl-glass flex flex-col justify-between rounded-2xl p-6 text-xs"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] text-muted-foreground">{sub.cohortName}</span>
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
                  <h3 className="mt-2 text-base font-medium text-foreground">
                    {sub.projectTitle}
                  </h3>
                  <p className="mt-2 leading-5 text-muted-foreground">{sub.summary}</p>
                  {sub.mentorFeedback && (
                    <div className="mt-3 rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-3.5 text-emerald-700 dark:text-emerald-200">
                      <p className="font-medium">Mentor review ({sub.mentorName})</p>
                      <p className="mt-1">{sub.mentorFeedback}</p>
                    </div>
                  )}
                </div>

                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                  <div className="flex flex-wrap gap-3 font-mono text-[11px] text-muted-foreground">
                    {(sub.githubUrl || sub.artifactUrl) && (
                      <a
                        href={sub.githubUrl || sub.artifactUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-foreground"
                      >
                        GitHub repository
                      </a>
                    )}
                    {sub.deploymentUrl && (
                      <a
                        href={sub.deploymentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[var(--accent)] hover:underline"
                      >
                        Live demo
                      </a>
                    )}
                  </div>
                  <Link
                    href={`/projects/${sub.projectSlug}`}
                    className="inline-flex items-center gap-1 font-medium text-[var(--accent)] hover:underline"
                  >
                    Open workspace <ArrowUpRight size={13} aria-hidden="true" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Human-Friendly Activity Evidence */}
        <section className="tgl-glass rounded-2xl p-6">
          <h2 className="flex items-center gap-2 text-base font-medium text-foreground">
            <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            <span>Verified learning activity timeline</span>
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Every approved project, completed concept, and earned credential is recorded automatically in your activity log.
          </p>
          <div className="mt-4 divide-y divide-border">
            {workspace.evidence.map((ev) => (
              <div
                key={ev.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3 text-xs"
              >
                <div>
                  <Link
                    href={ev.relatedSlug}
                    className="font-medium text-foreground hover:text-[var(--accent)]"
                  >
                    {ev.title}
                  </Link>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{ev.pathwayTitle}</p>
                </div>
                <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
                  {new Date(ev.recordedAt).toLocaleDateString("en-IN", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Included Certificates & INTERNSHIP CERTIFICATE */}
        <section className="tgl-glass rounded-2xl p-6">
          <div className="mb-4">
            <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--accent)]">
              Included Credentials · INTERNSHIP CERTIFICATE
            </p>
            <h2 className="mt-1 text-xl font-medium tracking-[-0.03em] text-foreground">
              Official certificates &amp; QR verification
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Internship participation and your official INTERNSHIP CERTIFICATE are included in your single Programme Enrolment (₹0 additional fee) once completion checks and mentor approval pass.
            </p>
          </div>
          <StudentCertificationsPanel />
        </section>
      </div>
    </RoleShell>
  );
}
