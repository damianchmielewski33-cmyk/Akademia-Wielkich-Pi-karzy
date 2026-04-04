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
  const userId = Number(id);
  if (!Number.isFinite(userId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  const db = getDb();
  const row = db
    .prepare(`
      SELECT id, first_name, last_name, player_alias AS zawodnik,
             CASE WHEN is_admin = 1 THEN 'admin' ELSE 'player' END AS role
      FROM users WHERE id = ?
    `)
    .get(userId);
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(row);
}

const putSchema = z.object({
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  zawodnik: z.string().min(1),
  role: z.enum(["admin", "player"]),
});

export async function PUT(req: Request, ctx: Ctx) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;
  const { id } = await ctx.params;
  const userId = Number(id);
  if (!Number.isFinite(userId)) {
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
  const data = parsed.data;
  const db = getDb();
  db.prepare(
    `UPDATE users SET first_name = ?, last_name = ?, player_alias = ?, is_admin = ? WHERE id = ?`
  ).run(data.first_name, data.last_name, data.zawodnik, data.role === "admin" ? 1 : 0, userId);
  return NextResponse.json({ status: "ok" });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;
  const { id } = await ctx.params;
  const userId = Number(id);
  if (!Number.isFinite(userId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  const db = getDb();
  db.prepare("DELETE FROM users WHERE id = ?").run(userId);
  return NextResponse.json({ status: "deleted" });
}
