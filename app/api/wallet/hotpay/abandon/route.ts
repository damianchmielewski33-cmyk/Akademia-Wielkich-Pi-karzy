import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api-helpers";
import { getDbForHotpaySession } from "@/lib/db";
import {
  getHotpayPaymentBySessionId,
  markHotpayPaymentCancelledByUser,
} from "@/lib/hotpay-wallet";
import { screenBlockApiResponse } from "@/lib/screen-block-api";

export const runtime = "nodejs";

/**
 * Po powrocie z bramki bez SUCCESS/FAILURE z webhooka (np. anulowany BLIK)
 * oznaczamy lokalnie płatność jako cancelled — żeby UI pokazało jawne odrzucenie.
 * Późniejszy SUCCESS z HotPay nadal może zaksięgować (applyHotpaySuccessCredit).
 */
export async function POST(req: Request) {
  const blocked = await screenBlockApiResponse(req);
  if (blocked) return blocked;

  const gate = await requireUser();
  if (!gate.ok) return gate.response;

  let sessionId = "";
  try {
    const json = (await req.json()) as { session_id?: unknown };
    sessionId = typeof json.session_id === "string" ? json.session_id.trim() : "";
  } catch {
    return NextResponse.json({ error: "Nieprawidłowe JSON" }, { status: 400 });
  }
  if (!sessionId || sessionId.length > 64) {
    return NextResponse.json({ error: "Brak session_id" }, { status: 400 });
  }

  const db = await getDbForHotpaySession(sessionId);
  const payment = await getHotpayPaymentBySessionId(db, sessionId);
  if (!payment) {
    return NextResponse.json({ error: "Nie znaleziono płatności" }, { status: 404 });
  }
  if (payment.user_id !== gate.session.userId && !gate.session.isAdmin) {
    return NextResponse.json({ error: "Brak dostępu" }, { status: 403 });
  }

  const result = await markHotpayPaymentCancelledByUser(db, payment);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    session_id: sessionId,
    status: result.status,
  });
}
