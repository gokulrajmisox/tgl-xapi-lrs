import { NextResponse } from "next/server";
import { getCertificateByPublicId } from "@/lib/certifications/store";
import { generateCertificateQrSvg } from "@/lib/certifications/qr";
import { CERTIFICATE_TYPE_LABELS, type CertificateType } from "@/lib/certifications/pricing";

export async function GET(
  request: Request,
  context: { params: Promise<{ certificateId: string }> },
) {
  const { certificateId } = await context.params;
  const cert = await getCertificateByPublicId(decodeURIComponent(certificateId));

  if (!cert) {
    return NextResponse.json(
      { authentic: false, status: "not_found", error: "Certificate ID not found." },
      { status: 404, headers: { "Cache-Control": "no-store" } },
    );
  }

  const origin = new URL(request.url).origin;
  const verificationUrl = `${origin}/verify/certificate/${encodeURIComponent(cert.certificate_id)}`;
  const qrSvg = await generateCertificateQrSvg(verificationUrl);
  const authentic = cert.issuance_status === "issued";

  return NextResponse.json(
    {
      authentic,
      status: cert.issuance_status,
      certificate: {
        certificateId: cert.certificate_id,
        recipientName: cert.recipient_name,
        certificateTitle:
          CERTIFICATE_TYPE_LABELS[cert.certificate_type as CertificateType] ?? cert.certificate_type,
        achievementTitle: cert.achievement_title,
        organization: "Touch Grass Later",
        issuedAt: cert.issued_at,
        revokedAt: cert.revoked_at,
        revocationReason: cert.revocation_reason,
        verificationUrl,
      },
      qrSvg,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
