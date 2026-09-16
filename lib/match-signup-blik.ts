import type { AppDb } from "@/lib/db";
import { logActivity } from "@/lib/db";
import { syncPaidFlagWithWallet } from "@/lib/match-paid";
import { matchSignupContributionPln } from "@/lib/public-payment-share";

export type MatchForBlik = {
  id: number;
  match_date: string;
  match_time: string;
  location: string;
  fee_pln: number | null;
  signed_up: number;
};

export type BlikActionOk = { ok: true; alreadyPaid: boolean; alreadyDeclared: boolean };
export type BlikActionErr = { ok: false; error: string; status: number };
export type BlikActionResult = BlikActionOk | BlikActionErr;

export async function loadCommittedSignup(db: AppDb, matchId: number, userId: number) {
  return (await db
    .prepare(
      `SELECT user_id, COALESCE(paid, 0) AS paid, COALESCE(blik_declared, 0) AS blik_declared
       FROM match_signups
       WHERE match_id = ? AND user_id = ? AND COALESCE(commitment, 1) = 1`
    )
    .get(matchId, userId)) as { user_id: number; paid: number; blik_declared: number } | undefined;
}

/** Zawodnik zgłasza przelew BLIK — bez oznaczania jako opłacone. */
export async function declareBlikPhoneTransfer(
  db: AppDb,
  args: { match: MatchForBlik; userId: number }
): Promise<BlikActionResult> {
  const signup = await loadCommittedSignup(db, args.match.id, args.userId);
  if (!signup) {
    return { ok: false, error: "Ten zawodnik nie jest zapisany na mecz", status: 400 };
  }
  if (Number(signup.paid) === 1) {
    return { ok: true, alreadyPaid: true, alreadyDeclared: true };
  }
  if (Number(signup.blik_declared) === 1) {
    return { ok: true, alreadyPaid: false, alreadyDeclared: true };
  }

  await db
    .prepare(`UPDATE match_signups SET blik_declared = 1 WHERE match_id = ? AND user_id = ?`)
    .run(args.match.id, args.userId);

  const matchLabel = `${args.match.match_date} ${args.match.match_time} · ${args.match.location}`;
  await logActivity(
    args.userId,
    `Zgłosił przelew BLIK na telefon — czeka na potwierdzenie admina — ${matchLabel}`
  );

  return { ok: true, alreadyPaid: false, alreadyDeclared: false };
}

/** Admin potwierdza, że przelew doszedł — dopiero wtedy status opłacone. */
export async function confirmBlikPhoneTransfer(
  db: AppDb,
  args: { match: MatchForBlik; userId: number; adminId: number }
): Promise<BlikActionResult> {
  const signup = await loadCommittedSignup(db, args.match.id, args.userId);
  if (!signup) {
    return { ok: false, error: "Ten zawodnik nie jest zapisany na mecz", status: 400 };
  }
  if (Number(signup.paid) === 1) {
    return { ok: true, alreadyPaid: true, alreadyDeclared: true };
  }

  await db
    .prepare(`UPDATE match_signups SET paid = 1, blik_declared = 1 WHERE match_id = ? AND user_id = ?`)
    .run(args.match.id, args.userId);

  const matchLabel = `${args.match.match_date} ${args.match.match_time} · ${args.match.location}`;
  await syncPaidFlagWithWallet(db, {
    matchId: args.match.id,
    userId: args.userId,
    paid: true,
    adminId: args.adminId,
    matchLabel,
    feePln: matchSignupContributionPln(args.match.fee_pln, Number(args.match.signed_up) || 0),
  });
  await logActivity(
    args.adminId,
    `Potwierdził przelew BLIK na telefon — ${matchLabel} (zawodnik ${args.userId})`
  );

  return { ok: true, alreadyPaid: false, alreadyDeclared: true };
}

export async function loadMatchForSignupFees(db: AppDb, matchId: number) {
  return (await db
    .prepare("SELECT id, match_date, match_time, location, fee_pln, signed_up, cancelled FROM matches WHERE id = ?")
    .get(matchId)) as
    | (MatchForBlik & { cancelled: number })
    | undefined;
}
