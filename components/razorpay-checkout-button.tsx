"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  CreditCard,
  Loader2,
  ShieldAlert,
  ShieldCheck,
  X,
} from "lucide-react";
import { formatInrFromPaise } from "@/lib/certifications/pricing";
import SlideCommit from "@/components/react-bits/SlideCommit";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => {
      open: () => void;
      on: (event: string, cb: (res: unknown) => void) => void;
    };
  }
}

type CheckoutOrderState = {
  razorpayOrderId: string;
  amountPaise: number;
  itemName: string;
  isSimulated: boolean;
};

type CheckoutStep = "idle" | "summary" | "gateway" | "success" | "failed";

export function RazorpayCheckoutButton({
  orderKind = "programme_enrollment",
  productId,
  courseId,
  productName,
  pricePaise,
  eligible = true,
  alreadyIssued = false,
  alreadyEnrolled = false,
  internshipApplicationId,
  studentName,
  studentEmail,
  courseDuration,
  whatYouReceive,
  continueHref,
  onSuccess,
}: {
  orderKind?: "programme_enrollment" | "course_enrollment" | "certificate";
  productId?: string;
  courseId?: string;
  productName: string;
  pricePaise: number;
  eligible?: boolean;
  alreadyIssued?: boolean;
  alreadyEnrolled?: boolean;
  internshipApplicationId?: string | null;
  studentName?: string;
  studentEmail?: string;
  courseDuration?: string;
  whatYouReceive?: string[];
  continueHref?: string;
  onSuccess?: () => void;
}) {
  const [step, setStep] = useState<CheckoutStep>("idle");
  const [busy, setBusy] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [confirmedRef, setConfirmedRef] = useState<{
    orderId: string;
    paymentId?: string;
    certificateId?: string;
  } | null>(null);
  const [sandboxOrder, setSandboxOrder] = useState<CheckoutOrderState | null>(null);

  const isCourse =
    orderKind === "programme_enrollment" || orderKind === "course_enrollment";
  const alreadyCompleted = isCourse ? alreadyEnrolled : alreadyIssued;

  const summaryItems =
    whatYouReceive && whatYouReceive.length > 0
      ? whatYouReceive
      : isCourse
        ? [
            "Complete course modules, written notes, and curated video lessons",
            "Assignments, graded assessment, and mentor-reviewed practical project",
            "Automatic internship track activation with structured tasks",
            "Included official Internship Completion Certificate (₹0 extra after approval)",
          ]
        : [
            "Official QR-verified completion certificate included in your programme",
            "Unique public verification URL to share with employers",
            "Printable certificate copy",
          ];

  const loadRazorpayScript = (): Promise<boolean> =>
    new Promise((resolve) => {
      if (typeof window !== "undefined" && window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });

  const handleOpenSummary = () => {
    setErrorMessage("");
    setStatusMessage("");
    setStep("summary");
  };

  const handleProceedToPay = async () => {
    setBusy(true);
    setErrorMessage("");
    setStatusMessage("");

    try {
      const payload = isCourse
        ? { orderKind: "programme_enrollment", courseId }
        : {
            orderKind: "certificate",
            productId,
            internshipApplicationId: internshipApplicationId ?? null,
          };

      const response = await fetch("/api/payments/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Could not start payment right now.");
      }

      const order = data.order as { razorpay_order_id: string; amount_paise: number };

      if (data.isSimulated || !data.keyId) {
        setSandboxOrder({
          razorpayOrderId: order.razorpay_order_id,
          amountPaise: order.amount_paise,
          itemName: productName,
          isSimulated: true,
        });
        setStep("gateway");
        setBusy(false);
        return;
      }

      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded || !window.Razorpay) {
        throw new Error("Could not load Razorpay payment window. Please try again.");
      }

      setStep("idle");
      const rzp = new window.Razorpay({
        key: data.keyId,
        amount: order.amount_paise,
        currency: "INR",
        name: "Touch Grass Later",
        description: productName,
        order_id: order.razorpay_order_id,
        prefill: {
          name: studentName ?? "",
          email: studentEmail ?? "",
        },
        theme: { color: "#b9a9d6" },
        handler: async (paymentRes: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          setBusy(true);
          try {
            const verifyRes = await fetch("/api/payments/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpayOrderId: paymentRes.razorpay_order_id,
                razorpayPaymentId: paymentRes.razorpay_payment_id,
                razorpaySignature: paymentRes.razorpay_signature,
              }),
            });
            const verifyData = await verifyRes.json();
            if (!verifyRes.ok) {
              throw new Error(verifyData.error ?? "Payment verification failed.");
            }
            setConfirmedRef({
              orderId: paymentRes.razorpay_order_id,
              paymentId: paymentRes.razorpay_payment_id,
              certificateId: verifyData.issuance?.certificate_id,
            });
            if (isCourse) {
              setStatusMessage(
                "Payment confirmed! Course lessons, practical project, and your linked internship track are now unlocked.",
              );
            } else {
              setStatusMessage(
                verifyData.issuance
                  ? `Certificate ${verifyData.issuance.certificate_id} is ready.`
                  : "Your included certificate is ready.",
              );
            }
            setStep("success");
            onSuccess?.();
          } catch (verifyErr) {
            setErrorMessage(
              verifyErr instanceof Error
                ? verifyErr.message
                : "Payment could not be verified. Please contact support or try again.",
            );
            setStep("failed");
          } finally {
            setBusy(false);
          }
        },
        modal: {
          ondismiss: async () => {
            await fetch("/api/payments/fail", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpayOrderId: order.razorpay_order_id,
                status: "cancelled",
                reason: "Student closed Razorpay checkout window",
              }),
            }).catch(() => {});
            setErrorMessage("Payment was cancelled. No money was charged.");
            setStep("failed");
            setBusy(false);
          },
        },
      });

      rzp.on("payment.failed", async (failEvent: unknown) => {
        const desc =
          typeof failEvent === "object" &&
          failEvent !== null &&
          "error" in failEvent &&
          typeof (failEvent as { error?: { description?: string } }).error?.description === "string"
            ? (failEvent as { error: { description: string } }).error.description
            : "Payment failed during checkout.";
        await fetch("/api/payments/fail", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            razorpayOrderId: order.razorpay_order_id,
            status: "failed",
            reason: desc,
          }),
        }).catch(() => {});
        setErrorMessage(desc);
        setStep("failed");
        setBusy(false);
      });

      rzp.open();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Could not start payment.");
      setStep("failed");
      setBusy(false);
    }
  };

  const runSandboxAction = async (
    outcome: "success" | "invalid_signature" | "failed" | "cancelled",
    deferSuccessView = false,
  ) => {
    if (!sandboxOrder) return;
    setBusy(true);
    setErrorMessage("");
    setStatusMessage("");

    try {
      if (outcome === "failed" || outcome === "cancelled") {
        const res = await fetch("/api/payments/fail", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            razorpayOrderId: sandboxOrder.razorpayOrderId,
            status: outcome,
            reason:
              outcome === "failed"
                ? "Simulated payment failure in Razorpay Test Mode"
                : "Student cancelled checkout in Razorpay Test Mode",
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Could not cancel payment.");
        setErrorMessage(
          outcome === "failed"
            ? isCourse
              ? "Your test payment did not go through. No money was charged—you can try again below."
              : "Your test payment did not go through. Your completed work stays safe, and you can retry anytime."
            : "Checkout cancelled. No payment was charged.",
        );
        setSandboxOrder(null);
        setStep("failed");
        return;
      }

      const simPaymentId = `pay_sim_${Date.now()}`;
      const simSignature =
        outcome === "invalid_signature"
          ? "invalid_signature"
          : `sim_sig_${sandboxOrder.razorpayOrderId}`;

      const res = await fetch("/api/payments/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          razorpayOrderId: sandboxOrder.razorpayOrderId,
          razorpayPaymentId: simPaymentId,
          razorpaySignature: simSignature,
          paymentMethod: "upi_test",
          simulateTestCheckout: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Payment signature could not be verified.");
      }

      setConfirmedRef({
        orderId: sandboxOrder.razorpayOrderId,
        paymentId: simPaymentId,
        certificateId: data.issuance?.certificate_id,
      });

      if (isCourse) {
        setStatusMessage(
          "Payment confirmed! Course modules, practical project, and your internship track are now unlocked.",
        );
      } else {
        setStatusMessage(
          data.issuance
            ? `Certificate ${data.issuance.certificate_id} is now issued.`
            : "Your included certificate is ready.",
        );
      }

      if (!deferSuccessView) {
        setSandboxOrder(null);
        setStep("success");
      }
      onSuccess?.();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Payment verification failed.");
      if (deferSuccessView) throw err;
    } finally {
      setBusy(false);
    }
  };

  const disabledReason = alreadyCompleted
    ? isCourse
      ? "You are already enrolled in this programme."
      : "You have already received this certificate."
    : !eligible
      ? "Complete the required steps above to unlock this certificate."
      : "";

  return (
    <div className="space-y-2.5">
      <button
        type="button"
        disabled={busy || !eligible || alreadyCompleted}
        onClick={handleOpenSummary}
        className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#f4f3ef] px-5 py-3 text-xs font-medium text-[#111111] transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-40 whitespace-nowrap shrink-0"
      >
        {busy ? (
          <Loader2 size={14} className="animate-spin" aria-hidden="true" />
        ) : (
          <CreditCard size={14} aria-hidden="true" />
        )}
        {alreadyCompleted
          ? isCourse
            ? "Enrolled"
            : "Certificate issued"
          : isCourse
            ? `Enrol Now · ${formatInrFromPaise(pricePaise)}`
            : "Claim Included Certificate"}
      </button>

      {disabledReason && !alreadyCompleted && (
        <p className="text-xs text-white/55">{disabledReason}</p>
      )}

      {statusMessage && step === "idle" && (
        <p role="status" className="flex items-center gap-2 text-xs text-emerald-300">
          <CheckCircle2 size={14} aria-hidden="true" />
          <span>{statusMessage}</span>
        </p>
      )}

      {errorMessage && step === "idle" && (
        <p role="alert" className="flex items-center gap-2 text-xs text-rose-300">
          <AlertCircle size={14} aria-hidden="true" />
          <span>{errorMessage}</span>
        </p>
      )}

      {/* Step 1: Plain-English Order Summary Modal before invoking Razorpay */}
      {step === "summary" && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="order-summary-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
        >
          <div className="w-full max-w-md rounded-2xl border border-white/15 bg-[#121212] p-6 text-[#f4f3ef] shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-[#b9a9d6]">
                  Step 1 of 2 · Order Summary
                </p>
                <h3 id="order-summary-title" className="mt-1.5 text-lg font-medium tracking-[-0.03em]">
                  {productName}
                </h3>
                {courseDuration && (
                  <p className="mt-1 text-xs text-white/55">Duration: {courseDuration}</p>
                )}
              </div>
              <button
                type="button"
                aria-label="Close order summary"
                onClick={() => setStep("idle")}
                className="grid size-11 place-items-center rounded-full border border-white/10 text-white/70 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs">
              <div className="rounded-xl border border-white/10 bg-black/30 p-4">
                <p className="font-medium text-white">What you get after payment:</p>
                <ul className="mt-2.5 space-y-2 text-white/75">
                  {summaryItems.map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <CheckCircle2
                        size={14}
                        className="mt-0.5 shrink-0 text-emerald-300"
                        aria-hidden="true"
                      />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/30 px-4 py-3">
                <span className="text-white/65">Total to pay now</span>
                <span className="font-mono text-base font-semibold tabular-nums text-white">
                  {formatInrFromPaise(pricePaise)} INR
                </span>
              </div>

              <div className="flex items-start gap-2 rounded-xl border border-[#b9a9d6]/25 bg-[#b9a9d6]/10 p-3 text-[11px] leading-5 text-[#dfd5ef]">
                <ShieldCheck size={14} className="mt-0.5 shrink-0 text-[#b9a9d6]" aria-hidden="true" />
                <span>
                  {isCourse
                    ? "One-time single fee: covers course lessons, assignments, project review, internship participation, and your Internship Completion Certificate at ₹0 extra once approved."
                    : "Certificates are included at ₹0 extra once your required programme, project, and internship work are approved."}
                </span>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
              <button
                type="button"
                onClick={() => setStep("idle")}
                className="min-h-11 flex-1 rounded-full border border-white/15 px-4 py-2.5 text-xs text-white/80 hover:border-white/35"
              >
                Back
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleProceedToPay()}
                className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full bg-[#f4f3ef] px-5 py-2.5 text-xs font-medium text-[#111111] hover:bg-white disabled:opacity-50"
              >
                {busy ? (
                  <>
                    <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                    Opening payment...
                  </>
                ) : (
                  <>
                    Proceed to Pay · {formatInrFromPaise(pricePaise)}
                    <ArrowRight size={14} aria-hidden="true" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Interactive Razorpay Test Gateway Modal when Test Simulation is active */}
      {step === "gateway" && sandboxOrder && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="sandbox-checkout-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
        >
          <div className="w-full max-w-md rounded-2xl border border-white/15 bg-[#121212] p-6 text-[#f4f3ef] shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-[#b9a9d6]">
                  Step 2 of 2 · Secure Test Checkout
                </p>
                <h3 id="sandbox-checkout-title" className="mt-1.5 text-lg font-medium tracking-[-0.03em]">
                  {sandboxOrder.itemName}
                </h3>
              </div>
              <button
                type="button"
                aria-label="Cancel payment"
                onClick={() => void runSandboxAction("cancelled")}
                className="grid size-11 place-items-center rounded-full border border-white/10 text-white/65 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <div className="mt-4 space-y-2 rounded-xl border border-white/10 bg-black/30 p-4 text-xs">
              <div className="flex justify-between">
                <span className="text-white/55">Reference</span>
                <span className="font-mono text-white/85">{sandboxOrder.razorpayOrderId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/55">Amount</span>
                <span className="font-semibold tabular-nums text-white">
                  {formatInrFromPaise(sandboxOrder.amountPaise)} INR
                </span>
              </div>
              <p className="pt-2 text-xs leading-5 text-white/55">
                Test mode is active—no real money will be charged. Slide below to confirm your payment and unlock access immediately.
              </p>
            </div>

            {errorMessage && (
              <p role="alert" className="mt-3 flex items-center gap-2 rounded-xl border border-rose-400/30 bg-rose-950/25 px-3 py-2.5 text-xs text-rose-200">
                <AlertCircle size={14} className="shrink-0" aria-hidden="true" />
                <span>{errorMessage}</span>
              </p>
            )}

            <div className="mt-5 flex flex-col gap-3">
              <div className="flex flex-col items-center gap-1.5">
                <SlideCommit
                  label={`Slide to pay ${formatInrFromPaise(sandboxOrder.amountPaise)}`}
                  doneLabel="Paid"
                  errorLabel="Check payment"
                  trackColor="#1c1922"
                  handleColor="#f4f3ef"
                  successColor="#22c55e"
                  dangerColor="#e5484d"
                  width={276}
                  height={52}
                  disabled={busy}
                  onConfirm={() => runSandboxAction("success", true)}
                  onDone={() => {
                    window.setTimeout(() => {
                      setSandboxOrder(null);
                      setStep("success");
                    }, 550);
                  }}
                />
                <p className="text-xs text-white/50">
                  Drag across or focus the handle and press End to pay.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void runSandboxAction("failed")}
                  className="min-h-11 rounded-full border border-rose-300/30 px-3 py-2 text-xs text-rose-200 hover:bg-rose-300/10 disabled:opacity-50"
                >
                  Simulate payment issue
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void runSandboxAction("cancelled")}
                  className="min-h-11 rounded-full border border-white/15 px-3 py-2 text-xs text-white/75 hover:text-white disabled:opacity-50"
                >
                  Cancel checkout
                </button>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => void runSandboxAction("invalid_signature")}
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-amber-300/25 px-4 py-2 text-xs text-amber-200/90 hover:bg-amber-300/10 disabled:opacity-50"
              >
                <ShieldAlert size={13} aria-hidden="true" />
                Test invalid signature block
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Confirmation & Immediate Next Step */}
      {step === "success" && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="payment-success-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
        >
          <div className="w-full max-w-md rounded-2xl border border-emerald-400/35 bg-[#121212] p-6 text-[#f4f3ef] shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
              <div className="flex items-start gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-emerald-500/20 text-emerald-300">
                  <CheckCircle2 size={20} aria-hidden="true" />
                </span>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-emerald-300">
                    Payment Confirmed
                  </p>
                  <h3 id="payment-success-title" className="mt-1 text-lg font-medium tracking-[-0.03em]">
                    {isCourse ? "Programme Enrolment Active!" : "Certificate Issued!"}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                aria-label="Close confirmation"
                onClick={() => setStep("idle")}
                className="grid size-11 place-items-center rounded-full border border-white/10 text-white/65 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <p className="leading-5 text-white/80">
                {statusMessage ||
                  (isCourse
                    ? `You now have full access to ${productName}, its linked project, and its internship track.`
                    : `Your verified certificate for ${productName} is ready.`)}
              </p>

              {confirmedRef && (
                <div className="space-y-1.5 rounded-xl border border-white/10 bg-black/30 p-3.5 text-[11px] text-white/65">
                  <p>
                    Total paid (all-inclusive):{" "}
                    <strong className="text-white">{formatInrFromPaise(pricePaise)} INR</strong>
                  </p>
                  <p className="font-mono">Order: {confirmedRef.orderId}</p>
                  {confirmedRef.certificateId && (
                    <p className="font-mono text-emerald-300">
                      Certificate ID: {confirmedRef.certificateId}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
              {isCourse ? (
                <button
                  type="button"
                  onClick={() => {
                    setStep("idle");
                    onSuccess?.();
                  }}
                  className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full bg-[#f4f3ef] px-5 py-2.5 text-xs font-medium text-[#111111] hover:bg-white"
                >
                  Open Programme Workspace
                  <ArrowRight size={14} aria-hidden="true" />
                </button>
              ) : confirmedRef?.certificateId ? (
                <Link
                  href={`/verify/certificate/${encodeURIComponent(confirmedRef.certificateId)}`}
                  className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full bg-[#f4f3ef] px-5 py-2.5 text-xs font-medium text-[#111111] hover:bg-white"
                >
                  View Certificate
                  <ArrowRight size={14} aria-hidden="true" />
                </Link>
              ) : (
                <Link
                  href={continueHref ?? "/certificates"}
                  onClick={() => setStep("idle")}
                  className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full bg-[#f4f3ef] px-5 py-2.5 text-xs font-medium text-[#111111] hover:bg-white"
                >
                  Continue Learning
                  <ArrowRight size={14} aria-hidden="true" />
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Step 4: Payment Failed / Cancelled Retry State */}
      {step === "failed" && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="payment-failed-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
        >
          <div className="w-full max-w-md rounded-2xl border border-rose-400/35 bg-[#121212] p-6 text-[#f4f3ef] shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
              <div className="flex items-start gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-rose-500/20 text-rose-300">
                  <AlertCircle size={20} aria-hidden="true" />
                </span>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-rose-300">
                    Payment Not Completed
                  </p>
                  <h3 id="payment-failed-title" className="mt-1 text-lg font-medium tracking-[-0.03em]">
                    Nothing was charged
                  </h3>
                </div>
              </div>
              <button
                type="button"
                aria-label="Close notice"
                onClick={() => setStep("idle")}
                className="grid size-11 place-items-center rounded-full border border-white/10 text-white/65 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <p className="mt-4 text-xs leading-6 text-white/75">
              {errorMessage || "Your payment did not finish. You can review your order and try again."}
            </p>

            <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
              <button
                type="button"
                onClick={() => setStep("idle")}
                className="min-h-11 flex-1 rounded-full border border-white/15 px-4 py-2.5 text-xs text-white/80 hover:border-white/35"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setErrorMessage("");
                  setStep("summary");
                }}
                className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full bg-[#f4f3ef] px-5 py-2.5 text-xs font-medium text-[#111111] hover:bg-white"
              >
                Try Again
                <ArrowRight size={14} aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
