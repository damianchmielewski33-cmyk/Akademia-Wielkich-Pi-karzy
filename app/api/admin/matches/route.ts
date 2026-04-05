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
      SELECT id, match_date AS date, match_time AS time,
             location, signed_up AS players_count, played, fee_pln
      FROM matches
      ORDER BY match_date DESC
    `)
    .all();
  return NextResponse.json(rows);
}
