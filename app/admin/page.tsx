import Link from "next/link";
import { redirect } from "next/navigation";
import { RoleShell } from "@/components/role-shell";
import { AdminOperationsClient } from "@/components/admin-operations-client";
import { isPrivilegedStaffEmail } from "@/lib/auth/access";
import {
  listAdminDirectoryUsers,
  resolveCurrentActor,
} from "@/lib/certifications/store";
import { listCoursesCatalog } from "@/lib/courses/store";
import { getMentorConsoleDataAsync } from "@/lib/learning-workspace-store";

export const metadata = {
  title: "Admin Operations — Touch Grass Later",
  description:
    "Manage cohorts, bundled Programmes with single INR fees (₹499–₹1,999), included internships & certificates, Razorpay payments, and email delivery.",
};

type AdminSection = "overview" | "courses" | "payments" | "emails";

function normalizeSection(raw?: string): AdminSection {
  if (raw === "courses" || raw === "payments" || raw === "emails") return raw;
  return "overview";
}

export default async function AdminHomePage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string }>;
}) {
  const { user, configured } = await resolveCurrentActor();

  if (configured && !user) {
    redirect("/auth/login?next=/admin");
  }

  if (configured && (!user || user.role !== "admin" || !isPrivilegedStaffEmail(user.email))) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
        <section className="tgl-glass max-w-lg rounded-2xl p-8">
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">TGL / Admin</p>
          <h1 className="mt-4 text-3xl font-medium tracking-[-0.06em]">
            Administrator claim required.
          </h1>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            This account does not hold the Firebase Authentication server-verified claim{" "}
            <code className="text-[var(--accent)]">role=admin</code>.
          </p>
          <Link href="/learn" className="mt-6 inline-flex text-xs text-[var(--accent)] underline underline-offset-4">
            Return to Student Workspace
          </Link>
        </section>
      </main>
    );
  }

  const params = await searchParams;
  const initialSection = normalizeSection(params.section);
  const [initialCourses, mentorData, directoryUsers] = await Promise.all([
    listCoursesCatalog(user?.id ?? null, true),
    getMentorConsoleDataAsync(),
    listAdminDirectoryUsers(),
  ]);

  return (
    <RoleShell
      role="admin"
      title="Platform administration"
      subtitle="Programmes & single INR pricing (₹499–₹1,999), included internships & certificates, Razorpay payments, and email console"
      primaryAction={{ label: "Browse Programmes", href: "/programmes" }}
    >
      <AdminOperationsClient
        key={initialSection}
        isSandbox={Boolean(user?.isSandbox)}
        initialSection={initialSection}
        initialCourses={initialCourses}
        initialCohorts={mentorData.cohorts}
        initialUsers={directoryUsers}
      />
    </RoleShell>
  );
}
