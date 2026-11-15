import { NextResponse } from "next/server";
import { resolveCurrentActor } from "@/lib/certifications/store";
import { buildProgrammeWorkspacePayload } from "@/lib/learning/course-workspace";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const actor = await resolveCurrentActor();
  const payload = await buildProgrammeWorkspacePayload({
    slug,
    user: actor.user,
  });

  if (!payload) {
    return NextResponse.json({ error: "Programme not found." }, { status: 404 });
  }

  return NextResponse.json(
    {
      ...payload.detail,
      internshipTrack: payload.internshipTrack,
      internshipApplication: payload.internshipApplication,
      issuedCertificate: payload.issuedCertificate,
      progression: payload.progression,
      enrolledAt: payload.enrolledAt,
      completedOn: payload.completedOn,
      claimedAt: payload.claimedAt,
      projectSubmissions: payload.projectSubmissions,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
