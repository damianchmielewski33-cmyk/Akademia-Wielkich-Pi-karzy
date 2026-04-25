import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAdmin } from "@/lib/api-helpers";

export const runtime = "nodejs";

export async function GET() {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const db = await getDb();

  const players = await db
    .prepare(
      `
      SELECT
        u.id,
        u.first_name,
        u.last_name,
        u.player_alias AS zawodnik,
        u.profile_photo_path,
        COALESCE(ROUND(SUM(t.amount_pln), 2), 0) AS balance_pln
      FROM users u
      LEFT JOIN wallet_transactions t ON t.user_id = u.id
      WHERE COALESCE(u.is_admin, 0) = 0
      GROUP BY u.id
      ORDER BY u.first_name, u.last_name
    `
    )
    .all();

  const pendingDeposits = await db
    .prepare(
      `
      SELECT d.id, d.user_id, d.amount_pln, d.created_by, d.status, d.note,
             d.player_declared_at, d.admin_confirmed_received_at,
             d.admin_declared_received_at, d.player_confirmed_amount_at,
             d.created_at,
             u.first_name, u.last_name, u.player_alias AS zawodnik, u.profile_photo_path
      FROM wallet_deposit_requests d
      JOIN users u ON u.id = d.user_id
      WHERE d.status = 'pending'
      ORDER BY datetime(d.created_at) DESC
    `
    )
    .all();

  const playedMatches = await db
    .prepare(
      `
      SELECT id, match_date, match_time, location, max_slots, signed_up, played, fee_pln
      FROM matches
      WHERE played = 1
      ORDER BY match_date DESC, match_time DESC
      LIMIT 30
    `
    )
    .all();

  return NextResponse.json({ players, pendingDeposits, playedMatches });
}

