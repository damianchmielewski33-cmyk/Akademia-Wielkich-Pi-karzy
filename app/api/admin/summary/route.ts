import { NextResponse } from "next/server";
import { getUnreadAdminMessageCount } from "@/lib/admin-messages";
import { getDb } from "@/lib/db";
import { requireAdmin } from "@/lib/api-helpers";

export const runtime = "nodejs";

export async function GET() {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;
  const db = await getDb();
  const players = (await db.prepare("SELECT COUNT(*) AS c FROM users").get() as { c: number }).c;
  const admins = (await db.prepare("SELECT COUNT(*) AS c FROM users WHERE is_admin = 1").get() as { c: number })
    .c;
  const matches = (await db.prepare("SELECT COUNT(*) AS c FROM matches").get() as { c: number }).c;
  const stats = (await db.prepare("SELECT COUNT(*) AS c FROM match_stats").get() as { c: number }).c;
  const upcoming_matches = (
    (await db
      .prepare(
        "SELECT COUNT(*) AS c FROM matches WHERE match_date >= date('now') AND played = 0 AND COALESCE(cancelled, 0) = 0"
      )
      .get()) as { c: number }
  ).c;
  const pin_reset_requests = (
    (await db.prepare("SELECT COUNT(*) AS c FROM users WHERE pin_reset_requested = 1").get()) as {
      c: number;
    }
  ).c;
  const unread_messages = await getUnreadAdminMessageCount(db);
  return NextResponse.json({
    players,
    admins,
    matches,
    stats,
    upcoming_matches,
    pin_reset_requests,
    unread_messages,
  });
}
