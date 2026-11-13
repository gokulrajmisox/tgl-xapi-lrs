"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, CheckCircle2, CircleDashed, Lock } from "lucide-react";
import { CertificateDocument } from "@/components/certificate-document";
import { RazorpayCheckoutButton } from "@/components/razorpay-checkout-button";
import { formatInrFromPaise, isPaidCertificate } from "@/lib/certifications/pricing";
import type { EligibilityCheckItem } from "@/lib/certifications/eligibility";

type EnrichedProduct = {
  id: string;
  slug: string;
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

export function CertificatesHub() {
  const [products, setProducts] = useState<EnrichedProduct[]>([]);
  const [user, setUser] = useState<{ id: string; name: string; email: string } | null>(null);
  const [razorpayMode, setRazorpayMode] = useState<string>("unconfigured");
  const [selectedPreviewId, setSelectedPreviewId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/certifications/products", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setProducts(data.products ?? []);
      setUser(data.user ?? null);
      setRazorpayMode(data.razorpay?.mode ?? "unconfigured");
      if (!selectedPreviewId && data.products?.[0]?.id) {
        setSelectedPreviewId(data.products[0].id);
      }
    } finally {
      setLoading(false);
    }
  }, [selectedPreviewId]);

  useEffect(() => {
    void load();
  }, [load]);

  const previewProduct =
    products.find((p) => p.id === selectedPreviewId) ?? products[0] ?? null;

  return (
    <div className="space-y-12">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-[#111111] px-6 py-4 text-xs text-white/60">
        <span>
          Checkout mode:{" "}
          <strong className="text-[#f4f3ef]">
            {razorpayMode === "live"
              ? "Razorpay INR Live Checkout"
              : "Razorpay INR Test Mode"}
          </strong>
        </span>
        <Link href="/dashboard/learning" className="text-[#b9a9d6] hover:text-white">
          Open student dashboard <ArrowUpRight size={13} className="inline" />
        </Link>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-64 animate-pulse rounded-2xl border border-white/10 bg-white/[0.03]" />
          ))}
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {products.map((product) => {
            const paid = isPaidCertificate(product.price_paise);
            const eligible = Boolean(product.eligibility?.eligible);
            const issued = product.activeIssuance?.issuance_status === "issued";
            const isInternship = product.certificate_type === "internship";

            return (
              <article
                key={product.id}
                className={`flex flex-col justify-between rounded-2xl border p-6 sm:p-7 ${
                  isInternship
                    ? "border-[#b9a9d6]/45 bg-[#14121a]"
                    : "border-white/10 bg-[#111111]"
                }`}
              >
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                    <span className="text-[#b9a9d6]">
                      {paid ? "Paid Certificate · INR" : "Free Certificate"}
                    </span>
                    <span className="font-mono text-lg font-semibold tabular-nums text-[#f4f3ef]">
                      {formatInrFromPaise(product.price_paise)}
                    </span>
                  </div>

                  <h2 className="mt-3 text-2xl font-medium tracking-[-0.04em] text-[#f4f3ef]">
                    {isInternship ? (
                      <>
                        <span className="uppercase tracking-[0.02em]">INTERNSHIP CERTIFICATE</span>
                      </>
                    ) : (
                      product.name
                    )}
                  </h2>

                  <p className="mt-2 text-xs leading-6 text-white/55">{product.description}</p>

                  <div className="mt-5 border-t border-white/10 pt-4">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-white/40">
                      Eligibility status
                    </p>
                    {product.eligibility ? (
                      <ul className="mt-3 space-y-2">
                        {product.eligibility.checks.map((c) => (
                          <li key={c.key} className="flex items-center gap-2 text-xs">
                            {c.satisfied ? (
                              <CheckCircle2 size={14} className="shrink-0 text-emerald-400" aria-hidden="true" />
                            ) : (
                              <CircleDashed size={14} className="shrink-0 text-white/35" aria-hidden="true" />
                            )}
                            <span className={c.satisfied ? "text-white/85" : "text-white/45"}>
                              {c.label}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-2 flex items-center gap-2 text-xs text-white/45">
                        <Lock size={13} aria-hidden="true" /> Sign in to evaluate your eligibility.
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-6 space-y-4 border-t border-white/10 pt-5">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-white/50">
                    <span>
                      Payment:{" "}
                      <strong className="text-white/80 capitalize">
                        {product.latestPayment?.payment_status ??
                          product.latestOrder?.order_status ??
                          "Not started"}
                      </strong>
                    </span>
                    <span>
                      Issuance:{" "}
                      <strong className="text-[#b9a9d6]">
                        {issued
                          ? `Issued (${product.activeIssuance?.certificate_id})`
                          : eligible
                            ? "Ready for checkout"
                            : "Ineligible"}
                      </strong>
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    {user ? (
                      <RazorpayCheckoutButton
                        productId={product.id}
                        productName={product.name}
                        pricePaise={product.price_paise}
                        eligible={eligible}
                        alreadyIssued={Boolean(issued)}
                        internshipApplicationId={product.matchedApplicationId}
                        studentName={user.name}
                        studentEmail={user.email}
                        onSuccess={() => void load()}
                      />
                    ) : (
                      <Link
                        href="/auth/login?next=/certificates"
                        className="inline-flex items-center gap-2 rounded-full bg-[#f4f3ef] px-4 py-2.5 text-xs font-medium text-[#111111]"
                      >
                        Sign in to check eligibility <ArrowUpRight size={13} />
                      </Link>
                    )}

                    <button
                      type="button"
                      onClick={() => setSelectedPreviewId(product.id)}
                      className="rounded-full border border-white/15 px-3.5 py-2 text-xs text-white/70 hover:border-white/35 hover:text-white"
                    >
                      Preview certificate
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {previewProduct && (
        <section className="space-y-4 border-t border-white/10 pt-10">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-white/40">
                Certificate Preview &amp; Verification
              </p>
              <h3 className="mt-2 text-2xl font-medium tracking-[-0.04em]">
                {previewProduct.name}
              </h3>
            </div>
            {previewProduct.activeIssuance && (
              <Link
                href={`/verify/certificate/${encodeURIComponent(previewProduct.activeIssuance.certificate_id)}`}
                className="text-xs text-[#b9a9d6] underline underline-offset-4"
              >
                Open public verification page
              </Link>
            )}
          </div>

          <CertificateDocument
            showActions={Boolean(previewProduct.activeIssuance)}
            data={{
              certificateId:
                previewProduct.activeIssuance?.certificate_id ?? "TGL-CERT-2026-8419",
              recipientName:
                previewProduct.activeIssuance?.recipient_name ?? user?.name ?? "Aarav Sharma",
              certificateTitle:
                previewProduct.certificate_type === "internship"
                  ? "INTERNSHIP CERTIFICATE"
                  : previewProduct.name.toUpperCase(),
              achievementTitle:
                previewProduct.activeIssuance?.achievement_title ??
                previewProduct.achievementTitle ??
                previewProduct.name,
              organization: "Touch Grass Later",
              issuedAt: previewProduct.activeIssuance?.issued_at ?? null,
              status: previewProduct.activeIssuance
                ? previewProduct.activeIssuance.issuance_status === "revoked"
                  ? "revoked"
                  : "issued"
                : "preview",
            }}
          />
        </section>
      )}
    </div>
  );
}
