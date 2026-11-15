import { NextResponse } from "next/server";
import { generateCertificatePdf } from "@/lib/certifications/pdf";
import {
  getCertificatePdfData,
  markCertificateClaimed,
} from "@/lib/certifications/store";

export async function GET(
  _request: Request,
  context: { params: Promise<{ certificateId: string }> },
) {
  const { certificateId } = await context.params;
  const decodedId = decodeURIComponent(certificateId);
  const data = await getCertificatePdfData(decodedId);
  if (!data) {
    return NextResponse.json({ error: "Issued certificate not found." }, { status: 404 });
  }

  markCertificateClaimed(data.certificateId);
  const pdf = await generateCertificatePdf(data);
  return new NextResponse(Buffer.from(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${data.certificateId}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
