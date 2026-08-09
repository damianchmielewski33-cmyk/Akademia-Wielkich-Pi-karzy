import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/api-helpers";
import { getAppSettings } from "@/lib/app-settings";
import { suggestPaymentAmountPln } from "@/lib/bank-payment-link";
import { getDb, logActivity } from "@/lib/db";
import {
  buildHotpayReturnUrl,
  createHotpaySessionId,
  getHotpayConfig,
  grossUpHotpayAmount,
  initPayment,
  type HotpayPaymentKind,
} from "@/lib/hotpay";
import { markHotpayPaymentFailure } from "@/lib/hotpay-wallet";
import { screenBlockApiResponse } from "@/lib/screen-block-api";
import { isAdminTestModeActive, persistAdminTestModeFlag } from "@/lib/test-mode";
import { getMatchFeeRoundingCreditForUser, getUserWalletBalancePln } from "@/lib/wallet";

export const runtime = "nodejs";

const postSchema = z.object({
  kind: z.enum(["match", "topup"]),
  amount_pln: z.coerce.number().positive().max(10000).optional(),
  /** Ścieżka powrotu po bramce (np. /terminarz?mecz=12). */
  return_path: z.string().trim().max(512).optional(),
});

export async function POST(req: Request) {
  const blocked = await screenBlockApiResponse(req);
  if (blocked) return blocked;

  const gate = await requireUser();
  if (!gate.ok) return gate.response;

  const config = getHotpayConfig();
  if (!config) {
    return NextResponse.json(
      { error: "Płatności online są chwilowo niedostępne. Skorzystaj z BLIK lub skontaktuj się z administratorem." },
      { status: 503 }
    );
  }

  const db = await getDb();
  const appSettings = await getAppSettings(db);
  if (!appSettings.hotpay_enabled) {
    return NextResponse.json(
      { error: "Płatności online są chwilowo wyłączone. Skorzystaj z BLIK lub skontaktuj się z administratorem." },
      { status: 503 }
    );
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Nieprawidłowe JSON" }, { status: 400 });
  }
  const parsed = postSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Nieprawidłowe dane płatności" }, { status: 400 });
  }

  const kind = parsed.data.kind as HotpayPaymentKind;
  const userId = gate.session.userId;
  const balance = await getUserWalletBalancePln(userId);

  let amountPln: number;
  if (kind === "match") {
    const suggested = suggestPaymentAmountPln(balance, appSettings.default_match_fee_pln);
    if (suggested == null || suggested <= 0) {
      return NextResponse.json(
        { error: "Brak kwoty wpisowego — ustaw domyślną opłatę lub masz już uregulowane saldo." },
        { status: 400 }
      );
    }
    amountPln = suggested;
  } else {
    if (parsed.data.amount_pln == null) {
      return NextResponse.json({ error: "Podaj kwotę doładowania" }, { status: 400 });
    }
    amountPln = Math.round(parsed.data.amount_pln * 100) / 100;
  }

  if (!Number.isFinite(amountPln) || amountPln < 0.01 || amountPln > 10000) {
    return NextResponse.json({ error: "Kwota musi być w zakresie 0,01–10 000 PLN" }, { status: 400 });
  }

  /* Przy spłacie zaległości: zawyżenie składki (ceil do 0,50) obniża prowizję operatora. */
  let commissionOffsetPln = 0;
  const debtPln = balance < 0 ? Math.round(Math.abs(balance) * 100) / 100 : 0;
  const isDebtPayment = debtPln > 0 && Math.abs(amountPln - debtPln) < 0.02;
  if (isDebtPayment || kind === "match") {
    commissionOffsetPln = await getMatchFeeRoundingCreditForUser(userId);
  }

  /* Kwota netto = do zaksięgowania na portfelu; gross = co widzi operator po doliczonej prowizji. */
  const grossAmountPln = grossUpHotpayAmount(
    amountPln,
    appSettings.hotpay_commission_pct,
    appSettings.hotpay_commission_fixed,
    commissionOffsetPln
  );
  const hasCommission = grossAmountPln > amountPln;

  const inTestMode = await isAdminTestModeActive();
  if (inTestMode) {
    await persistAdminTestModeFlag(userId);
  }
  const sessionId = createHotpaySessionId(userId, { testMode: inTestMode });
  const returnUrl = buildHotpayReturnUrl(sessionId, "pending", parsed.data.return_path);
  const playerLabel =
    [gate.session.firstName, gate.session.lastName].filter(Boolean).join(" ").trim() || gate.session.zawodnik;
  const serviceName =
    kind === "match"
      ? `${config.serviceName} — mecz (${playerLabel})`
      : `${config.serviceName} — doładowanie (${playerLabel})`;
  const isTest = inTestMode ? 1 : 0;

  const insert = await db
    .prepare(
      `INSERT INTO hotpay_payments (session_id, user_id, kind, amount_pln, gross_amount_pln, status, is_test)
       VALUES (?, ?, ?, ?, ?, 'pending', ?)`
    )
    .run(sessionId, userId, kind, amountPln, hasCommission ? grossAmountPln : null, isTest);

  const paymentRowId = Number(insert.lastInsertRowid);

  const emailRow = (await db.prepare("SELECT email FROM users WHERE id = ?").get(userId)) as
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
    console.error(
      `[hotpay/create] INIT_FAIL userId=${userId} kind=${kind} net=${amountPln} gross=${grossAmountPln} offset=${commissionOffsetPln} error=${init.error}`
    );
    await markHotpayPaymentFailure(db, paymentRowId, { errorMessage: init.error });
    await logActivity(userId, `HotPay INIT FAILED (${kind}) ${amountPln.toFixed(2)} PLN: ${init.error} [${sessionId}]`);
    return NextResponse.json({ error: init.error, session_id: sessionId }, { status: 502 });
  }

  console.info(
    `[hotpay/create] ok userId=${userId} kind=${kind} net=${amountPln} gross=${grossAmountPln} offset=${commissionOffsetPln} session=${sessionId}`
  );
  await logActivity(
    userId,
    `Rozpoczął płatność HotPay (${kind}): ${amountPln.toFixed(2)} PLN [${sessionId}]`
  );

  return NextResponse.json({
    ok: true,
    url: init.url,
    session_id: sessionId,
    amount_pln: amountPln,
    kind,
  });
}
