import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createCourseEnrollmentOrder,
  resolveCurrentActor,
} from "@/lib/certifications/store";
import { RazorpayGatewayError } from "@/lib/payments/razorpay";

const ProgrammeOrderSchema = z.object({
  orderKind: z.enum(["programme_enrollment", "course_enrollment"]),
  courseId: z.string().trim().min(2).max(120),
});

const LegacyCertificateOrderSchema = z.object({
  orderKind: z.literal("certificate").optional(),
  productId: z.string().uuid().optional(),
  internshipApplicationId: z.string().uuid().nullable().optional(),
});

const CreateOrderSchema = z.union([ProgrammeOrderSchema, LegacyCertificateOrderSchema]);

export async function POST(request: Request) {
  const actor = await resolveCurrentActor();
  if (!actor.user || actor.user.isSandbox) {
    return NextResponse.json(
      { error: "Sign in required to initiate checkout." },
      { status: 401 },
    );
  }

  const rawBody = await request.json().catch(() => null);
  const body = CreateOrderSchema.safeParse(rawBody);
  if (!body.success) {
    return NextResponse.json({ error: "Invalid order request." }, { status: 400 });
  }

  try {
    if ("courseId" in body.data) {
      const result = await createCourseEnrollmentOrder({
        user: actor.user,
        courseId: body.data.courseId,
        orderKind: body.data.orderKind,
      });
      if (result.error || !result.order) {
        return NextResponse.json(
          { error: result.error ?? "Unable to create programme enrolment order." },
          { status: result.status ?? 400 },
        );
      }
      return NextResponse.json(
        {
          order: result.order,
          order_id: result.order.razorpay_order_id,
          amount: result.order.amount_paise,
          currency: result.order.currency,
          keyId: result.keyId ?? null,
          isSimulated: Boolean(result.isSimulated),
          courseTitle: result.courseTitle ?? null,
        },
        { status: 201, headers: { "Cache-Control": "no-store" } },
      );
    }

    return NextResponse.json(
      {
        error:
          "Separate certificate payments have been retired. Your official completion certificate is included at ₹0 extra inside Programme Enrolment once approved.",
      },
      { status: 400 },
    );
  } catch (error) {
    const status = error instanceof RazorpayGatewayError ? error.statusCode : 500;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Order creation failed." },
      { status },
    );
  }
}
