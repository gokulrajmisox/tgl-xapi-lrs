import { notFound } from "next/navigation";
import { Header } from "@/components/header";
import { CourseWorkspaceClient } from "@/components/course-workspace-client";
import {
  isSupabaseConfigured,
  listInternships,
  listIssuances,
  listStudentApplications,
  resolveCurrentActor,
} from "@/lib/certifications/store";
import { getCourseDetailForActor } from "@/lib/courses/store";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const detail = await getCourseDetailForActor({ slug });
  if (!detail) {
    return { title: "Programme Not Found — Touch Grass Later" };
  }
  return {
    title: `${detail.course.title} — Touch Grass Later`,
    description: detail.course.subtitle,
  };
}

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const configured = isSupabaseConfigured();
  const actor = await resolveCurrentActor();

  const detail = await getCourseDetailForActor({
    slug,
    userId: actor.user?.id ?? null,
    bypassLockForAdmin: actor.user?.role === "admin",
  });

  if (!detail) {
    notFound();
  }

  const [internships, applications, issuances] = await Promise.all([
    listInternships(),
    actor.user ? listStudentApplications(actor.user.id) : Promise.resolve([]),
    actor.user ? listIssuances(actor.user.id) : Promise.resolve([]),
  ]);

  const internshipTrack =
    internships.find((i) => i.slug === detail.course.linkedInternshipSlug) ?? null;
  const internshipApplication =
    internshipTrack
      ? applications.find((a) => a.internship_id === internshipTrack.id) ?? null
      : null;
  const issuedCertificate =
    internshipApplication
      ? issuances.find(
          (i) =>
            i.internship_application_id === internshipApplication.id &&
            i.issuance_status !== "revoked",
        ) ?? null
      : null;

  return (
    <div className="min-h-screen overflow-x-clip bg-[#090909]">
      <Header />
      <main>
        <CourseWorkspaceClient
          initialDetail={detail}
          initialInternshipTrack={internshipTrack}
          initialInternshipApplication={internshipApplication}
          initialIssuedCertificate={issuedCertificate}
          user={actor.user}
          isSandbox={!configured}
        />
      </main>
    </div>
  );
}
