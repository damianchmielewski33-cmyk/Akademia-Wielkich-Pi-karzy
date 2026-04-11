import { NextResponse } from "next/server";
import { getDb, logActivity } from "@/lib/db";
import { requireUser } from "@/lib/api-helpers";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export async function POST(_req: Request, ctx: Ctx) {
  const gate = await requireUser();
  if (!gate.ok) return gate.response;
  const { id } = await ctx.params;
  const mid = Number(id);
  if (!Number.isFinite(mid)) {
    return NextResponse.json({ error: "Invalid match" }, { status: 400 });
  }
  const db = await getDb();
  const match = await db.prepare("SELECT * FROM matches WHERE id = ?").get(mid) as
    | { id: number; match_date: string; match_time: string; location: string; played: number }
    | undefined;
  if (!match) return NextResponse.json({ error: "Mecz nie istnieje" }, { status: 404 });

  if (match.match_date < todayISO() || match.played === 1) {
    return NextResponse.json(
      { error: "Nie można wypisać się z meczu po terminie lub rozegranego." },
      { status: 400 }
    );
  }

  const signup = (await db
    .prepare(
      "SELECT id, COALESCE(commitment, 1) AS commitment FROM match_signups WHERE user_id = ? AND match_id = ?"
    )
    .get(gate.session.userId, mid)) as { id: number; commitment: number } | undefined;

  if (signup) {
    await db.prepare("DELETE FROM match_signups WHERE id = ?").run(signup.id);
    if (signup.commitment === 1) {
      await db.prepare("UPDATE matches SET signed_up = signed_up - 1 WHERE id = ? AND signed_up > 0").run(mid);
    }
    await logActivity(
      gate.session.userId,
      `Wypisał się z meczu ${match.match_date} ${match.match_time} (${match.location}), id ${mid}`
    );
  }

  return NextResponse.json({ ok: true });
}
