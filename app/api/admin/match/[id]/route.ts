import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb, logActivity } from "@/lib/db";
import { requireAdmin } from "@/lib/api-helpers";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: Request, context: RouteContext) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;
  const { id } = await context.params;
  const mid = Number(id);
  if (!Number.isFinite(mid)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  const db = getDb();
  const row = db
    .prepare(
      "SELECT id, match_date AS date, match_time AS time, location, fee_pln FROM matches WHERE id = ?"
    )
    .get(mid);
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(row);
}

const putSchema = z.object({
  date: z.string().min(1),
  time: z.string().min(1),
  location: z.string().min(1),
  fee_pln: z.union([z.number().nonnegative(), z.null()]).optional(),
});

export async function PUT(req: Request, context: RouteContext) {
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
  const parsed = putSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const db = getDb();
  const fee = parsed.data.fee_pln;
  if (fee !== undefined) {
    db.prepare(
      "UPDATE matches SET match_date = ?, match_time = ?, location = ?, fee_pln = ? WHERE id = ?"
    ).run(parsed.data.date, parsed.data.time, parsed.data.location, fee, mid);
  } else {
    db.prepare("UPDATE matches SET match_date = ?, match_time = ?, location = ? WHERE id = ?").run(
      parsed.data.date,
      parsed.data.time,
      parsed.data.location,
      mid
    );
  }
  logActivity(
    gate.session.userId,
    `Edytował mecz id ${mid}: ${parsed.data.date} ${parsed.data.time}, ${parsed.data.location}`
  );
  return NextResponse.json({ status: "ok" });
}

export async function DELETE(_req: Request, context: RouteContext) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;
  const { id } = await context.params;
  const mid = Number(id);
  if (!Number.isFinite(mid)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  const db = getDb();
  const row = db
    .prepare("SELECT match_date, match_time, location FROM matches WHERE id = ?")
    .get(mid) as { match_date: string; match_time: string; location: string } | undefined;
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  db.prepare("DELETE FROM matches WHERE id = ?").run(mid);
  logActivity(
    gate.session.userId,
    `Usunął mecz id ${mid}: ${row.match_date} ${row.match_time} (${row.location})`
  );
  return NextResponse.json({ status: "deleted" });
}
