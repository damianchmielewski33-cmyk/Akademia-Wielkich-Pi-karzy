import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAdmin } from "@/lib/api-helpers";

export const runtime = "nodejs";

export async function GET() {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;
  const db = getDb();
  const rows = db
    .prepare(`
      SELECT s.id,
             u.player_alias AS zawodnik,
             s.match_id,
             s.goals, s.assists, s.distance, s.saves
      FROM match_stats s
      JOIN users u ON u.id = s.user_id
      ORDER BY s.id DESC
    `)
    .all();
  return NextResponse.json(rows);
}
