import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createCourseEnrollmentOrder,
  resolveCurrentActor,
} from "@/lib/certifications/store";
import { RazorpayGatewayError } from "@/lib/payments/razorpay";

const CourseOrderSchema = z
  .object({
    courseId: z.string().trim().min(2).max(120),
    orderKind: z.enum(["programme_enrollment", "course_enrollment"]).optional(),
  })
  .strict();

export async function POST(request: Request) {
  const actor = await resolveCurrentActor({ request });
  if (!actor.user || actor.user.isSandbox) {
    return NextResponse.json(
      { error: "Sign in required to create an order." },
      { status: 401 },
    );
  }

  const rawBody = await request.json().catch(() => null);
  const parsed = CourseOrderSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error:
          "Invalid order payload. Programme prices are derived strictly on the server from the courseId catalog record.",
      },
      { status: 400 },
    );
  }

  try {
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
  } catch (error) {
    const status = error instanceof RazorpayGatewayError ? error.statusCode : 500;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Order creation failed." },
      { status },
    );
  }
}
