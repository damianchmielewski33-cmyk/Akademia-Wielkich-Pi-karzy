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
      SELECT id, first_name, last_name, player_alias AS zawodnik,
             CASE WHEN is_admin = 1 THEN 'admin' ELSE 'player' END AS role
      FROM users
      ORDER BY first_name
    `)
    .all();
  return NextResponse.json(rows);
}
