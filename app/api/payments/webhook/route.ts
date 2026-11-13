import { NextResponse } from "next/server";
import { processRazorpayWebhookEvent } from "@/lib/certifications/store";

export async function POST(request: Request) {
  // Always read the exact raw body before JSON parsing so HMAC-SHA256 verification matches Razorpay bytes.
  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature");
  const eventIdHeader = request.headers.get("x-razorpay-event-id");

  const result = await processRazorpayWebhookEvent({
    rawBody,
    signature,
    eventIdHeader,
  });

  return NextResponse.json(
    {
      processingStatus: result.processingStatus,
      message: result.message,
    },
    { status: result.status, headers: { "Cache-Control": "no-store" } },
  );
}
