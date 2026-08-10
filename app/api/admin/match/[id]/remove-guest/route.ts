import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/api-helpers";
import { adminRemoveTemporaryGuest } from "@/lib/guest-cleanup";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

const bodySchema = z.object({
  user_id: z.coerce.number().int().positive(),
  check_balance: z.boolean().optional(),
});

export async function POST(req: Request, context: RouteContext) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const { id } = await context.params;
  const mid = Number(id);
  if (!Number.isFinite(mid)) {
    return NextResponse.json({ error: "Invalid match id" }, { status: 400 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const result = await adminRemoveTemporaryGuest({
    userId: parsed.data.user_id,
    matchId: mid,
    actorUserId: gate.session.userId,
    checkBalanceOnly: parsed.data.check_balance === true,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  if ("check" in result && result.check) {
    return NextResponse.json({
      balance: result.balance,
      can_delete: result.can_delete,
      prepaid_cart_pln: result.prepaid_cart_pln,
    });
  }

  if ("deleted" in result && result.deleted) {
    return NextResponse.json({ ok: true, refunded_pln: result.refunded_pln });
  }

  return NextResponse.json({ error: "Nie udało się usunąć gościa" }, { status: 500 });
}
