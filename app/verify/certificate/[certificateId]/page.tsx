import Link from "next/link";
import { headers } from "next/headers";
import { ArrowLeft, Download, ShieldAlert, ShieldCheck, ShieldX } from "lucide-react";
import { Header } from "@/components/header";
import { SiteFooter } from "@/components/site-footer";
import { getCertificateByPublicId } from "@/lib/certifications/store";
import { generateCertificateQrSvg } from "@/lib/certifications/qr";
import { CERTIFICATE_TYPE_LABELS, type CertificateType } from "@/lib/certifications/pricing";

export const metadata = {
  title: "Verify Certificate — Touch Grass Later",
  description: "Public QR verification record for Touch Grass Later certificates.",
};

export default async function VerifyCertificatePage({
  params,
}: {
  params: Promise<{ certificateId: string }>;
}) {
  const { certificateId } = await params;
  const decodedId = decodeURIComponent(certificateId);
  const cert = await getCertificateByPublicId(decodedId);

  const reqHeaders = await headers();
  const proto = reqHeaders.get("x-forwarded-proto") ?? "https";
  const host = reqHeaders.get("x-forwarded-host") ?? reqHeaders.get("host") ?? "localhost:3000";
  const verificationUrl = `${proto}://${host}/verify/certificate/${encodeURIComponent(decodedId)}`;
  const qrSvg = cert ? await generateCertificateQrSvg(verificationUrl) : "";

  const isAuthentic = cert?.issuance_status === "issued";
  const isRevoked = cert?.issuance_status === "revoked";
  const certTitle = cert
    ? cert.certificate_type === "internship"
      ? "INTERNSHIP CERTIFICATE"
      : CERTIFICATE_TYPE_LABELS[cert.certificate_type as CertificateType] ?? cert.certificate_type
    : "";

  const formatDate = (value?: string | null, fallback = "Recorded") =>
    value
      ? new Date(value).toLocaleDateString("en-IN", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : fallback;

  return (
    <main className="min-h-screen bg-background text-foreground">
      <Header />
      <section className="px-6 pb-24 pt-36 md:px-12 md:pt-44 lg:px-20">
        <div className="mx-auto max-w-[920px]">
          <Link
            href="/certificates"
            className="mb-10 inline-flex items-center gap-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft size={13} /> Certificates directory
          </Link>

          <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            Touch Grass Later · Public Certificate Registry
          </p>
          <h1 className="mt-4 text-4xl font-medium tracking-[-0.06em] sm:text-5xl">
            Certificate Verification
          </h1>

          {!cert ? (
            <section className="mt-8 rounded-2xl border border-amber-500/35 bg-amber-500/10 p-7">
              <div className="flex items-center gap-3 text-amber-700 dark:text-amber-200">
                <ShieldAlert size={20} aria-hidden="true" />
                <h2 className="text-lg font-medium">Certificate record not found</h2>
              </div>
              <p className="mt-3 text-sm leading-6 text-foreground/80">
                No issued certificate matches ID{" "}
                <code className="font-mono text-foreground">{decodedId}</code>. Verify the ID printed on the document or contact Touch Grass Later.
              </p>
            </section>
          ) : (
            <div className="mt-8 space-y-6">
              <section
                className={`rounded-2xl border p-6 ${
                  isRevoked
                    ? "border-rose-500/40 bg-rose-500/10"
                    : isAuthentic
                      ? "border-emerald-500/35 bg-emerald-500/10"
                      : "tgl-glass"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    {isRevoked ? (
                      <ShieldX size={22} className="text-rose-600 dark:text-rose-300" aria-hidden="true" />
                    ) : (
                      <ShieldCheck size={22} className="text-emerald-600 dark:text-emerald-300" aria-hidden="true" />
                    )}
                    <div>
                      <p className="text-base font-medium text-foreground">
                        {isRevoked
                          ? "Revoked Certificate — Invalid"
                          : isAuthentic
                            ? "Authentic & Active Certificate"
                            : "Pending Approval"}
                      </p>
                      <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                        ID: {cert.certificate_id}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                      {cert.issuance_status}
                    </span>
                    {isAuthentic && (
                      <a
                        href={`/api/certificates/${encodeURIComponent(cert.certificate_id)}/pdf`}
                        download={`${cert.certificate_id}.pdf`}
                        className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-xs font-medium text-accent-foreground hover:opacity-90 whitespace-nowrap shrink-0"
                      >
                        <Download size={13} aria-hidden="true" />
                        Download PDF
                      </a>
                    )}
                  </div>
                </div>

                {isRevoked && cert.revocation_reason && (
                  <p className="mt-4 border-t border-rose-500/20 pt-3 text-xs text-rose-700 dark:text-rose-200">
                    Audit revocation reason: {cert.revocation_reason}
                  </p>
                )}
              </section>

              <article className="rounded-2xl border border-[#d9d5cc] bg-[#f4f3ef] p-7 text-[#111111] shadow-sm sm:p-10">
                <div className="flex flex-col justify-between gap-6 border-b border-black/10 pb-6 sm:flex-row sm:items-end">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-black/55">
                      Issuing Organization: TGL Learning Portal
                    </p>
                    <h2 className="mt-2 text-2xl font-medium tracking-[-0.04em] sm:text-3xl">
                      {certTitle}
                    </h2>
                  </div>
                  <p className="font-mono text-xs tabular-nums text-black/65">
                    {cert.certificate_id}
                  </p>
                </div>

                <dl className="mt-6 grid gap-5 sm:grid-cols-2">
                  <div>
                    <dt className="text-[11px] uppercase tracking-[0.14em] text-black/50">
                      Student Name
                    </dt>
                    <dd className="mt-1 font-serif text-2xl italic text-[#111111]">
                      {cert.recipient_name}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] uppercase tracking-[0.14em] text-black/50">
                      Programme / Internship
                    </dt>
                    <dd className="mt-1 text-sm font-medium text-[#111111]">
                      {cert.achievement_title}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] uppercase tracking-[0.14em] text-black/50">
                      Joined On
                    </dt>
                    <dd className="mt-1 text-sm tabular-nums text-[#111111]">
                      {formatDate(cert.joined_at ?? cert.created_at)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] uppercase tracking-[0.14em] text-black/50">
                      Completed On
                    </dt>
                    <dd className="mt-1 text-sm tabular-nums text-[#111111]">
                      {formatDate(cert.completed_at ?? cert.issued_at)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] uppercase tracking-[0.14em] text-black/50">
                      Issue Date
                    </dt>
                    <dd className="mt-1 text-sm tabular-nums text-[#111111]">
                      {formatDate(cert.issued_at, "Not issued")}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] uppercase tracking-[0.14em] text-black/50">
                      Authorized Signatory &amp; Status
                    </dt>
                    <dd className="mt-1 text-sm font-medium text-[#111111]">
                      Gokulraj · <span className="capitalize">{cert.issuance_status}</span>
                    </dd>
                  </div>
                </dl>

                <div className="mt-8 flex flex-col justify-between gap-4 border-t border-black/10 pt-6 sm:flex-row sm:items-center">
                  <div className="text-xs text-black/60">
                    <p>Public Verification URL</p>
                    <p className="mt-1 break-all font-mono text-[11px] text-black/80">
                      {verificationUrl}
                    </p>
                  </div>
                  {qrSvg && (
                    <div
                      aria-label={`QR verification matrix for ${cert.certificate_id}`}
                      className="shrink-0 rounded-lg border border-black/10 bg-[#f4f3ef] p-1.5"
                      dangerouslySetInnerHTML={{ __html: qrSvg }}
                    />
                  )}
                </div>
              </article>
            </div>
          )}
        </div>
      </section>
      <SiteFooter note="Every issued Touch Grass Later certificate includes an immutable ID and live verification URL." />
    </main>
  );
}
