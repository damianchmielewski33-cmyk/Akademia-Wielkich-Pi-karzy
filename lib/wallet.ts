import { getDb } from "@/lib/db";
import { tryRemoveTemporaryGuestIfBalanceZero } from "@/lib/guest-cleanup";
import { matchChargeRoundingMarkupPln } from "@/lib/match-fee";

export type WalletBalanceRow = { balance_pln: number };

export type WalletBalances = {
  admin: number;
  operator: number;
  total: number;
};

export async function getUserWalletBalancePln(userId: number): Promise<number> {
  const db = await getDb();
  const row = (await db
    .prepare(
      `
      SELECT COALESCE(ROUND(SUM(amount_pln), 2), 0) AS balance_pln
      FROM wallet_transactions
      WHERE user_id = ?
    `
    )
    .get(userId)) as WalletBalanceRow | undefined;
  return Number(row?.balance_pln ?? 0);
}

/** Zwraca salda z podziałem na portfel admina i operatora. */
export async function getWalletBalances(userId: number): Promise<WalletBalances> {
  const db = await getDb();
  const rows = (await db
    .prepare(
      `SELECT wallet_kind, COALESCE(ROUND(SUM(amount_pln), 2), 0) AS balance_pln
       FROM wallet_transactions
       WHERE user_id = ?
       GROUP BY wallet_kind`
    )
    .all(userId)) as { wallet_kind: string; balance_pln: number }[];
  let admin = 0;
  let operator = 0;
  for (const r of rows) {
    if (r.wallet_kind === "operator") operator = Number(r.balance_pln);
    else admin = Number(r.balance_pln);
  }
  return { admin, operator, total: Math.round((admin + operator) * 100) / 100 };
}

/**
 * Suma zawyżeń składki (ceil do 0,50) z obciążeń meczowych gracza.
 * Używana do obniżenia prowizji HotPay przy spłacie zaległości.
 */
export async function getMatchFeeRoundingCreditForUser(userId: number): Promise<number> {
  const db = await getDb();
  const rows = (await db
    .prepare(
      `
      SELECT c.amount_pln, m.fee_pln, m.signed_up
      FROM match_wallet_charges c
      JOIN matches m ON m.id = c.match_id
      WHERE c.user_id = ?
    `
    )
    .all(userId)) as { amount_pln: number; fee_pln: number | null; signed_up: number }[];

  let credit = 0;
  for (const r of rows) {
    credit += matchChargeRoundingMarkupPln(Number(r.amount_pln), r.fee_pln, Number(r.signed_up));
  }
  return Math.round(credit * 100) / 100;
}

export type WalletDepositRequestRow = {
  id: number;
  user_id: number;
  amount_pln: number;
  created_by: "player" | "admin";
  status: "pending" | "completed" | "cancelled";
  wallet_kind: "admin" | "operator";
  note: string | null;
  player_declared_at: string | null;
  admin_confirmed_received_at: string | null;
  admin_declared_received_at: string | null;
  player_confirmed_amount_at: string | null;
  completed_at: string | null;
  created_at: string;
};

export type WalletTransactionRow = {
  id: number;
  user_id: number;
  kind: "deposit" | "match_charge" | "adjustment" | "transfer";
  amount_pln: number;
  wallet_kind: "admin" | "operator";
  deposit_request_id: number | null;
  match_id: number | null;
  related_user_id: number | null;
  note: string | null;
  created_at: string;
};

function roundPln(n: number): number {
  return Math.round(n * 100) / 100;
}

function formatPlayerLabel(u: {
  first_name: string;
  last_name: string;
  player_alias: string;
}): string {
  const name = [u.first_name, u.last_name].filter(Boolean).join(" ").trim();
  return name || u.player_alias || "Gracz";
}

/**
 * Przelew P2P: dwie pozycje ledgerowe (debit nadawcy, credit odbiorcy).
 * Po debicie weryfikuje saldo — przy wyścigu równoległym cofa debet.
 */
