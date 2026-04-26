import { getDb } from "@/lib/db";

export type WalletBalanceRow = { balance_pln: number };

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

export type WalletDepositRequestRow = {
  id: number;
  user_id: number;
  amount_pln: number;
  created_by: "player" | "admin";
  status: "pending" | "completed" | "cancelled";
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
  kind: "deposit" | "match_charge" | "adjustment";
  amount_pln: number;
  deposit_request_id: number | null;
  match_id: number | null;
  note: string | null;
  created_at: string;
};

export async function completeDepositRequest(depositId: number, completedByUserId: number) {
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

  await db.prepare(
    `UPDATE wallet_deposit_requests
     SET status = 'completed', completed_at = datetime('now')
     WHERE id = ?`
  ).run(depositId);

  await db.prepare(
    `INSERT INTO wallet_transactions (user_id, kind, amount_pln, deposit_request_id, note)
     VALUES (?, 'deposit', ?, ?, ?)`
  ).run(dep.user_id, Number(dep.amount_pln), dep.id, `Wpłata zaksięgowana (zakończone przez user ${completedByUserId})`);

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
  await db.prepare(
    `INSERT INTO match_wallet_charges (match_id, user_id, amount_pln, note, created_by_admin_id)
     VALUES (?, ?, ?, ?, ?)`
  ).run(args.matchId, args.userId, args.amountPln, args.note ?? null, args.adminId);

  await db.prepare(
    `INSERT INTO wallet_transactions (user_id, kind, amount_pln, match_id, note)
     VALUES (?, 'match_charge', ?, ?, ?)`
  ).run(args.userId, -Math.abs(args.amountPln), args.matchId, args.note ?? `Rozliczenie meczu id ${args.matchId}`);
}

