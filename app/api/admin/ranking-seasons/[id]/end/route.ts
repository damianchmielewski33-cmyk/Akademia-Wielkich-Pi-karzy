import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-helpers";
import { getDb, logActivity } from "@/lib/db";
import { endRankingSeason } from "@/lib/ranking-seasons";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_req: Request, ctx: Ctx) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const { id } = await ctx.params;
  const seasonId = Number(id);
  if (!Number.isFinite(seasonId)) {
    return NextResponse.json({ error: "Nieprawidłowe id sezonu." }, { status: 400 });
  }

  const db = await getDb();
  try {
    const season = await endRankingSeason(db, seasonId, gate.session.userId);
    await logActivity(gate.session.userId, `Zakończył sezon rankingu: «${season.name}» (id ${season.id})`);
    return NextResponse.json({ ok: true, season });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Nie udało się zakończyć sezonu.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
