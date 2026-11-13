import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, FolderGit2, Users } from "lucide-react";
import { RoleShell } from "@/components/role-shell";
import { PathwayMapExplorer } from "@/components/pathway-map-explorer";
import {
  enrichedPathways,
  findPathwayByParam,
  getNodesForPathway,
  getProjectsForPathway,
  learningNodes,
  learningProjects,
} from "@/lib/learning-graph";
import { getLearnerSnapshot } from "@/lib/learning-workspace-store";
import { DEMO_STUDENT_ID, resolveCurrentActor } from "@/lib/certifications/store";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const pathway = findPathwayByParam(slug);
  return {
    title: pathway
      ? `${pathway.title} Map — Touch Grass Later`
      : "Pathway Map — Touch Grass Later",
    description:
      pathway?.description ??
      "Interactive non-linear learning map with concepts, applied projects, and mentor touchpoints.",
  };
}

export default async function PathwayMapPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const pathway = findPathwayByParam(slug);
  if (!pathway) notFound();

  const { user } = await resolveCurrentActor();
  const actorId = user?.id ?? DEMO_STUDENT_ID;
  const workspace = getLearnerSnapshot(actorId);

  const pathwayNodes = getNodesForPathway(pathway.slug);
  const pathwayProjects = getProjectsForPathway(pathway.slug);

  return (
    <RoleShell
      role="student"
      title={`${pathway.title} map`}
      subtitle={`${pathway.category} · Mentor: ${pathway.mentorName} (${pathway.cohortName})`}
      primaryAction={
        pathwayProjects[0]
          ? { label: "Open pathway project", href: `/projects/${pathwayProjects[0].slug}` }
          : { label: "Explore all pathways", href: "/explore" }
      }
    >
      <div className="space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/explore"
            className="inline-flex items-center gap-2 text-xs text-white/55 hover:text-white"
          >
            <ArrowLeft size={13} aria-hidden="true" /> Back to explore network
          </Link>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {enrichedPathways.slice(0, 5).map((item) => (
              <Link
                key={item.slug}
                href={`/pathways/${item.slug}`}
                className={`rounded-full px-3 py-1.5 transition-colors whitespace-nowrap shrink-0 ${
                  item.slug === pathway.slug
                    ? "bg-[#b9a9d6] font-medium text-[#111111]"
                    : "border border-white/10 text-white/55 hover:border-white/30 hover:text-white"
                }`}
              >
                {item.title}
              </Link>
            ))}
          </div>
        </div>

        <section className="grid gap-6 rounded-2xl border border-white/10 bg-[#111111] p-6 lg:grid-cols-[1.3fr_.7fr]">
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-[#b9a9d6]">
              Pathway {pathway.number} · {pathway.category}
            </p>
            <h2 className="mt-2 text-2xl font-medium tracking-[-0.04em] text-[#f4f3ef]">
              {pathway.title}
            </h2>
            <p className="mt-2 max-w-2xl text-xs leading-6 text-white/60">
              {pathway.description}
            </p>
          </div>
          <div className="flex flex-col justify-between rounded-xl border border-white/10 bg-black/25 p-4 text-xs">
            <div>
              <p className="text-[11px] uppercase tracking-[0.14em] text-white/45">
                Cohort &amp; mentor guidance
              </p>
              <p className="mt-1.5 font-medium text-[#f4f3ef]">{pathway.mentorName}</p>
              <p className="text-white/50">
                {pathway.mentorRole} · {pathway.cohortName}
              </p>
            </div>
            <p className="mt-3 text-[11px] text-white/45">
              Core focus: {pathway.skills.join(" · ")}
            </p>
          </div>
        </section>

        <PathwayMapExplorer
          nodes={pathwayNodes}
          allNodes={learningNodes}
          projects={learningProjects}
          initialNodeStates={workspace.nodeStates}
          initialSavedItems={workspace.savedItems}
          heading="Connected concepts, projects & mentor touchpoints"
          subheading="Select any node to mark progress, jump into a linked project brief, traverse adjacent pathways, or message your mentor."
        />

        {/* Applied Projects & Peer Work in this Pathway */}
        {pathwayProjects.length > 0 && (
          <section className="space-y-4">
            <h2 className="flex items-center gap-2 text-base font-medium">
              <FolderGit2 size={16} className="text-[#b9a9d6]" aria-hidden="true" />
              <span>Applied projects &amp; peer showcase</span>
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              {pathwayProjects.map((project) => (
                <article
                  key={project.slug}
                  className="flex flex-col justify-between rounded-2xl border border-white/10 bg-[#111111] p-6"
                >
                  <div>
                    <p className="text-[11px] text-white/45">
                      {project.difficulty} · {project.estimatedHours} hours
                    </p>
                    <h3 className="mt-2 text-lg font-medium tracking-[-0.03em] text-[#f4f3ef]">
                      {project.title}
                    </h3>
                    <p className="mt-2 text-xs leading-5 text-white/55">{project.summary}</p>
                    {project.peerWork.length > 0 && (
                      <div className="mt-4 rounded-xl border border-white/10 bg-black/25 p-3.5 text-xs">
                        <p className="flex items-center gap-1.5 text-[11px] font-medium text-[#b9a9d6]">
                          <Users size={12} aria-hidden="true" /> Peer example ·{" "}
                          {project.peerWork[0].learnerName}
                        </p>
                        <p className="mt-1 text-white/60">{project.peerWork[0].summary}</p>
                      </div>
                    )}
                  </div>
                  <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4 text-xs">
                    <span className="text-white/45">Mentor: {project.mentorName}</span>
                    <Link
                      href={`/projects/${project.slug}`}
                      className="inline-flex items-center gap-1.5 font-medium text-[#f4f3ef] hover:text-[#b9a9d6]"
                    >
                      Open project brief <ArrowUpRight size={13} aria-hidden="true" />
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
      </div>
    </RoleShell>
  );
}
