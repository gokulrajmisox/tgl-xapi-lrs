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
import { DEMO_STUDENT_ID, resolveCurrentActor } from "@/lib/certifications/store";

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
  const actorId = user?.id ?? DEMO_STUDENT_ID;
  const workspace = getLearnerSnapshot(actorId);

  const relatedConcepts = project.relatedConceptIds
    .map((id) => findNodeById(id))
    .filter((node): node is LearningNode => Boolean(node));

  const relatedProjects = project.relatedProjectSlugs
    .map((s) => findProjectBySlug(s))
    .filter((p): p is ProjectBrief => Boolean(p));

  const projectSubmissions = workspace.submissions.filter(
    (s) => s.projectSlug === project.slug,
  );
  const projectMessages = workspace.messages.filter(
    (m) => m.projectSlug === project.slug,
  );

  return (
    <RoleShell
      role="student"
      title={project.title}
      subtitle={`${project.category} · ${project.cohortName} · Mentor: ${project.mentorName}`}
      primaryAction={{ label: "Portfolio & evidence", href: "/learn/portfolio" }}
    >
      <ProjectWorkspaceClient
        project={project}
        relatedConcepts={relatedConcepts}
        relatedProjects={relatedProjects}
        initialSubmissions={projectSubmissions}
        initialMessages={projectMessages}
        initiallySaved={workspace.savedItems.includes(`project:${project.slug}`)}
      />
    </RoleShell>
  );
}
