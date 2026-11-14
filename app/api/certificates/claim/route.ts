import { NextResponse } from "next/server";
import { z } from "zod";
import {
  claimIncludedCertificate,
  resolveCurrentActor,
} from "@/lib/certifications/store";

const ClaimSchema = z.object({
  internshipApplicationId: z.string().uuid().optional().nullable(),
});

export async function POST(request: Request) {
  const actor = await resolveCurrentActor();
  if (!actor.user) {
    return NextResponse.json({ error: "Sign in required to claim certificate." }, { status: 401 });
  }

  const parsed = ClaimSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid certificate claim request." }, { status: 400 });
  }

  const result = await claimIncludedCertificate({
    user: actor.user,
    internshipApplicationId: parsed.data.internshipApplicationId ?? null,
  });

  if (result.error || !result.issuance) {
    return NextResponse.json(
      { error: result.error ?? "Unable to issue included certificate." },
      { status: result.status ?? 400 },
    );
  }

  return NextResponse.json(
    { issuance: result.issuance },
    { status: 201, headers: { "Cache-Control": "no-store" } },
  );
}
