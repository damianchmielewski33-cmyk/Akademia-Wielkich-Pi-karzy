import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb, logActivity } from "@/lib/db";
import { requireAdmin } from "@/lib/api-helpers";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

const cancelSchema = z.object({
  reason: z.string().min(1),
});

export async function POST(req: Request, context: RouteContext) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;
  const { id } = await context.params;
  const mid = Number(id);
  if (!Number.isFinite(mid)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad JSON" }, { status: 400 });
  }
  const parsed = cancelSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const db = await getDb();
  const row = await db
    .prepare("SELECT match_date, match_time, location FROM matches WHERE id = ?")
    .get(mid) as { match_date: string; match_time: string; location: string } | undefined;
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await db.prepare("UPDATE matches SET cancelled = 1, cancellation_reason = ? WHERE id = ?").run(parsed.data.reason, mid);
  logActivity(
    gate.session.userId,
    `Anulował mecz id ${mid}: ${row.match_date} ${row.match_time} (${row.location}), powód: ${parsed.data.reason}`
  );
  // TODO: notify signed up players
  return NextResponse.json({ ok: true });
}