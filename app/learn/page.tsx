import { redirect } from "next/navigation";
import { RoleShell } from "@/components/role-shell";
import { StudentHomeClient } from "@/components/student-home-client";
import { getLearnerSnapshot } from "@/lib/learning-workspace-store";
import { listCoursesCatalog } from "@/lib/courses/store";
import {
  DEMO_STUDENT_ID,
  getCertificateClaimedAt,
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
  title: "My Learning — Touch Grass Later",
  description:
    "Unified learning hub for all enrolled programmes, internship tracks, practical projects, and included certificates.",
};

export default async function StudentHomePage() {
  const configured = isSupabaseConfigured();
  const { user } = await resolveCurrentActor();

  if (configured && !user) {
    redirect("/auth/login?next=/learn");
  }

  const actorId = user?.id ?? DEMO_STUDENT_ID;
  const learnerName = user?.name?.trim() || "Learner";
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

  const claimedCertIds = issuances
    .filter((i) => Boolean(getCertificateClaimedAt(i.certificate_id)))
    .map((i) => i.certificate_id);

  return (
    <RoleShell
      role="student"
      title={`My Learning · ${learnerName}`}
      subtitle="Continue where you left off across all enrolled programmes, practical projects, guided internship tracks, and included certificates."
      primaryAction={{ label: "Explore Programmes", href: "/programmes" }}
    >
      <StudentHomeClient
        learnerName={learnerName}
        courses={courses}
        internships={internships}
        applications={applications}
        orders={orders}
        payments={payments}
        issuances={issuances}
        claimedCertIds={claimedCertIds}
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
