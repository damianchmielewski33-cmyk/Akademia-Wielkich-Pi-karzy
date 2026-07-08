import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb, logActivity } from "@/lib/db";
import { requireAdmin } from "@/lib/api-helpers";
import { adminDemotionBlockedReason, bumpAuthVersion } from "@/lib/admin-role";

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
  const db = await getDb();
  const target = await db
    .prepare("SELECT first_name, last_name, is_admin FROM users WHERE id = ?")
    .get(userId) as { first_name: string; last_name: string; is_admin: number } | undefined;
  if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const demotionBlock = await adminDemotionBlockedReason(
    db,
    userId,
    gate.session.userId,
    parsed.data.role
  );
  if (demotionBlock) {
    return NextResponse.json({ error: demotionBlock }, { status: 400 });
  }

  const nextIsAdmin = parsed.data.role === "admin" ? 1 : 0;
  if (target.is_admin === 1 && nextIsAdmin === 0) {
    await bumpAuthVersion(db, userId);
  }

  await db.prepare("UPDATE users SET is_admin = ? WHERE id = ?").run(nextIsAdmin, userId);
  logActivity(
    gate.session.userId,
    `Zmienił rolę użytkownika ${target.first_name} ${target.last_name} (id ${userId}) na: ${parsed.data.role === "admin" ? "administrator" : "zawodnik"}`
  );
  return NextResponse.json({ status: "role_changed" });
}
