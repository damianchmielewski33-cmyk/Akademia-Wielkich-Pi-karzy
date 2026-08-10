import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/api-helpers";
import { getDb, logActivity } from "@/lib/db";
import {
  applyHotpaySuccessCredit,
  canManualCreditHotpayPayment,
  diagnoseHotpayPayment,
  getHotpayPaymentBySessionId,
  settleMatchCartAfterCredit,
  type HotpayPaymentRow,
} from "@/lib/hotpay-wallet";
import { checkRateLimitDistributed } from "@/lib/rate-limit-db";
import { rateLimitKey, rateLimitedResponse, RATE } from "@/lib/rate-limit";

export const runtime = "nodejs";

async function recentWebhookIpBlocks(db: Awaited<ReturnType<typeof getDb>>) {
  try {
    const row = (await db
      .prepare(
        `SELECT COUNT(*) AS c,
                MAX(timestamp) AS latest_at
         FROM activity_log
         WHERE action LIKE 'HotPay webhook FORBIDDEN IP:%'
           AND timestamp >= datetime('now', '-24 hours')`
      )
      .get()) as { c: number; latest_at: string | null } | undefined;
    const count = Number(row?.c ?? 0);
    if (!Number.isFinite(count) || count <= 0) {
      return { count: 0, latest_at: null as string | null };
    }
    return { count, latest_at: row?.latest_at ?? null };
  } catch {
    return { count: 0, latest_at: null as string | null };
  }
}

/**
 * GET /api/admin/wallet/hotpay/confirm
 * Zwraca listę płatności HotPay do diagnozy.
 * Wymaga uprawnienia sekcji Finanse.
 *
 * Parametry query:
 *  ?session_id=hp_...   — pełne dane konkretnej sesji
 *  ?status=pending      — lista wg statusu (pending/failure/cancelled/success)
 *  ?limit=50            — max wierszy (domyślnie 50)
 */
export async function GET(req: Request) {
  const gate = await requireAdmin("finance");
  if (!gate.ok) return gate.response;

  const url = new URL(req.url);
  const sessionId = url.searchParams.get("session_id")?.trim();
  const statusFilter = url.searchParams.get("status")?.trim();
  const limit = Math.min(200, Math.max(1, parseInt(url.searchParams.get("limit") ?? "50", 10)));

  const db = await getDb();
  const webhook_ip_blocks = await recentWebhookIpBlocks(db);

  if (sessionId) {
    const row = (await db
      .prepare(
        `SELECT hp.*, u.first_name, u.last_name, u.zawodnik, u.email
         FROM hotpay_payments hp
         LEFT JOIN users u ON u.id = hp.user_id
         WHERE hp.session_id = ? LIMIT 1`
      )
      .get(sessionId)) as (HotpayPaymentRow & {
      first_name?: string;
      last_name?: string;
      zawodnik?: string;
      email?: string;
    }) | undefined;

    if (!row) {
      return NextResponse.json({ error: "Nie znaleziono sesji HotPay" }, { status: 404 });
    }

    const activityRows = (await db
      .prepare(
        `SELECT action, timestamp AS created_at FROM activity_log
         WHERE action LIKE ? OR action LIKE ?
         ORDER BY timestamp DESC LIMIT 20`
      )
      .all(`%${sessionId}%`, `%${row.hotpay_payment_id ?? "~~~NONE~~~"}%`)) as {
      action: string;
      created_at: string;
    }[];

    return NextResponse.json({
      payment: row,
      activity: activityRows,
      diagnosis: diagnoseHotpayPayment(row),
      webhook_ip_blocks,
    });
  }

  const whereClause = statusFilter ? `WHERE hp.status = ?` : "";
  const params: unknown[] = statusFilter ? [statusFilter, limit] : [limit];
  const rows = (await db
    .prepare(
      `SELECT hp.id, hp.session_id, hp.user_id, hp.kind, hp.amount_pln, hp.gross_amount_pln,
              hp.status, hp.hotpay_payment_id, hp.error_message,
              hp.created_at, hp.completed_at, hp.deposit_request_id, hp.cart_id,
              u.first_name, u.last_name, u.zawodnik
       FROM hotpay_payments hp
       LEFT JOIN users u ON u.id = hp.user_id
       ${whereClause}
       ORDER BY hp.created_at DESC LIMIT ?`
    )
    .all(...params)) as (Partial<HotpayPaymentRow> & {
    first_name?: string;
    last_name?: string;
    zawodnik?: string;
  })[];

  return NextResponse.json({
    count: rows.length,
    payments: rows.map((r) => ({
      ...r,
      diagnosis: diagnoseHotpayPayment(r as HotpayPaymentRow),
    })),
    webhook_ip_blocks,
  });
}

