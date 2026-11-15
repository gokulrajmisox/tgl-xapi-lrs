import { notFound } from "next/navigation";
import { Header } from "@/components/header";
import { CourseWorkspaceClient } from "@/components/course-workspace-client";
import {
  isSupabaseConfigured,
  resolveCurrentActor,
} from "@/lib/certifications/store";
import { getCourseDetailForActor } from "@/lib/courses/store";
import { buildProgrammeWorkspacePayload } from "@/lib/learning/course-workspace";

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

  const payload = await buildProgrammeWorkspacePayload({
    slug,
    user: actor.user,
  });

  if (!payload) {
    notFound();
  }

  return (
    <div className="min-h-screen overflow-x-clip bg-background text-foreground">
      <Header />
      <main>
        <CourseWorkspaceClient
          initialDetail={payload.detail}
          initialInternshipTrack={payload.internshipTrack}
          initialInternshipApplication={payload.internshipApplication}
          initialIssuedCertificate={payload.issuedCertificate}
          initialProgression={payload.progression}
          initialEnrolledAt={payload.enrolledAt}
          initialCompletedOn={payload.completedOn}
          initialClaimedAt={payload.claimedAt}
          initialProjectSubmissions={payload.projectSubmissions}
          user={actor.user}
          isSandbox={!configured}
        />
      </main>
    </div>
  );
}
