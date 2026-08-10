import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/api-helpers";
import { screenBlockApiResponse } from "@/lib/screen-block-api";
import { getWalletBalances } from "@/lib/wallet";

export const runtime = "nodejs";

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 500;

export async function GET(req: Request) {
  const blocked = await screenBlockApiResponse(req);
  if (blocked) return blocked;

  const gate = await requireUser();
  if (!gate.ok) return gate.response;

  const url = new URL(req.url);
  const offsetRaw = Number.parseInt(url.searchParams.get("offset") ?? "0", 10);
  const limitRaw = Number.parseInt(url.searchParams.get("limit") ?? String(DEFAULT_LIMIT), 10);
  const offset = Number.isFinite(offsetRaw) && offsetRaw > 0 ? offsetRaw : 0;
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, Number.isFinite(limitRaw) && limitRaw > 0 ? limitRaw : DEFAULT_LIMIT)
  );

  const db = await getDb();
  const userId = gate.session.userId;
  const balances = await getWalletBalances(userId);

  let pending: unknown[] = [];
  try {
    pending = await db
      .prepare(
        `
      SELECT id, user_id, amount_pln, created_by, status, wallet_kind, note,
             player_declared_at, admin_confirmed_received_at,
             admin_declared_received_at, player_confirmed_amount_at,
             completed_at, created_at
      FROM wallet_deposit_requests
      WHERE user_id = ? AND status = 'pending'
      ORDER BY created_at DESC
    `
      )
      .all(userId);
  } catch {
    pending = [];
  }

  let transactionsTotal = 0;
  let tx: unknown[] = [];
  try {
    const totalRow = (await db
      .prepare(`SELECT COUNT(*) AS c FROM wallet_transactions WHERE user_id = ?`)
      .get(userId)) as { c: number } | undefined;
    transactionsTotal = Number(totalRow?.c ?? 0);

    tx = await db
      .prepare(
        `
      SELECT
        t.id,
        t.user_id,
        t.kind,
        t.amount_pln,
        t.wallet_kind,
        t.deposit_request_id,
        t.match_id,
        t.related_user_id,
        t.note,
        t.created_at,
        COALESCE(t.is_test, 0) AS is_test,
        SUM(t.amount_pln) OVER (
          PARTITION BY t.user_id
          ORDER BY datetime(t.created_at) ASC, t.id ASC
          ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
        ) AS balance_after_pln,
        m.match_date AS match_date,
        m.match_time AS match_time,
        m.location AS match_location,
        CASE WHEN COALESCE(m.cancelled, 0) = 1 THEN 1 ELSE 0 END AS match_cancelled,
        ru.player_alias AS related_zawodnik,
        ru.first_name AS related_first_name,
        ru.last_name AS related_last_name
      FROM wallet_transactions t
      LEFT JOIN matches m ON m.id = t.match_id
      LEFT JOIN users ru ON ru.id = t.related_user_id
      WHERE t.user_id = ?
      ORDER BY datetime(t.created_at) DESC, t.id DESC
      LIMIT ? OFFSET ?
    `
      )
      .all(userId, limit, offset);
  } catch {
    transactionsTotal = 0;
    tx = [];
  }

  return NextResponse.json({
    user_id: userId,
    balance_pln: balances.total,
    admin_balance_pln: balances.admin,
    operator_balance_pln: balances.operator,
    pending,
    transactions: tx,
    transactions_total: transactionsTotal,
    transactions_offset: offset,
    transactions_limit: limit,
    transactions_has_more: offset + tx.length < transactionsTotal,
  });
}
