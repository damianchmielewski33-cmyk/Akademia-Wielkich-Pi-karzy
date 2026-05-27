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
  const db = await getDb();
  const row = await db
    .prepare(
      "SELECT id, match_date AS date, match_time AS time, location, fee_pln, max_slots FROM matches WHERE id = ?"
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
  max_slots: z.coerce.number().int().min(1).optional(),
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
  const db = await getDb();
  const fee = parsed.data.fee_pln;
  const maxSlots = parsed.data.max_slots;

  let query = "UPDATE matches SET match_date = ?, match_time = ?, location = ?";
  const params: (string | number | null | undefined)[] = [parsed.data.date, parsed.data.time, parsed.data.location];

  if (fee !== undefined) {
    query += ", fee_pln = ?";
    params.push(fee);
  }

  if (maxSlots !== undefined) {
    query += ", max_slots = ?";
    params.push(maxSlots);
  }

  query += " WHERE id = ?";
  params.push(mid);

  await db.prepare(query).run(...params);

  logActivity(
    gate.session.userId,
    `Edytował mecz id ${mid}: ${parsed.data.date} ${parsed.data.time}, ${parsed.data.location}${maxSlots !== undefined ? `, max. ${maxSlots} miejsc` : ""}`
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
  const db = await getDb();
  const row = await db
    .prepare("SELECT match_date, match_time, location FROM matches WHERE id = ?")
    .get(mid) as { match_date: string; match_time: string; location: string } | undefined;
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await db.prepare("DELETE FROM matches WHERE id = ?").run(mid);
  logActivity(
    gate.session.userId,
    `Usunął mecz id ${mid}: ${row.match_date} ${row.match_time} (${row.location})`
  );
  return NextResponse.json({ status: "deleted" });
}
