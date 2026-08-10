import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb, logActivity } from "@/lib/db";
import { requireAdmin } from "@/lib/api-helpers";
import { getPrepaidMatchCartAmount, settlePrepaidPlayerWithoutCharge } from "@/lib/match-cart";
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

const postSchema = z
  .object({
    charges: z
      .array(
        z.object({
          user_id: z.coerce.number().int().positive(),
          amount_pln: z.coerce.number().positive().max(1000),
          note: z.string().trim().max(200).optional(),
        })
      )
      .default([]),
    /** Ostateczna składka na osobę — do porównania z wpłatą koszykową. */
    fee_per_person_pln: z.coerce.number().min(0).max(1000).optional(),
    /** Zawodnicy z paid=1 w rozliczeniu — bez debetu; ewentualny zwrot nadpłaty. */
    prepaid_user_ids: z.array(z.coerce.number().int().positive()).default([]),
  })
  .refine((d) => d.charges.length > 0 || d.prepaid_user_ids.length > 0, {
    message: "Brak zawodników do rozliczenia",
  });

/**
 * Admin dzieli koszt rozegranego meczu i odejmuje z portfeli zawodników.
 * Osoby już opłacone koszykiem: bez ponownego obciążenia; gdy składka < wpłata —
 * różnica wraca na portfel płatnika koszyka.
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
  const match = (await db
    .prepare("SELECT played, match_date, match_time, location FROM matches WHERE id = ?")
    .get(matchId)) as
    | { played: number; match_date: string; match_time: string; location: string }
    | undefined;
  if (!match) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (match.played !== 1) return NextResponse.json({ error: "Match not played" }, { status: 409 });

  const applied: { user_id: number; amount_pln: number }[] = [];
  const prepaidSettled: {
    user_id: number;
    prepaid_pln: number;
    final_fee_pln: number;
    credited_pln: number;
    payer_user_id: number | null;
  }[] = [];
  const skipped: { user_id: number; reason: string }[] = [];

  const feePerPerson =
    parsed.data.fee_per_person_pln != null && Number.isFinite(parsed.data.fee_per_person_pln)
      ? Math.round(Number(parsed.data.fee_per_person_pln) * 100) / 100
      : null;

  const prepaidIds = [...new Set(parsed.data.prepaid_user_ids.map((x) => Number(x)).filter((x) => x > 0))];
  for (const userId of prepaidIds) {
    const signup = (await db
      .prepare(`SELECT COALESCE(paid, 0) AS paid FROM match_signups WHERE match_id = ? AND user_id = ?`)
      .get(matchId, userId)) as { paid: number } | undefined;
    if (!signup || Number(signup.paid) !== 1) {
      skipped.push({ user_id: userId, reason: "not_prepaid" });
      continue;
    }
    // Bez podanej składki — nie zwracaj całej wpłaty; traktuj jako „składka = wpłata”.
    let finalFee = feePerPerson;
    if (finalFee == null) {
      const prepaidInfo = await getPrepaidMatchCartAmount(matchId, userId);
      finalFee = prepaidInfo?.amount_pln ?? 0;
    }
    const result = await settlePrepaidPlayerWithoutCharge({
      matchId,
      beneficiaryUserId: userId,
      finalFeePln: finalFee,
      adminId: gate.session.userId,
    });
    if (!result.ok) {
      skipped.push({ user_id: userId, reason: result.error === "ALREADY_CHARGED" ? "already_charged" : "error" });
      continue;
    }
    if (result.already_settled) {
      skipped.push({ user_id: userId, reason: "already_charged" });
      continue;
    }
    prepaidSettled.push({
      user_id: userId,
      prepaid_pln: result.prepaid_pln,
      final_fee_pln: finalFee,
      credited_pln: result.credited_pln,
      payer_user_id: result.payer_user_id,
    });
  }

  for (const c of parsed.data.charges) {
    if (prepaidIds.includes(c.user_id)) {
      skipped.push({ user_id: c.user_id, reason: "already_prepaid" });
      continue;
    }
    const signup = (await db
      .prepare(`SELECT COALESCE(paid, 0) AS paid FROM match_signups WHERE match_id = ? AND user_id = ?`)
      .get(matchId, c.user_id)) as { paid: number } | undefined;
    if (signup && Number(signup.paid) === 1) {
      skipped.push({ user_id: c.user_id, reason: "already_prepaid" });
      continue;
    }

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
      if (msg.includes("UNIQUE") || msg.includes("constraint") || msg.includes("PRIMARY")) {
        skipped.push({ user_id: c.user_id, reason: "already_charged" });
      } else {
        console.error("[admin/wallet/match/:id/charges] charge failed", e);
        skipped.push({ user_id: c.user_id, reason: "error" });
      }
    }
  }

  const creditedTotal = prepaidSettled.reduce((s, p) => s + p.credited_pln, 0);
  await logActivity(
    gate.session.userId,
    `Rozliczył mecz ${match.match_date} ${match.match_time} (${match.location}), id ${matchId}. Obciążenia: ${applied.length}, opłaceni z góry: ${prepaidSettled.length}, zwroty nadpłat: ${creditedTotal.toFixed(2)} PLN, pominięte: ${skipped.length}`
  );

  return NextResponse.json({ ok: true, applied, prepaid_settled: prepaidSettled, skipped });
}
