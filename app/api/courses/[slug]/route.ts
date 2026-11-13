import { NextResponse } from "next/server";
import { resolveCurrentActor } from "@/lib/certifications/store";
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
    return NextResponse.json({ error: "Course not found." }, { status: 404 });
  }

  return NextResponse.json(detail, {
    headers: { "Cache-Control": "no-store" },
  });
}
