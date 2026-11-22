import { NextResponse } from "next/server";
import {
  listAdminDirectoryUsers,
  listAllApplicationsForAdmin,
  listIssuances,
  listOrders,
  listPayments,
  requireAdminActor,
} from "@/lib/certifications/store";
import { listAllCoursesRaw } from "@/lib/courses/store";
import { getMentorConsoleDataAsync } from "@/lib/learning-workspace-store";

function csvEscape(value: string | number | null | undefined): string {
  const str = String(value ?? "");
  if (/[",\r\n]/.test(str)) {
    return `"${str.replaceAll('"', '""')}"`;
  }
  return str;
}

export async function GET(request: Request) {
  const auth = await requireAdminActor(request);
  if (auth.error) {
    return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });
  }

  const url = new URL(request.url);
  const format = url.searchParams.get("format");

  const [courses, orders, payments, issuances, applications, users, mentorData] =
    await Promise.all([
      listAllCoursesRaw(true),
      listOrders(),
      listPayments(),
      listIssuances(),
      listAllApplicationsForAdmin(),
      listAdminDirectoryUsers(),
      getMentorConsoleDataAsync(),
    ]);

  const paidOrders = orders.filter((o) => o.order_status === "paid");
  const grossRevenuePaise = paidOrders.reduce((acc, o) => acc + o.amount_paise, 0);
  const refundedPayments = payments.filter((p) => p.payment_status === "refunded");
  const activeCertificates = issuances.filter((i) => i.issuance_status === "issued");
  const revokedCertificates = issuances.filter((i) => i.issuance_status === "revoked");
  const approvedSubmissions = mentorData.submissions.filter((s) => s.status === "approved");
  const completedApplications = applications.filter((a) => a.status === "completed");

  const summary = {
    generatedAt: new Date().toISOString(),
    totalProgrammes: courses.length,
    publishedProgrammes: courses.filter((c) => c.isPublished).length,
    directoryUsers: users.length,
    paidOrdersCount: paidOrders.length,
    grossRevenueInr: Math.round(grossRevenuePaise / 100),
    refundedCount: refundedPayments.length,
    totalSubmissions: mentorData.submissions.length,
    approvedSubmissions: approvedSubmissions.length,
    internshipApplications: applications.length,
    completedInternships: completedApplications.length,
    issuedCertificates: activeCertificates.length,
    revokedCertificates: revokedCertificates.length,
  };

  if (format === "csv") {
    const lines: string[] = [
      "Section,ID,Label,Recipient/Owner,Status,Amount_INR,Timestamp",
      ...orders.map((o) =>
        [
          "Order",
          o.razorpay_order_id,
          String(o.metadata?.programmeTitle ?? o.metadata?.courseTitle ?? o.order_kind ?? "Programme"),
          o.user_id,
          o.order_status,
          Math.round(o.amount_paise / 100),
          o.created_at,
        ]
          .map(csvEscape)
          .join(","),
      ),
      ...issuances.map((c) =>
        [
          "Certificate",
          c.certificate_id,
          c.achievement_title,
          `${c.recipient_name} <${c.recipient_email}>`,
          c.issuance_status,
          0,
          c.issued_at ?? c.created_at,
        ]
          .map(csvEscape)
          .join(","),
      ),
      ...mentorData.submissions.map((s) =>
        [
          "ProjectSubmission",
          s.id,
          s.projectTitle,
          `${s.learnerName} <${s.learnerEmail}>`,
          s.status,
          "",
          s.submittedAt,
        ]
          .map(csvEscape)
          .join(","),
      ),
    ];

    return new NextResponse(lines.join("\n"), {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="tgl-platform-report.csv"',
        "Cache-Control": "no-store",
      },
    });
  }

  return NextResponse.json(
    { summary },
    { status: 200, headers: { "Cache-Control": "no-store" } },
  );
}
