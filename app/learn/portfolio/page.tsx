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
    "Review project submissions, mentor feedback, verified activity evidence, and optional INR certificates.",
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
      subtitle="Verified project submissions, mentor critiques, and optional INR certification checkout"
      primaryAction={{ label: "Open learning map", href: "/learn/map" }}
    >
      <div className="space-y-10">
        {/* Work Submissions & Mentor Reviews */}
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="flex items-center gap-2 text-lg font-medium">
              <FolderGit2 size={17} className="text-[#b9a9d6]" aria-hidden="true" />
              <span>Project submissions &amp; mentor reviews ({workspace.submissions.length})</span>
            </h2>
            <Link
              href="/explore"
              className="text-xs text-[#b9a9d6] hover:text-white"
            >
              Start another project
            </Link>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {workspace.submissions.map((sub) => (
              <article
                key={sub.id}
                className="flex flex-col justify-between rounded-2xl border border-white/10 bg-[#111111] p-6 text-xs"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] text-white/45">{sub.cohortName}</span>
                    <span
                      className={`capitalize font-medium ${
                        sub.status === "approved"
                          ? "text-emerald-300"
                          : sub.status === "revision_required"
                            ? "text-amber-300"
                            : "text-[#b9a9d6]"
                      }`}
                    >
                      {sub.status.replaceAll("_", " ")}
                    </span>
                  </div>
                  <h3 className="mt-2 text-base font-medium text-[#f4f3ef]">
                    {sub.projectTitle}
                  </h3>
                  <p className="mt-2 leading-5 text-white/60">{sub.summary}</p>
                  {sub.mentorFeedback && (
                    <div className="mt-3 rounded-xl border border-emerald-400/20 bg-emerald-950/20 p-3.5 text-emerald-200">
                      <p className="font-medium">Mentor review ({sub.mentorName})</p>
                      <p className="mt-1">{sub.mentorFeedback}</p>
                    </div>
                  )}
                </div>

                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
                  <div className="flex flex-wrap gap-3 font-mono text-[11px] text-white/55">
                    {(sub.githubUrl || sub.artifactUrl) && (
                      <a
                        href={sub.githubUrl || sub.artifactUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-white"
                      >
                        GitHub repository
                      </a>
                    )}
                    {sub.deploymentUrl && (
                      <a
                        href={sub.deploymentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#b9a9d6] hover:text-white"
                      >
                        Live demo
                      </a>
                    )}
                  </div>
                  <Link
                    href={`/projects/${sub.projectSlug}`}
                    className="inline-flex items-center gap-1 font-medium text-[#b9a9d6] hover:text-white"
                  >
                    Open workspace <ArrowUpRight size={13} aria-hidden="true" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Human-Friendly Activity Evidence */}
        <section className="rounded-2xl border border-white/10 bg-[#111111] p-6">
          <h2 className="flex items-center gap-2 text-base font-medium">
            <CheckCircle2 size={16} className="text-emerald-400" aria-hidden="true" />
            <span>Verified learning activity timeline</span>
          </h2>
          <p className="mt-1 text-xs text-white/50">
            Every approved project, completed concept, and earned credential is recorded automatically in your activity log.
          </p>
          <div className="mt-4 divide-y divide-white/10">
            {workspace.evidence.map((ev) => (
              <div
                key={ev.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3 text-xs"
              >
                <div>
                  <Link
                    href={ev.relatedSlug}
                    className="font-medium text-[#f4f3ef] hover:text-[#b9a9d6]"
                  >
                    {ev.title}
                  </Link>
                  <p className="mt-0.5 text-[11px] text-white/45">{ev.pathwayTitle}</p>
                </div>
                <span className="font-mono text-[11px] tabular-nums text-white/50">
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

        {/* Optional Certificates & INTERNSHIP CERTIFICATE Checkout */}
        <section className="rounded-2xl border border-white/10 bg-[#0d0d0f] p-6">
          <div className="mb-4">
            <p className="text-[11px] uppercase tracking-[0.16em] text-[#b9a9d6]">
              Optional Credentials · INTERNSHIP CERTIFICATE
            </p>
            <h2 className="mt-1 text-xl font-medium tracking-[-0.03em] text-[#f4f3ef]">
              Official certificates &amp; QR verification
            </h2>
            <p className="mt-1 text-xs text-white/55">
              Internship and pathway participation are free. Payment (₹299–₹599 INR) is optional and available only once eligibility checks and mentor approval pass.
            </p>
          </div>
          <StudentCertificationsPanel />
        </section>
      </div>
    </RoleShell>
  );
}
