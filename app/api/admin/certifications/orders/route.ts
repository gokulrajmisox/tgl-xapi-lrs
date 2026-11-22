import { NextResponse } from "next/server";
import {
  listAllApplicationsForAdmin,
  listInternships,
  listIssuances,
  listOrders,
  listPayments,
  listProducts,
  requireAdminActor,
} from "@/lib/certifications/store";

export async function GET(request: Request) {
  const auth = await requireAdminActor(request);
  if (auth.error) return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });

  const [products, orders, payments, issuances, applications, internships] = await Promise.all([
    listProducts(true),
    listOrders(),
    listPayments(),
    listIssuances(),
    listAllApplicationsForAdmin(),
    listInternships(),
  ]);

  return NextResponse.json(
    { products, orders, payments, issuances, applications, internships },
    { headers: { "Cache-Control": "no-store" } },
  );
}
