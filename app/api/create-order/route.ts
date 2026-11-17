import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createCourseEnrollmentOrder,
  resolveCurrentActor,
} from "@/lib/certifications/store";
import {
  createRazorpayOrder,
  RazorpayGatewayError,
} from "@/lib/payments/razorpay";

const CourseOrderSchema = z.object({
  courseId: z.string().trim().min(2).max(120),
  orderKind: z.enum(["programme_enrollment", "course_enrollment"]).optional(),
});

const DirectAmountOrderSchema = z.object({
  amount: z.number(),
  currency: z.literal("INR").optional().default("INR"),
  receipt: z.string().trim().min(2).max(40).optional(),
  notes: z.record(z.string(), z.string()).optional(),
});

const CreateOrderRequestSchema = z.union([
  CourseOrderSchema,
  DirectAmountOrderSchema,
]);

export async function POST(request: Request) {
  const actor = await resolveCurrentActor();
  if (!actor.user || actor.user.isSandbox) {
    return NextResponse.json(
      { error: "Sign in required to create an order." },
      { status: 401 },
    );
  }

  const rawBody = await request.json().catch(() => null);
  const parsed = CreateOrderRequestSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid order request payload." },
      { status: 400 },
    );
  }

  try {
    if ("courseId" in parsed.data) {
      const result = await createCourseEnrollmentOrder({
        user: actor.user,
        courseId: parsed.data.courseId,
        orderKind: parsed.data.orderKind ?? "programme_enrollment",
      });
      if (result.error || !result.order) {
        return NextResponse.json(
          { error: result.error ?? "Unable to create Razorpay order." },
          { status: result.status ?? 400 },
        );
      }

      return NextResponse.json(
        {
          order_id: result.order.razorpay_order_id,
          amount: result.order.amount_paise,
          currency: result.order.currency,
          key_id: result.keyId ?? null,
          isSimulated: Boolean(result.isSimulated),
          order: result.order,
          courseTitle: result.courseTitle ?? null,
        },
        { status: 201, headers: { "Cache-Control": "no-store" } },
      );
    }

    const rpOrder = await createRazorpayOrder({
      amountPaise: parsed.data.amount,
      currency: parsed.data.currency,
      receipt: parsed.data.receipt ?? `tgl_ord_${Date.now()}`,
      notes: parsed.data.notes,
    });

    return NextResponse.json(
      {
        order_id: rpOrder.razorpayOrderId,
        amount: rpOrder.amountPaise,
        currency: rpOrder.currency,
        key_id: rpOrder.keyId,
        isSimulated: rpOrder.isSimulated,
      },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const status = error instanceof RazorpayGatewayError ? error.statusCode : 500;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Order creation failed." },
      { status },
    );
  }
}
