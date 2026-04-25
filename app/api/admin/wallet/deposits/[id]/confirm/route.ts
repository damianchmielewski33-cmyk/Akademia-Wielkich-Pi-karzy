import { NextResponse } from "next/server";
import { getDb, logActivity } from "@/lib/db";
import { requireAdmin } from "@/lib/api-helpers";
import { completeDepositRequest } from "@/lib/wallet";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Admin potwierdza: "otrzymałem" dla wpłaty zgłoszonej przez zawodnika.
 */
export async function POST(_req: Request, ctx: Ctx) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const { id } = await ctx.params;
  const depId = Number(id);
  if (!Number.isFinite(depId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const db = await getDb();
  const row = (await db
    .prepare(
      `SELECT id, user_id, created_by, status, player_declared_at, admin_confirmed_received_at
       FROM wallet_deposit_requests WHERE id = ?`
    )
    .get(depId)) as
    | {
        id: number;
        user_id: number;
        created_by: "player" | "admin";
        status: "pending" | "completed" | "cancelled";
        player_declared_at: string | null;
        admin_confirmed_received_at: string | null;
      }
    | undefined;
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (row.status !== "pending") return NextResponse.json({ error: "Not pending" }, { status: 409 });
  if (row.created_by !== "player" || !row.player_declared_at) {
    return NextResponse.json({ error: "Not confirmable" }, { status: 409 });
  }
  if (row.admin_confirmed_received_at) return NextResponse.json({ error: "Already confirmed" }, { status: 409 });

  await db
    .prepare(
      `UPDATE wallet_deposit_requests
       SET admin_confirmed_received_at = datetime('now')
       WHERE id = ?`
    )
    .run(depId);

  const done = await completeDepositRequest(depId, gate.session.userId);
  if (!done.ok) return NextResponse.json({ error: done.error }, { status: 409 });

  await logActivity(gate.session.userId, `Potwierdził otrzymanie wpłaty (id ${depId})`);
  return NextResponse.json({ ok: true });
}

