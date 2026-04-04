import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ matchId: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { matchId } = await ctx.params;
  const mid = Number(matchId);
  if (!Number.isFinite(mid)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  const db = getDb();
  const row = db
    .prepare(
      "SELECT id, match_date, match_time, location, max_slots FROM matches WHERE id = ?"
    )
    .get(mid);
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(row);
}
