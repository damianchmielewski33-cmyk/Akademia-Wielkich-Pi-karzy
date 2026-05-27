import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb, logActivity } from "@/lib/db";
import { requireAdmin } from "@/lib/api-helpers";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

const bodySchema = z.object({
  user_id: z.coerce.number().int().positive(),
  check_balance: z.boolean().optional(),
});

export async function POST(req: Request, context: RouteContext) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const { id } = await context.params;
  const mid = Number(id);
  if (!Number.isFinite(mid)) {
    return NextResponse.json({ error: "Invalid match id" }, { status: 400 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const db = await getDb();
  const userId = parsed.data.user_id;

  const user = await db
    .prepare("SELECT id, first_name, last_name, is_temporary FROM users WHERE id = ?")
    .get(userId) as any;

  if (!user) {
    return NextResponse.json({ error: "Użytkownik nie znaleziony" }, { status: 404 });
  }

  if (!user.is_temporary) {
    return NextResponse.json({ error: "To nie jest tymczasowy piłkarz" }, { status: 400 });
  }

  const balanceRow = await db
    .prepare(`SELECT COALESCE(SUM(amount_pln), 0) as balance FROM wallet_transactions WHERE user_id = ?`)
    .get(userId) as { balance: number } | undefined;

  const balance = balanceRow?.balance ?? 0;

  if (parsed.data.check_balance) {
    return NextResponse.json({ balance, can_delete: balance >= 0 });
  }

  if (balance < 0) {
    return NextResponse.json({ error: "Gracz ma należność" }, { status: 400 });
  }

  const match = await db
    .prepare("SELECT match_date, match_time FROM matches WHERE id = ?")
    .get(mid) as any;

  await db.prepare("DELETE FROM match_signups WHERE user_id = ? AND match_id = ?").run(userId, mid);
  await db.prepare("UPDATE matches SET signed_up = signed_up - 1 WHERE id = ? AND signed_up > 0").run(mid);
  await db.prepare("DELETE FROM match_stats WHERE user_id = ? AND match_id = ?").run(userId, mid);
  await db.prepare("DELETE FROM wallet_transactions WHERE user_id = ?").run(userId);
  await db.prepare("DELETE FROM match_wallet_charges WHERE user_id = ?").run(userId);
  await db.prepare("DELETE FROM match_lineup_slots WHERE user_id = ?").run(userId);
  await db.prepare("DELETE FROM match_attendance WHERE user_id = ?").run(userId);
  await db.prepare("DELETE FROM match_participation_survey WHERE user_id = ?").run(userId);
  await db.prepare("DELETE FROM match_transport_messages WHERE user_id = ?").run(userId);
  await db.prepare("DELETE FROM users WHERE id = ?").run(userId);

  await logActivity(
    gate.session.userId,
    `Usunął tymczasowego piłkarza ${user.first_name} ${user.last_name}`
  );

  return NextResponse.json({ ok: true });
}
