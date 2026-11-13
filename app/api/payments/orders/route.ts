import { NextResponse } from "next/server";
import { z } from "zod";
import { createCertificationOrder, resolveCurrentActor } from "@/lib/certifications/store";

const CreateOrderSchema = z.object({
  productId: z.string().uuid(),
  internshipApplicationId: z.string().uuid().nullable().optional(),
});

export async function POST(request: Request) {
  const actor = await resolveCurrentActor();
  if (!actor.user) {
    return NextResponse.json({ error: "Sign in required to initiate checkout." }, { status: 401 });
  }

  const body = CreateOrderSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "Invalid order request." }, { status: 400 });
  }

  try {
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
