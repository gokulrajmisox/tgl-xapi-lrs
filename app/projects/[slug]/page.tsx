import { notFound } from "next/navigation";
import { RoleShell } from "@/components/role-shell";
import { ProjectWorkspaceClient } from "@/components/project-workspace-client";
import {
  findNodeById,
  findProjectBySlug,
  type LearningNode,
  type ProjectBrief,
} from "@/lib/learning-graph";
import { getLearnerSnapshot } from "@/lib/learning-workspace-store";
import { resolveCurrentActor } from "@/lib/certifications/store";
import {
  getCourseDetailForActor,
  listAllCoursesRaw,
} from "@/lib/courses/store";
import { canAccessCourseProject } from "@/lib/learning/progression";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = findProjectBySlug(slug);
  return {
    title: project
      ? `${project.title} — Touch Grass Later`
      : "Project Workspace — Touch Grass Later",
    description:
      project?.summary ??
      "Project brief, deliverables, submissions, peer showcase, and mentor review thread.",
  };
}

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = findProjectBySlug(slug);
  if (!project) notFound();

  const { user } = await resolveCurrentActor();
  const actorId = user?.id ?? null;
  const workspace = actorId ? getLearnerSnapshot(actorId) : null;

  const allCourses = await listAllCoursesRaw(true);
  const linkedCourse = allCourses.find(
    (c) => c.project.slug === project.slug,
  );
  let accessAllowed = true;
  let accessLockReason: string | null = null;
  if (linkedCourse && user?.role !== "admin") {
    const courseDetail = await getCourseDetailForActor({
      slug: linkedCourse.slug,
      userId: actorId,
      bypassLockForAdmin: false,
    });
    if (!courseDetail || courseDetail.locked) {
      accessAllowed = false;
      accessLockReason =
        "Enrol in this programme first, complete the modules, and pass the graded quiz to unlock this project.";
    } else {
      const gate = canAccessCourseProject({
        enrolled: true,
        completedLessonCount: courseDetail.course.completedLessonCount,
        totalLessonCount: courseDetail.course.lessonCount,
        quizPassed: courseDetail.course.quizPassed,
      });
      accessAllowed = gate.allowed;
      accessLockReason = gate.reason;
    }
  }

  const relatedConcepts = project.relatedConceptIds
    .map((id) => findNodeById(id))
    .filter((node): node is LearningNode => Boolean(node));

  const relatedProjects = project.relatedProjectSlugs
    .map((s) => findProjectBySlug(s))
    .filter((p): p is ProjectBrief => Boolean(p));

  const projectSubmissions =
    workspace?.submissions.filter((s) => s.projectSlug === project.slug) ?? [];
  const projectMessages =
    workspace?.messages.filter((m) => m.projectSlug === project.slug) ?? [];

  return (
    <RoleShell
      role="student"
      title={project.title}
      subtitle={`${project.category} · ${project.cohortName} · Mentor: ${project.mentorName}`}
      primaryAction={
        linkedCourse
          ? { label: "Open Unified Workspace", href: `/programmes/${linkedCourse.slug}` }
          : { label: "My Learning", href: "/learn" }
      }
    >
      <ProjectWorkspaceClient
        project={project}
        linkedCourseSlug={linkedCourse?.slug ?? null}
        linkedCourseTitle={linkedCourse?.title ?? null}
        accessAllowed={accessAllowed}
        accessLockReason={accessLockReason}
        relatedConcepts={relatedConcepts}
        relatedProjects={relatedProjects}
        initialSubmissions={projectSubmissions}
        initialMessages={projectMessages}
        initiallySaved={workspace?.savedItems.includes(`project:${project.slug}`) ?? false}
      />
    </RoleShell>
  );
}
