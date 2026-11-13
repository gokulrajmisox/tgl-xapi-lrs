"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, CheckCircle2, CircleDashed, QrCode } from "lucide-react";
import { CertificateDocument } from "@/components/certificate-document";
import { RazorpayCheckoutButton } from "@/components/razorpay-checkout-button";
import { formatInrFromPaise, isPaidCertificate } from "@/lib/certifications/pricing";
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
  latestOrder?: {
    order_status: string;
  } | null;
  latestPayment?: {
    payment_status: string;
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
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/certifications/products", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      const found = (data.products ?? []).find(
        (p: ProductSummary) => p.certificate_type === "internship",
      );
      setInternshipProduct(found ?? null);
      setUser(data.user ?? null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const pricePaise = internshipProduct?.price_paise ?? null;
  const isPaid = pricePaise !== null ? isPaidCertificate(pricePaise) : true;
  const eligible = Boolean(internshipProduct?.eligibility?.eligible);
  const activeIssuance = internshipProduct?.activeIssuance ?? null;

  const paymentStatusLabel = internshipProduct?.latestPayment?.payment_status
    ? internshipProduct.latestPayment.payment_status
    : internshipProduct?.latestOrder?.order_status
      ? internshipProduct.latestOrder.order_status
      : "Not initiated";

  const issuanceStatusLabel = activeIssuance
    ? activeIssuance.issuance_status === "issued"
      ? "Issued & verifiable"
      : activeIssuance.issuance_status === "revoked"
        ? "Revoked"
        : "Pending approval"
    : eligible
      ? "Eligible — awaiting checkout"
      : "Pending completion & mentor approval";

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
              Optional Credential · Verified Completion Only
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
              Earn an official QR-verified <strong className="font-medium text-white">INTERNSHIP CERTIFICATE</strong> once your internship work is submitted and approved by an authorized mentor. Internship participation itself is completely free—no student is ever required to purchase a certificate.
            </p>
            <dl className="grid gap-4 border-t border-white/10 pt-4 text-xs sm:grid-cols-3">
              <div>
                <dt className="text-[10px] uppercase tracking-[0.14em] text-white/40">Issuance fee</dt>
                <dd className="mt-1 font-semibold tabular-nums text-[#f4f3ef]">
                  {loading || pricePaise === null ? "Loading…" : formatInrFromPaise(pricePaise)}{" "}
                  <span className="font-normal text-white/45">
                    ({isPaid ? "Paid · INR" : "Free"})
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-[0.14em] text-white/40">Payment status</dt>
                <dd className="mt-1 font-medium capitalize text-white/85">{paymentStatusLabel}</dd>
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
                Payment alone never creates a valid certificate. Issuance requires every criterion below:
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

              <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-white/10 pt-5">
                {internshipProduct && (
                  <RazorpayCheckoutButton
                    productId={internshipProduct.id}
                    productName={internshipProduct.name}
                    pricePaise={internshipProduct.price_paise}
                    eligible={eligible}
                    alreadyIssued={Boolean(activeIssuance && activeIssuance.issuance_status === "issued")}
                    internshipApplicationId={internshipProduct.matchedApplicationId}
                    studentName={user?.name}
                    studentEmail={user?.email}
                    onSuccess={() => void load()}
                  />
                )}
                <Link
                  href="/internships"
                  className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2.5 text-xs text-white/80 transition-colors hover:border-white/35 hover:text-white whitespace-nowrap shrink-0"
                >
                  Apply for free internship <ArrowUpRight size={13} aria-hidden="true" />
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
