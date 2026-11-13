import { RoleShell } from "@/components/role-shell";
import { ExploreNetwork } from "@/components/explore-network";
import { enrichedPathways, learningNodes, learningProjects } from "@/lib/learning-graph";
import { getLearnerSnapshot } from "@/lib/learning-workspace-store";
import { DEMO_STUDENT_ID, resolveCurrentActor } from "@/lib/certifications/store";

export const metadata = {
  title: "Explore Pathways, Projects & Concepts — Touch Grass Later",
  description:
    "Searchable non-linear network of learning pathways, applied projects, concepts, and mentor touchpoints.",
};

export default async function ExplorePage() {
  const { user } = await resolveCurrentActor();
  const actorId = user?.id ?? DEMO_STUDENT_ID;
  const workspace = getLearnerSnapshot(actorId);

  return (
    <RoleShell
      role="student"
      title="Explore the network"
      subtitle="Search pathways, projects, and concepts — enter at any node without linear lock-in"
      primaryAction={{ label: "Personal learning map", href: "/learn/map" }}
    >
      <ExploreNetwork
        pathways={enrichedPathways}
        projects={learningProjects}
        nodes={learningNodes}
        initialSavedItems={workspace.savedItems}
      />
    </RoleShell>
  );
}
