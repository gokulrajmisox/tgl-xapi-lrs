import Link from "next/link";
import { redirect } from "next/navigation";
import { RoleShell } from "@/components/role-shell";
import { MentorConsoleClient } from "@/components/mentor-console-client";
import { getMentorConsoleData } from "@/lib/learning-workspace-store";
import { isSupabaseConfigured, resolveCurrentActor } from "@/lib/certifications/store";

export const metadata = {
  title: "Mentor Workspace — Touch Grass Later",
  description:
    "Review learner submissions, leave rubric feedback, approve internship eligibility, and answer learner questions.",
};

export default async function MentorPage() {
  const configured = isSupabaseConfigured();
  const { user } = await resolveCurrentActor({ allowSandboxAdmin: !configured });

  if (configured && !user) {
    redirect("/auth/login?next=/mentor");
  }

  if (configured && user?.role !== "admin") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
        <section className="tgl-glass max-w-lg rounded-2xl p-8">
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">TGL / Mentor</p>
          <h1 className="mt-4 text-3xl font-medium tracking-[-0.06em]">
            Mentor or administrator claim required.
          </h1>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            This account does not hold the server-managed mentor/admin role claim required to review cohort submissions.
          </p>
          <Link href="/learn" className="mt-6 inline-flex text-xs text-[var(--accent)] underline underline-offset-4">
            Return to Student Workspace
          </Link>
        </section>
      </main>
    );
  }

  const mentorData = getMentorConsoleData();

  return (
    <RoleShell
      role="mentor"
      title="Mentor review studio"
      subtitle="Inspect project submissions, post critique notes, approve work for certification eligibility, and guide cohorts"
      primaryAction={{ label: "Explore network", href: "/explore" }}
    >
      <MentorConsoleClient
        initialCohorts={mentorData.cohorts}
        initialLearners={mentorData.learners}
        initialSubmissions={mentorData.submissions}
        initialMessages={mentorData.messages}
      />
    </RoleShell>
  );
}
