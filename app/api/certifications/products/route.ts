import { NextResponse } from "next/server";
import {
  evaluateProductEligibilityForUser,
  listIssuances,
  listOrders,
  listPayments,
  listProducts,
  resolveCurrentActor,
} from "@/lib/certifications/store";
import { getRazorpayPublicConfig } from "@/lib/payments/razorpay";

export async function GET() {
  const [products, actorResult] = await Promise.all([
    listProducts(false),
    resolveCurrentActor(),
  ]);
  const razorpay = getRazorpayPublicConfig();

  if (!actorResult.user) {
    return NextResponse.json(
      {
        products: products.map((product) => ({
          ...product,
          eligibility: null,
          activeIssuance: null,
          latestOrder: null,
        })),
        razorpay,
        user: null,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  const user = actorResult.user;
  const [orders, payments, issuances] = await Promise.all([
    listOrders(user.id),
    listPayments(user.id),
    listIssuances(user.id),
  ]);

  const enrichedProducts = await Promise.all(
    products.map(async (product) => {
      const { evaluation, matchedApplication, achievementTitle } =
        await evaluateProductEligibilityForUser({
          userId: user.id,
          product,
        });
      const activeIssuance =
        issuances.find(
          (i) => i.product_id === product.id && i.issuance_status !== "revoked",
        ) ?? null;
      const latestOrder = orders.find((o) => o.product_id === product.id) ?? null;
      const latestPayment = latestOrder
        ? payments.find((p) => p.order_id === latestOrder.id) ?? null
        : null;

      return {
        ...product,
        eligibility: evaluation,
        achievementTitle,
        matchedApplicationId: matchedApplication?.id ?? null,
        activeIssuance,
        latestOrder,
        latestPayment,
      };
    }),
  );

  return NextResponse.json(
    {
      products: enrichedProducts,
      orders,
      payments,
      issuances,
      razorpay,
      user,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
