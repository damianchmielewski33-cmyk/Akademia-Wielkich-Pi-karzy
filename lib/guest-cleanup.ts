import { getDb, logActivity } from "@/lib/db";

type TempUserRow = {
  id: number;
  first_name: string;
  last_name: string;
  is_temporary: number;
  temporary_guest_match_id: number | null;
};

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

/** Usuwa gościa jednorazowego dopiero gdy saldo portfela wynosi 0. */
export async function tryRemoveTemporaryGuestIfBalanceZero(args: {
  userId: number;
  matchId?: number | null;
  actorUserId?: number;
}): Promise<boolean> {
  const db = await getDb();
  const user = (await db
    .prepare(
      "SELECT id, first_name, last_name, is_temporary, temporary_guest_match_id FROM users WHERE id = ?"
    )
    .get(args.userId)) as TempUserRow | undefined;

  if (!user?.is_temporary) return false;

  const balanceRow = (await db
    .prepare(`SELECT COALESCE(ROUND(SUM(amount_pln), 2), 0) AS balance FROM wallet_transactions WHERE user_id = ?`)
    .get(args.userId)) as { balance: number } | undefined;
  const balance = round2(Number(balanceRow?.balance ?? 0));

  if (Math.abs(balance) >= 0.005) return false;

  const mid = args.matchId ?? user.temporary_guest_match_id;
  if (!mid) return false;

  const uid = args.userId;

  await db.prepare("DELETE FROM match_signups WHERE user_id = ? AND match_id = ?").run(uid, mid);
  await db.prepare("UPDATE matches SET signed_up = signed_up - 1 WHERE id = ? AND signed_up > 0").run(mid);
  await db.prepare("DELETE FROM match_stats WHERE user_id = ? AND match_id = ?").run(uid, mid);
  await db.prepare("DELETE FROM wallet_transactions WHERE user_id = ?").run(uid);
  await db.prepare("DELETE FROM match_wallet_charges WHERE user_id = ?").run(uid);
  await db.prepare("DELETE FROM match_lineup_slots WHERE user_id = ?").run(uid);
  await db.prepare("DELETE FROM match_attendance WHERE user_id = ?").run(uid);
  await db.prepare("DELETE FROM match_participation_survey WHERE user_id = ?").run(uid);
  await db.prepare("DELETE FROM match_transport_messages WHERE user_id = ?").run(uid);
  await db.prepare("DELETE FROM users WHERE id = ?").run(uid);

  if (args.actorUserId != null) {
    await logActivity(
      args.actorUserId,
      `Usunął gościa ${user.first_name} ${user.last_name} po wyzerowaniu salda portfela (mecz id ${mid})`
    );
  }

  return true;
}

/** @deprecated Użyj tryRemoveTemporaryGuestIfBalanceZero */
export const removeTemporaryGuestIfPaid = tryRemoveTemporaryGuestIfBalanceZero;
