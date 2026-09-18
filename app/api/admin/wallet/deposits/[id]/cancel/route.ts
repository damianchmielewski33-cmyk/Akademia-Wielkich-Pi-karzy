import { NextResponse } from "next/server";
import { getDb, logActivity } from "@/lib/db";
import { requireAdmin } from "@/lib/api-helpers";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Admin odrzuca / anuluje oczekującą wpłatę.
 */
export async function POST(_req: Request, ctx: Ctx) {
  const gate = await requireAdmin("finance");
  if (!gate.ok) return gate.response;

  const { id } = await ctx.params;
  const depId = Number(id);
  if (!Number.isFinite(depId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const db = await getDb();
  const updated = await db
    .prepare(
      `UPDATE wallet_deposit_requests
       SET status = 'cancelled'
       WHERE id = ? AND status = 'pending'`
    )
    .run(depId);
  if (updated.changes === 0) {
    return NextResponse.json({ error: "Wpłata nie jest już oczekująca" }, { status: 409 });
  }

  await logActivity(gate.session.userId, `Anulował oczekującą wpłatę (id ${depId})`);
  return NextResponse.json({ ok: true });
}
