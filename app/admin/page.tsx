import Link from "next/link";
import { redirect } from "next/navigation";
import { RoleShell } from "@/components/role-shell";
import { AdminOperationsClient } from "@/components/admin-operations-client";
import { isSupabaseConfigured, resolveCurrentActor } from "@/lib/certifications/store";
import { listCoursesCatalog } from "@/lib/courses/store";
import { getMentorConsoleData } from "@/lib/learning-workspace-store";

export const metadata = {
  title: "Admin Operations — Touch Grass Later",
  description:
    "Manage cohorts, bundled Programmes with single INR fees (₹499–₹1,999), included internships & certificates, Razorpay payments, and email delivery.",
};

type AdminSection = "overview" | "courses" | "payments" | "emails";

const ADMIN_DIRECTORY_USERS = [
  { id: "00000000-0000-4000-8000-000000000101", name: "Aarav Sharma", email: "aarav.sharma@example.edu", role: "student", cohort: "Autumn Engineering Cohort" },
  { id: "00000000-0000-4000-8000-000000000102", name: "Meera Krishnan", email: "meera.krishnan@example.edu", role: "student", cohort: "Autumn Engineering Cohort" },
  { id: "00000000-0000-4000-8000-000000000103", name: "Diya Nair", email: "diya.nair@example.edu", role: "student", cohort: "Product Craft Cohort" },
  { id: "mentor-kabir", name: "Kabir Malhotra", email: "kabir.mentor@touchgrasslater.org", role: "mentor", cohort: "Autumn Engineering Cohort" },
  { id: "mentor-nisha", name: "Dr. Nisha Menon", email: "nisha.mentor@touchgrasslater.org", role: "mentor", cohort: "Applied AI Studio" },
  { id: "00000000-0000-4000-8000-000000000001", name: "TGL Operations Admin", email: "admin@touchgrasslater.org", role: "admin", cohort: "All Cohorts" },
];

function normalizeSection(raw?: string): AdminSection {
  if (raw === "courses" || raw === "payments" || raw === "emails") return raw;
  return "overview";
}

export default async function AdminHomePage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string }>;
}) {
  const configured = isSupabaseConfigured();
  const { user } = await resolveCurrentActor({ allowSandboxAdmin: !configured });

  if (configured && !user) {
    redirect("/auth/login?next=/admin");
  }

  if (configured && user?.role !== "admin") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
        <section className="tgl-glass max-w-lg rounded-2xl p-8">
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">TGL / Admin</p>
          <h1 className="mt-4 text-3xl font-medium tracking-[-0.06em]">
            Administrator claim required.
          </h1>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            This account does not hold the server-managed Supabase app metadata claim{" "}
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
  const [initialCourses, mentorData] = await Promise.all([
    listCoursesCatalog(user?.id ?? null, true),
    Promise.resolve(getMentorConsoleData()),
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
        isSandbox={!configured}
        initialSection={initialSection}
        initialCourses={initialCourses}
        initialCohorts={mentorData.cohorts}
        initialUsers={ADMIN_DIRECTORY_USERS}
      />
    </RoleShell>
  );
}
