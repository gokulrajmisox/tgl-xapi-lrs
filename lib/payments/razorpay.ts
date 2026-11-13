import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export type RazorpayMode = "test" | "live" | "unconfigured";

export type RazorpayPublicConfig = {
  keyId: string | null;
  mode: RazorpayMode;
  configured: boolean;
};

export function getRazorpayPublicConfig(): RazorpayPublicConfig {
  const keyId = process.env.RAZORPAY_KEY_ID?.trim() || null;
  const hasSecret = Boolean(process.env.RAZORPAY_KEY_SECRET?.trim());
  if (!keyId || !hasSecret) {
    return { keyId: null, mode: "unconfigured", configured: false };
  }
  const mode: RazorpayMode = keyId.startsWith("rzp_live_") ? "live" : "test";
  return { keyId, mode, configured: true };
}

function getRazorpaySecrets() {
  return {
    keyId: process.env.RAZORPAY_KEY_ID?.trim() || "",
    keySecret: process.env.RAZORPAY_KEY_SECRET?.trim() || "",
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET?.trim() || "",
  };
}

export function verifyRazorpayPaymentSignature(params: {
  orderId: string;
  paymentId: string;
  signature: string;
  secretOverride?: string;
}): boolean {
  const secret = params.secretOverride ?? getRazorpaySecrets().keySecret;
  if (!secret || !params.orderId || !params.paymentId || !params.signature) {
    return false;
  }
  const expectedHex = createHmac("sha256", secret)
    .update(`${params.orderId}|${params.paymentId}`)
    .digest("hex");

  const expectedBuf = Buffer.from(expectedHex, "utf8");
  const receivedBuf = Buffer.from(params.signature.trim(), "utf8");
  if (expectedBuf.length !== receivedBuf.length) {
    return false;
  }
  return timingSafeEqual(expectedBuf, receivedBuf);
}

export function verifyRazorpayWebhookSignature(params: {
  rawBody: string;
  signature: string | null;
  webhookSecretOverride?: string;
}): boolean {
  const secret = params.webhookSecretOverride ?? getRazorpaySecrets().webhookSecret;
  if (!secret || !params.signature || !params.rawBody) {
    return false;
  }
  const expectedHex = createHmac("sha256", secret)
    .update(params.rawBody, "utf8")
    .digest("hex");

  const expectedBuf = Buffer.from(expectedHex, "utf8");
  const receivedBuf = Buffer.from(params.signature.trim(), "utf8");
  if (expectedBuf.length !== receivedBuf.length) {
    return false;
  }
  return timingSafeEqual(expectedBuf, receivedBuf);
}

export type CreateOrderResult = {
  razorpayOrderId: string;
  amountPaise: number;
  currency: "INR";
  mode: "razorpay_test" | "razorpay_live" | "simulated_test";
  isSimulated: boolean;
  keyId: string | null;
};

export async function createRazorpayOrder(params: {
  amountPaise: number;
  currency?: "INR";
  receipt: string;
  notes?: Record<string, string>;
}): Promise<CreateOrderResult> {
  const { keyId, keySecret } = getRazorpaySecrets();
  const currency = params.currency ?? "INR";

  if (!keyId || !keySecret) {
    // Explicit sandbox simulation when Razorpay credentials are not yet configured in environment.
    return {
      razorpayOrderId: `order_sim_${randomBytes(10).toString("hex")}`,
      amountPaise: params.amountPaise,
      currency,
      mode: "simulated_test",
      isSimulated: true,
      keyId: null,
    };
  }

  const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
  const response = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: params.amountPaise,
      currency,
      receipt: params.receipt.slice(0, 40),
      notes: params.notes ?? {},
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "Unknown Razorpay error");
    throw new Error(`Razorpay order creation failed (${response.status}): ${errText}`);
  }

  const order = (await response.json()) as { id: string; amount: number; currency: string };
  return {
    razorpayOrderId: order.id,
    amountPaise: order.amount,
    currency: "INR",
    mode: keyId.startsWith("rzp_live_") ? "razorpay_live" : "razorpay_test",
    isSimulated: false,
    keyId,
  };
}

export async function refundRazorpayPayment(params: {
  razorpayPaymentId: string;
  amountPaise: number;
  reason?: string;
  isSimulated?: boolean;
}): Promise<{ refundId: string; status: string; isSimulated: boolean }> {
  const { keyId, keySecret } = getRazorpaySecrets();

  if (params.isSimulated || params.razorpayPaymentId.startsWith("pay_sim_") || !keyId || !keySecret) {
    return {
      refundId: `rfnd_sim_${randomBytes(8).toString("hex")}`,
      status: "processed",
      isSimulated: true,
    };
  }

  const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
  const response = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(params.razorpayPaymentId)}/refund`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: params.amountPaise,
      notes: params.reason ? { reason: params.reason } : undefined,
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "Unknown Razorpay refund error");
    throw new Error(`Razorpay refund failed (${response.status}): ${errText}`);
  }

  const data = (await response.json()) as { id: string; status: string };
  return { refundId: data.id, status: data.status || "processed", isSimulated: false };
}

export function computeSignatureForTest(orderId: string, paymentId: string, secret: string): string {
  return createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");
}

export function computeWebhookSignatureForTest(rawBody: string, webhookSecret: string): string {
  return createHmac("sha256", webhookSecret).update(rawBody, "utf8").digest("hex");
}
