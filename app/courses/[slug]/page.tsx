import { notFound } from "next/navigation";
import { Header } from "@/components/header";
import { CourseWorkspaceClient } from "@/components/course-workspace-client";
import { isSupabaseConfigured, resolveCurrentActor } from "@/lib/certifications/store";
import { getCourseDetailForActor } from "@/lib/courses/store";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const detail = await getCourseDetailForActor({ slug });
  if (!detail) {
    return { title: "Course Not Found — Touch Grass Later" };
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

  return (
    <div className="min-h-screen bg-[#090909]">
      <Header />
      <main>
        <CourseWorkspaceClient
          initialDetail={detail}
          user={actor.user}
          isSandbox={!configured}
        />
      </main>
    </div>
  );
}
