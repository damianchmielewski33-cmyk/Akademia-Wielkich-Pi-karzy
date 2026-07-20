import type { AppDb } from "@/lib/db";
import { getUserWalletBalancePln } from "@/lib/wallet";

/** Czy zawodnik ma oznaczoną opłatę (flaga lub dodatnie saldo portfela). */
export async function isMatchPaidForUser(
  db: AppDb,
  args: { matchId: number; userId: number; paidFlag: number }
): Promise<boolean> {
  if (args.paidFlag === 1) return true;
  const balance = await getUserWalletBalancePln(args.userId);
  return balance >= 0;
}

/** Synchronizuje flagę paid z portfelem po ręcznym oznaczeniu przez admina. */
export async function syncPaidFlagWithWallet(
  db: AppDb,
  args: {
    matchId: number;
    userId: number;
    paid: boolean;
    adminId: number;
    matchLabel: string;
    feePln?: number | null;
  }
): Promise<void> {
  if (!args.paid) return;

  const balance = await getUserWalletBalancePln(args.userId);
  if (balance >= 0) return;

  const topUp = Math.abs(balance);
  const fee = args.feePln != null && Number.isFinite(args.feePln) ? Math.max(args.feePln, topUp) : topUp;

  await db
    .prepare(
      `INSERT INTO wallet_transactions (user_id, kind, amount_pln, match_id, note)
       VALUES (?, 'adjustment', ?, ?, ?)`
    )
    .run(
      args.userId,
      fee,
      args.matchId,
      `Korekta salda przy oznaczeniu opłaty — ${args.matchLabel}`
    );
}
