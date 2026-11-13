import { NextResponse } from "next/server";
import { z } from "zod";
import { recordFailedOrCancelledPayment, resolveCurrentActor } from "@/lib/certifications/store";

const FailSchema = z.object({
  razorpayOrderId: z.string().trim().min(4).max(120),
  razorpayPaymentId: z.string().trim().max(120).optional(),
  status: z.enum(["failed", "cancelled"]),
  reason: z.string().trim().min(1).max(300),
});

export async function POST(request: Request) {
  const actor = await resolveCurrentActor();
  if (!actor.user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const parsed = FailSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payment failure payload." }, { status: 400 });
  }

  const result = await recordFailedOrCancelledPayment({
    user: actor.user,
    razorpayOrderId: parsed.data.razorpayOrderId,
    razorpayPaymentId: parsed.data.razorpayPaymentId,
    status: parsed.data.status,
    reason: parsed.data.reason,
  });

  if (result.error) return NextResponse.json({ error: result.error }, { status: 404 });
  return NextResponse.json({ recorded: true, order: result.order }, { headers: { "Cache-Control": "no-store" } });
}
