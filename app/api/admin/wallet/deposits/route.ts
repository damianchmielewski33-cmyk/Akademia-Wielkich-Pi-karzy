import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb, logActivity } from "@/lib/db";
import { requireAdmin } from "@/lib/api-helpers";
import { completeDepositRequest } from "@/lib/wallet";

export const runtime = "nodejs";

const postSchema = z.object({
  user_id: z.coerce.number().int().positive(),
  amount_pln: z.coerce.number().positive().max(10000),
  note: z.string().trim().max(200).optional(),
  /** Domyślnie 'admin'. 'operator' tylko dla korekty na wniosek gracza. */
  wallet_kind: z.enum(["admin", "operator"]).default("admin"),
  /** Wymagana notatka przy korekcie portfela operatora. */
  operator_correction_reason: z.string().trim().max(300).optional(),
});

/**
 * Admin ręcznie wprowadza: "otrzymałem pieniądze" -> księgowane natychmiast w portfelu zawodnika.
 */
export async function POST(req: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Nieprawidłowe JSON" }, { status: 400 });
  }
  const parsed = postSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { user_id, amount_pln, note, wallet_kind, operator_correction_reason } = parsed.data;

  if (wallet_kind === "operator" && !operator_correction_reason?.trim()) {
    return NextResponse.json(
      { error: "Korekta portfela operatora wymaga podania powodu (operator_correction_reason)" },
      { status: 400 }
    );
  }

  const db = await getDb();
  const u = await db.prepare("SELECT 1 AS ok FROM users WHERE id = ?").get(user_id);
  if (!u) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const fullNote = wallet_kind === "operator" && operator_correction_reason
    ? `${note ?? ""} [korekta operatora: ${operator_correction_reason}]`.trim()
    : note ?? null;

  const r = await db
    .prepare(
      `
      INSERT INTO wallet_deposit_requests
        (user_id, amount_pln, created_by, status, wallet_kind, note, admin_declared_received_at, player_confirmed_amount_at)
      VALUES (?, ?, 'admin', 'pending', ?, ?, datetime('now'), datetime('now'))
    `
    )
    .run(user_id, amount_pln, wallet_kind, fullNote);

  const depId = Number(r.lastInsertRowid);
  const done = await completeDepositRequest(depId, gate.session.userId, wallet_kind);
  if (!done.ok) return NextResponse.json({ error: done.error }, { status: 409 });

  await logActivity(
    gate.session.userId,
    `Wprowadził ręcznie otrzymaną wpłatę dla user ${user_id}: ${amount_pln} PLN (${wallet_kind}, id ${depId})`
  );

  return NextResponse.json({ ok: true, id: depId }, { status: 201 });
}
