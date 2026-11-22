import { NextResponse } from "next/server";
import { z } from "zod";
import {
  addInternshipTask,
  approveInternshipApplication,
  createAdminInternship,
  evaluateInternshipTaskSubmission,
  issueCertificateForVerifiedOrder,
  listOrders,
  listPayments,
  listProducts,
  regenerateCertificateByAdmin,
  requireAdminActor,
  revokeCertificateWithReason,
} from "@/lib/certifications/store";

const ActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("evaluate_task"),
    applicationId: z.string().uuid(),
    taskId: z.string().trim().min(2),
    decision: z.enum(["approved", "revision_required"]),
    mentorFeedback: z.string().trim().min(5).max(800),
    scoreLabel: z.string().trim().max(80).optional(),
  }),
  z.object({
    action: z.literal("create_internship"),
    title: z.string().trim().min(4).max(160),
    track: z.string().trim().min(2).max(80),
    description: z.string().trim().min(10).max(800),
    durationWeeks: z.number().int().min(1).max(26),
    requiredCourseSlug: z.string().trim().optional().nullable(),
    requiredProjectSlug: z.string().trim().optional().nullable(),
    requireProjectApproval: z.boolean().default(true),
    initialTaskTitle: z.string().trim().min(4).max(140),
    initialTaskBrief: z.string().trim().min(8).max(400),
    initialTaskDeadline: z.string().trim().min(2).max(60),
    initialTaskFormat: z.string().trim().min(2).max(80).default("GitHub URL"),
  }),
  z.object({
    action: z.literal("add_internship_task"),
    internshipId: z.string().uuid(),
    title: z.string().trim().min(4).max(140),
    brief: z.string().trim().min(8).max(400),
    deadlineLabel: z.string().trim().min(2).max(60),
    deliverableFormat: z.string().trim().min(2).max(80).default("GitHub URL"),
    requireProjectApproval: z.boolean().optional(),
  }),
  z.object({
    action: z.literal("approve_internship"),
    applicationId: z.string().uuid(),
    mentorNotes: z.string().trim().max(500).optional(),
    finalScoreLabel: z.string().trim().max(80).optional(),
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
  z.object({
    action: z.literal("regenerate_certificate"),
    certificateId: z.string().trim().min(4).max(120),
    recipientName: z.string().trim().min(2).max(120).optional(),
    reason: z.string().trim().max(500).optional(),
  }),
]);

export async function POST(request: Request) {
  const auth = await requireAdminActor(request);
  if (auth.error) return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });

  const parsed = ActionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid issuance review payload." },
      { status: 400 },
    );
  }

  const data = parsed.data;

  if (data.action === "evaluate_task") {
    const result = await evaluateInternshipTaskSubmission({
      applicationId: data.applicationId,
      taskId: data.taskId,
      decision: data.decision,
      mentorFeedback: data.mentorFeedback,
      scoreLabel: data.scoreLabel,
    });
    if (result.error) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({ application: result.application });
  }

  if (data.action === "create_internship") {
    const result = await createAdminInternship({
      title: data.title,
      track: data.track,
      description: data.description,
      durationWeeks: data.durationWeeks,
      requiredCourseSlug: data.requiredCourseSlug || null,
      requiredProjectSlug: data.requiredProjectSlug || null,
      requireProjectApproval: data.requireProjectApproval,
      tasks: [
        {
          title: data.initialTaskTitle,
          brief: data.initialTaskBrief,
          deadlineLabel: data.initialTaskDeadline,
          deliverableFormat: data.initialTaskFormat,
        },
      ],
    });
    if (result.error) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({ internship: result.internship }, { status: 201 });
  }

  if (data.action === "add_internship_task") {
    const result = await addInternshipTask({
      internshipId: data.internshipId,
      title: data.title,
      brief: data.brief,
      deadlineLabel: data.deadlineLabel,
      deliverableFormat: data.deliverableFormat,
      requireProjectApproval: data.requireProjectApproval,
    });
    if (result.error) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({ internship: result.internship });
  }

  if (data.action === "approve_internship") {
    const result = await approveInternshipApplication({
      applicationId: data.applicationId,
      adminId: auth.user.id,
      mentorNotes: data.mentorNotes,
      finalScoreLabel: data.finalScoreLabel,
    });
    if (result.error) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({
      application: result.application,
      issuance: result.issuance ?? null,
    });
  }

  if (data.action === "revoke_certificate") {
    const result = await revokeCertificateWithReason({
      certificateId: data.certificateId,
      reason: data.reason,
    });
    if (result.error) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({ issuance: result.issuance });
  }

  if (data.action === "regenerate_certificate") {
    const result = await regenerateCertificateByAdmin({
      certificateId: data.certificateId,
      adminId: auth.user.id,
      recipientName: data.recipientName,
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
