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

async function getWalletBalancePln(userId: number): Promise<number> {
  const db = await getDb();
  const balanceRow = (await db
    .prepare(`SELECT COALESCE(ROUND(SUM(amount_pln), 2), 0) AS balance FROM wallet_transactions WHERE user_id = ?`)
    .get(userId)) as { balance: number } | undefined;
  return round2(Number(balanceRow?.balance ?? 0));
}

async function refundGuestCartIfNeeded(args: {
  matchId: number;
  userId: number;
  actorUserId: number | null;
  reason: string;
}): Promise<{ ok: true; refunded_pln: number } | { ok: false; error: string }> {
  // Dynamic import — unika cyklu guest-cleanup ↔ match-cart ↔ wallet.
  const { getPrepaidMatchCartAmount, refundMatchCartBeneficiary } = await import("@/lib/match-cart");
  const prepaid = await getPrepaidMatchCartAmount(args.matchId, args.userId);
  if (!prepaid) return { ok: true, refunded_pln: 0 };
  const refund = await refundMatchCartBeneficiary({
    matchId: args.matchId,
    beneficiaryUserId: args.userId,
    actorUserId: args.actorUserId,
    reason: args.reason,
  });
  if (!refund.ok) return { ok: false, error: refund.error };
  return { ok: true, refunded_pln: refund.refunded_pln };
}

/**
 * Kasuje rekordy tymczasowego gościa (signup, portfel, user).
 * Wywoływać dopiero po zwrocie koszyka / sprawdzeniu salda.
 */
export async function purgeTemporaryGuestRecords(args: {
  userId: number;
  matchId: number;
}): Promise<void> {
  const db = await getDb();
  const uid = args.userId;
  const mid = args.matchId;

  // Anuluj pozycje w niedokończonych koszykach (completed obsługuje zwrot wcześniej).
  await db.prepare("DELETE FROM wallet_match_cart_items WHERE beneficiary_user_id = ?").run(uid);

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
}

/**
 * Zwrot koszyka (jeśli był) + kasowanie gościa, gdy saldo = 0 i mecz nierozegany.
 * Wspólna ścieżka dla admina i auto-cleanup.
 */
export async function removeTemporaryGuestWithCartRefund(args: {
  userId: number;
  matchId: number;
  actorUserId?: number | null;
  /** Gdy true — nie kasuj przy aktywnym zapisie na nierozegany mecz (auto-cleanup). */
  protectActiveSignup?: boolean;
  reason: string;
}): Promise<
  | { ok: true; removed: true; refunded_pln: number }
  | { ok: true; removed: false; reason: "not_temporary" | "nonzero_balance" | "played" | "active_signup" | "no_match" }
  | { ok: false; error: string }
> {
  const db = await getDb();
  const user = (await db
    .prepare(
      "SELECT id, first_name, last_name, is_temporary, temporary_guest_match_id FROM users WHERE id = ?"
    )
    .get(args.userId)) as TempUserRow | undefined;

  if (!user?.is_temporary) return { ok: true, removed: false, reason: "not_temporary" };

  const mid = args.matchId;
  const matchRow = (await db
    .prepare(`SELECT COALESCE(played, 0) AS played FROM matches WHERE id = ?`)
    .get(mid)) as { played: number } | undefined;
  if (!matchRow) return { ok: true, removed: false, reason: "no_match" };
  if (Number(matchRow.played) === 1) {
    return { ok: true, removed: false, reason: "played" };
  }

  if (args.protectActiveSignup) {
    const activeSignup = (await db
      .prepare(
        `
        SELECT 1 AS ok
        FROM match_signups ms
        JOIN matches m ON m.id = ms.match_id
        WHERE ms.user_id = ?
          AND COALESCE(m.played, 0) = 0
          AND COALESCE(m.cancelled, 0) = 0
        LIMIT 1
      `
      )
      .get(args.userId)) as { ok: number } | undefined;
    if (activeSignup) return { ok: true, removed: false, reason: "active_signup" };
  }

  const refund = await refundGuestCartIfNeeded({
    matchId: mid,
    userId: args.userId,
    actorUserId: args.actorUserId ?? null,
    reason: args.reason,
  });
  if (!refund.ok) return { ok: false, error: refund.error };
  const refunded_pln = refund.refunded_pln;

  const balance = await getWalletBalancePln(args.userId);
  if (Math.abs(balance) >= 0.005) {
    return { ok: true, removed: false, reason: "nonzero_balance" };
  }

  await purgeTemporaryGuestRecords({ userId: args.userId, matchId: mid });

  if (args.actorUserId != null) {
    await logActivity(
      args.actorUserId,
      `Usunął gościa ${user.first_name} ${user.last_name} (mecz id ${mid})${
        refunded_pln > 0 ? ` · zwrot koszyka ${refunded_pln.toFixed(2)} PLN` : ""
      }`
    );
  }

  return { ok: true, removed: true, refunded_pln };
}

