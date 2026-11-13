import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createCertificationOrder,
  createCourseEnrollmentOrder,
  resolveCurrentActor,
} from "@/lib/certifications/store";

const CertificateOrderSchema = z.object({
  orderKind: z.literal("certificate").optional(),
  productId: z.string().uuid(),
  internshipApplicationId: z.string().uuid().nullable().optional(),
});

const CourseOrderSchema = z.object({
  orderKind: z.literal("course_enrollment"),
  courseId: z.string().trim().min(2).max(120),
});

const CreateOrderSchema = z.union([CourseOrderSchema, CertificateOrderSchema]);

export async function POST(request: Request) {
  const actor = await resolveCurrentActor();
  if (!actor.user) {
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
    if (body.data.orderKind === "course_enrollment") {
      const result = await createCourseEnrollmentOrder({
        user: actor.user,
        courseId: body.data.courseId,
      });
      if (result.error || !result.order) {
        return NextResponse.json(
          { error: result.error ?? "Unable to create course order." },
          { status: result.status ?? 400 },
        );
      }
      return NextResponse.json(
        {
          order: result.order,
          keyId: result.keyId ?? null,
          isSimulated: Boolean(result.isSimulated),
          courseTitle: result.courseTitle ?? null,
        },
        { status: 201, headers: { "Cache-Control": "no-store" } },
      );
    }

    const result = await createCertificationOrder({
      user: actor.user,
      productId: body.data.productId,
      internshipApplicationId: body.data.internshipApplicationId ?? null,
    });
    if (result.error || !result.order) {
      return NextResponse.json(
        { error: result.error ?? "Unable to create order." },
        { status: result.status ?? 400 },
      );
    }

    return NextResponse.json(
      {
        order: result.order,
        keyId: result.keyId ?? null,
        isSimulated: Boolean(result.isSimulated),
        product: result.product,
      },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Order creation failed." },
      { status: 500 },
    );
  }
}