export async function transferWalletFunds(args: {
  fromUserId: number;
  toUserId: number;
  amountPln: number;
  note?: string | null;
}): Promise<
  | { ok: true; amount_pln: number; balance_pln: number }
  | {
      ok: false;
      error:
        | "SELF_TRANSFER"
        | "INVALID_AMOUNT"
        | "RECIPIENT_NOT_FOUND"
        | "INSUFFICIENT_FUNDS";
    }
> {
  const amount = roundPln(Number(args.amountPln));
  if (!Number.isFinite(amount) || amount < 1) {
    return { ok: false, error: "INVALID_AMOUNT" };
  }
  if (args.fromUserId === args.toUserId) {
    return { ok: false, error: "SELF_TRANSFER" };
  }

  const db = await getDb();
  const recipient = (await db
    .prepare(
      `SELECT id, first_name, last_name, player_alias
       FROM users WHERE id = ? AND COALESCE(is_temporary, 0) = 0`
    )
    .get(args.toUserId)) as
    | { id: number; first_name: string; last_name: string; player_alias: string }
    | undefined;
  if (!recipient) {
    return { ok: false, error: "RECIPIENT_NOT_FOUND" };
  }

  const sender = (await db
    .prepare(
      `SELECT id, first_name, last_name, player_alias FROM users WHERE id = ?`
    )
    .get(args.fromUserId)) as
    | { id: number; first_name: string; last_name: string; player_alias: string }
    | undefined;
  if (!sender) {
    return { ok: false, error: "RECIPIENT_NOT_FOUND" };
  }

  const balanceBefore = await getUserWalletBalancePln(args.fromUserId);
  if (balanceBefore < amount) {
    return { ok: false, error: "INSUFFICIENT_FUNDS" };
  }

  const toLabel = formatPlayerLabel(recipient);
  const fromLabel = formatPlayerLabel(sender);
  const extraNote = args.note?.trim() ? ` — ${args.note.trim()}` : "";

  const debit = await db
    .prepare(
      `INSERT INTO wallet_transactions (user_id, kind, amount_pln, related_user_id, note, is_test)
       VALUES (?, 'transfer', ?, ?, ?, ?)`
    )
    .run(args.fromUserId, -amount, args.toUserId, `Przelew do ${toLabel}${extraNote}`, 0);

  const balanceAfterDebit = await getUserWalletBalancePln(args.fromUserId);
  if (balanceAfterDebit < 0) {
    await db.prepare(`DELETE FROM wallet_transactions WHERE id = ?`).run(Number(debit.lastInsertRowid));
    return { ok: false, error: "INSUFFICIENT_FUNDS" };
  }

  await db
    .prepare(
      `INSERT INTO wallet_transactions (user_id, kind, amount_pln, related_user_id, note, is_test)
       VALUES (?, 'transfer', ?, ?, ?, ?)`
    )
    .run(args.toUserId, amount, args.fromUserId, `Przelew od ${fromLabel}${extraNote}`, 0);

  const balance_pln = await getUserWalletBalancePln(args.fromUserId);
  return { ok: true, amount_pln: amount, balance_pln };
}

