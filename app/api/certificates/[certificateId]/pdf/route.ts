import { NextResponse } from "next/server";
import { generateCertificatePdf } from "@/lib/certifications/pdf";
import { getCertificatePdfData } from "@/lib/certifications/store";

export async function GET(
  _request: Request,
  context: { params: Promise<{ certificateId: string }> },
) {
  const { certificateId } = await context.params;
  const data = await getCertificatePdfData(decodeURIComponent(certificateId));
  if (!data) {
    return NextResponse.json({ error: "Issued certificate not found." }, { status: 404 });
  }

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
