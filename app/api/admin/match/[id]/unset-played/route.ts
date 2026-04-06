import { NextResponse } from "next/server";
import { getDb, logActivity } from "@/lib/db";
import { requireAdmin } from "@/lib/api-helpers";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_req: Request, ctx: Ctx) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;
  const { id } = await ctx.params;
  const mid = Number(id);
  if (!Number.isFinite(mid)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  const db = await getDb();
  const row = await db
    .prepare("SELECT match_date, match_time, location FROM matches WHERE id = ?")
    .get(mid) as { match_date: string; match_time: string; location: string } | undefined;
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await db.prepare("UPDATE matches SET played = 0 WHERE id = ?").run(mid);
  logActivity(
    gate.session.userId,
    `Cofnął status rozegranego meczu: ${row.match_date} ${row.match_time} (${row.location}), id ${mid}`
  );
  return NextResponse.json({ ok: true });
}