const postSchema = z.object({
  session_id: z.string().min(1),
  /** Opcjonalnie — ID z panelu HotPay; jeśli brak, używa wartości z wiersza lub znacznika admin. */
  hotpay_payment_id: z.string().min(1).optional(),
  secure: z.string().min(1).optional(),
  /**
   * credit — zaksięguj wpłatę (gdy webhook nie doszedł / success bez deposit)
   * retry_cart — tylko ponów settle koszyka (gdy wpłata OK, koszyk nadal pending)
   */
  action: z.enum(["credit", "retry_cart"]).optional().default("credit"),
});

/**
 * POST /api/admin/wallet/hotpay/confirm
 * Ręczne domknięcie płatności lub ponowienie settle koszyka.
 * Tylko sekcja Finanse + rate-limit; credit tylko gdy brak deposit.
 */
export async function POST(req: Request) {
  const gate = await requireAdmin("finance");
  if (!gate.ok) return gate.response;

  const rl = await checkRateLimitDistributed(
    rateLimitKey(`hotpay_admin_confirm:${gate.session.userId}`, req),
    RATE.hotpayAdminConfirm.limit,
    RATE.hotpayAdminConfirm.windowMs
  );
  if (!rl.ok) return rateLimitedResponse(rl.retryAfterSec);

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad JSON" }, { status: 400 });
  }

  const parsed = postSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const db = await getDb();
  const payment = await getHotpayPaymentBySessionId(db, parsed.data.session_id);
  if (!payment) {
    return NextResponse.json({ error: "Nie znaleziono sesji HotPay" }, { status: 404 });
  }

  if (parsed.data.action === "retry_cart") {
    if (payment.kind !== "match_cart" || payment.cart_id == null) {
      return NextResponse.json({ error: "Sesja nie jest koszykiem meczowym" }, { status: 400 });
    }
    if (payment.deposit_request_id == null) {
      return NextResponse.json(
        { error: "Brak wpłaty — najpierw action=credit (księgowanie)" },
        { status: 409 }
      );
    }
    const settle = await settleMatchCartAfterCredit(db, payment);
    await logActivity(
      gate.session.userId,
      `HotPay admin retry_cart session=${payment.session_id} ok=${settle.ok}${
        settle.ok ? "" : ` error=${settle.error}`
      }`
    );
    if (!settle.ok) {
      return NextResponse.json(
        {
          error: `Nie udało się zaaplikować koszyka: ${settle.error}`,
          diagnosis: diagnoseHotpayPayment(payment),
        },
        { status: 409 }
      );
    }
    const latest = await getHotpayPaymentBySessionId(db, payment.session_id);
    return NextResponse.json({
      ok: true,
      action: "retry_cart",
      payment: latest,
      diagnosis: latest ? diagnoseHotpayPayment(latest) : null,
    });
  }

  // Awaryjne księgowanie: tylko pending / cancelled / failure albo success bez deposit.
  if (!canManualCreditHotpayPayment(payment)) {
    return NextResponse.json(
      {
        error: "Sesja już ma wpłatę albo nie nadaje się do ręcznego księgowania",
        diagnosis: diagnoseHotpayPayment(payment),
      },
      { status: 409 }
    );
  }

  const hotpayPaymentId =
    parsed.data.hotpay_payment_id?.trim() ||
    payment.hotpay_payment_id?.trim() ||
    `admin-manual-${payment.session_id}`;
  const secure =
    parsed.data.secure?.trim() || payment.secure?.trim() || `admin-confirm-${gate.session.userId}`;

  const credit = await applyHotpaySuccessCredit(db, payment, {
    hotpayPaymentId,
    secure,
  });
  if (!credit.ok) {
    return NextResponse.json({ error: credit.error }, { status: 409 });
  }

  const latest = await getHotpayPaymentBySessionId(db, payment.session_id);
  await logActivity(
    gate.session.userId,
    `HotPay admin confirm credit session=${payment.session_id} amount=${payment.amount_pln} already=${credit.alreadyApplied ? 1 : 0}`
  );

  return NextResponse.json({
    ok: true,
    action: "credit",
    already_applied: credit.alreadyApplied,
    payment: latest,
    diagnosis: latest ? diagnoseHotpayPayment(latest) : null,
  });
}
