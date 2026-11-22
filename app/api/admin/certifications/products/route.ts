import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createOrUpdateProduct,
  listProducts,
  requireAdminActor,
} from "@/lib/certifications/store";

const ProductPayloadSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().min(5).max(800),
  certificateType: z.enum([
    "internship",
    "course_completion",
    "project_completion",
    "special_achievement",
  ]),
  pricePaise: z.number().int().min(0),
  enabled: z.boolean(),
});

export async function GET(request: Request) {
  const auth = await requireAdminActor(request);
  if (auth.error) return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });
  const products = await listProducts(true);
  return NextResponse.json({ products }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const auth = await requireAdminActor(request);
  if (auth.error) return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });

  const parsed = ProductPayloadSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid certification product details." }, { status: 400 });
  }

  const result = await createOrUpdateProduct(parsed.data);
  if (result.error) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ product: result.product }, { status: 201 });
}

export async function PATCH(request: Request) {
  const auth = await requireAdminActor(request);
  if (auth.error) return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });

  const parsed = ProductPayloadSchema.extend({ id: z.string().uuid() }).safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid certification product update." }, { status: 400 });
  }

  const result = await createOrUpdateProduct(parsed.data);
  if (result.error) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ product: result.product }, { status: 200 });
}
