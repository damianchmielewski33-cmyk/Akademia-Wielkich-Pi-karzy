import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb, logActivity } from "@/lib/db";
import { requireAdmin } from "@/lib/api-helpers";
import { getWalletBalances } from "@/lib/wallet";
import { tryRemoveTemporaryGuestIfBalanceZero } from "@/lib/guest-cleanup";
import { testModeFlag } from "@/lib/test-mode";

export const runtime = "nodejs";

const postSchema = z.object({
  user_id: z.coerce.number().int().positive(),
  /** Docelowe saldo łączne (PLN). */
  balance_pln: z.coerce.number().finite().min(-10000).max(10000),
  note: z.string().trim().max(200).optional(),
  /** Domyślnie 'admin'. Korekta 'operator' tylko na wniosek gracza. */
  wallet_kind: z.enum(["admin", "operator"]).default("admin"),
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
  const { user_id, balance_pln, note, wallet_kind } = parsed.data;

  const user = (await db
    .prepare("SELECT id, COALESCE(is_admin, 0) AS is_admin FROM users WHERE id = ?")
    .get(user_id)) as { id: number; is_admin: number } | undefined;
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const balances = await getWalletBalances(user_id);
  const currentWallet = wallet_kind === "operator" ? balances.operator : balances.admin;
  const current = round2(currentWallet);
  const target = round2(Number(balance_pln));
  const delta = round2(target - current);

  if (Math.abs(delta) < 0.005) {
    return NextResponse.json({
      ok: true,
      noChange: true,
      current_balance_pln: balances.total,
      target_balance_pln: target,
    });
  }

  const walletLabel = wallet_kind === "operator" ? "operatora" : "admina";
  const baseNote = `Ustawienie salda portfela ${walletLabel} na ${target} PLN (było ${current} PLN)`;
  const fullNote = note ? `${baseNote} · ${note}` : baseNote;
  const storedNote = fullNote.length > 200 ? `${fullNote.slice(0, 197)}...` : fullNote;

  const isTest = await testModeFlag();
  const r = await db
    .prepare(
      `INSERT INTO wallet_transactions (user_id, kind, amount_pln, wallet_kind, note, is_test)
       VALUES (?, 'adjustment', ?, ?, ?, ?)`
    )
    .run(user_id, delta, wallet_kind, storedNote, isTest);

  const txId = Number(r.lastInsertRowid);

  await logActivity(
    gate.session.userId,
    `Ustawił saldo portfela ${walletLabel} user ${user_id} na ${target} PLN (delta ${delta} PLN), tx ${txId}`
  );

  await tryRemoveTemporaryGuestIfBalanceZero({
    userId: user_id,
    actorUserId: gate.session.userId,
  });

  const newBalances = await getWalletBalances(user_id);
  return NextResponse.json({
    ok: true,
    txId,
    delta_pln: delta,
    current_balance_pln: newBalances.total,
    admin_balance_pln: newBalances.admin,
    operator_balance_pln: newBalances.operator,
    target_balance_pln: target,
  });
}
