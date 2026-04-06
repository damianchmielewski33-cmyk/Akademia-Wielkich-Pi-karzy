import { NextResponse } from "next/server";
import { getDb, logActivity } from "@/lib/db";
import { requireAdmin } from "@/lib/api-helpers";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Reset PIN: usuwa skrót PIN, czyści prośbę o reset, podbija auth_version (unieważnia JWT użytkownika).
 */
export async function POST(_req: Request, ctx: Ctx) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;
  const { id } = await ctx.params;
  const userId = Number(id);
  if (!Number.isFinite(userId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const db = await getDb();
  const row = (await db
    .prepare("SELECT first_name, last_name, player_alias FROM users WHERE id = ?")
    .get(userId)) as { first_name: string; last_name: string; player_alias: string } | undefined;
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db
    .prepare(
      `UPDATE users SET pin_hash = NULL, pin_hash_pending = NULL, pin_reset_requested = 0, auth_version = auth_version + 1 WHERE id = ?`
    )
    .run(userId);

  await logActivity(
    gate.session.userId,
    `Zresetował PIN użytkownika id ${userId}: ${row.first_name} ${row.last_name} (${row.player_alias})`
  );

  return NextResponse.json({ ok: true });
}
