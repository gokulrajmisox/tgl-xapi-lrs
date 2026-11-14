import { NextResponse } from "next/server";
import {
  listInternships,
  listIssuances,
  listStudentApplications,
  resolveCurrentActor,
} from "@/lib/certifications/store";
import { getCourseDetailForActor } from "@/lib/courses/store";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const actor = await resolveCurrentActor();
  const detail = await getCourseDetailForActor({
    slug,
    userId: actor.user?.id ?? null,
    bypassLockForAdmin: actor.user?.role === "admin",
  });

  if (!detail) {
    return NextResponse.json({ error: "Programme not found." }, { status: 404 });
  }

  const [internships, applications, issuances] = await Promise.all([
    listInternships(),
    actor.user ? listStudentApplications(actor.user.id) : Promise.resolve([]),
    actor.user ? listIssuances(actor.user.id) : Promise.resolve([]),
  ]);

  const internshipTrack =
    internships.find((i) => i.slug === detail.course.linkedInternshipSlug) ?? null;
  const internshipApplication =
    internshipTrack
      ? applications.find((a) => a.internship_id === internshipTrack.id) ?? null
      : null;
  const issuedCertificate =
    internshipApplication
      ? issuances.find(
          (i) =>
            i.internship_application_id === internshipApplication.id &&
            i.issuance_status !== "revoked",
        ) ?? null
      : null;

  return NextResponse.json(
    {
      ...detail,
      internshipTrack,
      internshipApplication,
      issuedCertificate,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
