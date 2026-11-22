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
import { resolveCurrentActor } from "@/lib/certifications/store";

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
  const workspace = user ? getLearnerSnapshot(user.id) : null;

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
            className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft size={13} aria-hidden="true" /> Back to explore network
          </Link>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {enrichedPathways.slice(0, 5).map((item) => (
              <Link
                key={item.slug}
                href={`/pathways/${item.slug}`}
                className={`shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 transition-colors ${
                  item.slug === pathway.slug
                    ? "bg-primary font-medium text-primary-foreground"
                    : "border border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                }`}
              >
                {item.title}
              </Link>
            ))}
          </div>
        </div>

        <section className="tgl-glass grid gap-6 rounded-2xl p-6 lg:grid-cols-[1.3fr_.7fr]">
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--accent)]">
              Pathway {pathway.number} · {pathway.category}
            </p>
            <h2 className="mt-2 text-2xl font-medium tracking-[-0.04em] text-foreground">
              {pathway.title}
            </h2>
            <p className="mt-2 max-w-2xl text-xs leading-6 text-muted-foreground">
              {pathway.description}
            </p>
          </div>
          <div className="tgl-subsurface flex flex-col justify-between rounded-xl p-4 text-xs">
            <div>
              <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                Cohort &amp; mentor guidance
              </p>
              <p className="mt-1.5 font-medium text-foreground">{pathway.mentorName}</p>
              <p className="text-muted-foreground">
                {pathway.mentorRole} · {pathway.cohortName}
              </p>
            </div>
            <p className="mt-3 text-[11px] text-muted-foreground">
              Core focus: {pathway.skills.join(" · ")}
            </p>
          </div>
        </section>

        <PathwayMapExplorer
          nodes={pathwayNodes}
          allNodes={learningNodes}
          projects={learningProjects}
          initialNodeStates={workspace?.nodeStates ?? {}}
          initialSavedItems={workspace?.savedItems ?? []}
          heading="Connected concepts, projects & mentor touchpoints"
          subheading="Select any node to mark progress, jump into a linked project brief, traverse adjacent pathways, or message your mentor."
        />

        {/* Applied Projects & Peer Work in this Pathway */}
        {pathwayProjects.length > 0 && (
          <section className="space-y-4">
            <h2 className="flex items-center gap-2 text-base font-medium text-foreground">
              <FolderGit2 size={16} className="text-[var(--accent)]" aria-hidden="true" />
              <span>Applied projects &amp; peer showcase</span>
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              {pathwayProjects.map((project) => (
                <article
                  key={project.slug}
                  className="tgl-glass flex flex-col justify-between rounded-2xl p-6"
                >
                  <div>
                    <p className="text-[11px] text-muted-foreground">
                      {project.difficulty} · {project.estimatedHours} hours
                    </p>
                    <h3 className="mt-2 text-lg font-medium tracking-[-0.03em] text-foreground">
                      {project.title}
                    </h3>
                    <p className="mt-2 text-xs leading-5 text-muted-foreground">{project.summary}</p>
                    {project.peerWork.length > 0 && (
                      <div className="tgl-subsurface mt-4 rounded-xl p-3.5 text-xs">
                        <p className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--accent)]">
                          <Users size={12} aria-hidden="true" /> Peer example ·{" "}
                          {project.peerWork[0].learnerName}
                        </p>
                        <p className="mt-1 text-muted-foreground">{project.peerWork[0].summary}</p>
                      </div>
                    )}
                  </div>
                  <div className="mt-5 flex items-center justify-between border-t border-border pt-4 text-xs">
                    <span className="text-muted-foreground">Mentor: {project.mentorName}</span>
                    <Link
                      href={`/projects/${project.slug}`}
                      className="inline-flex items-center gap-1.5 font-medium text-foreground hover:text-[var(--accent)]"
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
