import { NextResponse } from "next/server";
import { z } from "zod";
import {
  listOrders,
  resolveCurrentActor,
  verifyAndCaptureCheckoutPayment,
} from "@/lib/certifications/store";

const VerifySchema = z.object({
  razorpayOrderId: z.string().trim().min(4).max(120),
  razorpayPaymentId: z.string().trim().min(4).max(120),
  razorpaySignature: z.string().trim().min(4).max(256),
  paymentMethod: z.string().trim().max(40).optional(),
  simulateTestCheckout: z.boolean().optional(),
});

export async function POST(request: Request) {
  const actor = await resolveCurrentActor({ request });
  if (!actor.user || actor.user.isSandbox) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const parsed = VerifySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Missing required Razorpay verification fields." }, { status: 400 });
  }

  const userOrders = await listOrders(actor.user.id);
  const matchedOrder = userOrders.find(
    (o) => o.razorpay_order_id === parsed.data.razorpayOrderId,
  );
  if (!matchedOrder) {
    return NextResponse.json(
      { error: "Order record not found for the signed-in student." },
      { status: 404 },
    );
  }

  const result = await verifyAndCaptureCheckoutPayment({
    user: actor.user,
    razorpayOrderId: parsed.data.razorpayOrderId,
    razorpayPaymentId: parsed.data.razorpayPaymentId,
    razorpaySignature: parsed.data.razorpaySignature,
    paymentMethod: parsed.data.paymentMethod,
    simulateTestCheckout: parsed.data.simulateTestCheckout,
  });

  if (result.error && !result.payment) {
    return NextResponse.json({ error: result.error }, { status: result.status ?? 400 });
  }

  return NextResponse.json(
    {
      verified: true,
      payment: result.payment,
      issuance: result.issuance ?? null,
      enrollment: result.enrollment ?? null,
      internshipApplication: result.internshipApplication ?? null,
      issuanceError: result.error ?? null,
    },
    { status: 200, headers: { "Cache-Control": "no-store" } },
  );
}
