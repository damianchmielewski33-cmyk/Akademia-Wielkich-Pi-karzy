import type { AppDb } from "@/lib/db";
import { tryRemoveTemporaryGuestIfBalanceZero } from "@/lib/guest-cleanup";
import type { HotpayNotificationPayload, HotpayPaymentKind, HotpayPaymentStatus } from "@/lib/hotpay";
import {
  formatHotpayAmount,
  isHotpayTestSessionId,
  timingSafeEqualString,
  verifyNotificationHash,
} from "@/lib/hotpay";
import { applyPendingMatchCartAfterHotpay } from "@/lib/match-cart";

export type HotpayPaymentRow = {
  id: number;
  session_id: string;
  user_id: number;
  kind: HotpayPaymentKind;
  amount_pln: number;
  /** Kwota brutto wysłana do operatora (po gross-up). NULL = brak prowizji (amount_pln = gross). */
  gross_amount_pln: number | null;
  status: HotpayPaymentStatus;
  hotpay_payment_id: string | null;
  secure: string | null;
  deposit_request_id: number | null;
  cart_id: number | null;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
  is_test: number;
};

export async function getHotpayPaymentBySessionId(
  db: AppDb,
  sessionId: string
): Promise<HotpayPaymentRow | null> {
  const row = (await db
    .prepare(
      `SELECT id, session_id, user_id, kind, amount_pln, gross_amount_pln, status, hotpay_payment_id, secure,
              deposit_request_id, cart_id, error_message, created_at, completed_at,
              COALESCE(is_test, 0) AS is_test
       FROM hotpay_payments WHERE session_id = ?`
    )
    .get(sessionId)) as HotpayPaymentRow | undefined;
  return row ?? null;
}

/**
 * Idempotentnie księguje udaną płatność HotPay na portfelu użytkownika.
 * Najpierw atomowo „rezerwuje” wiersz (`pending` → `success`), żeby równoległe
 * webhooki nie zaksięgowały tej samej płatności dwukrotnie.
 * Przy przegranej o `deposit_request_id` cofamy lokalny INSERT (kompensacja).
 */
export async function applyHotpaySuccessCredit(
  db: AppDb,
  payment: HotpayPaymentRow,
  args: { hotpayPaymentId: string; secure: string }
): Promise<{ ok: true; alreadyApplied: boolean } | { ok: false; error: string }> {
  if (payment.status === "success" && payment.deposit_request_id != null) {
    if (payment.kind === "match_cart" && payment.cart_id != null) {
      await applyPendingMatchCartAfterHotpay(payment.cart_id, payment.user_id);
    }
    return { ok: true, alreadyApplied: true };
  }

  const amount = Math.round(Number(payment.amount_pln) * 100) / 100;
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, error: "INVALID_AMOUNT" };
  }

  if (payment.status === "pending" || payment.status === "failure" || payment.status === "cancelled") {
    // pending = normalny flow; failure/cancelled = lokalne „porzucenie” po powrocie —
    // późniejszy SUCCESS z HotPay i tak musi móc zaksięgować.
    const claim = await db
      .prepare(
        `UPDATE hotpay_payments
         SET status = 'success',
             hotpay_payment_id = ?,
             secure = ?,
             error_message = 'crediting-lock',
             completed_at = datetime('now')
         WHERE id = ? AND status IN ('pending', 'failure', 'cancelled') AND deposit_request_id IS NULL`
      )
      .run(args.hotpayPaymentId, args.secure, payment.id);
    if (claim.changes === 0) {
      const latest = await getHotpayPaymentBySessionId(db, payment.session_id);
      if (latest?.deposit_request_id != null) {
        return { ok: true, alreadyApplied: true };
      }
      // Inny worker w trakcie księgowania — nie wstawiaj drugiej wpłaty.
      return { ok: true, alreadyApplied: true };
    }
  } else if (payment.status === "success" && payment.deposit_request_id == null) {
    // Wznów po crashu: przejmij tylko gdy brak aktywnego locka (albo stary „crediting-lock”).
    const lockToken = `lock:${crypto.randomUUID()}`;
    const lock = await db
      .prepare(
        `UPDATE hotpay_payments
         SET error_message = ?,
             hotpay_payment_id = COALESCE(hotpay_payment_id, ?),
             secure = COALESCE(secure, ?)
         WHERE id = ? AND status = 'success' AND deposit_request_id IS NULL
           AND (
             IFNULL(error_message, '') = ''
             OR error_message = 'crediting-lock'
           )`
      )
      .run(lockToken, args.hotpayPaymentId, args.secure, payment.id);
    if (lock.changes === 0) {
      const latest = await getHotpayPaymentBySessionId(db, payment.session_id);
      if (latest?.deposit_request_id != null) {
        return { ok: true, alreadyApplied: true };
      }
      return { ok: true, alreadyApplied: true };
    }
  } else {
    return { ok: true, alreadyApplied: true };
  }

  // Idempotencja po partial-crash: ta sama sesja już ma wpłatę.
  const existingBySession = (await db
    .prepare(
      `SELECT id FROM wallet_deposit_requests
       WHERE user_id = ? AND note LIKE ? AND status = 'completed'
       LIMIT 1`
    )
    .get(payment.user_id, `%(${payment.session_id})%`)) as { id: number } | undefined;
  if (existingBySession) {
    await db
      .prepare(
        `UPDATE hotpay_payments
         SET deposit_request_id = ?, error_message = NULL,
             hotpay_payment_id = COALESCE(hotpay_payment_id, ?),
             secure = COALESCE(secure, ?)
         WHERE id = ? AND deposit_request_id IS NULL`
      )
      .run(existingBySession.id, args.hotpayPaymentId, args.secure, payment.id);
    return { ok: true, alreadyApplied: true };
  }

  const note =
    payment.kind === "match"
      ? `HotPay — wpisowe / zapłata za mecz (${payment.session_id})`
      : payment.kind === "match_cart"
        ? `HotPay — koszyk meczowy (${payment.session_id})`
        : `HotPay — doładowanie portfela (${payment.session_id})`;

  const dep = await db
    .prepare(
      `INSERT INTO wallet_deposit_requests
        (user_id, amount_pln, created_by, status, wallet_kind, note,
         player_declared_at, admin_confirmed_received_at, completed_at)
       VALUES (?, ?, 'player', 'completed', 'operator', ?, datetime('now'), datetime('now'), datetime('now'))`
    )
    .run(payment.user_id, amount, note);

  const depositId = Number(dep.lastInsertRowid);
  const isTest =
    Number(payment.is_test) === 1 || isHotpayTestSessionId(payment.session_id) ? 1 : 0;

  await db
    .prepare(
      `INSERT INTO wallet_transactions (user_id, kind, amount_pln, deposit_request_id, wallet_kind, note, is_test)
       VALUES (?, 'deposit', ?, ?, 'operator', ?, ?)`
    )
    .run(payment.user_id, amount, depositId, note, isTest);

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
    // Przegrana wyścigu — cofnij lokalną wpłatę, żeby nie było podwójnego salda.
    await db.prepare(`DELETE FROM wallet_transactions WHERE deposit_request_id = ?`).run(depositId);
    await db.prepare(`DELETE FROM wallet_deposit_requests WHERE id = ?`).run(depositId);
    return { ok: true, alreadyApplied: true };
  }

  await tryRemoveTemporaryGuestIfBalanceZero({
    userId: payment.user_id,
    actorUserId: payment.user_id,
  });

  if (payment.kind === "match_cart" && payment.cart_id != null) {
    await applyPendingMatchCartAfterHotpay(payment.cart_id, payment.user_id);
  }

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

