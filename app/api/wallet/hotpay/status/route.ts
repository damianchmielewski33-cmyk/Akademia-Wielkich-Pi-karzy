import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api-helpers";
import { getDbForHotpaySession } from "@/lib/db";
import { getHotpayPaymentBySessionId } from "@/lib/hotpay-wallet";
import { screenBlockApiResponse } from "@/lib/screen-block-api";
import {
  applyTestModeCookie,
  persistAdminTestModeFlag,
} from "@/lib/test-mode";
import { isHotpayTestSessionId } from "@/lib/hotpay";

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

  const db = await getDbForHotpaySession(sessionId);
  const payment = await getHotpayPaymentBySessionId(db, sessionId);
  if (!payment) {
    return NextResponse.json({ error: "Nie znaleziono płatności" }, { status: 404 });
  }
  if (payment.user_id !== gate.session.userId && !gate.session.isAdmin) {
    return NextResponse.json({ error: "Brak dostępu" }, { status: 403 });
  }

  const res = NextResponse.json({
    session_id: payment.session_id,
    kind: payment.kind,
    amount_pln: payment.amount_pln,
    status: payment.status,
    error_message: payment.error_message,
    deposit_request_id: payment.deposit_request_id,
    completed_at: payment.completed_at,
  });

  if (gate.session.isAdmin && isHotpayTestSessionId(sessionId)) {
    try {
      await persistAdminTestModeFlag(gate.session.userId);
      applyTestModeCookie(res, true);
    } catch {
      /* nie blokuj statusu płatności */
    }
  }

  return res;
}
