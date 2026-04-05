import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb, logActivity } from "@/lib/db";
import { requireAdmin } from "@/lib/api-helpers";

export const runtime = "nodejs";

const bodySchema = z.object({
  role: z.enum(["admin", "player"]),
});

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
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
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const db = getDb();
  const target = db
    .prepare("SELECT first_name, last_name FROM users WHERE id = ?")
    .get(userId) as { first_name: string; last_name: string } | undefined;
  if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });
  db.prepare("UPDATE users SET is_admin = ? WHERE id = ?").run(
    parsed.data.role === "admin" ? 1 : 0,
    userId
  );
  logActivity(
    gate.session.userId,
    `Zmienił rolę użytkownika ${target.first_name} ${target.last_name} (id ${userId}) na: ${parsed.data.role === "admin" ? "administrator" : "zawodnik"}`
  );
  return NextResponse.json({ status: "role_changed" });
}