/** Usuwa gościa jednorazowego dopiero gdy saldo portfela wynosi 0 (z zwrotem koszyka). */
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

  const mid = args.matchId ?? user.temporary_guest_match_id;
  if (!mid) return false;

  const result = await removeTemporaryGuestWithCartRefund({
    userId: args.userId,
    matchId: mid,
    actorUserId: args.actorUserId,
    protectActiveSignup: true,
    reason: `auto-cleanup po wyzerowaniu salda — mecz id ${mid}`,
  });

  return result.ok === true && result.removed === true;
}

/**
 * Ręczne usunięcie gościa przez admina (ten sam rdzeń co auto-cleanup + zwrot koszyka).
 */
export async function adminRemoveTemporaryGuest(args: {
  userId: number;
  matchId: number;
  actorUserId: number;
  checkBalanceOnly?: boolean;
}): Promise<
  | { ok: true; check: true; balance: number; can_delete: boolean; prepaid_cart_pln: number }
  | { ok: true; deleted: true; refunded_pln: number }
  | { ok: false; error: string; status: number }
> {
  const db = await getDb();
  const user = (await db
    .prepare("SELECT id, first_name, last_name, is_temporary, temporary_guest_match_id FROM users WHERE id = ?")
    .get(args.userId)) as TempUserRow | undefined;

  if (!user) return { ok: false, error: "Użytkownik nie znaleziony", status: 404 };
  if (!user.is_temporary) {
    return { ok: false, error: "To nie jest tymczasowy piłkarz", status: 400 };
  }

  const matchRow = (await db
    .prepare(`SELECT COALESCE(played, 0) AS played FROM matches WHERE id = ?`)
    .get(args.matchId)) as { played: number } | undefined;
  if (!matchRow) return { ok: false, error: "Mecz nie znaleziony", status: 404 };
  if (Number(matchRow.played) === 1) {
    return {
      ok: false,
      error:
        "Nie można usunąć gościa z meczu oznaczonego jako rozegrany. Najpierw cofnij status rozegranego (jeśli to możliwe).",
      status: 409,
    };
  }

  const balance = await getWalletBalancePln(args.userId);
  const { getPrepaidMatchCartAmount } = await import("@/lib/match-cart");
  const prepaid = await getPrepaidMatchCartAmount(args.matchId, args.userId);
  const prepaid_cart_pln = prepaid?.amount_pln ?? 0;
  const balanceIsZero = Math.abs(balance) < 0.005;

  if (args.checkBalanceOnly) {
    return {
      ok: true,
      check: true,
      balance,
      can_delete: balanceIsZero,
      prepaid_cart_pln,
    };
  }

  if (!balanceIsZero) {
    return {
      ok: false,
      error: "Gość może zostać usunięty dopiero gdy saldo portfela wynosi 0",
      status: 400,
    };
  }

  const result = await removeTemporaryGuestWithCartRefund({
    userId: args.userId,
    matchId: args.matchId,
    actorUserId: args.actorUserId,
    protectActiveSignup: false,
    reason: `admin usunął gościa — mecz id ${args.matchId}`,
  });

  if (!result.ok) {
    return { ok: false, error: result.error, status: 409 };
  }
  if (!result.removed) {
    if (result.reason === "nonzero_balance") {
      return {
        ok: false,
        error: "Gość może zostać usunięty dopiero gdy saldo portfela wynosi 0",
        status: 400,
      };
    }
    if (result.reason === "played") {
      return {
        ok: false,
        error:
          "Nie można usunąć gościa z meczu oznaczonego jako rozegrany. Najpierw cofnij status rozegranego (jeśli to możliwe).",
        status: 409,
      };
    }
    return { ok: false, error: "Nie udało się usunąć gościa", status: 400 };
  }

  return { ok: true, deleted: true, refunded_pln: result.refunded_pln };
}

export type AbandonedCleanupResult = {
  cancelled_payments: number;
  cancelled_carts: number;
  removed_guests: number;
  purged_old_payments: number;
  purged_old_carts: number;
};

/**
 * Cron: anuluj stare pending HotPay/koszyki i usuń porzuconych gości z zaproszenia
 * (miejsce w składzie + user), gdy płatność nie doszła w oknie `olderThanMinutes`.
 */