/** Oznacza pending jako cancelled po powrocie użytkownika bez potwierdzenia (np. anulowany BLIK). */
export async function markHotpayPaymentCancelledByUser(
  db: AppDb,
  payment: HotpayPaymentRow
): Promise<{ ok: true; status: HotpayPaymentStatus } | { ok: false; error: string }> {
  if (payment.status === "success" && payment.deposit_request_id != null) {
    return { ok: true, status: "success" };
  }
  if (payment.status === "failure" || payment.status === "cancelled") {
    return { ok: true, status: payment.status };
  }
  if (payment.status !== "pending") {
    return { ok: true, status: payment.status };
  }
  await db
    .prepare(
      `UPDATE hotpay_payments
       SET status = 'cancelled',
           error_message = ?,
           completed_at = datetime('now')
       WHERE id = ? AND status = 'pending'`
    )
    .run("Anulowano lub brak potwierdzenia po powrocie z bramki HotPay", payment.id);
  const latest = await getHotpayPaymentBySessionId(db, payment.session_id);
  return { ok: true, status: latest?.status ?? "cancelled" };
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
  if (!timingSafeEqualString(payload.SEKRET.trim(), expectedSekret.trim())) {
    console.error(
      `[hotpay/notification] BAD_SEKRET payload_len=${payload.SEKRET.trim().length} env_len=${expectedSekret.trim().length} payload_prefix=${payload.SEKRET.trim().slice(0, 6)}... env_prefix=${expectedSekret.trim().slice(0, 6)}...`
    );
    return { ok: false, error: "BAD_SEKRET" };
  }

  const payment = await getHotpayPaymentBySessionId(db, payload.ID_ZAMOWIENIA);
  if (!payment) {
    return { ok: false, error: "NOT_FOUND" };
  }

  let expectedAmount: string;
  try {
    // Porównuj z kwotą brutto (wysłaną do operatora); jeśli nie ma gross — fallback do net.
    const referenceAmount = payment.gross_amount_pln ?? payment.amount_pln;
    expectedAmount = formatHotpayAmount(referenceAmount);
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
    errorMessage: status === "FAILURE" ? "Płatność została odrzucona" : `Nieznany status płatności: ${payload.STATUS}`,
  });
  return { ok: true, outcome: "failed" };
}
