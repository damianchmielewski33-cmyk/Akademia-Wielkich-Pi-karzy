import type { AppDb } from "@/lib/db";
import { tryRemoveTemporaryGuestIfBalanceZero } from "@/lib/guest-cleanup";
import type { HotpayNotificationPayload, HotpayPaymentKind, HotpayPaymentStatus } from "@/lib/hotpay";
import { formatHotpayAmount, timingSafeEqualString, verifyNotificationHash } from "@/lib/hotpay";

export type HotpayPaymentRow = {
  id: number;
  session_id: string;
  user_id: number;
  kind: HotpayPaymentKind;
  amount_pln: number;
  status: HotpayPaymentStatus;
  hotpay_payment_id: string | null;
  secure: string | null;
  deposit_request_id: number | null;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
};

export async function getHotpayPaymentBySessionId(
  db: AppDb,
  sessionId: string
): Promise<HotpayPaymentRow | null> {
  const row = (await db
    .prepare(
      `SELECT id, session_id, user_id, kind, amount_pln, status, hotpay_payment_id, secure,
              deposit_request_id, error_message, created_at, completed_at
       FROM hotpay_payments WHERE session_id = ?`
    )
    .get(sessionId)) as HotpayPaymentRow | undefined;
  return row ?? null;
}

/**
 * Idempotentnie księguje udaną płatność HotPay na portfelu użytkownika.
 * Najpierw atomowo „rezerwuje” wiersz (`pending` → `success`), żeby równoległe
 * webhooki nie zaksięgowały tej samej płatności dwukrotnie.
 */
export async function applyHotpaySuccessCredit(
  db: AppDb,
  payment: HotpayPaymentRow,
  args: { hotpayPaymentId: string; secure: string }
): Promise<{ ok: true; alreadyApplied: boolean } | { ok: false; error: string }> {
  if (payment.status === "success" && payment.deposit_request_id != null) {
    return { ok: true, alreadyApplied: true };
  }

  const amount = Math.round(Number(payment.amount_pln) * 100) / 100;
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, error: "INVALID_AMOUNT" };
  }

  if (payment.status === "pending") {
    const claim = await db
      .prepare(
        `UPDATE hotpay_payments
         SET status = 'success',
             hotpay_payment_id = ?,
             secure = ?,
             error_message = 'crediting-lock',
             completed_at = datetime('now')
         WHERE id = ? AND status = 'pending'`
      )
      .run(args.hotpayPaymentId, args.secure, payment.id);
    if (claim.changes === 0) {
      // Inny worker przejął wiersz — nie wznawiaj księgowania tutaj (unikamy podwójnego INSERT).
      return { ok: true, alreadyApplied: true };
    }
  } else if (payment.status === "success" && payment.deposit_request_id == null) {
    // Wznów po crashu: tylko jeden worker może trzymać crediting-lock.
    const lock = await db
      .prepare(
        `UPDATE hotpay_payments
         SET error_message = 'crediting-lock',
             hotpay_payment_id = COALESCE(hotpay_payment_id, ?),
             secure = COALESCE(secure, ?)
         WHERE id = ? AND status = 'success' AND deposit_request_id IS NULL
           AND IFNULL(error_message, '') != 'crediting-lock'`
      )
      .run(args.hotpayPaymentId, args.secure, payment.id);
    if (lock.changes === 0) {
      return { ok: true, alreadyApplied: true };
    }
  } else {
    return { ok: true, alreadyApplied: true };
  }

  const note =
    payment.kind === "match"
      ? `HotPay — wpisowe / zapłata za mecz (${payment.session_id})`
      : `HotPay — doładowanie portfela (${payment.session_id})`;

  const dep = await db
    .prepare(
      `INSERT INTO wallet_deposit_requests
        (user_id, amount_pln, created_by, status, note,
         player_declared_at, admin_confirmed_received_at, completed_at)
       VALUES (?, ?, 'player', 'completed', ?, datetime('now'), datetime('now'), datetime('now'))`
    )
    .run(payment.user_id, amount, note);

  const depositId = Number(dep.lastInsertRowid);

  await db
    .prepare(
      `INSERT INTO wallet_transactions (user_id, kind, amount_pln, deposit_request_id, note)
       VALUES (?, 'deposit', ?, ?, ?)`
    )
    .run(payment.user_id, amount, depositId, note);

  const linked = await db
    .prepare(
      `UPDATE hotpay_payments
       SET deposit_request_id = ?,
           error_message = NULL,
           hotpay_payment_id = COALESCE(hotpay_payment_id, ?),
           secure = COALESCE(secure, ?)
       WHERE id = ? AND deposit_request_id IS NULL`
    )
    .run(depositId, args.hotpayPaymentId, args.secure, payment.id);

  if (linked.changes === 0) {
    return { ok: true, alreadyApplied: true };
  }

  await tryRemoveTemporaryGuestIfBalanceZero({
    userId: payment.user_id,
    actorUserId: payment.user_id,
  });

  return { ok: true, alreadyApplied: false };
}

