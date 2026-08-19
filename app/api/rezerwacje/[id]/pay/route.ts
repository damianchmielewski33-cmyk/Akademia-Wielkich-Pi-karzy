import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api-helpers";
import { getAppSettings } from "@/lib/app-settings";
import { getDb, logActivity } from "@/lib/db";
import { getBookingById } from "@/lib/booking";
import {
  buildHotpayReturnUrl,
  createHotpaySessionId,
  getHotpayConfig,
  grossUpHotpayAmount,
  initPayment,
} from "@/lib/hotpay";

export const runtime = "nodejs";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireUser();
  if (!gate.ok) return gate.response;

  const bookingId = Number((await params).id);
  if (!Number.isInteger(bookingId) || bookingId <= 0) {
    return NextResponse.json({ error: "Nieprawidłowa rezerwacja" }, { status: 400 });
  }

  const config = getHotpayConfig();
  if (!config) {
    return NextResponse.json({ error: "Płatności online są chwilowo niedostępne." }, { status: 503 });
  }

  const db = await getDb();
  const appSettings = await getAppSettings(db);
  if (!appSettings.hotpay_enabled) {
    return NextResponse.json({ error: "Płatności online są chwilowo wyłączone." }, { status: 503 });
  }

  const booking = await getBookingById(db, bookingId, gate.session.userId);
  if (!booking) return NextResponse.json({ error: "Nie znaleziono rezerwacji" }, { status: 404 });
  if (booking.status === "confirmed") {
    return NextResponse.json({ ok: true, status: "confirmed" });
  }
  if (booking.status !== "pending") {
    return NextResponse.json({ error: "Tej rezerwacji nie można już opłacić." }, { status: 409 });
  }

  const amountPln = Math.round(Number(booking.amount_pln) * 100) / 100;
  const grossAmountPln = grossUpHotpayAmount(
    amountPln,
    appSettings.hotpay_commission_pct,
    appSettings.hotpay_commission_fixed,
    0
  );
  const hasCommission = grossAmountPln > amountPln;
  const sessionId = createHotpaySessionId(gate.session.userId);
  const returnPath = `/rezerwacje?booking=${booking.id}`;
  const returnUrl = buildHotpayReturnUrl(sessionId, "pending", returnPath);
  const playerLabel =
    [gate.session.firstName, gate.session.lastName].filter(Boolean).join(" ").trim() || gate.session.zawodnik;

  await db
    .prepare(
      `INSERT INTO booking_payments (booking_id, provider, amount_pln, status, hotpay_session_id)
       VALUES (?, 'hotpay', ?, 'pending', ?)`
    )
    .run(booking.id, amountPln, sessionId);

  const payment = await db
    .prepare(
      `INSERT INTO hotpay_payments
        (session_id, user_id, kind, amount_pln, gross_amount_pln, status, booking_id, is_test)
       VALUES (?, ?, 'booking', ?, ?, 'pending', ?, 0)`
    )
    .run(sessionId, gate.session.userId, amountPln, hasCommission ? grossAmountPln : null, booking.id);

  await db
    .prepare(
      `UPDATE bookings
       SET hotpay_session_id = ?, updated_at = datetime('now')
       WHERE id = ? AND status = 'pending'`
    )
    .run(sessionId, booking.id);

  const init = await initPayment(
    {
      amountPln: grossAmountPln,
      orderId: sessionId,
      returnUrl,
      personalData: playerLabel,
      serviceName: `${config.serviceName} - rezerwacja boiska ${booking.pitch_name ?? ""}`.trim(),
    },
    { config }
  );

  if (!init.ok) {
    await db
      .prepare(
        `UPDATE hotpay_payments
         SET status = 'failure', error_message = ?, completed_at = datetime('now')
         WHERE id = ?`
      )
      .run(init.error, Number(payment.lastInsertRowid));
    return NextResponse.json({ error: init.error }, { status: 502 });
  }

  await logActivity(gate.session.userId, `Rozpoczął płatność za rezerwację #${booking.id}: ${amountPln.toFixed(2)} PLN`);
  return NextResponse.json({ ok: true, url: init.url, session_id: sessionId, amount_pln: amountPln });
}
