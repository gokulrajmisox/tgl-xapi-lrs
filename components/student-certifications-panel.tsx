"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Award, FileText, Receipt, ShieldCheck, X } from "lucide-react";
import { CertificateDocument } from "@/components/certificate-document";
import { CERTIFICATE_TYPE_LABELS, formatInrFromPaise, type CertificateType } from "@/lib/certifications/pricing";

type OrderItem = {
  id: string;
  order_kind?: "programme_enrollment" | "course_enrollment" | "certificate";
  product_id: string | null;
  razorpay_order_id: string;
  amount_paise: number;
  currency: string;
  order_status: string;
  payment_mode: string;
  metadata?: Record<string, unknown>;
  created_at: string;
};

type PaymentItem = {
  id: string;
  order_id: string;
  razorpay_payment_id: string;
  payment_status: string;
  payment_method: string | null;
  verified_at: string | null;
  created_at: string;
};

type IssuanceItem = {
  id: string;
  certificate_id: string;
  recipient_name: string;
  achievement_title: string;
  certificate_type: CertificateType;
  issuance_status: "issued" | "revoked" | "pending_approval";
  revocation_reason: string | null;
  issued_at: string | null;
};

type ProductItem = {
  id: string;
  name: string;
  certificate_type: CertificateType;
  price_paise: number;
  eligibility?: { eligible: boolean; missingReasons: string[] } | null;
  matchedApplicationId?: string | null;
  activeIssuance?: IssuanceItem | null;
};

