import { redirect } from "next/navigation";
import { RoleShell } from "@/components/role-shell";
import { StudentHomeClient } from "@/components/student-home-client";
import { getLearnerSnapshotAsync } from "@/lib/learning-workspace-store";
import {
  getCourseDetailForActor,
  listCoursesCatalog,
  type CourseDetailResponse,
} from "@/lib/courses/store";
import {
  DEMO_STUDENT_ID,
  getCertificateClaimedAt,
  listEmailLogs,
  listInternships,
  listIssuances,
  listOrders,
  listPayments,
  listProducts,
  listStudentApplications,
  resolveCurrentActor,
} from "@/lib/certifications/store";
import { buildLearningUniverseSnapshot } from "@/lib/learning/skills-universe";

export const metadata = {
  title: "My Learning — Touch Grass Later",
  description:
    "Unified learning hub with interactive skill constellation, learning roadmap, skill mastery matrix, practical projects, and included certificates.",
};

export default async function StudentHomePage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string }>;
}) {
  const { user, configured } = await resolveCurrentActor();

  if (configured && !user) {
    redirect("/auth/login?next=/learn");
  }

  const resolvedSearch = searchParams ? await searchParams : undefined;
  const initialTab =
    typeof resolvedSearch?.tab === "string" ? resolvedSearch.tab.trim() : undefined;

  const actorId = user?.id ?? DEMO_STUDENT_ID;
  const learnerName = user?.name?.trim() || "Learner";

  const [
    workspace,
    courses,
    internships,
    applications,
    orders,
    payments,
    issuances,
    products,
    allEmailLogs,
  ] = await Promise.all([
    getLearnerSnapshotAsync(actorId),
    listCoursesCatalog(actorId),
    listInternships(),
    listStudentApplications(actorId),
    listOrders(actorId),
    listPayments(actorId),
    listIssuances(actorId),
    listProducts(false),
    listEmailLogs(),
  ]);

  const rawDetails = await Promise.all(
    courses.map((c) => getCourseDetailForActor({ slug: c.slug, userId: actorId })),
  );
  const courseDetails = rawDetails.filter(
    (d): d is CourseDetailResponse => Boolean(d),
  );

  const learningUniverse = buildLearningUniverseSnapshot({
    courseDetails,
    submissions: workspace.submissions,
    internships,
    applications,
    issuances,
  });

  const userEmailLogs = user?.email
    ? allEmailLogs
        .filter((log) => log.recipient_email.toLowerCase() === user.email.toLowerCase())
        .slice(0, 6)
    : allEmailLogs.slice(0, 4);

  const claimedCertIds = issuances
    .filter((i) => Boolean(getCertificateClaimedAt(i.certificate_id, i)))
    .map((i) => i.certificate_id);

  return (
    <RoleShell
      role="student"
      title={`My Learning · ${learnerName}`}
      subtitle="Unified learning workspace with interactive Skill Constellation, visual roadmaps, verified skill mastery, practical projects, and included certificates."
      primaryAction={{ label: "Explore Programmes", href: "/programmes" }}
    >
      <StudentHomeClient
        learnerName={learnerName}
        initialTab={initialTab}
        learningUniverse={learningUniverse}
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
        emailLogs={userEmailLogs}
      />
    </RoleShell>
  );
}
