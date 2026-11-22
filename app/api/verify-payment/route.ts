import { NextResponse } from "next/server";
import { z } from "zod";
import {
  listOrders,
  resolveCurrentActor,
  verifyAndCaptureCheckoutPayment,
} from "@/lib/certifications/store";

const CanonicalVerifySchema = z.object({
  razorpay_order_id: z.string().trim().min(4).max(120).optional(),
  razorpay_payment_id: z.string().trim().min(4).max(120).optional(),
  razorpay_signature: z.string().trim().min(4).max(256).optional(),
  razorpayOrderId: z.string().trim().min(4).max(120).optional(),
  razorpayPaymentId: z.string().trim().min(4).max(120).optional(),
  razorpaySignature: z.string().trim().min(4).max(256).optional(),
  paymentMethod: z.string().trim().max(40).optional(),
  simulateTestCheckout: z.boolean().optional(),
});

export async function POST(request: Request) {
  const actor = await resolveCurrentActor({ request });
  if (!actor.user || actor.user.isSandbox) {
    return NextResponse.json({ verified: false, error: "Sign in required." }, { status: 401 });
  }

  const parsed = CanonicalVerifySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { verified: false, error: "Invalid payment verification payload." },
      { status: 400 },
    );
  }

  const orderId = parsed.data.razorpay_order_id ?? parsed.data.razorpayOrderId ?? "";
  const paymentId = parsed.data.razorpay_payment_id ?? parsed.data.razorpayPaymentId ?? "";
  const signature = parsed.data.razorpay_signature ?? parsed.data.razorpaySignature ?? "";

  if (!orderId || !paymentId || !signature) {
    return NextResponse.json(
      {
        verified: false,
        error:
          "Missing required fields: razorpay_order_id, razorpay_payment_id, and razorpay_signature are all required.",
      },
      { status: 400 },
    );
  }

  const userOrders = await listOrders(actor.user.id);
  const matchedOrder = userOrders.find((o) => o.razorpay_order_id === orderId);
  if (!matchedOrder) {
    return NextResponse.json(
      {
        verified: false,
        error: "Order record not found for the signed-in student.",
      },
      { status: 404 },
    );
  }

  const result = await verifyAndCaptureCheckoutPayment({
    user: actor.user,
    razorpayOrderId: orderId,
    razorpayPaymentId: paymentId,
    razorpaySignature: signature,
    paymentMethod: parsed.data.paymentMethod,
    simulateTestCheckout: parsed.data.simulateTestCheckout,
  });

  if (result.error && !result.payment) {
    return NextResponse.json(
      { verified: false, error: result.error },
      { status: result.status ?? 400 },
    );
  }

  return NextResponse.json(
    {
      verified: true,
      order_id: orderId,
      payment_id: paymentId,
      payment: result.payment,
      enrollment: result.enrollment ?? null,
      internshipApplication: result.internshipApplication ?? null,
      issuance: result.issuance ?? null,
    },
    { status: 200, headers: { "Cache-Control": "no-store" } },
  );
}
