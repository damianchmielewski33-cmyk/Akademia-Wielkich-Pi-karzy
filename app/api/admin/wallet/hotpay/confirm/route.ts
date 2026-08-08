import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-helpers";
import { getDb } from "@/lib/db";
import type { HotpayPaymentRow } from "@/lib/hotpay-wallet";

export const runtime = "nodejs";

/**
 * GET /api/admin/wallet/hotpay/confirm
 * Zwraca listę płatności HotPay do diagnozy.
 *
 * Parametry query:
 *  ?session_id=hp_...   — pełne dane konkretnej sesji
 *  ?status=pending      — lista wg statusu (pending/failure/cancelled/success)
 *  ?limit=50            — max wierszy (domyślnie 50)
 */
export async function GET(req: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const url = new URL(req.url);
  const sessionId = url.searchParams.get("session_id")?.trim();
  const statusFilter = url.searchParams.get("status")?.trim();
  const limit = Math.min(200, Math.max(1, parseInt(url.searchParams.get("limit") ?? "50", 10)));

  const db = await getDb();

  if (sessionId) {
    const row = (await db
      .prepare(
        `SELECT hp.*, u.first_name, u.last_name, u.zawodnik, u.email
         FROM hotpay_payments hp
         LEFT JOIN users u ON u.id = hp.user_id
         WHERE hp.session_id = ? LIMIT 1`
      )
      .get(sessionId)) as (HotpayPaymentRow & { first_name?: string; last_name?: string; zawodnik?: string; email?: string }) | undefined;

    if (!row) {
      return NextResponse.json({ error: "Nie znaleziono sesji HotPay" }, { status: 404 });
    }

    const activityRows = (await db
      .prepare(
        `SELECT action, created_at FROM activity_log
         WHERE action LIKE ? OR action LIKE ?
         ORDER BY created_at DESC LIMIT 20`
      )
      .all(`%${sessionId}%`, `%${row.hotpay_payment_id ?? "~~~NONE~~~"}%`)) as { action: string; created_at: string }[];

    return NextResponse.json({
      payment: row,
      activity: activityRows,
      diagnosis: diagnose(row),
    });
  }

  const whereClause = statusFilter ? `WHERE hp.status = ?` : "";
  const params: unknown[] = statusFilter ? [statusFilter, limit] : [limit];
  const rows = (await db
    .prepare(
      `SELECT hp.id, hp.session_id, hp.user_id, hp.kind, hp.amount_pln,
              hp.status, hp.hotpay_payment_id, hp.error_message,
              hp.created_at, hp.completed_at,
              u.first_name, u.last_name, u.zawodnik
       FROM hotpay_payments hp
       LEFT JOIN users u ON u.id = hp.user_id
       ${whereClause}
       ORDER BY hp.created_at DESC LIMIT ?`
    )
    .all(...params)) as (Partial<HotpayPaymentRow> & { first_name?: string; last_name?: string; zawodnik?: string })[];

  return NextResponse.json({
    count: rows.length,
    payments: rows.map((r) => ({
      ...r,
      diagnosis: diagnose(r as HotpayPaymentRow),
    })),
  });
}

function diagnose(r: Partial<HotpayPaymentRow>): string {
  if (r.status === "success" && r.deposit_request_id != null) return "OK — zaksięgowano";
  if (r.status === "success" && r.deposit_request_id == null) return "BŁĄD — success w bazie, brak wpłaty — prześlij przez /confirm";
  if (r.status === "pending") {
    const ageMin = r.created_at
      ? Math.round((Date.now() - new Date(r.created_at + "Z").getTime()) / 60000)
      : null;
    return `PENDING${ageMin != null ? ` (${ageMin} min)` : ""} — webhook nie doszedł lub płatność w toku`;
  }
  if (r.status === "failure") return `ODRZUCONA — ${r.error_message ?? "brak szczegółów"}`;
  if (r.status === "cancelled") return `ANULOWANA — ${r.error_message ?? "użytkownik"}`;
  return r.status ?? "nieznany";
}
