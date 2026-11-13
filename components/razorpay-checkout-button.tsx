"use client";

import { useState } from "react";
import { AlertCircle, CheckCircle2, CreditCard, Loader2, ShieldAlert, X } from "lucide-react";
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

export function RazorpayCheckoutButton({
  orderKind = "certificate",
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
  onSuccess,
}: {
  orderKind?: "certificate" | "course_enrollment";
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
  onSuccess?: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [sandboxOrder, setSandboxOrder] = useState<CheckoutOrderState | null>(null);

  const isCourse = orderKind === "course_enrollment";
  const alreadyCompleted = isCourse ? alreadyEnrolled : alreadyIssued;

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

  const handleStartCheckout = async () => {
    setBusy(true);
    setErrorMessage("");
    setStatusMessage("");

    try {
      const payload = isCourse
        ? { orderKind: "course_enrollment", courseId }
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
        throw new Error(data.error ?? "Could not initiate checkout order.");
      }

      const order = data.order as { razorpay_order_id: string; amount_paise: number };

      if (data.isSimulated || !data.keyId) {
        setSandboxOrder({
          razorpayOrderId: order.razorpay_order_id,
          amountPaise: order.amount_paise,
          itemName: productName,
          isSimulated: true,
        });
        setBusy(false);
        return;
      }

      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded || !window.Razorpay) {
        throw new Error("Could not load Razorpay Checkout script.");
      }

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
              throw new Error(verifyData.error ?? "Signature verification failed.");
            }
            if (isCourse) {
              setStatusMessage("Payment verified. Course notes, videos, and project unlocked.");
            } else {
              setStatusMessage(
                verifyData.issuance
                  ? `Payment verified. Certificate ${verifyData.issuance.certificate_id} issued.`
                  : "Payment verified. Certificate issuance queued.",
              );
            }
            onSuccess?.();
          } catch (verifyErr) {
            setErrorMessage(
              verifyErr instanceof Error ? verifyErr.message : "Payment verification failed.",
            );
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
            setErrorMessage("Checkout cancelled. No payment was charged.");
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
            : "Payment failed in Razorpay checkout";
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
        setBusy(false);
      });

      rzp.open();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Checkout could not start.");
      setBusy(false);
    }
  };

  const runSandboxAction = async (
    outcome: "success" | "invalid_signature" | "failed" | "cancelled",
    deferModalClose = false,
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
                ? "Simulated card decline in Razorpay Test Sandbox"
                : "Student cancelled checkout in Razorpay Test Sandbox",
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed to update payment status.");
        setErrorMessage(
          outcome === "failed"
            ? isCourse
              ? "Simulated payment failure recorded. Retry checkout anytime to unlock this course."
              : "Simulated payment failure recorded. Internship participation remains unaffected."
            : "Checkout cancelled and recorded.",
        );
        setSandboxOrder(null);
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
        throw new Error(data.error ?? "Payment signature rejected.");
      }

      if (isCourse) {
        setStatusMessage("Test payment verified. Course notes, videos, and project unlocked.");
      } else {
        setStatusMessage(
          data.issuance
            ? `Test payment verified. Certificate ${data.issuance.certificate_id} issued.`
            : "Test payment verified.",
        );
      }
      if (!deferModalClose) {
        setSandboxOrder(null);
      }
      onSuccess?.();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Test verification error.");
      if (deferModalClose) throw err;
    } finally {
      setBusy(false);
    }
  };

  const disabledReason = alreadyCompleted
    ? isCourse
      ? "Already enrolled in this course"
      : "Certificate already issued"
    : !eligible
      ? "Complete eligibility checks first"
      : "";

  return (
    <div className="space-y-2.5">
      <button
        type="button"
        disabled={busy || !eligible || alreadyCompleted}
        onClick={() => void handleStartCheckout()}
        className="inline-flex items-center gap-2 rounded-full bg-[#f4f3ef] px-5 py-3 text-xs font-medium text-[#111111] transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-40 whitespace-nowrap shrink-0"
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
            ? `Enroll & Pay · ${formatInrFromPaise(pricePaise)}`
            : pricePaise === 0
              ? "Claim free certificate"
              : `Get Certificate · ${formatInrFromPaise(pricePaise)}`}
      </button>

      {disabledReason && !alreadyCompleted && (
        <p className="text-[11px] text-white/45">{disabledReason}</p>
      )}

      {statusMessage && (
        <p role="status" className="flex items-center gap-2 text-xs text-emerald-300">
          <CheckCircle2 size={14} aria-hidden="true" />
          <span>{statusMessage}</span>
        </p>
      )}

      {errorMessage && (
        <p role="alert" className="flex items-center gap-2 text-xs text-rose-300">
          <AlertCircle size={14} aria-hidden="true" />
          <span>{errorMessage}</span>
        </p>
      )}

      {sandboxOrder && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="sandbox-checkout-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
        >
          <div className="w-full max-w-md rounded-2xl border border-white/15 bg-[#121212] p-6 text-[#f4f3ef] shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-[#b9a9d6]">
                  Razorpay Test Mode Simulator
                </p>
                <h3 id="sandbox-checkout-title" className="mt-1.5 text-lg font-medium tracking-[-0.03em]">
                  {sandboxOrder.itemName}
                </h3>
              </div>
              <button
                type="button"
                aria-label="Close test checkout"
                onClick={() => void runSandboxAction("cancelled")}
                className="grid size-8 place-items-center rounded-full border border-white/10 text-white/60 hover:text-white"
              >
                <X size={15} />
              </button>
            </div>

            <div className="mt-4 space-y-2 rounded-xl border border-white/10 bg-black/30 p-4 text-xs">
              <div className="flex justify-between">
                <span className="text-white/50">Order ID</span>
                <span className="font-mono text-white/85">{sandboxOrder.razorpayOrderId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">Payable Amount (INR)</span>
                <span className="font-semibold tabular-nums text-white">
                  {formatInrFromPaise(sandboxOrder.amountPaise)}
                </span>
              </div>
              <p className="pt-2 text-[11px] leading-5 text-white/45">
                Interactive Razorpay Test Mode sandbox: verify valid payment signatures, signature rejection, failures, and cancellations without real charges.
              </p>
            </div>

            <div className="mt-5 flex flex-col gap-3">
              <div className="flex flex-col items-center gap-1.5">
                <SlideCommit
                  label={`Slide to pay ${formatInrFromPaise(sandboxOrder.amountPaise)}`}
                  doneLabel="Paid"
                  errorLabel="Payment failed"
                  trackColor="#1c1922"
                  handleColor="#f4f3ef"
                  successColor="#22c55e"
                  dangerColor="#e5484d"
                  width={276}
                  height={52}
                  disabled={busy}
                  onConfirm={() => runSandboxAction("success", true)}
                  onDone={() => {
                    window.setTimeout(() => setSandboxOrder(null), 650);
                  }}
                />
                <p className="text-[11px] text-white/45">
                  Slide across or focus and press End to confirm test payment.
                </p>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => void runSandboxAction("invalid_signature")}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-amber-300/30 px-4 py-2.5 text-xs text-amber-200 hover:bg-amber-300/10 disabled:opacity-50"
              >
                <ShieldAlert size={13} aria-hidden="true" />
                Test invalid signature rejection
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void runSandboxAction("failed")}
                  className="rounded-full border border-rose-300/30 px-3 py-2 text-xs text-rose-200 hover:bg-rose-300/10 disabled:opacity-50"
                >
                  Simulate failure
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void runSandboxAction("cancelled")}
                  className="rounded-full border border-white/15 px-3 py-2 text-xs text-white/70 hover:text-white disabled:opacity-50"
                >
                  Cancel checkout
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
