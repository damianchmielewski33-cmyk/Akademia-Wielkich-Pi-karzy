import { NextResponse } from "next/server";
import { getDb, logActivity } from "@/lib/db";
import { requireAdmin } from "@/lib/api-helpers";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_req: Request, ctx: Ctx) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;
  const { id } = await ctx.params;
  const mid = Number(id);
  if (!Number.isFinite(mid)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  const db = await getDb();
  const row = (await db
    .prepare("SELECT match_date, match_time, location FROM matches WHERE id = ?")
    .get(mid)) as { match_date: string; match_time: string; location: string } | undefined;
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const charges = (await db
    .prepare(`SELECT COUNT(*) AS c FROM match_wallet_charges WHERE match_id = ?`)
    .get(mid)) as { c: number } | undefined;
  // Także korekty przy ręcznym „opłacone” (adjustment z match_id) — bez wiersza w match_wallet_charges.
  const adjustments = (await db
    .prepare(
      `SELECT COUNT(*) AS c FROM wallet_transactions
       WHERE match_id = ? AND kind = 'adjustment'`
    )
    .get(mid)) as { c: number } | undefined;
  if (Number(charges?.c ?? 0) > 0 || Number(adjustments?.c ?? 0) > 0) {
    return NextResponse.json(
      {
        error:
          "Nie można cofnąć statusu rozegranego — mecz ma już rozliczenia lub korekty w portfelach. Anuluj mecz (ze zwrotami) albo skoryguj salda ręcznie.",
      },
      { status: 409 }
    );
  }

  await db.prepare("UPDATE matches SET played = 0 WHERE id = ?").run(mid);
  await logActivity(
    gate.session.userId,
    `Cofnął status rozegranego meczu: ${row.match_date} ${row.match_time} (${row.location}), id ${mid}`
  );
  return NextResponse.json({ ok: true });
}
