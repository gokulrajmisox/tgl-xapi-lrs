import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import Razorpay from "razorpay";

export type RazorpayMode = "test" | "live" | "unconfigured";

export type RazorpayPublicConfig = {
  keyId: string | null;
  mode: RazorpayMode;
  configured: boolean;
};

export class RazorpayGatewayError extends Error {
  statusCode: number;
  code?: string;

  constructor(message: string, statusCode = 500, code?: string) {
    super(message);
    this.name = "RazorpayGatewayError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

export function getRazorpayPublicConfig(): RazorpayPublicConfig {
  const keyId =
    process.env.RAZORPAY_KEY_ID?.trim() ||
    process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID?.trim() ||
    null;
  const hasSecret = Boolean(process.env.RAZORPAY_KEY_SECRET?.trim());
  if (!keyId || !hasSecret) {
    return { keyId: null, mode: "unconfigured", configured: false };
  }
  const mode: RazorpayMode = keyId.startsWith("rzp_live_") ? "live" : "test";
  return { keyId, mode, configured: true };
}

export function getRazorpayKeyIdPublic(): string | null {
  return (
    process.env.RAZORPAY_KEY_ID?.trim() ||
    process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID?.trim() ||
    null
  );
}

function getRazorpaySecrets() {
  return {
    keyId: process.env.RAZORPAY_KEY_ID?.trim() || "",
    keySecret: process.env.RAZORPAY_KEY_SECRET?.trim() || "",
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET?.trim() || "",
  };
}

export function validateRazorpayOrderAmountPaise(amountPaise: number): {
  valid: boolean;
  reason?: string;
} {
  if (!Number.isInteger(amountPaise)) {
    return { valid: false, reason: "Order amount must be an integer in paise." };
  }
  if (amountPaise < 100) {
    return {
      valid: false,
      reason: "Minimum Razorpay order amount is 100 paise (₹1).",
    };
  }
  return { valid: true };
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

function parseRazorpaySdkError(err: unknown, fallbackMessage: string): RazorpayGatewayError {
  if (err instanceof RazorpayGatewayError) {
    return err;
  }
  if (typeof err === "object" && err !== null) {
    const record = err as {
      statusCode?: number;
      error?: { description?: string; code?: string };
      message?: string;
    };
    const statusCode = typeof record.statusCode === "number" ? record.statusCode : 500;
    const description =
      record.error?.description ||
      record.message ||
      fallbackMessage;
    const code = record.error?.code;

    if (statusCode === 401) {
      return new RazorpayGatewayError(
        "Razorpay API authentication failed. Verify RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.",
        401,
        code ?? "RAZORPAY_AUTH_FAILED",
      );
    }
    if (statusCode === 400) {
      return new RazorpayGatewayError(description, 400, code ?? "RAZORPAY_BAD_REQUEST");
    }
    return new RazorpayGatewayError(description, 500, code ?? "RAZORPAY_GATEWAY_ERROR");
  }
  return new RazorpayGatewayError(fallbackMessage, 500, "RAZORPAY_GATEWAY_ERROR");
}

export async function createRazorpayOrder(params: {
  amountPaise: number;
  currency?: "INR";
  receipt: string;
  notes?: Record<string, string>;
}): Promise<CreateOrderResult> {
  const amountCheck = validateRazorpayOrderAmountPaise(params.amountPaise);
  if (!amountCheck.valid) {
    throw new RazorpayGatewayError(
      amountCheck.reason ?? "Invalid order amount.",
      400,
      "INVALID_AMOUNT",
    );
  }

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

  try {
    const client = new Razorpay({ key_id: keyId, key_secret: keySecret });
    const order = await client.orders.create({
      amount: params.amountPaise,
      currency,
      receipt: params.receipt.slice(0, 40),
      notes: params.notes ?? {},
    });

    return {
      razorpayOrderId: order.id,
      amountPaise: Number(order.amount),
      currency: "INR",
      mode: keyId.startsWith("rzp_live_") ? "razorpay_live" : "razorpay_test",
      isSimulated: false,
      keyId,
    };
  } catch (err) {
    throw parseRazorpaySdkError(err, "Razorpay order creation failed.");
  }
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

  try {
    const client = new Razorpay({ key_id: keyId, key_secret: keySecret });
    const refund = await client.payments.refund(params.razorpayPaymentId, {
      amount: params.amountPaise,
      notes: params.reason ? { reason: params.reason } : undefined,
    });
    return {
      refundId: refund.id,
      status: refund.status || "processed",
      isSimulated: false,
    };
  } catch (err) {
    throw parseRazorpaySdkError(err, "Razorpay refund failed.");
  }
}

export function computeSignatureForTest(orderId: string, paymentId: string, secret: string): string {
  return createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");
}

export function computeWebhookSignatureForTest(rawBody: string, webhookSecret: string): string {
  return createHmac("sha256", webhookSecret).update(rawBody, "utf8").digest("hex");
}