export function StudentCertificationsPanel() {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [issuances, setIssuances] = useState<IssuanceItem[]>([]);
  const [claiming, setClaiming] = useState(false);
  const [claimNotice, setClaimNotice] = useState("");
  const [claimError, setClaimError] = useState("");
  const [receiptOrder, setReceiptOrder] = useState<{
    order: OrderItem;
    payment: PaymentItem | null;
    productName: string;
  } | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/certifications/products", { cache: "no-store" });
    if (!res.ok) return;
    const data = await res.json();
    setProducts(data.products ?? []);
    setOrders(data.orders ?? []);
    setPayments(data.payments ?? []);
    setIssuances(data.issuances ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleClaimIncluded = async (internshipApplicationId?: string | null) => {
    setClaiming(true);
    setClaimNotice("");
    setClaimError("");
    try {
      const res = await fetch("/api/certificates/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ internshipApplicationId: internshipApplicationId ?? null }),
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
      setClaiming(false);
    }
  };

  const internshipCert = products.find((p) => p.certificate_type === "internship");
  const certIssued = internshipCert?.activeIssuance?.issuance_status === "issued";

  return (
    <section className="tgl-glass mt-8 space-y-6 rounded-2xl p-6">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-5">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--accent)]">
            Included Credentials &amp; Programme Receipts
          </p>
          <h2 className="mt-2 text-2xl font-medium tracking-[-0.04em] text-foreground">
            Your <span className="font-serif italic text-[var(--accent)]">INTERNSHIP CERTIFICATE</span> &amp; credentials
          </h2>
          <p className="mt-2 max-w-2xl text-xs leading-5 text-muted-foreground">
            Track certificate eligibility, download issued QR-verified credentials, and review your single-payment Programme receipts (₹0 extra certificate fee).
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/internships"
            className="rounded-full border border-border px-4 py-2 text-xs text-foreground transition-colors hover:bg-muted/40"
          >
            Internships (Included)
          </Link>
          <Link
            href="/certificates"
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground"
          >
            Certificate Verification <ArrowUpRight size={13} />
          </Link>
        </div>
      </div>

      {claimNotice && (
        <p role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-700 dark:text-emerald-200">
          {claimNotice}
        </p>
      )}
      {claimError && (
        <p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs text-rose-700 dark:text-rose-200">
          {claimError}
        </p>
      )}

      {internshipCert && (
        <div className="tgl-subsurface flex flex-col justify-between gap-5 rounded-xl border border-[var(--accent)]/30 p-5 lg:flex-row lg:items-center">
          <div className="space-y-1.5">
            <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--accent)]">
              Included Credential · INTERNSHIP CERTIFICATE
            </p>
            <p className="text-base font-medium text-foreground">
              {certIssued
                ? `Issued: ${internshipCert.activeIssuance?.certificate_id}`
                : internshipCert.eligibility?.eligible
                  ? "You are eligible to claim your included INTERNSHIP CERTIFICATE"
                  : "Complete programme lessons, project, internship tasks, and mentor approval to unlock"}
            </p>
            <p className="text-xs text-muted-foreground">
              Certificate fee:{" "}
              <strong className="tabular-nums text-emerald-600 dark:text-emerald-300">
                {formatInrFromPaise(0)}
              </strong>{" "}
              (covered by Programme Enrolment)
            </p>
          </div>

          {certIssued && internshipCert.activeIssuance ? (
            <Link
              href={`/verify/certificate/${encodeURIComponent(internshipCert.activeIssuance.certificate_id)}`}
              className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-xs font-medium text-primary-foreground"
            >
              <Award size={14} aria-hidden="true" /> Open Verified Certificate
            </Link>
          ) : internshipCert.eligibility?.eligible ? (
            <button
              type="button"
              disabled={claiming}
              onClick={() => void handleClaimIncluded(internshipCert.matchedApplicationId)}
              className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-xs font-medium text-primary-foreground disabled:opacity-50"
            >
              {claiming ? "Issuing…" : "Claim Included Certificate (₹0 extra)"}
            </button>
          ) : (
            <Link
              href="/learn"
              className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border border-border px-5 py-2.5 text-xs font-medium text-foreground transition-colors hover:bg-muted/40"
            >
              Continue Programme <ArrowUpRight size={13} />
            </Link>
          )}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-medium text-foreground">
            <ShieldCheck size={15} className="text-[var(--accent)]" aria-hidden="true" />
            <span>Issued certificates ({issuances.length})</span>
          </div>

          {issuances.length > 0 ? (
            <div className="space-y-4">
              {issuances.map((cert) => (
                <CertificateDocument
                  key={cert.id}
                  compact
                  data={{
                    certificateId: cert.certificate_id,
                    recipientName: cert.recipient_name,
                    certificateTitle:
                      cert.certificate_type === "internship"
                        ? "INTERNSHIP CERTIFICATE"
                        : CERTIFICATE_TYPE_LABELS[cert.certificate_type].toUpperCase(),
                    achievementTitle: cert.achievement_title,
                    organization: "Touch Grass Later",
                    issuedAt: cert.issued_at,
                    status: cert.issuance_status === "revoked" ? "revoked" : "issued",
                    revocationReason: cert.revocation_reason,
                  }}
                />
              ))}
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-border p-5 text-xs text-muted-foreground">
              No certificates issued yet. Once your lessons, project, internship tasks, and mentor approval are complete, your certificate is issued automatically at ₹0 extra.
            </p>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-medium text-foreground">
            <Receipt size={15} className="text-[var(--accent)]" aria-hidden="true" />
            <span>Programme payment history &amp; receipts ({orders.length})</span>
          </div>

          {orders.length > 0 ? (
            <div className="space-y-2.5">
              {orders.map((order) => {
                const payment = payments.find((p) => p.order_id === order.id) ?? null;
                const product = products.find((p) => p.id === order.product_id);
                const isProgrammeOrder =
                  order.order_kind === "programme_enrollment" ||
                  order.order_kind === "course_enrollment" ||
                  Boolean(order.metadata?.courseTitle ?? order.metadata?.programmeTitle);
                const orderTitle = isProgrammeOrder
                  ? `Programme: ${String(
                      order.metadata?.courseTitle ??
                        order.metadata?.programmeTitle ??
                        "TGL Programme Enrolment",
                    )}`
                  : (product?.name ?? "Programme Enrolment");

                return (
                  <article
                    key={order.id}
                    className="tgl-subsurface flex flex-wrap items-center justify-between gap-3 rounded-xl p-4 text-xs"
                  >
                    <div>
                      <p className="font-medium text-foreground">
                        {orderTitle}
                      </p>
                      <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                        {order.razorpay_order_id} ·{" "}
                        <span className="capitalize">{order.order_status}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-medium tabular-nums text-foreground">
                        {formatInrFromPaise(order.amount_paise)}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setReceiptOrder({
                            order,
                            payment,
                            productName: orderTitle,
                          })
                        }
                        className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-[11px] text-foreground transition-colors hover:bg-muted/40"
                      >
                        <FileText size={12} aria-hidden="true" /> Receipt
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-border p-5 text-xs text-muted-foreground">
              No payment records yet.
            </p>
          )}
        </div>
      </div>

      {receiptOrder && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="receipt-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm dark:bg-black/80"
        >
          <div className="tgl-glass-strong w-full max-w-md rounded-2xl p-6 text-foreground">
            <div className="flex items-start justify-between border-b border-border pb-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--accent)]">
                  Touch Grass Later · INR Receipt
                </p>
                <h3 id="receipt-dialog-title" className="mt-1 text-lg font-medium">
                  {receiptOrder.productName}
                </h3>
              </div>
              <button
                type="button"
                aria-label="Close receipt"
                onClick={() => setReceiptOrder(null)}
                className="grid size-8 place-items-center rounded-full border border-border text-muted-foreground hover:text-foreground"
              >
                <X size={15} />
              </button>
            </div>
            <dl className="mt-4 space-y-2.5 text-xs">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Order ID</dt>
                <dd className="font-mono">{receiptOrder.order.razorpay_order_id}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Payment ID</dt>
                <dd className="font-mono">
                  {receiptOrder.payment?.razorpay_payment_id ?? "Pending / None"}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Amount</dt>
                <dd className="font-semibold tabular-nums">
                  {formatInrFromPaise(receiptOrder.order.amount_paise)} INR
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Status</dt>
                <dd className="capitalize">{receiptOrder.order.order_status}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Gateway Mode</dt>
                <dd>{receiptOrder.order.payment_mode}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Date</dt>
                <dd className="tabular-nums">
                  {new Date(receiptOrder.order.created_at).toLocaleString("en-IN")}
                </dd>
              </div>
            </dl>
            <button
              type="button"
              onClick={() => window.print()}
              className="mt-6 w-full rounded-full bg-primary px-4 py-2.5 text-xs font-medium text-primary-foreground"
            >
              Print receipt
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
