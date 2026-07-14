import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAdmin } from "@/lib/api-helpers";
import { parseRealm, REALMS } from "@/lib/realm";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;
  const url = new URL(req.url);
  const realm = parseRealm(url.searchParams.get("realm"), REALMS.ACADEMY);
  const db = await getDb();
  const rows = await db
    .prepare(`
      SELECT id, match_date AS date, match_time AS time,
             location, signed_up AS players_count, played, fee_pln, max_slots, cancelled
      FROM matches
      WHERE realm = ?
      ORDER BY match_date DESC
    `)
    .all(realm);
  return NextResponse.json(rows);
}
