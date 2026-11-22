import { NextResponse } from "next/server";
import { z } from "zod";
import {
  listAdminDirectoryUsers,
  listInternships,
  requireAdminActor,
} from "@/lib/certifications/store";
import { enrichedPathways, learningNodes, learningProjects } from "@/lib/learning-graph";
import {
  addAdminCohort,
  getMentorConsoleDataAsync,
} from "@/lib/learning-workspace-store";

const CohortSchema = z.object({
  name: z.string().trim().min(3).max(120),
  pathwaySlug: z.string().trim().min(2).max(100),
  mentorName: z.string().trim().min(2).max(80),
  mentorEmail: z.string().email(),
});

export async function GET() {
  const auth = await requireAdminActor();
  if (auth.error) {
    return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });
  }

  const [mentorData, internships, users] = await Promise.all([
    getMentorConsoleDataAsync(),
    listInternships(),
    listAdminDirectoryUsers(),
  ]);

  return NextResponse.json({
    cohorts: mentorData.cohorts,
    learners: mentorData.learners,
    submissions: mentorData.submissions,
    messages: mentorData.messages,
    contentSummary: {
      pathwayCount: enrichedPathways.length,
      nodeCount: learningNodes.length,
      projectCount: learningProjects.length,
      internshipCount: internships.length,
    },
    users,
  });
}

export async function POST(request: Request) {
  const auth = await requireAdminActor();
  if (auth.error) {
    return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });
  }

  const parsed = CohortSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid cohort payload." },
      { status: 400 },
    );
  }

  const cohort = addAdminCohort(parsed.data);
  return NextResponse.json({ cohort }, { status: 201 });
}
