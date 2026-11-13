import { NextResponse } from "next/server";
import { z } from "zod";
import { resolveCurrentActor, verifyAndCaptureCheckoutPayment } from "@/lib/certifications/store";

const VerifySchema = z.object({
  razorpayOrderId: z.string().trim().min(4).max(120),
  razorpayPaymentId: z.string().trim().min(4).max(120),
  razorpaySignature: z.string().trim().min(4).max(256),
  paymentMethod: z.string().trim().max(40).optional(),
  simulateTestCheckout: z.boolean().optional(),
});

export async function POST(request: Request) {
  const actor = await resolveCurrentActor();
  if (!actor.user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const parsed = VerifySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Missing required Razorpay verification fields." }, { status: 400 });
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
      issuanceError: result.error ?? null,
    },
    { status: 200, headers: { "Cache-Control": "no-store" } },
  );
}
