import Link from "next/link";
import { headers } from "next/headers";
import { ArrowLeft, ShieldAlert, ShieldCheck, ShieldX } from "lucide-react";
import { Header } from "@/components/header";
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

  return (
    <main className="min-h-screen bg-[#090909] text-[#f4f3ef]">
      <Header />
      <section className="px-6 pb-24 pt-36 md:px-12 md:pt-44 lg:px-20">
        <div className="mx-auto max-w-[920px]">
          <Link
            href="/certificates"
            className="mb-10 inline-flex items-center gap-2 text-xs text-white/45 transition-colors hover:text-white"
          >
            <ArrowLeft size={13} /> Certificates directory
          </Link>

          <p className="text-[10px] uppercase tracking-[0.22em] text-white/40">
            Touch Grass Later · Public Certificate Registry
          </p>
          <h1 className="mt-4 text-4xl font-medium tracking-[-0.06em] sm:text-5xl">
            Certificate Verification
          </h1>

          {!cert ? (
            <section className="mt-8 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-7">
              <div className="flex items-center gap-3 text-amber-200">
                <ShieldAlert size={20} aria-hidden="true" />
                <h2 className="text-lg font-medium">Certificate record not found</h2>
              </div>
              <p className="mt-3 text-sm leading-6 text-white/70">
                No issued certificate matches ID{" "}
                <code className="font-mono text-white">{decodedId}</code>. Verify the ID printed on the document or contact Touch Grass Later.
              </p>
            </section>
          ) : (
            <div className="mt-8 space-y-6">
              <section
                className={`rounded-2xl border p-6 ${
                  isRevoked
                    ? "border-rose-400/40 bg-rose-500/10"
                    : isAuthentic
                      ? "border-emerald-400/35 bg-emerald-500/10"
                      : "border-white/15 bg-white/[0.03]"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    {isRevoked ? (
                      <ShieldX size={22} className="text-rose-300" aria-hidden="true" />
                    ) : (
                      <ShieldCheck size={22} className="text-emerald-300" aria-hidden="true" />
                    )}
                    <div>
                      <p className="text-base font-medium">
                        {isRevoked
                          ? "Revoked Certificate — Invalid"
                          : isAuthentic
                            ? "Authentic & Active Certificate"
                            : "Pending Approval"}
                      </p>
                      <p className="mt-0.5 font-mono text-xs text-white/70">
                        ID: {cert.certificate_id}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-medium uppercase tracking-[0.14em] text-white/75">
                    {cert.issuance_status}
                  </span>
                </div>

                {isRevoked && cert.revocation_reason && (
                  <p className="mt-4 border-t border-rose-300/20 pt-3 text-xs text-rose-200">
                    Audit revocation reason: {cert.revocation_reason}
                  </p>
                )}
              </section>

              <article className="rounded-2xl border border-[#d9d5cc] bg-[#f4f3ef] p-7 text-[#111111] sm:p-10">
                <div className="flex flex-col justify-between gap-6 border-b border-black/10 pb-6 sm:flex-row sm:items-end">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-black/55">
                      Issuing Organization: Touch Grass Later
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
                      Internship / Course / Project
                    </dt>
                    <dd className="mt-1 text-sm font-medium text-[#111111]">
                      {cert.achievement_title}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] uppercase tracking-[0.14em] text-black/50">
                      Issue Date
                    </dt>
                    <dd className="mt-1 text-sm tabular-nums text-[#111111]">
                      {cert.issued_at
                        ? new Date(cert.issued_at).toLocaleDateString("en-IN", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })
                        : "Not issued"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] uppercase tracking-[0.14em] text-black/50">
                      Verification Status
                    </dt>
                    <dd className="mt-1 text-sm font-medium capitalize text-[#111111]">
                      {cert.issuance_status}
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
    </main>
  );
}
