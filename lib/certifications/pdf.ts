import { PDFDocument, StandardFonts, rgb, type PDFPage, type PDFFont } from "pdf-lib";

export type CertificatePdfData = {
  certificateId: string;
  studentName: string;
  programmeName: string;
  joinedOn: string;
  completedOn: string;
  issuedOn: string;
  authorizedSignatory: string;
  organization?: string;
};

const NAVY = rgb(0.03, 0.15, 0.42);
const BLUE = rgb(0.02, 0.19, 0.52);
const YELLOW = rgb(1, 0.73, 0.02);
const PALE_BLUE = rgb(0.89, 0.91, 0.98);
const GREY = rgb(0.35, 0.39, 0.48);
const WHITE = rgb(1, 1, 1);

function fitText(text: string, font: PDFFont, maxWidth: number, size: number): number {
  if (font.widthOfTextAtSize(text, size) <= maxWidth) return size;
  return Math.max(12, (maxWidth / font.widthOfTextAtSize(text, size)) * size);
}

function centered(page: PDFPage, text: string, font: PDFFont, size: number, y: number, color = NAVY) {
  const width = page.getWidth();
  const textWidth = font.widthOfTextAtSize(text, size);
  page.drawText(text, { x: (width - textWidth) / 2, y, size, font, color });
}

function formatDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase();
}

function drawReferenceFrame(page: PDFPage) {
  const { width, height } = page.getSize();
  page.drawRectangle({ x: 0, y: 0, width, height, color: WHITE });

  // The reference uses bold blue corner fields with yellow inset accents.
  page.drawRectangle({ x: 0, y: height - 74, width: 180, height: 74, color: BLUE });
  page.drawRectangle({ x: 0, y: height - 95, width: 214, height: 21, color: YELLOW });
  page.drawLine({ start: { x: 0, y: height - 95 }, end: { x: 214, y: height }, thickness: 26, color: YELLOW });
  page.drawRectangle({ x: width - 180, y: height - 74, width: 180, height: 74, color: YELLOW });
  page.drawRectangle({ x: width - 214, y: height - 95, width: 214, height: 21, color: BLUE });
  page.drawLine({ start: { x: width, y: height - 95 }, end: { x: width - 214, y: height }, thickness: 26, color: BLUE });
  page.drawRectangle({ x: 0, y: 0, width: 250, height: 25, color: BLUE });
  page.drawRectangle({ x: 0, y: 25, width: 270, height: 8, color: YELLOW });
  page.drawLine({ start: { x: 0, y: 33 }, end: { x: 270, y: 0 }, thickness: 6, color: YELLOW });
  page.drawRectangle({ x: width - 250, y: 0, width: 250, height: 25, color: YELLOW });
  page.drawRectangle({ x: width - 270, y: 25, width: 270, height: 8, color: BLUE });
  page.drawLine({ start: { x: width, y: 33 }, end: { x: width - 270, y: 0 }, thickness: 6, color: BLUE });
}

export async function generateCertificatePdf(data: CertificatePdfData): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([841.89, 595.28]);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const italic = await pdf.embedFont(StandardFonts.HelveticaOblique);
  const { width } = page.getSize();

  drawReferenceFrame(page);

  centered(page, "TGL.", bold, 52, 508, NAVY);
  centered(page, "Learn  •  Build  •  Grow", regular, 19, 480, GREY);

  const titleSize = fitText("CERTIFICATE OF COMPLETION", bold, 640, 41);
  centered(page, "CERTIFICATE OF COMPLETION", bold, titleSize, 405, BLUE);
  page.drawLine({ start: { x: 190, y: 382 }, end: { x: 375, y: 382 }, thickness: 1.4, color: GREY });
  page.drawLine({ start: { x: 466, y: 382 }, end: { x: 651, y: 382 }, thickness: 1.4, color: GREY });
  page.drawSvgPath("M 420 382 L 432 394 L 444 382 L 432 370 Z", { color: YELLOW });

  centered(page, "This certificate is presented to", regular, 23, 345, NAVY);
  page.drawLine({ start: { x: 112, y: 286 }, end: { x: 730, y: 286 }, thickness: 2.2, color: BLUE });
  const studentSize = fitText(data.studentName, bold, 570, 34);
  centered(page, data.studentName, bold, studentSize, 300, NAVY);

  centered(page, "for successfully completing the", regular, 22, 244, NAVY);
  const programmeSize = fitText(data.programmeName, bold, 590, 26);
  centered(page, data.programmeName, bold, programmeSize, 211, BLUE);

  page.drawLine({ start: { x: 420, y: 120 }, end: { x: 420, y: 188 }, thickness: 1, color: GREY });
  const dateY = 138;
  const capsuleWidth = 190;
  for (const x of [130, 522]) {
    page.drawRectangle({ x, y: dateY - 8, width: capsuleWidth, height: 32, color: PALE_BLUE, borderColor: PALE_BLUE, borderWidth: 1 });
  }
  centeredIn(page, "Joined On", bold, 18, 225, 174, NAVY);
  centeredIn(page, formatDate(data.joinedOn), regular, 16, 225, 147, NAVY);
  centeredIn(page, "Completed On", bold, 18, 617, 174, NAVY);
  centeredIn(page, formatDate(data.completedOn), regular, 16, 617, 147, NAVY);

  page.drawLine({ start: { x: 340, y: 84 }, end: { x: 502, y: 84 }, thickness: 1.1, color: NAVY });
  centered(page, data.authorizedSignatory, italic, 22, 94, rgb(0.04, 0.04, 0.04));
  centered(page, "Authorized Signatory", bold, 15, 61, NAVY);
  centered(page, data.organization ?? "TGL Learning Portal", regular, 14, 42, NAVY);

  page.drawText(`Certificate ID: ${data.certificateId}`, { x: 18, y: 38, size: 11, font: regular, color: NAVY });
  page.drawText("|", { x: 182, y: 38, size: 11, font: bold, color: YELLOW });
  page.drawText(`Issued on: ${formatDate(data.issuedOn)}`, { x: 198, y: 38, size: 11, font: regular, color: NAVY });

  return pdf.save();
}

function centeredIn(page: PDFPage, text: string, font: PDFFont, size: number, centerX: number, y: number, color = NAVY) {
  page.drawText(text, { x: centerX - font.widthOfTextAtSize(text, size) / 2, y, size, font, color });
}
