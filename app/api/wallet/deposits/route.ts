import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb, logActivity } from "@/lib/db";
import { requireUser } from "@/lib/api-helpers";

export const runtime = "nodejs";

const postSchema = z.object({
  amount_pln: z.coerce.number().positive().max(10000),
  note: z.string().trim().max(200).optional(),
});

/**
 * Zawodnik deklaruje: "przelałem pieniądze" -> admin ma do autoryzacji otrzymanie.
 */
export async function POST(req: Request) {
  const gate = await requireUser();
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

  const db = await getDb();
  const userId = gate.session.userId;
  const { amount_pln, note } = parsed.data;

  const r = await db
    .prepare(
      `
      INSERT INTO wallet_deposit_requests
        (user_id, amount_pln, created_by, status, note, player_declared_at)
      VALUES (?, ?, 'player', 'pending', ?, datetime('now'))
    `
    )
    .run(userId, amount_pln, note ?? null);

  await logActivity(userId, `Zgłosił wpłatę do portfela: ${amount_pln} PLN (id ${Number(r.lastInsertRowid)})`);
  return NextResponse.json({ ok: true, id: Number(r.lastInsertRowid) }, { status: 201 });
}

