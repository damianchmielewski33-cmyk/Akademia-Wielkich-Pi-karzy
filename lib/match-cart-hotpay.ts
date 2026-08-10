import { getAppSettings } from "@/lib/app-settings";
import { getDb, logActivity } from "@/lib/db";
import {
  createPendingMatchCart,
  linkHotpaySessionToCart,
} from "@/lib/match-cart";
import {
  buildHotpayReturnUrl,
  createHotpaySessionId,
  getHotpayConfig,
  grossUpHotpayAmount,
  initPayment,
} from "@/lib/hotpay";
import { matchCartRoundingMarkupPln } from "@/lib/match-fee";
import { markHotpayPaymentFailure } from "@/lib/hotpay-wallet";

export type StartHotpayMatchCartResult =
  | {
      ok: true;
      url: string;
      session_id: string;
      cart_id: number;
      amount_pln: number;
    }
  | { ok: false; error: string; status: number };

/**
 * Tworzy pending koszyk + sesję HotPay (bez logowania — np. gość z zaproszenia).
 * Po sukcesie webhook doładowuje portfel płatnika i stosuje koszyk.
 */
export async function startHotpayMatchCartPayment(args: {
  payerUserId: number;
  matchId: number;
  beneficiaryUserIds: number[];
  returnPath: string;
  /** Etykieta w nazwie usługi HotPay (np. imię gościa). */
  payerLabel: string;
  /** Gdy true — logActivity pod payerUserId (gość). */
  logAsPayer?: boolean;
}): Promise<StartHotpayMatchCartResult> {
  const config = getHotpayConfig();
  if (!config) {
    return {
      ok: false,
      error: "Płatności online są chwilowo niedostępne.",
      status: 503,
    };
  }

  const db = await getDb();
  const appSettings = await getAppSettings(db);
  if (!appSettings.hotpay_enabled) {
    return {
      ok: false,
      error: "Płatności online są wyłączone.",
      status: 503,
    };
  }

  const pending = await createPendingMatchCart({
    payerUserId: args.payerUserId,
    matchId: args.matchId,
    beneficiaryUserIds: args.beneficiaryUserIds,
  });
  if (!pending.ok) {
    const messages: Record<typeof pending.error, string> = {
      MATCH_NOT_FOUND: "Nie znaleziono meczu.",
      MATCH_CLOSED: "Ten mecz jest już zamknięty lub odwołany.",
      NO_FEE: "Brak ustalonej opłaty za mecz.",
      NO_BENEFICIARIES: "Brak zawodników do opłacenia.",
      INVALID_BENEFICIARIES: "Zawodnik nie kwalifikuje się do opłaty.",
    };
    return { ok: false, error: messages[pending.error], status: 400 };
  }

  const matchRow = (await db
    .prepare(`SELECT fee_pln, signed_up FROM matches WHERE id = ?`)
    .get(args.matchId)) as { fee_pln: number | null; signed_up: number } | undefined;
  const commissionOffsetPln = matchCartRoundingMarkupPln(
    matchRow?.fee_pln,
    Number(matchRow?.signed_up ?? 0),
    pending.beneficiaries.length
  );

  const amountPln = pending.amount_pln;
  const grossAmountPln = grossUpHotpayAmount(
    amountPln,
    appSettings.hotpay_commission_pct,
    appSettings.hotpay_commission_fixed,
    commissionOffsetPln
  );
  const hasCommission = grossAmountPln > amountPln;

  const sessionId = createHotpaySessionId(args.payerUserId);
  const returnUrl = buildHotpayReturnUrl(sessionId, "pending", args.returnPath);
  const payerLabel = args.payerLabel.trim() || `Gracz #${args.payerUserId}`;
  const serviceName = `${config.serviceName} — koszyk meczowy (${payerLabel})`;

  const insert = await db
    .prepare(
      `INSERT INTO hotpay_payments (session_id, user_id, kind, amount_pln, gross_amount_pln, status, cart_id, is_test)
       VALUES (?, ?, 'match_cart', ?, ?, 'pending', ?, 0)`
    )
    .run(sessionId, args.payerUserId, amountPln, hasCommission ? grossAmountPln : null, pending.cart_id);

  await linkHotpaySessionToCart(pending.cart_id, sessionId);

  const emailRow = (await db.prepare("SELECT email FROM users WHERE id = ?").get(args.payerUserId)) as
    | { email: string | null }
    | undefined;

  const init = await initPayment(
    {
      amountPln: grossAmountPln,
      orderId: sessionId,
      returnUrl,
      email: emailRow?.email ?? undefined,
      personalData: payerLabel,
      serviceName,
    },
    { config }
  );

  if (!init.ok) {
    await markHotpayPaymentFailure(db, Number(insert.lastInsertRowid), { errorMessage: init.error });
    await db
      .prepare(`UPDATE wallet_match_carts SET status = 'cancelled' WHERE id = ? AND status = 'pending'`)
      .run(pending.cart_id);
    return { ok: false, error: init.error, status: 502 };
  }

  if (args.logAsPayer !== false) {
    await logActivity(
      args.payerUserId,
      `Koszyk meczowy HotPay (zaproszenie): ${amountPln.toFixed(2)} PLN · mecz ${args.matchId} [${sessionId}]`
    );
  }

  return {
    ok: true,
    url: init.url,
    session_id: sessionId,
    cart_id: pending.cart_id,
    amount_pln: amountPln,
  };
}
