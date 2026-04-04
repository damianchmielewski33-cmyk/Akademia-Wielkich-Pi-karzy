import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { requireAdmin } from "@/lib/api-helpers";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;
  const { id } = await ctx.params;
  const sid = Number(id);
  if (!Number.isFinite(sid)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  const db = getDb();
  const row = db
    .prepare(`SELECT id, goals, assists, distance, saves FROM match_stats WHERE id = ?`)
    .get(sid);
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(row);
}

const putSchema = z.object({
  goals: z.coerce.number().int().min(0),
  assists: z.coerce.number().int().min(0),
  distance: z.coerce.number().min(0),
  saves: z.coerce.number().int().min(0).optional(),
});

export async function PUT(req: Request, ctx: Ctx) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;
  const { id } = await ctx.params;
  const sid = Number(id);
  if (!Number.isFinite(sid)) {
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
  const saves = parsed.data.saves ?? 0;
  const db = getDb();
  db.prepare(
    `UPDATE match_stats SET goals = ?, assists = ?, distance = ?, saves = ? WHERE id = ?`
  ).run(parsed.data.goals, parsed.data.assists, parsed.data.distance, saves, sid);
  return NextResponse.json({ status: "ok" });
}
