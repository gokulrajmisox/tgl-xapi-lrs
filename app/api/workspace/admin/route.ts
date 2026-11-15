import { NextResponse } from "next/server";
import { z } from "zod";
import { isPrivilegedStaffEmail } from "@/lib/auth/access";
import { isSupabaseConfigured, resolveCurrentActor, getMemoryStore } from "@/lib/certifications/store";
import { enrichedPathways, learningNodes, learningProjects } from "@/lib/learning-graph";
import { addAdminCohort, getMentorConsoleData } from "@/lib/learning-workspace-store";

const CohortSchema = z.object({
  name: z.string().trim().min(3).max(120),
  pathwaySlug: z.string().trim().min(2).max(100),
  mentorName: z.string().trim().min(2).max(80),
  mentorEmail: z.string().email(),
});

async function requireAdmin() {
  const configured = isSupabaseConfigured();
  const { user } = await resolveCurrentActor({ allowSandboxAdmin: !configured });
  if (configured && !user) {
    return { allowed: false, status: 401, error: "Sign in required." };
  }
  if (configured && (!user || user.role !== "admin" || !isPrivilegedStaffEmail(user.email))) {
    return { allowed: false, status: 403, error: "Administrator access required." };
  }
  return { allowed: true, user };
}

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.allowed) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const mentorData = getMentorConsoleData();
  const certStore = getMemoryStore();

  return NextResponse.json({
    cohorts: mentorData.cohorts,
    learners: mentorData.learners,
    contentSummary: {
      pathwayCount: enrichedPathways.length,
      nodeCount: learningNodes.length,
      projectCount: learningProjects.length,
      internshipCount: certStore.internships.length,
    },
    users: [
      { id: "00000000-0000-4000-8000-000000000101", name: "Aarav Sharma", email: "aarav.sharma@example.edu", role: "student", cohort: "Autumn Engineering Cohort" },
      { id: "00000000-0000-4000-8000-000000000102", name: "Meera Krishnan", email: "meera.krishnan@example.edu", role: "student", cohort: "Autumn Engineering Cohort" },
      { id: "00000000-0000-4000-8000-000000000103", name: "Diya Nair", email: "diya.nair@example.edu", role: "student", cohort: "Product Craft Cohort" },
      { id: "mentor-kabir", name: "Kabir Malhotra", email: "kabir.mentor@touchgrasslater.org", role: "mentor", cohort: "Autumn Engineering Cohort" },
      { id: "mentor-nisha", name: "Dr. Nisha Menon", email: "nisha.mentor@touchgrasslater.org", role: "mentor", cohort: "Applied AI Studio" },
      { id: "00000000-0000-4000-8000-000000000001", name: "TGL Operations Admin", email: "admin@touchgrasslater.org", role: "admin", cohort: "All Cohorts" },
    ],
  });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.allowed) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
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
