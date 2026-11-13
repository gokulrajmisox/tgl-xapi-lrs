import { redirect } from "next/navigation";
import { RoleShell } from "@/components/role-shell";
import { StudentHomeClient } from "@/components/student-home-client";
import { getLearnerSnapshot } from "@/lib/learning-workspace-store";
import { listCoursesCatalog } from "@/lib/courses/store";
import {
  DEMO_STUDENT_ID,
  isSupabaseConfigured,
  listInternships,
  listIssuances,
  listOrders,
  listPayments,
  listProducts,
  listStudentApplications,
  resolveCurrentActor,
} from "@/lib/certifications/store";

export const metadata = {
  title: "Student Dashboard — Touch Grass Later",
  description:
    "Track your 6-stage learning-to-internship journey: paid courses, lesson progress, project deliverables, internship tasks, mentor feedback, and QR certificates.",
};

export default async function StudentHomePage() {
  const configured = isSupabaseConfigured();
  const { user } = await resolveCurrentActor();

  if (configured && !user) {
    redirect("/auth/login?next=/learn");
  }

  const actorId = user?.id ?? DEMO_STUDENT_ID;
  const learnerName = user?.name ?? "Aarav Sharma";
  const workspace = getLearnerSnapshot(actorId);

  const [courses, internships, applications, orders, payments, issuances, products] =
    await Promise.all([
      listCoursesCatalog(actorId),
      listInternships(),
      listStudentApplications(actorId),
      listOrders(actorId),
      listPayments(actorId),
      listIssuances(actorId),
      listProducts(false),
    ]);

  return (
    <RoleShell
      role="student"
      title="Student dashboard"
      subtitle="Pay → Enrol → Learn → Build Project → Complete Internship → Receive Internship Certificate"
      primaryAction={{ label: "Browse paid courses", href: "/courses" }}
    >
      <StudentHomeClient
        learnerName={learnerName}
        courses={courses}
        internships={internships}
        applications={applications}
        orders={orders}
        payments={payments}
        issuances={issuances}
        products={products}
        nodeStates={workspace.nodeStates}
        savedItems={workspace.savedItems}
        submissions={workspace.submissions}
        messages={workspace.messages}
        evidence={workspace.evidence}
      />
    </RoleShell>
  );
}
