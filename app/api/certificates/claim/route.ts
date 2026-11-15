import { NextResponse } from "next/server";
import { z } from "zod";
import {
  claimIncludedCertificate,
  getCertificateByPublicId,
  markCertificateClaimed,
  resolveCurrentActor,
} from "@/lib/certifications/store";

const ClaimSchema = z.object({
  internshipApplicationId: z.string().uuid().optional().nullable(),
  confirmCertificateId: z.string().trim().min(4).max(120).optional(),
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

  if (parsed.data.confirmCertificateId) {
    const cert = await getCertificateByPublicId(parsed.data.confirmCertificateId);
    if (!cert || (cert.user_id !== actor.user.id && actor.user.role !== "admin")) {
      return NextResponse.json({ error: "Issued certificate not found." }, { status: 404 });
    }
    if (cert.issuance_status !== "issued") {
      return NextResponse.json({ error: "Certificate is not issued." }, { status: 403 });
    }
    const claimedAt = markCertificateClaimed(cert.certificate_id);
    return NextResponse.json(
      { issuance: cert, claimedAt },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
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

  const claimedAt = markCertificateClaimed(result.issuance.certificate_id);

  return NextResponse.json(
    { issuance: result.issuance, claimedAt },
    { status: 201, headers: { "Cache-Control": "no-store" } },
  );
}