export async function completeDepositRequest(
  depositId: number,
  completedByUserId: number,
  walletKind: "admin" | "operator" = "admin"
) {
  const db = await getDb();
  const dep = (await db
    .prepare(
      `SELECT id, user_id, amount_pln, status, created_by,
              player_declared_at, admin_confirmed_received_at,
              admin_declared_received_at, player_confirmed_amount_at
       FROM wallet_deposit_requests
       WHERE id = ?`
    )
    .get(depositId)) as
    | {
        id: number;
        user_id: number;
        amount_pln: number;
        status: string;
        created_by: "player" | "admin";
        player_declared_at: string | null;
        admin_confirmed_received_at: string | null;
        admin_declared_received_at: string | null;
        player_confirmed_amount_at: string | null;
      }
    | undefined;
  if (!dep) return { ok: false as const, error: "NOT_FOUND" as const };
  if (dep.status !== "pending") return { ok: false as const, error: "NOT_PENDING" as const };
  // Safety: never complete without the proper party confirmation.
  const confirmOk =
    (dep.created_by === "player" && Boolean(dep.player_declared_at) && Boolean(dep.admin_confirmed_received_at)) ||
    (dep.created_by === "admin" && Boolean(dep.admin_declared_received_at) && Boolean(dep.player_confirmed_amount_at));
  if (!confirmOk) return { ok: false as const, error: "NOT_CONFIRMED" as const };

  // Atomowe przejęcie wiersza — drugi równoległy confirm dostaje changes=0.
  const claim = await db
    .prepare(
      `UPDATE wallet_deposit_requests
       SET status = 'completed', completed_at = datetime('now')
       WHERE id = ? AND status = 'pending'`
    )
    .run(depositId);
  if (claim.changes === 0) {
    return { ok: false as const, error: "NOT_PENDING" as const };
  }

  await db
    .prepare(
      `INSERT INTO wallet_transactions (user_id, kind, amount_pln, deposit_request_id, wallet_kind, note, is_test)
       VALUES (?, 'deposit', ?, ?, ?, ?, ?)`
    )
    .run(
      dep.user_id,
      Number(dep.amount_pln),
      dep.id,
      walletKind,
      `Wpłata zaksięgowana (zakończone przez user ${completedByUserId})`,
      0
    );

  await tryRemoveTemporaryGuestIfBalanceZero({
    userId: dep.user_id,
    actorUserId: completedByUserId,
  });

  return { ok: true as const };
}

export async function createMatchCharge(args: {
  matchId: number;
  userId: number;
  amountPln: number;
  note?: string | null;
  adminId: number;
}) {
  const db = await getDb();
  const fee = Math.abs(args.amountPln);
  const chargeNote = args.note ?? `Rozliczenie meczu id ${args.matchId}`;

  await db.prepare(
    `INSERT INTO match_wallet_charges (match_id, user_id, amount_pln, note, created_by_admin_id)
     VALUES (?, ?, ?, ?, ?)`
  ).run(args.matchId, args.userId, fee, chargeNote, args.adminId);

  // Opłata pobierana najpierw z portfela admina, reszta z portfela operatora.
  const balances = await getWalletBalances(args.userId);
  const adminBalance = balances.admin;

  if (adminBalance >= fee) {
    await db.prepare(
      `INSERT INTO wallet_transactions (user_id, kind, amount_pln, match_id, wallet_kind, note, is_test)
       VALUES (?, 'match_charge', ?, ?, 'admin', ?, ?)`
    ).run(args.userId, -fee, args.matchId, chargeNote, 0);
  } else if (adminBalance > 0) {
    const adminPart = Math.round(adminBalance * 100) / 100;
    const operatorPart = Math.round((fee - adminPart) * 100) / 100;
    await db.prepare(
      `INSERT INTO wallet_transactions (user_id, kind, amount_pln, match_id, wallet_kind, note, is_test)
       VALUES (?, 'match_charge', ?, ?, 'admin', ?, ?)`
    ).run(args.userId, -adminPart, args.matchId, chargeNote, 0);
    await db.prepare(
      `INSERT INTO wallet_transactions (user_id, kind, amount_pln, match_id, wallet_kind, note, is_test)
       VALUES (?, 'match_charge', ?, ?, 'operator', ?, ?)`
    ).run(args.userId, -operatorPart, args.matchId, chargeNote, 0);
  } else {
    await db.prepare(
      `INSERT INTO wallet_transactions (user_id, kind, amount_pln, match_id, wallet_kind, note, is_test)
       VALUES (?, 'match_charge', ?, ?, 'operator', ?, ?)`
    ).run(args.userId, -fee, args.matchId, chargeNote, 0);
  }

  await tryRemoveTemporaryGuestIfBalanceZero({
    userId: args.userId,
    matchId: args.matchId,
    actorUserId: args.adminId,
  });
}

