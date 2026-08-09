import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/api-helpers";
import { getAppSettings } from "@/lib/app-settings";
import { getDb, logActivity } from "@/lib/db";
import {
  applyMatchCartFromWallet,
  createPendingMatchCart,
  linkHotpaySessionToCart,
  listMatchCartOptions,
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
import { checkRateLimit, rateLimitKey, rateLimitedResponse, RATE } from "@/lib/rate-limit";
import { screenBlockApiResponse } from "@/lib/screen-block-api";
import { isAdminTestModeActive, persistAdminTestModeFlag } from "@/lib/test-mode";
import { getUserWalletBalancePln } from "@/lib/wallet";

export const runtime = "nodejs";

const postSchema = z.object({
  match_id: z.coerce.number().int().positive(),
  user_ids: z.array(z.coerce.number().int().positive()).min(1).max(40),
  /** Gdy brak środków — spróbuj HotPay na pełną kwotę koszyka. */
  allow_hotpay: z.boolean().optional().default(true),
  /** Ścieżka powrotu po bramce (np. /terminarz?mecz=12). */
  return_path: z.string().trim().max(512).optional(),
});

export async function GET(req: Request) {
  const blocked = await screenBlockApiResponse(req);
  if (blocked) return blocked;

  const gate = await requireUser();
  if (!gate.ok) return gate.response;

  const matches = await listMatchCartOptions();
  const balance_pln = await getUserWalletBalancePln(gate.session.userId);
  return NextResponse.json({ matches, balance_pln });
}

export async function POST(req: Request) {
  const blocked = await screenBlockApiResponse(req);
  if (blocked) return blocked;

  const gate = await requireUser();
  if (!gate.ok) return gate.response;

  const rl = checkRateLimit(
    rateLimitKey(`wallet_match_cart:${gate.session.userId}`, req),
    RATE.walletMatchCart.limit,
    RATE.walletMatchCart.windowMs
  );
  if (!rl.ok) return rateLimitedResponse(rl.retryAfterSec);

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Nieprawidłowe JSON" }, { status: 400 });
  }
  const parsed = postSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Wybierz mecz i co najmniej jednego zawodnika." }, { status: 400 });
  }

  const payerId = gate.session.userId;
  const { match_id, user_ids, allow_hotpay, return_path } = parsed.data;

  const walletPay = await applyMatchCartFromWallet({
    payerUserId: payerId,
    matchId: match_id,
    beneficiaryUserIds: user_ids,
  });

  if (walletPay.ok) {
    await logActivity(
      payerId,
      `Koszyk meczowy: opłacono ${walletPay.paid_user_ids.length} os. · ${walletPay.amount_pln} PLN (mecz ${match_id})`
    );
    return NextResponse.json({
      ok: true,
      method: "wallet",
      cart_id: walletPay.cart_id,
      amount_pln: walletPay.amount_pln,
      balance_pln: walletPay.balance_pln,
      paid_user_ids: walletPay.paid_user_ids,
    });
  }

  if (walletPay.error !== "INSUFFICIENT_FUNDS" || !allow_hotpay) {
    const messages: Record<typeof walletPay.error, string> = {
      MATCH_NOT_FOUND: "Nie znaleziono meczu.",
      MATCH_CLOSED: "Ten mecz jest już zamknięty lub odwołany.",
      NO_FEE: "Brak ustalonej opłaty za mecz.",
      NO_BENEFICIARIES: "Wybierz zawodników do opłacenia.",
      INVALID_BENEFICIARIES: "Część zawodników nie kwalifikuje się do opłaty (już opłaceni lub niezapisani).",
      INSUFFICIENT_FUNDS: "Niewystarczające saldo na portfelu.",
      CART_NOT_FOUND: "Nie znaleziono koszyka.",
      CART_NOT_PENDING: "Koszyk został już rozliczony.",
    };
    const status = walletPay.error === "INSUFFICIENT_FUNDS" ? 409 : 400;
    return NextResponse.json({ error: messages[walletPay.error], code: walletPay.error }, { status });
  }

  // Brak środków → HotPay na pełną kwotę koszyka, potem webhook zastosuje koszyk.
  const config = getHotpayConfig();
  if (!config) {
    return NextResponse.json(
      {
        error: "Niewystarczające saldo. Doładuj portfel lub skonfiguruj płatności online.",
        code: "INSUFFICIENT_FUNDS",
      },
      { status: 409 }
    );
  }

  const db = await getDb();
  const appSettings = await getAppSettings(db);
  if (!appSettings.hotpay_enabled) {
    return NextResponse.json(
      {
        error: "Niewystarczające saldo. Płatności online są wyłączone — doładuj portfel BLIK-iem.",
        code: "INSUFFICIENT_FUNDS",
      },
      { status: 409 }
    );
  }

  const pending = await createPendingMatchCart({
    payerUserId: payerId,
    matchId: match_id,
    beneficiaryUserIds: user_ids,
  });
  if (!pending.ok) {
    return NextResponse.json(
      { error: "Nie udało się przygotować koszyka płatności.", code: pending.error },
      { status: 400 }
    );
  }

  const matchRow = (await db
    .prepare(`SELECT fee_pln, signed_up FROM matches WHERE id = ?`)
    .get(match_id)) as { fee_pln: number | null; signed_up: number } | undefined;
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

  const inTestMode = await isAdminTestModeActive();
  if (inTestMode) {
    await persistAdminTestModeFlag(payerId);
  }
  const sessionId = createHotpaySessionId(payerId, { testMode: inTestMode });
  const returnUrl = buildHotpayReturnUrl(sessionId, "pending", return_path);
  const playerLabel =
    [gate.session.firstName, gate.session.lastName].filter(Boolean).join(" ").trim() || gate.session.zawodnik;
  const serviceName = `${config.serviceName} — koszyk meczowy (${playerLabel})`;
  const isTest = inTestMode ? 1 : 0;

  const insert = await db
    .prepare(
      `INSERT INTO hotpay_payments (session_id, user_id, kind, amount_pln, gross_amount_pln, status, cart_id, is_test)
       VALUES (?, ?, 'match_cart', ?, ?, 'pending', ?, ?)`
    )
    .run(sessionId, payerId, amountPln, hasCommission ? grossAmountPln : null, pending.cart_id, isTest);

  await linkHotpaySessionToCart(pending.cart_id, sessionId);

  const emailRow = (await db.prepare("SELECT email FROM users WHERE id = ?").get(payerId)) as
    | { email: string | null }
    | undefined;

  const init = await initPayment(
    {
      amountPln: grossAmountPln,
      orderId: sessionId,
      returnUrl,
      email: emailRow?.email ?? undefined,
      personalData: playerLabel,
      serviceName,
    },
    { config }
  );

  if (!init.ok) {
    await markHotpayPaymentFailure(db, Number(insert.lastInsertRowid), { errorMessage: init.error });
    await db
      .prepare(`UPDATE wallet_match_carts SET status = 'cancelled' WHERE id = ? AND status = 'pending'`)
      .run(pending.cart_id);
    return NextResponse.json({ error: init.error, session_id: sessionId }, { status: 502 });
  }

  await logActivity(
    payerId,
    `Koszyk meczowy HotPay: ${amountPln.toFixed(2)} PLN (brutto ${grossAmountPln.toFixed(2)}) · mecz ${match_id} [${sessionId}]`
  );

  return NextResponse.json({
    ok: true,
    method: "hotpay",
    url: init.url,
    session_id: sessionId,
    cart_id: pending.cart_id,
    amount_pln: amountPln,
  });
}
