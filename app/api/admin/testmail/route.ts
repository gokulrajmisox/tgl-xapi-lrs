import { NextResponse } from "next/server";
import { z } from "zod";
import {
  generateTestmailInbox,
  getTestmailStatus,
  queryTestmail,
} from "@/lib/email/testmail";
import { requireAdminActor } from "@/lib/certifications/store";

const QuerySchema = z.object({
  tag: z.string().trim().min(1).max(80).optional(),
  tagPrefix: z.string().trim().min(1).max(80).optional(),
  timestampFrom: z.coerce.number().int().nonnegative().optional(),
  timestampTo: z.coerce.number().int().nonnegative().optional(),
  livequery: z.boolean().optional(),
  limit: z.coerce.number().int().min(0).max(100).optional(),
  offset: z.coerce.number().int().min(0).max(9899).optional(),
});

const ActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("generate"), tag: z.string().trim().min(1).max(32), runId: z.string().trim().max(40).optional() }),
  z.object({ action: z.literal("query"), query: QuerySchema.default({}) }),
]);

export async function GET(request: Request) {
  const auth = await requireAdminActor(request);
  if (auth.error) return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });
  return NextResponse.json({ status: getTestmailStatus() }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const auth = await requireAdminActor(request);
  if (auth.error) return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });
  const parsed = ActionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid Testmail request." }, { status: 400 });

  try {
    if (parsed.data.action === "generate") {
      return NextResponse.json({ inbox: generateTestmailInbox(parsed.data.tag, parsed.data.runId) });
    }
    const result = await queryTestmail(parsed.data.query);
    return NextResponse.json({ result }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Testmail request failed." },
      { status: 503 },
    );
  }
}
