"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Award, CheckCircle2, CircleDashed, Lock, ShieldCheck } from "lucide-react";
import { CertificateDocument } from "@/components/certificate-document";
import { formatInrFromPaise } from "@/lib/certifications/pricing";
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
};

export function CertificatesHub() {
  const [products, setProducts] = useState<EnrichedProduct[]>([]);
  const [user, setUser] = useState<{ id: string; name: string; email: string } | null>(null);
  const [selectedPreviewId, setSelectedPreviewId] = useState<string>("");
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [claimNotice, setClaimNotice] = useState("");
  const [claimError, setClaimError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/certifications/products", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setProducts(data.products ?? []);
      setUser(data.user ?? null);
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

  const handleClaimIncluded = async (product: EnrichedProduct) => {
    setClaimingId(product.id);
    setClaimNotice("");
    setClaimError("");
    try {
      const res = await fetch("/api/certificates/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          internshipApplicationId: product.matchedApplicationId ?? null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setClaimError(data.error ?? "Unable to issue included certificate yet.");
        return;
      }
      setClaimNotice(
        `Included certificate ${data.issuance?.certificate_id ?? ""} issued at ₹0 extra.`,
      );
      await load();
    } finally {
      setClaimingId(null);
    }
  };

  const previewProduct =
    products.find((p) => p.id === selectedPreviewId) ?? products[0] ?? null;

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-[#111111] px-6 py-4 text-xs text-white/70">
        <span className="flex items-center gap-2">
          <ShieldCheck size={15} className="text-[#b9a9d6]" aria-hidden="true" />
          Certificate Policy:{" "}
          <strong className="text-[#f4f3ef]">
            Included in every TGL Programme Enrolment (₹0 additional certificate fee)
          </strong>
        </span>
        <Link href="/learn" className="min-h-11 inline-flex items-center gap-1 text-[#b9a9d6] hover:text-white">
          Open My Home <ArrowUpRight size={13} />
        </Link>
      </div>

      {claimNotice && (
        <p role="status" className="rounded-xl border border-emerald-400/25 bg-emerald-950/20 px-4 py-3 text-xs text-emerald-200">
          {claimNotice}
        </p>
      )}
      {claimError && (
        <p role="alert" className="rounded-xl border border-rose-400/30 bg-rose-950/20 px-4 py-3 text-xs text-rose-200">
          {claimError}
        </p>
      )}

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-64 animate-pulse rounded-2xl border border-white/10 bg-white/[0.03]" />
          ))}
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {products.map((product) => {
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
                      Included with Programme Enrolment
                    </span>
                    <span className="font-mono text-sm font-semibold tabular-nums text-emerald-300">
                      {formatInrFromPaise(0)}
                    </span>
                  </div>

                  <h2 className="mt-3 text-2xl font-medium tracking-[-0.04em] text-[#f4f3ef]">
                    {isInternship ? (
                      <span className="uppercase tracking-[0.02em]">INTERNSHIP CERTIFICATE</span>
                    ) : (
                      product.name
                    )}
                  </h2>

                  <p className="mt-2 text-xs leading-6 text-white/60">{product.description}</p>

                  <div className="mt-5 border-t border-white/10 pt-4">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-white/50">
                      Eligibility checklist
                    </p>
                    {product.eligibility ? (
                      <>
                        <ul className="mt-3 space-y-2">
                          {product.eligibility.checks.map((c) => (
                            <li key={c.key} className="flex items-center gap-2 text-xs">
                              {c.satisfied ? (
                                <CheckCircle2 size={14} className="shrink-0 text-emerald-400" aria-hidden="true" />
                              ) : (
                                <CircleDashed size={14} className="shrink-0 text-white/40" aria-hidden="true" />
                              )}
                              <span className={c.satisfied ? "text-white/90" : "text-white/55"}>
                                {c.label}
                              </span>
                            </li>
                          ))}
                        </ul>
                        {!eligible && product.eligibility.missingReasons.length > 0 && (
                          <div className="mt-3 rounded-xl border border-amber-400/25 bg-amber-950/20 p-3 text-[11px] leading-5 text-amber-100">
                            <p className="font-medium">Remaining steps to unlock:</p>
                            <ul className="mt-1 list-disc pl-4 text-white/80">
                              {product.eligibility.missingReasons.map((reason) => (
                                <li key={reason}>{reason}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="mt-2 flex items-center gap-2 text-xs text-white/55">
                        <Lock size={13} aria-hidden="true" /> Sign in to check your certificate progress.
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-6 space-y-4 border-t border-white/10 pt-5">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-white/60">
                    <span>
                      Certificate fee:{" "}
                      <strong className="text-emerald-300">Included (₹0 extra)</strong>
                    </span>
                    <span>
                      Status:{" "}
                      <strong className="text-[#b9a9d6]">
                        {issued
                          ? `Issued (${product.activeIssuance?.certificate_id})`
                          : eligible
                            ? "Ready to claim"
                            : "Locked until steps complete"}
                      </strong>
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    {!user ? (
                      <Link
                        href="/auth/login?next=/certificates"
                        className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#f4f3ef] px-5 py-2.5 text-xs font-medium text-[#111111]"
                      >
                        Sign in to Check Eligibility <ArrowUpRight size={13} />
                      </Link>
                    ) : issued && product.activeIssuance ? (
                      <Link
                        href={`/verify/certificate/${encodeURIComponent(product.activeIssuance.certificate_id)}`}
                        className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#f4f3ef] px-5 py-2.5 text-xs font-medium text-[#111111]"
                      >
                        <Award size={14} aria-hidden="true" /> Open Verified Certificate
                      </Link>
                    ) : eligible ? (
                      <button
                        type="button"
                        disabled={claimingId === product.id}
                        onClick={() => void handleClaimIncluded(product)}
                        className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#f4f3ef] px-5 py-2.5 text-xs font-medium text-[#111111] disabled:opacity-50"
                      >
                        {claimingId === product.id
                          ? "Issuing Certificate…"
                          : "Claim Included Certificate (₹0 extra)"}
                      </button>
                    ) : (
                      <Link
                        href="/learn"
                        className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/15 px-5 py-2.5 text-xs text-white/85 hover:border-white/35"
                      >
                        Complete Remaining Steps <ArrowUpRight size={13} />
                      </Link>
                    )}

                    <button
                      type="button"
                      onClick={() => setSelectedPreviewId(product.id)}
                      className="min-h-11 rounded-full border border-white/15 px-4 py-2 text-xs text-white/80 hover:border-white/35 hover:text-white"
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
              <p className="text-[11px] uppercase tracking-[0.18em] text-white/50">
                Certificate Preview &amp; Verification
              </p>
              <h3 className="mt-2 text-2xl font-medium tracking-[-0.04em]">
                {previewProduct.name}
              </h3>
            </div>
            {previewProduct.activeIssuance && (
              <Link
                href={`/verify/certificate/${encodeURIComponent(previewProduct.activeIssuance.certificate_id)}`}
                className="min-h-11 inline-flex items-center text-xs text-[#b9a9d6] underline underline-offset-4"
              >
                Open public verification link
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