export async function markHotpayPaymentFailure(
  db: AppDb,
  paymentId: number,
  args: { hotpayPaymentId?: string | null; secure?: string | null; errorMessage: string }
): Promise<void> {
  await db
    .prepare(
      `UPDATE hotpay_payments
       SET status = 'failure',
           hotpay_payment_id = COALESCE(?, hotpay_payment_id),
           secure = COALESCE(?, secure),
           error_message = ?,
           completed_at = datetime('now')
       WHERE id = ? AND status = 'pending'`
    )
    .run(args.hotpayPaymentId ?? null, args.secure ?? null, args.errorMessage, paymentId);
}

export type ProcessNotificationResult =
  | { ok: true; outcome: "credited" | "already_credited" | "pending" | "failed" }
  | { ok: false; error: "BAD_HASH" | "BAD_SEKRET" | "NOT_FOUND" | "AMOUNT_MISMATCH" | "INVALID_AMOUNT" | string };

export async function processHotpayNotification(
  db: AppDb,
  payload: HotpayNotificationPayload,
  notificationPassword: string,
  expectedSekret: string
): Promise<ProcessNotificationResult> {
  if (!verifyNotificationHash(payload, notificationPassword)) {
    return { ok: false, error: "BAD_HASH" };
  }
  if (!timingSafeEqualString(payload.SEKRET, expectedSekret)) {
    return { ok: false, error: "BAD_SEKRET" };
  }

  const payment = await getHotpayPaymentBySessionId(db, payload.ID_ZAMOWIENIA);
  if (!payment) {
    return { ok: false, error: "NOT_FOUND" };
  }

  let expectedAmount: string;
  try {
    expectedAmount = formatHotpayAmount(payment.amount_pln);
  } catch {
    return { ok: false, error: "INVALID_AMOUNT" };
  }
  const notifiedAmount = Number.parseFloat(payload.KWOTA.replace(",", "."));
  const localAmount = Number.parseFloat(expectedAmount);
  if (!Number.isFinite(notifiedAmount) || Math.round(notifiedAmount * 100) !== Math.round(localAmount * 100)) {
    return { ok: false, error: "AMOUNT_MISMATCH" };
  }

  const status = payload.STATUS.toUpperCase();
  if (status === "SUCCESS") {
    const credit = await applyHotpaySuccessCredit(db, payment, {
      hotpayPaymentId: payload.ID_PLATNOSCI,
      secure: payload.SECURE,
    });
    if (!credit.ok) return { ok: false, error: credit.error };
    return { ok: true, outcome: credit.alreadyApplied ? "already_credited" : "credited" };
  }

  if (status === "PENDING") {
    await db
      .prepare(
        `UPDATE hotpay_payments
         SET hotpay_payment_id = ?, secure = ?
         WHERE id = ? AND status = 'pending'`
      )
      .run(payload.ID_PLATNOSCI, payload.SECURE, payment.id);
    return { ok: true, outcome: "pending" };
  }

  // FAILURE lub nieznany status → failure
  await markHotpayPaymentFailure(db, payment.id, {
    hotpayPaymentId: payload.ID_PLATNOSCI,
    secure: payload.SECURE,
    errorMessage: status === "FAILURE" ? "Płatność odrzucona przez HotPay" : `Status HotPay: ${payload.STATUS}`,
  });
  return { ok: true, outcome: "failed" };
}
