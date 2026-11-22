import { redirect } from "next/navigation";
import { RoleShell } from "@/components/role-shell";
import { PathwayMapExplorer } from "@/components/pathway-map-explorer";
import { learningNodes, learningProjects } from "@/lib/learning-graph";
import { getLearnerSnapshot } from "@/lib/learning-workspace-store";
import {
  DEMO_STUDENT_ID,
  resolveCurrentActor,
} from "@/lib/certifications/store";

export const metadata = {
  title: "Personal Learning Map — Touch Grass Later",
  description:
    "View completed, active, and suggested nodes across all connected pathways.",
};

export default async function PersonalLearningMapPage() {
  const { user, configured } = await resolveCurrentActor();

  if (configured && !user) {
    redirect("/auth/login?next=/learn/map");
  }

  const actorId = user?.id ?? DEMO_STUDENT_ID;
  const workspace = getLearnerSnapshot(actorId);

  return (
    <RoleShell
      role="student"
      title="Personal learning map"
      subtitle="Jump between concepts, projects, and mentor touchpoints in any order"
      primaryAction={{ label: "Portfolio & certificates", href: "/learn/portfolio" }}
    >
      <PathwayMapExplorer
        nodes={learningNodes}
        allNodes={learningNodes}
        projects={learningProjects}
        initialNodeStates={workspace.nodeStates}
        initialSavedItems={workspace.savedItems}
        heading="All connected concepts & projects"
        subheading="Filter by completed, active, or suggested nodes. Switch anytime between Spatial map and Accessible list."
      />
    </RoleShell>
  );
}
