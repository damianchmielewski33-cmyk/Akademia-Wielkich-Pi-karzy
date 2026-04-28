import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb, logActivity } from "@/lib/db";
import { requireAdmin } from "@/lib/api-helpers";

export const runtime = "nodejs";

const postSchema = z.object({
  user_id: z.coerce.number().int().positive(),
  /** Docelowe saldo (PLN). */
  balance_pln: z.coerce.number().finite().min(-10000).max(10000),
  note: z.string().trim().max(200).optional(),
});

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

/**
 * Admin ustawia docelowe saldo portfela zawodnika.
 * Realizowane jako transakcja typu "adjustment" (audytowalne), a nie podmiana agregatu.
 */
export async function POST(req: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

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
  const { user_id, balance_pln, note } = parsed.data;

  const user = (await db
    .prepare("SELECT id, COALESCE(is_admin, 0) AS is_admin FROM users WHERE id = ?")
    .get(user_id)) as { id: number; is_admin: number } | undefined;
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (user.is_admin) return NextResponse.json({ error: "Nie można ustawić salda adminowi" }, { status: 409 });

  const row = (await db
    .prepare(
      `
      SELECT COALESCE(ROUND(SUM(amount_pln), 2), 0) AS balance_pln
      FROM wallet_transactions
      WHERE user_id = ?
    `
    )
    .get(user_id)) as { balance_pln: number } | undefined;

  const current = round2(Number(row?.balance_pln ?? 0));
  const target = round2(Number(balance_pln));
  const delta = round2(target - current);

  if (Math.abs(delta) < 0.005) {
    return NextResponse.json({ ok: true, noChange: true, current_balance_pln: current, target_balance_pln: target });
  }

  const baseNote = `Ustawienie salda na ${target} PLN (było ${current} PLN)`;
  const fullNote = note ? `${baseNote} · ${note}` : baseNote;
  // Safety: DB constraint is 200 in other endpoints; keep it short.
  const storedNote = fullNote.length > 200 ? `${fullNote.slice(0, 197)}...` : fullNote;

  const r = await db
    .prepare(
      `
      INSERT INTO wallet_transactions (user_id, kind, amount_pln, note)
      VALUES (?, 'adjustment', ?, ?)
    `
    )
    .run(user_id, delta, storedNote);

  const txId = Number(r.lastInsertRowid);

  await logActivity(
    gate.session.userId,
    `Ustawił saldo portfela user ${user_id} na ${target} PLN (delta ${delta} PLN), tx ${txId}`
  );

  return NextResponse.json({
    ok: true,
    txId,
    delta_pln: delta,
    current_balance_pln: current,
    target_balance_pln: target,
  });
}