export async function cleanupAbandonedHotpayAndGuests(
  olderThanMinutes = 60,
  retentionDays = 90
): Promise<AbandonedCleanupResult> {
  const db = await getDb();
  const minutes = Math.max(15, Math.min(7 * 24 * 60, Math.floor(olderThanMinutes)));
  const days = Math.max(14, Math.min(730, Math.floor(retentionDays)));
  const ageMod = `-${minutes} minutes`;
  const retainMod = `-${days} days`;

  const stalePending = (await db
    .prepare(
      `
      SELECT id, cart_id FROM hotpay_payments
      WHERE status = 'pending'
        AND deposit_request_id IS NULL
        AND created_at < datetime('now', ?)
    `
    )
    .all(ageMod)) as { id: number; cart_id: number | null }[];

  let cancelled_payments = 0;
  for (const p of stalePending) {
    const upd = await db
      .prepare(
        `UPDATE hotpay_payments
         SET status = 'cancelled',
             error_message = ?,
             completed_at = datetime('now')
         WHERE id = ? AND status = 'pending' AND deposit_request_id IS NULL`
      )
      .run("Timeout — brak potwierdzenia z bramki HotPay", p.id);
    if (upd.changes > 0) cancelled_payments += 1;
    if (p.cart_id != null) {
      await db
        .prepare(`UPDATE wallet_match_carts SET status = 'cancelled' WHERE id = ? AND status = 'pending'`)
        .run(p.cart_id);
    }
  }

  const cartCancel = await db
    .prepare(
      `UPDATE wallet_match_carts
       SET status = 'cancelled'
       WHERE status = 'pending' AND created_at < datetime('now', ?)`
    )
    .run(ageMod);
  const cancelled_carts = Number(cartCancel.changes ?? 0);

  const guests = (await db
    .prepare(
      `
      SELECT DISTINCT u.id AS user_id,
             COALESCE(u.temporary_guest_match_id, ms.match_id) AS match_id
      FROM users u
      JOIN match_signups ms ON ms.user_id = u.id
      JOIN matches m ON m.id = ms.match_id
      WHERE u.is_temporary = 1
        AND COALESCE(ms.paid, 0) = 0
        AND COALESCE(m.played, 0) = 0
        AND COALESCE(m.cancelled, 0) = 0
        AND NOT EXISTS (
          SELECT 1 FROM hotpay_payments hp
          WHERE hp.user_id = u.id AND hp.status = 'success'
        )
        AND NOT EXISTS (
          SELECT 1 FROM hotpay_payments hp
          WHERE hp.user_id = u.id
            AND hp.status = 'pending'
            AND hp.created_at >= datetime('now', ?)
        )
        AND NOT EXISTS (
          SELECT 1 FROM wallet_match_cart_items i
          JOIN wallet_match_carts c ON c.id = i.cart_id
          WHERE i.beneficiary_user_id = u.id AND c.status = 'completed'
        )
        AND (
          EXISTS (
            SELECT 1 FROM hotpay_payments hp
            WHERE hp.user_id = u.id
              AND hp.status IN ('cancelled', 'failure')
              AND hp.created_at < datetime('now', ?)
          )
          OR EXISTS (
            SELECT 1 FROM wallet_match_carts c
            WHERE c.payer_user_id = u.id
              AND c.status = 'cancelled'
              AND c.created_at < datetime('now', ?)
          )
        )
    `
    )
    .all(ageMod, ageMod, ageMod)) as { user_id: number; match_id: number }[];

  let removed_guests = 0;
  for (const g of guests) {
    const result = await removeTemporaryGuestWithCartRefund({
      userId: g.user_id,
      matchId: g.match_id,
      actorUserId: null,
      protectActiveSignup: false,
      reason: `cleanup porzuconej płatności gościa — mecz id ${g.match_id}`,
    });
    if (result.ok && result.removed) removed_guests += 1;
  }

  const oldPay = await db
    .prepare(
      `DELETE FROM hotpay_payments
       WHERE status IN ('failure', 'cancelled')
         AND deposit_request_id IS NULL
         AND created_at < datetime('now', ?)`
    )
    .run(retainMod);
  const purged_old_payments = Number(oldPay.changes ?? 0);

  const oldCarts = await db
    .prepare(
      `DELETE FROM wallet_match_carts
       WHERE status = 'cancelled' AND created_at < datetime('now', ?)`
    )
    .run(retainMod);
  const purged_old_carts = Number(oldCarts.changes ?? 0);

  return {
    cancelled_payments,
    cancelled_carts,
    removed_guests,
    purged_old_payments,
    purged_old_carts,
  };
}

/** @deprecated Użyj tryRemoveTemporaryGuestIfBalanceZero */
export const removeTemporaryGuestIfPaid = tryRemoveTemporaryGuestIfBalanceZero;
