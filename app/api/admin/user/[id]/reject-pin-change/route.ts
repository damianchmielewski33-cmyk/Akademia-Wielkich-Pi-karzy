import { NextResponse } from "next/server";
import { getDb, logActivity } from "@/lib/db";
import { requireAdmin } from "@/lib/api-helpers";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

/** Odrzuca proponowany PIN; aktywny PIN pozostaje bez zmian. */
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
    .prepare(
      "SELECT first_name, last_name, player_alias, pin_hash_pending FROM users WHERE id = ?"
    )
    .get(userId)) as
    | { first_name: string; last_name: string; player_alias: string; pin_hash_pending: string | null }
    | undefined;
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!row.pin_hash_pending) {
    return NextResponse.json({ error: "Brak oczekującej zmiany PIN-u." }, { status: 400 });
  }

  await db
    .prepare(
      `UPDATE users SET pin_hash_pending = NULL, pin_reset_requested = 0, auth_version = auth_version + 1 WHERE id = ?`
    )
    .run(userId);

  await logActivity(
    gate.session.userId,
    `Odrzucił proponowaną zmianę PIN-u użytkownika id ${userId}: ${row.first_name} ${row.last_name} (${row.player_alias})`
  );

  return NextResponse.json({ ok: true });
}
