import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb, logActivity } from "@/lib/db";
import { requireAdmin } from "@/lib/api-helpers";
import { adminDemotionBlockedReason, bumpAuthVersion } from "@/lib/admin-role";
import { deleteUserAccountData } from "@/lib/delete-user-data";
import { normalizePlayerAlias } from "@/lib/player-alias";

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
  const db = await getDb();
  const row = await db
    .prepare(
      `
      SELECT id, first_name, last_name, player_alias AS zawodnik,
             CASE WHEN is_admin = 1 THEN 'admin' ELSE 'player' END AS role,
             COALESCE(can_pzu_cup, 0) AS can_pzu_cup
      FROM users WHERE id = ?
    `
    )
    .get(userId);
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(row);
}

const putSchema = z.object({
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  zawodnik: z.string().min(1),
  role: z.enum(["admin", "player"]),
  can_pzu_cup: z.boolean().optional(),
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
  const canonical = normalizePlayerAlias(data.zawodnik);
  if (!canonical) {
    return NextResponse.json({ error: "Nieprawidłowy pseudonim piłkarza (2–120 znaków)." }, { status: 400 });
  }
  const db = await getDb();
  const existing = (await db
    .prepare("SELECT is_admin, COALESCE(can_pzu_cup, 0) AS can_pzu_cup FROM users WHERE id = ?")
    .get(userId)) as { is_admin: number; can_pzu_cup: number } | undefined;
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const demotionBlock = await adminDemotionBlockedReason(db, userId, gate.session.userId, data.role);
  if (demotionBlock) {
    return NextResponse.json({ error: demotionBlock }, { status: 400 });
  }

  const clash = (await db
    .prepare("SELECT id FROM users WHERE player_alias = ? AND id != ?")
    .get(canonical, userId)) as { id: number } | undefined;
  if (clash) {
    return NextResponse.json({ error: "Ten pseudonim piłkarza jest już zajęty." }, { status: 409 });
  }
  const nextIsAdmin = data.role === "admin" ? 1 : 0;
  const nextPzuCup = data.can_pzu_cup === undefined ? existing.can_pzu_cup : data.can_pzu_cup ? 1 : 0;
  if (existing.is_admin === 1 && nextIsAdmin === 0) {
    await bumpAuthVersion(db, userId);
  }

  await db
    .prepare(
      `UPDATE users SET first_name = ?, last_name = ?, player_alias = ?, is_admin = ?, can_pzu_cup = ? WHERE id = ?`
    )
    .run(data.first_name, data.last_name, canonical, nextIsAdmin, nextPzuCup, userId);
  const pzuNote =
    nextPzuCup !== existing.can_pzu_cup ? `, PZU Cup: ${nextPzuCup ? "tak" : "nie"}` : "";
  await logActivity(
    gate.session.userId,
    `Zaktualizował profil użytkownika id ${userId}: ${data.first_name} ${data.last_name} (${canonical}), rola: ${data.role === "admin" ? "admin" : "zawodnik"}${pzuNote}`
  );
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
  if (userId === gate.session.userId) {
    return NextResponse.json({ error: "Nie możesz usunąć własnego konta" }, { status: 400 });
  }
  const db = await getDb();
  const target = (await db
    .prepare("SELECT first_name, last_name, player_alias FROM users WHERE id = ?")
    .get(userId)) as { first_name: string; last_name: string; player_alias: string } | undefined;
  if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    await deleteUserAccountData(db, userId);
  } catch (err) {
    console.error("[admin/user] DELETE failed", err);
    return NextResponse.json(
      { error: "Nie udało się usunąć użytkownika — konto ma powiązane dane, których nie udało się wyczyścić." },
      { status: 500 }
    );
  }

  await logActivity(
    gate.session.userId,
    `Usunął konto: ${target.first_name} ${target.last_name} (${target.player_alias}), id ${userId}`
  );
  return NextResponse.json({ status: "deleted" });
}
