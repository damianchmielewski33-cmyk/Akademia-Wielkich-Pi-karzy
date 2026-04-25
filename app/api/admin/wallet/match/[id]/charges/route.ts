import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb, logActivity } from "@/lib/db";
import { requireAdmin } from "@/lib/api-helpers";
import { createMatchCharge } from "@/lib/wallet";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;
  const { id } = await ctx.params;
  const matchId = Number(id);
  if (!Number.isFinite(matchId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const db = await getDb();
  const charges = await db
    .prepare(
      `
      SELECT c.match_id, c.user_id, c.amount_pln, c.note, c.created_by_admin_id, c.created_at,
             u.first_name, u.last_name, u.player_alias AS zawodnik, u.profile_photo_path
      FROM match_wallet_charges c
      JOIN users u ON u.id = c.user_id
      WHERE c.match_id = ?
      ORDER BY datetime(c.created_at) DESC
    `
    )
    .all(matchId);
  return NextResponse.json({ charges });
}

const postSchema = z.object({
  charges: z
    .array(
      z.object({
        user_id: z.coerce.number().int().positive(),
        amount_pln: z.coerce.number().positive().max(1000),
        note: z.string().trim().max(200).optional(),
      })
    )
    .min(1),
});

/**
 * Admin dzieli koszt rozegranego meczu i odejmuje z portfeli zawodników.
 * Każdy zawodnik może być rozliczony maksymalnie raz per mecz (PK: match_id+user_id).
 */
export async function POST(req: Request, ctx: Ctx) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;
  const { id } = await ctx.params;
  const matchId = Number(id);
  if (!Number.isFinite(matchId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Nieprawidłowe JSON" }, { status: 400 });
  }
  const parsed = postSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const db = await getDb();
  const match = await db.prepare("SELECT played, match_date, match_time, location FROM matches WHERE id = ?").get(
    matchId
  ) as { played: number; match_date: string; match_time: string; location: string } | undefined;
  if (!match) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (match.played !== 1) return NextResponse.json({ error: "Match not played" }, { status: 409 });

  const applied: { user_id: number; amount_pln: number }[] = [];
  const skipped: { user_id: number; reason: string }[] = [];

  for (const c of parsed.data.charges) {
    try {
      await createMatchCharge({
        matchId,
        userId: c.user_id,
        amountPln: c.amount_pln,
        note: c.note ?? null,
        adminId: gate.session.userId,
      });
      applied.push({ user_id: c.user_id, amount_pln: c.amount_pln });
    } catch (e) {
      const msg = String((e as { message?: string } | undefined)?.message ?? "");
      // SQLite unique constraint / Turso error message variations
      if (msg.includes("UNIQUE") || msg.includes("constraint") || msg.includes("PRIMARY")) {
        skipped.push({ user_id: c.user_id, reason: "already_charged" });
      } else {
        console.error("[admin/wallet/match/:id/charges] charge failed", e);
        skipped.push({ user_id: c.user_id, reason: "error" });
      }
    }
  }

  await logActivity(
    gate.session.userId,
    `Rozliczył mecz ${match.match_date} ${match.match_time} (${match.location}), id ${matchId}. Obciążenia: ${applied.length}, pominięte: ${skipped.length}`
  );

  return NextResponse.json({ ok: true, applied, skipped });
}

