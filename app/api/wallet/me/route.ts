import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/api-helpers";
import { getUserWalletBalancePln } from "@/lib/wallet";

export const runtime = "nodejs";

export async function GET() {
  const gate = await requireUser();
  if (!gate.ok) return gate.response;

  const db = await getDb();
  const userId = gate.session.userId;
  const balance_pln = await getUserWalletBalancePln(userId);

  const pending = await db
    .prepare(
      `
      SELECT id, user_id, amount_pln, created_by, status, note,
             player_declared_at, admin_confirmed_received_at,
             admin_declared_received_at, player_confirmed_amount_at,
             completed_at, created_at
      FROM wallet_deposit_requests
      WHERE user_id = ? AND status = 'pending'
      ORDER BY created_at DESC
    `
    )
    .all(userId);

  const tx = await db
    .prepare(
      `
      SELECT id, user_id, kind, amount_pln, deposit_request_id, match_id, note, created_at
      FROM wallet_transactions
      WHERE user_id = ?
      ORDER BY datetime(created_at) DESC
      LIMIT 50
    `
    )
    .all(userId);

  return NextResponse.json({ balance_pln, pending, transactions: tx });
}

