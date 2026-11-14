"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Award, CheckCircle2, CircleDashed, QrCode } from "lucide-react";
import { CertificateDocument } from "@/components/certificate-document";
import { formatInrFromPaise } from "@/lib/certifications/pricing";
import type { EligibilityCheckItem } from "@/lib/certifications/eligibility";

type ProductSummary = {
  id: string;
  name: string;
  description: string;
  certificate_type: string;
  price_paise: number;
  currency: string;
  eligibility?: {
    eligible: boolean;
    status: string;
    checks: EligibilityCheckItem[];
    missingReasons: string[];
  } | null;
  achievementTitle?: string;
  matchedApplicationId?: string | null;
  activeIssuance?: {
    certificate_id: string;
    recipient_name: string;
    achievement_title: string;
    issued_at: string | null;
    issuance_status: "issued" | "revoked" | "pending_approval";
  } | null;
};

type UserSummary = {
  id: string;
  name: string;
  email: string;
} | null;

export function InternshipCertificateSection() {
  const [internshipProduct, setInternshipProduct] = useState<ProductSummary | null>(null);
  const [user, setUser] = useState<UserSummary>(null);
  const [claiming, setClaiming] = useState(false);
  const [claimNotice, setClaimNotice] = useState("");
  const [claimError, setClaimError] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/certifications/products", { cache: "no-store" });
    if (!res.ok) return;
    const data = await res.json();
    const found = (data.products ?? []).find(
      (p: ProductSummary) => p.certificate_type === "internship",
    );
    setInternshipProduct(found ?? null);
    setUser(data.user ?? null);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleClaimIncluded = async () => {
    setClaiming(true);
    setClaimNotice("");
    setClaimError("");
    try {
      const res = await fetch("/api/certificates/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          internshipApplicationId: internshipProduct?.matchedApplicationId ?? null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setClaimError(data.error ?? "Unable to claim included certificate.");
        return;
      }
      setClaimNotice(
        `Included certificate ${data.issuance?.certificate_id ?? ""} issued at ₹0 extra.`,
      );
      await load();
    } finally {
      setClaiming(false);
    }
  };

  const eligible = Boolean(internshipProduct?.eligibility?.eligible);
  const activeIssuance = internshipProduct?.activeIssuance ?? null;
  const issued = activeIssuance?.issuance_status === "issued";

  const issuanceStatusLabel = activeIssuance
    ? issued
      ? "Issued & verifiable"
      : activeIssuance.issuance_status === "revoked"
        ? "Revoked"
        : "Pending approval"
    : eligible
      ? "Eligible — ready to claim (₹0 extra)"
      : "Unlocks upon mentor approval";

  const checks: EligibilityCheckItem[] = internshipProduct?.eligibility?.checks ?? [
    { key: "internship_completed", label: "Internship completion record confirmed", satisfied: false },
    { key: "submission_provided", label: "Required project or work submission recorded", satisfied: false },
    { key: "mentor_approved", label: "Authorized mentor or admin approval obtained", satisfied: false },
  ];

  return (
    <section
      id="internship-certificate"
      aria-labelledby="internship-certificate-heading"
      className="scroll-mt-24 border-t border-white/10 bg-[#090909] px-6 py-24 text-[#f4f3ef] md:px-12 md:py-32 lg:px-20"
    >
      <div className="mx-auto max-w-[1280px]">
        <div className="grid gap-10 border-b border-white/10 pb-10 lg:grid-cols-[1.15fr_.85fr] lg:items-end">
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-white/45">
              Included Credential · Verified Completion Only
            </p>
            <h2
              id="internship-certificate-heading"
              className="mt-5 text-[clamp(2.5rem,5.4vw,5.2rem)] font-medium leading-[0.9] tracking-[-0.07em] text-[#f4f3ef]"
            >
              <span className="block text-white/95">INTERNSHIP</span>
              <span className="font-serif font-normal italic text-[#b9a9d6]">
                CERTIFICATE
              </span>
            </h2>
          </div>

          <div className="space-y-5">
            <p className="text-sm leading-7 text-white/60">
              Every TGL Programme includes an official QR-verified{" "}
              <strong className="font-medium text-white">INTERNSHIP CERTIFICATE</strong>{" "}
              at zero extra cost once your lessons, project, internship tasks, and mentor evaluation are approved.
            </p>
            <dl className="grid gap-4 border-t border-white/10 pt-4 text-xs sm:grid-cols-3">
              <div>
                <dt className="text-[10px] uppercase tracking-[0.14em] text-white/40">Certificate fee</dt>
                <dd className="mt-1 font-semibold tabular-nums text-emerald-300">
                  {formatInrFromPaise(0)}{" "}
                  <span className="block font-normal text-white/50">
                    Bundled with Programme
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-[0.14em] text-white/40">Enrolment coverage</dt>
                <dd className="mt-1 font-medium text-white/85">All-inclusive single fee</dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-[0.14em] text-white/40">Issuance status</dt>
                <dd className="mt-1 font-medium text-[#b9a9d6]">{issuanceStatusLabel}</dd>
              </div>
            </dl>
          </div>
        </div>

        <div className="mt-12 grid gap-10 lg:grid-cols-[.9fr_1.1fr] lg:items-start">
          <div className="space-y-8">
            <div className="rounded-2xl border border-white/10 bg-[#111111] p-6 sm:p-7">
              <div className="flex items-center justify-between gap-4">
                <h3 className="text-base font-medium tracking-[-0.03em]">
                  Eligibility requirements
                </h3>
                <span className="text-xs text-white/45">
                  {eligible ? "All requirements met" : "Verification required"}
                </span>
              </div>
              <p className="mt-2 text-xs leading-5 text-white/50">
                Enrolment payment unlocks learning &amp; internship access, never an automatic certificate. Issuance requires every criterion below:
              </p>

              <ul className="mt-5 space-y-3">
                {checks.map((check) => (
                  <li
                    key={check.key}
                    className="flex items-start gap-3 rounded-xl border border-white/[0.08] bg-black/25 px-4 py-3 text-xs"
                  >
                    {check.satisfied ? (
                      <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-400" aria-hidden="true" />
                    ) : (
                      <CircleDashed size={16} className="mt-0.5 shrink-0 text-white/35" aria-hidden="true" />
                    )}
                    <div>
                      <p className={check.satisfied ? "text-[#f4f3ef]" : "text-white/60"}>
                        {check.label}
                      </p>
                      <p className="mt-0.5 text-[11px] text-white/40">
                        {check.satisfied ? "Verified" : "Pending"}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>

              {claimNotice && (
                <p role="status" className="mt-4 rounded-xl border border-emerald-400/25 bg-emerald-950/20 px-3 py-2 text-xs text-emerald-200">
                  {claimNotice}
                </p>
              )}
              {claimError && (
                <p role="alert" className="mt-4 rounded-xl border border-rose-400/30 bg-rose-950/20 px-3 py-2 text-xs text-rose-200">
                  {claimError}
                </p>
              )}

              <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-white/10 pt-5">
                {issued && activeIssuance ? (
                  <Link
                    href={`/verify/certificate/${encodeURIComponent(activeIssuance.certificate_id)}`}
                    className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#f4f3ef] px-5 py-2.5 text-xs font-medium text-[#111111]"
                  >
                    <Award size={14} aria-hidden="true" /> Open Verified Certificate
                  </Link>
                ) : user && eligible ? (
                  <button
                    type="button"
                    disabled={claiming}
                    onClick={() => void handleClaimIncluded()}
                    className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#f4f3ef] px-5 py-2.5 text-xs font-medium text-[#111111] disabled:opacity-50"
                  >
                    {claiming ? "Issuing Certificate…" : "Claim Included Certificate (₹0 extra)"}
                  </button>
                ) : (
                  <Link
                    href="/programmes"
                    className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#f4f3ef] px-5 py-2.5 text-xs font-medium text-[#111111]"
                  >
                    Explore Programmes <ArrowUpRight size={13} aria-hidden="true" />
                  </Link>
                )}
                <Link
                  href="/internships"
                  className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/15 px-4 py-2.5 text-xs text-white/80 transition-colors hover:border-white/35 hover:text-white whitespace-nowrap shrink-0"
                >
                  Open Internship Workspace <ArrowUpRight size={13} aria-hidden="true" />
                </Link>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#111111] p-6 text-xs leading-6 text-white/55">
              <div className="flex items-center gap-2 text-[#f4f3ef]">
                <QrCode size={15} className="text-[#b9a9d6]" aria-hidden="true" />
                <span className="font-medium">QR-based public verification</span>
              </div>
              <p className="mt-2">
                Every issued <strong className="text-white/85">INTERNSHIP CERTIFICATE</strong> includes a unique identifier and scannable QR code linked to its public verification page, showing live authentic or revoked status.
              </p>
              <Link
                href="/verify/certificate/TGL-CERT-2026-8419"
                className="mt-3 inline-flex items-center gap-1.5 text-[#b9a9d6] underline underline-offset-4 hover:text-white"
              >
                Inspect sample verification record <ArrowUpRight size={12} aria-hidden="true" />
              </Link>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-white/45">
              <span>Certificate preview</span>
              <span>Official QR-verifiable format</span>
            </div>
            <CertificateDocument
              compact
              showActions={Boolean(activeIssuance)}
              data={{
                certificateId: activeIssuance?.certificate_id ?? "TGL-CERT-2026-8419",
                recipientName: activeIssuance?.recipient_name ?? user?.name ?? "Aarav Sharma",
                certificateTitle: "INTERNSHIP CERTIFICATE",
                achievementTitle:
                  activeIssuance?.achievement_title ??
                  internshipProduct?.achievementTitle ??
                  "Full-Stack Product Engineering Internship",
                organization: "Touch Grass Later",
                issuedAt: activeIssuance?.issued_at ?? null,
                status: activeIssuance
                  ? activeIssuance.issuance_status === "revoked"
                    ? "revoked"
                    : "issued"
                  : "preview",
              }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
