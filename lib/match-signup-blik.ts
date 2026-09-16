import type { AppDb } from "@/lib/db";
import { logActivity } from "@/lib/db";
import { tryRemoveTemporaryGuestIfBalanceZero } from "@/lib/guest-cleanup";
import {
  blikContributionCovered,
  resolveBlikReceivedPln,
  roundBlikPln,
  type BlikSettleOutcome,
} from "@/lib/blik-settle";
import { matchSignupContributionPln } from "@/lib/public-payment-share";
import { getUserWalletBalancePln } from "@/lib/wallet";

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

export type BlikSettleOk = {
  ok: true;
  paid: boolean;
  receivedPln: number;
  previousReceivedPln: number;
  walletDeltaPln: number;
  walletBalancePln: number;
};

export async function loadCommittedSignup(db: AppDb, matchId: number, userId: number) {
  return (await db
    .prepare(
      `SELECT user_id, COALESCE(paid, 0) AS paid, COALESCE(blik_declared, 0) AS blik_declared,
              COALESCE(blik_received_pln, 0) AS blik_received_pln
       FROM match_signups
       WHERE match_id = ? AND user_id = ? AND COALESCE(commitment, 1) = 1`
    )
    .get(matchId, userId)) as
    | { user_id: number; paid: number; blik_declared: number; blik_received_pln: number }
    | undefined;
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

function walletNoteForBlik(args: {
  outcome: BlikSettleOutcome;
  matchLabel: string;
  receivedPln: number;
  previousPln: number;
  contributionPln: number;
}): string {
  if (args.outcome === "not_received") {
    return args.previousPln > 0
      ? `Wyksięgowanie przelewu BLIK na telefon (brak wpłaty) — ${args.matchLabel}`
      : `Brak przelewu BLIK na telefon — ${args.matchLabel}`;
  }
  if (args.outcome === "underpaid") {
    return `Przelew BLIK na telefon — niedopłata ${args.receivedPln.toFixed(2)} / ${args.contributionPln.toFixed(2)} PLN — ${args.matchLabel}`;
  }
  if (args.outcome === "overpaid") {
    return `Przelew BLIK na telefon — nadpłata ${args.receivedPln.toFixed(2)} PLN (składka ${args.contributionPln.toFixed(2)}) — ${args.matchLabel}`;
  }
  return `Przelew BLIK na telefon — składka ${args.receivedPln.toFixed(2)} PLN — ${args.matchLabel}`;
}

/**
 * Admin rozlicza przelew BLIK: 0 / za mało / składka / za dużo.
 * Różnica względem poprzedniej kwoty idzie na główny portfel gracza (gotówka/BLIK).
 */
export async function settleBlikPhoneTransfer(
  db: AppDb,
  args: {
    match: MatchForBlik;
    userId: number;
    adminId: number;
    outcome: BlikSettleOutcome;
    receivedPln?: number | null;
  }
): Promise<BlikSettleOk | BlikActionErr> {
  const signup = await loadCommittedSignup(db, args.match.id, args.userId);
  if (!signup) {
    return { ok: false, error: "Ten zawodnik nie jest zapisany na mecz", status: 400 };
  }

  const contributionPln = matchSignupContributionPln(args.match.fee_pln, Number(args.match.signed_up) || 0);
  const resolved = resolveBlikReceivedPln({
    outcome: args.outcome,
    contributionPln,
    receivedPln: args.receivedPln,
  });
  if (!resolved.ok) {
    return { ok: false, error: resolved.error, status: 400 };
  }

  const receivedPln = resolved.receivedPln;
  const previousReceivedPln = roundBlikPln(Number(signup.blik_received_pln ?? 0));
  const walletDeltaPln = roundBlikPln(receivedPln - previousReceivedPln);
  const paid = blikContributionCovered(receivedPln, contributionPln);
  const matchLabel = `${args.match.match_date} ${args.match.match_time} · ${args.match.location}`;

  if (walletDeltaPln !== 0) {
    await db
      .prepare(
        `INSERT INTO wallet_transactions (user_id, kind, amount_pln, match_id, wallet_kind, note, is_test)
         VALUES (?, ?, ?, ?, 'admin', ?, 0)`
      )
      .run(
        args.userId,
        walletDeltaPln > 0 ? "deposit" : "adjustment",
        walletDeltaPln,
        args.match.id,
        walletNoteForBlik({
          outcome: args.outcome,
          matchLabel,
          receivedPln,
          previousPln: previousReceivedPln,
          contributionPln,
        })
      );
  }

  await db
    .prepare(
      `UPDATE match_signups
       SET paid = ?, blik_declared = ?, blik_received_pln = ?
       WHERE match_id = ? AND user_id = ?`
    )
    .run(paid ? 1 : 0, receivedPln > 0 ? 1 : 0, receivedPln, args.match.id, args.userId);

  const walletBalancePln = await getUserWalletBalancePln(args.userId, db);
  await tryRemoveTemporaryGuestIfBalanceZero({
    userId: args.userId,
    matchId: args.match.id,
    actorUserId: args.adminId,
  });

  const outcomeLabel =
    args.outcome === "not_received"
      ? "nie otrzymał przelewu"
      : args.outcome === "underpaid"
        ? `otrzymał za mało (${receivedPln.toFixed(2)} PLN)`
        : args.outcome === "overpaid"
          ? `otrzymał za dużo (${receivedPln.toFixed(2)} PLN)`
          : `otrzymał składkę (${receivedPln.toFixed(2)} PLN)`;
  await logActivity(
    args.adminId,
    `Rozliczył przelew BLIK — ${outcomeLabel} — ${matchLabel} (zawodnik ${args.userId})`
  );

  return {
    ok: true,
    paid,
    receivedPln,
    previousReceivedPln,
    walletDeltaPln,
    walletBalancePln,
  };
}

/** Admin potwierdza pełną składkę (skrót do settle / received). */
export async function confirmBlikPhoneTransfer(
  db: AppDb,
  args: { match: MatchForBlik; userId: number; adminId: number }
): Promise<BlikActionResult> {
  const result = await settleBlikPhoneTransfer(db, {
    ...args,
    outcome: "received",
  });
  if (!result.ok) return result;
  return { ok: true, alreadyPaid: result.paid && result.walletDeltaPln === 0, alreadyDeclared: true };
}

export async function loadMatchForSignupFees(db: AppDb, matchId: number) {
  return (await db
    .prepare("SELECT id, match_date, match_time, location, fee_pln, signed_up, cancelled FROM matches WHERE id = ?")
    .get(matchId)) as
    | (MatchForBlik & { cancelled: number })
    | undefined;
}
