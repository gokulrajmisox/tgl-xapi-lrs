import { NextResponse } from "next/server";
import { z } from "zod";
import { processAdminRefund, requireAdminActor } from "@/lib/certifications/store";

const RefundSchema = z.object({
  paymentId: z.string().uuid(),
  reason: z.string().trim().min(3).max(300),
});

export async function POST(request: Request) {
  const auth = await requireAdminActor(request);
  if (auth.error) return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });

  const parsed = RefundSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Payment ID and refund reason are required." }, { status: 400 });
  }

  try {
    const result = await processAdminRefund(parsed.data);
    if (result.error) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({ payment: result.payment }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Refund failed." },
      { status: 500 },
    );
  }
}
