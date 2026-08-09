import { NextResponse } from "next/server";
import { z } from "zod";
import { getAppSettings } from "@/lib/app-settings";
import { getDb, logActivity } from "@/lib/db";
import {
  buildHotpayReturnUrl,
  createHotpaySessionId,
  getHotpayConfig,
  grossUpHotpayAmount,
  initPayment,
} from "@/lib/hotpay";
import { markHotpayPaymentFailure } from "@/lib/hotpay-wallet";
import {
  getPublicLinkDebtAmountPln,
  loadPublicShareLink,
} from "@/lib/public-payment-share";
import { screenBlockApiResponse } from "@/lib/screen-block-api";
import { getMatchFeeRoundingCreditForUser } from "@/lib/wallet";

export const runtime = "nodejs";

const postSchema = z.object({
  token: z.string().trim().min(8).max(128),
  user_id: z.coerce.number().int().positive(),
});

/**
 * Publiczna spłata zaległości z linku podsumowania (bez logowania).
 * Kwota zawsze z serwera — saldo gracza widocznego na aktywnym linku.
 */
export async function POST(req: Request) {
  const blocked = await screenBlockApiResponse(req);
  if (blocked) return blocked;

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

  const link = await loadPublicShareLink(parsed.data.token);
  if (!link) {
    return NextResponse.json({ error: "Link jest nieaktywny" }, { status: 404 });
  }

  const userId = parsed.data.user_id;
  const debtPln = await getPublicLinkDebtAmountPln(link, userId);
  if (debtPln == null || debtPln < 0.01) {
    return NextResponse.json({ error: "Brak zaległości do opłacenia dla tego zawodnika" }, { status: 400 });
  }

  const amountPln = debtPln;
  const commissionOffsetPln = await getMatchFeeRoundingCreditForUser(userId);
  const grossAmountPln = grossUpHotpayAmount(
    amountPln,
    appSettings.hotpay_commission_pct,
    appSettings.hotpay_commission_fixed,
    commissionOffsetPln
  );
  const hasCommission = grossAmountPln > amountPln;

  const user = (await db
    .prepare("SELECT id, first_name, last_name, player_alias, email FROM users WHERE id = ?")
    .get(userId)) as
    | { id: number; first_name: string; last_name: string; player_alias: string | null; email: string | null }
    | undefined;
  if (!user) {
    return NextResponse.json({ error: "Zawodnik nie znaleziony" }, { status: 404 });
  }

  const sessionId = createHotpaySessionId(userId);
  const returnPath = `/platnosci-public/${link.token}`;
  const returnUrl = buildHotpayReturnUrl(sessionId, "pending", returnPath);
  const playerLabel =
    [user.first_name, user.last_name].filter(Boolean).join(" ").trim() || user.player_alias || `Gracz #${userId}`;
  const serviceName = `${config.serviceName} — zaległość (${playerLabel})`;

  const insert = await db
    .prepare(
      `INSERT INTO hotpay_payments (session_id, user_id, kind, amount_pln, gross_amount_pln, status, is_test)
       VALUES (?, ?, 'topup', ?, ?, 'pending', 0)`
    )
    .run(sessionId, userId, amountPln, hasCommission ? grossAmountPln : null);

  const paymentRowId = Number(insert.lastInsertRowid);

  const init = await initPayment(
    {
      amountPln: grossAmountPln,
      orderId: sessionId,
      returnUrl,
      email: user.email ?? undefined,
      personalData: playerLabel,
      serviceName,
    },
    { config }
  );

  if (!init.ok) {
    console.error(
      `[hotpay/public-create] INIT_FAIL userId=${userId} net=${amountPln} gross=${grossAmountPln} error=${init.error}`
    );
    await markHotpayPaymentFailure(db, paymentRowId, { errorMessage: init.error });
    await logActivity(
      userId,
      `HotPay PUBLIC INIT FAILED (topup) ${amountPln.toFixed(2)} PLN: ${init.error} [${sessionId}]`
    );
    return NextResponse.json({ error: init.error, session_id: sessionId }, { status: 502 });
  }

  console.info(
    `[hotpay/public-create] ok userId=${userId} net=${amountPln} gross=${grossAmountPln} session=${sessionId}`
  );
  await logActivity(
    userId,
    `Rozpoczął płatność HotPay z linku publicznego (zaległość): ${amountPln.toFixed(2)} PLN [${sessionId}]`
  );

  return NextResponse.json({
    ok: true,
    url: init.url,
    session_id: sessionId,
    amount_pln: amountPln,
    kind: "topup",
  });
}
