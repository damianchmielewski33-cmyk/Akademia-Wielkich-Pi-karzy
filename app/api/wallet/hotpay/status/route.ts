import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api-helpers";
import { getDbForHotpaySessionId } from "@/lib/db";
import { getHotpayPaymentBySessionId } from "@/lib/hotpay-wallet";
import { screenBlockApiResponse } from "@/lib/screen-block-api";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const blocked = await screenBlockApiResponse(req);
  if (blocked) return blocked;

  const gate = await requireUser();
  if (!gate.ok) return gate.response;

  const url = new URL(req.url);
  const sessionId = url.searchParams.get("session_id")?.trim() ?? "";
  if (!sessionId || sessionId.length > 64) {
    return NextResponse.json({ error: "Brak session_id" }, { status: 400 });
  }

  const db = await getDbForHotpaySessionId(sessionId);
  const payment = await getHotpayPaymentBySessionId(db, sessionId);
  if (!payment) {
    return NextResponse.json({ error: "Nie znaleziono płatności" }, { status: 404 });
  }
  if (payment.user_id !== gate.session.userId && !gate.session.isAdmin) {
    return NextResponse.json({ error: "Brak dostępu" }, { status: 403 });
  }

  return NextResponse.json({
    session_id: payment.session_id,
    kind: payment.kind,
    amount_pln: payment.amount_pln,
    status: payment.status,
    error_message: payment.error_message,
    deposit_request_id: payment.deposit_request_id,
    completed_at: payment.completed_at,
  });
}
