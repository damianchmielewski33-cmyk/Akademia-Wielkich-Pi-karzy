import { NextResponse } from "next/server";
import { getDbForHotpaySession } from "@/lib/db";
import { getHotpayPaymentBySessionId } from "@/lib/hotpay-wallet";
import { checkRateLimit, rateLimitKey, rateLimitedResponse, RATE } from "@/lib/rate-limit";
import { screenBlockApiResponse } from "@/lib/screen-block-api";

export const runtime = "nodejs";

/**
 * Status płatności HotPay bez logowania.
 * `session_id` jest sekretem z URL powrotu (capability token) — wystarczy do odczytu statusu.
 */
export async function GET(req: Request) {
  const blocked = await screenBlockApiResponse(req);
  if (blocked) return blocked;

  const rl = checkRateLimit(
    rateLimitKey("hotpay_public_status", req),
    RATE.hotpayPublicStatus.limit,
    RATE.hotpayPublicStatus.windowMs
  );
  if (!rl.ok) return rateLimitedResponse(rl.retryAfterSec);

  const url = new URL(req.url);
  const sessionId = url.searchParams.get("session_id")?.trim() ?? "";
  if (!sessionId || sessionId.length > 64) {
    return NextResponse.json({ error: "Brak session_id" }, { status: 400 });
  }

  const db = await getDbForHotpaySession(sessionId);
  const payment = await getHotpayPaymentBySessionId(db, sessionId);
  if (!payment) {
    return NextResponse.json({ error: "Nie znaleziono płatności" }, { status: 404 });
  }

  return NextResponse.json({
    session_id: payment.session_id,
    kind: payment.kind,
    amount_pln: payment.amount_pln,
    status: payment.status,
    error_message: payment.error_message,
    completed_at: payment.completed_at,
  });
}
