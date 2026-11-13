import { NextResponse } from "next/server";
import { z } from "zod";
import {
  approveInternshipApplication,
  issueCertificateForVerifiedOrder,
  listOrders,
  listPayments,
  listProducts,
  requireAdminActor,
  revokeCertificateWithReason,
} from "@/lib/certifications/store";

const ActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("approve_internship"),
    applicationId: z.string().uuid(),
    mentorNotes: z.string().trim().max(500).optional(),
  }),
  z.object({
    action: z.literal("approve_issuance"),
    orderId: z.string().uuid(),
    recipientName: z.string().trim().min(2).max(120),
    recipientEmail: z.string().trim().email(),
  }),
  z.object({
    action: z.literal("revoke_certificate"),
    certificateId: z.string().trim().min(4).max(120),
    reason: z.string().trim().min(5).max(500),
  }),
]);

export async function POST(request: Request) {
  const auth = await requireAdminActor();
  if (auth.error) return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });

  const parsed = ActionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid issuance review payload." }, { status: 400 });
  }

  const data = parsed.data;

  if (data.action === "approve_internship") {
    const result = await approveInternshipApplication({
      applicationId: data.applicationId,
      adminId: auth.user.id,
      mentorNotes: data.mentorNotes,
    });
    if (result.error) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({ application: result.application });
  }

  if (data.action === "revoke_certificate") {
    const result = await revokeCertificateWithReason({
      certificateId: data.certificateId,
      reason: data.reason,
    });
    if (result.error) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({ issuance: result.issuance });
  }

  const [orders, payments] = await Promise.all([listOrders(), listPayments()]);
  const order = orders.find((o) => o.id === data.orderId);
  if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  const payment = payments.find((p) => p.order_id === order.id && p.payment_status === "captured") ?? null;

  const products = await listProducts(true);
  const product = products.find((p) => p.id === order.product_id);
  if (!product) return NextResponse.json({ error: "Product not found." }, { status: 404 });

  const result = await issueCertificateForVerifiedOrder({
    user: {
      id: order.user_id,
      email: data.recipientEmail,
      name: data.recipientName,
      role: "student",
      isSandbox: auth.user.isSandbox,
    },
    order,
    payment,
    approvedBy: auth.user.id,
  });

  if (result.error) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ issuance: result.issuance });
}
