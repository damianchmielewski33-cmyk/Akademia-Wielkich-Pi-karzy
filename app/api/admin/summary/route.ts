import { NextResponse } from "next/server";
import { getUnreadAdminMessageCount } from "@/lib/admin-messages";
import { getDb } from "@/lib/db";
import { requireAdmin } from "@/lib/api-helpers";
import {
  isAdminTestModeActive,
  sqlMatchTestFilter,
  sqlUserTestFilter,
  sqlWalletTestFilter,
} from "@/lib/test-mode";

export const runtime = "nodejs";

export async function GET() {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;
  const db = await getDb();
  const testMode = await isAdminTestModeActive();

  const players = (
    (await db
      .prepare(`SELECT COUNT(*) AS c FROM users WHERE ${sqlUserTestFilter("", testMode)}`)
      .get()) as { c: number }
  ).c;
  const admins = (
    (await db.prepare("SELECT COUNT(*) AS c FROM users WHERE is_admin = 1").get()) as { c: number }
  ).c;
  const matches = (
    (await db
      .prepare(`SELECT COUNT(*) AS c FROM matches WHERE ${sqlMatchTestFilter("", testMode)}`)
      .get()) as { c: number }
  ).c;
  const stats = ((await db.prepare("SELECT COUNT(*) AS c FROM match_stats").get()) as { c: number }).c;
  const upcoming_matches = (
    (await db
      .prepare(
        `SELECT COUNT(*) AS c FROM matches WHERE match_date >= date('now') AND played = 0 AND COALESCE(cancelled, 0) = 0 AND ${sqlMatchTestFilter("", testMode)}`
      )
      .get()) as { c: number }
  ).c;
  const pin_reset_requests = (
    (await db
      .prepare(
        `SELECT COUNT(*) AS c FROM users WHERE pin_reset_requested = 1 AND ${sqlUserTestFilter("", testMode)}`
      )
      .get()) as {
      c: number;
    }
  ).c;
  const pin_change_pending = (
    (await db
      .prepare(
        `SELECT COUNT(*) AS c FROM users WHERE pin_hash_pending IS NOT NULL AND ${sqlUserTestFilter("", testMode)}`
      )
      .get()) as { c: number }
  ).c;
  const unread_messages = await getUnreadAdminMessageCount(db);
  const negative_balances =
    (
      (await db
        .prepare(
          `SELECT COUNT(*) AS c FROM (
           SELECT u.id
           FROM users u
           LEFT JOIN wallet_transactions t ON t.user_id = u.id AND ${sqlWalletTestFilter("t", testMode)}
           WHERE COALESCE(u.is_admin, 0) = 0
             AND COALESCE(u.is_temporary, 0) = 0
             AND ${sqlUserTestFilter("u", testMode)}
           GROUP BY u.id
           HAVING COALESCE(ROUND(SUM(CASE WHEN t.id IS NOT NULL THEN t.amount_pln ELSE 0 END), 2), 0) < 0
         )`
        )
        .get()) as { c: number } | undefined
    )?.c ?? 0;
  const pending_deposits =
    (
      (await db
        .prepare(
          `SELECT COUNT(*) AS c FROM wallet_deposit_requests d
           JOIN users u ON u.id = d.user_id
           WHERE d.status = 'pending' AND ${sqlUserTestFilter("u", testMode)}`
        )
        .get()) as { c: number } | undefined
    )?.c ?? 0;

  const next_matches = (await db
    .prepare(
      `SELECT id, match_date AS date, match_time AS time, location, signed_up AS players_count, max_slots
       FROM matches
       WHERE match_date >= date('now') AND played = 0 AND COALESCE(cancelled, 0) = 0
         AND ${sqlMatchTestFilter("", testMode)}
       ORDER BY match_date ASC, match_time ASC
       LIMIT 5`
    )
    .all()) as {
    id: number;
    date: string;
    time: string;
    location: string;
    players_count: number;
    max_slots: number;
  }[];

  return NextResponse.json({
    players,
    admins,
    matches,
    stats,
    upcoming_matches,
    pin_reset_requests,
    pin_change_pending,
    unread_messages,
    negative_balances,
    pending_deposits,
    next_matches,
    admin_sections: gate.session.adminSections,
  });
}
