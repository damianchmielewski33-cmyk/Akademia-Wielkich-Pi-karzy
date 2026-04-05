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
  if (!gate.ok) return NextResponse.json({ error: "NOT_LOGGED" }, { status: 401 });
  const { id } = await ctx.params;
  const mid = Number(id);
  if (!Number.isFinite(mid)) {
    return NextResponse.json({ error: "Invalid match" }, { status: 400 });
  }
  const db = getDb();
  const match = db.prepare("SELECT * FROM matches WHERE id = ?").get(mid) as
    | {
        id: number;
        match_date: string;
        match_time: string;
        location: string;
        signed_up: number;
        max_slots: number;
        played: number;
      }
    | undefined;
  if (!match) return NextResponse.json({ error: "Mecz nie istnieje" }, { status: 404 });

  if (match.match_date < todayISO() || match.played === 1) {
    return NextResponse.json(
      { error: "Nie można zapisać się na mecz po terminie lub rozegrany." },
      { status: 400 }
    );
  }
  if (match.signed_up >= match.max_slots) {
    return NextResponse.json({ error: "Brak miejsc na ten mecz!" }, { status: 400 });
  }

  const existing = db
    .prepare("SELECT id FROM match_signups WHERE user_id = ? AND match_id = ?")
    .get(gate.session.userId, mid);
  if (existing) {
    return NextResponse.json({ error: "Już jesteś zapisany na ten mecz!" }, { status: 400 });
  }

  const tx = db.transaction(() => {
    db.prepare("INSERT INTO match_signups (user_id, match_id, paid) VALUES (?, ?, 0)").run(
      gate.session.userId,
      mid
    );
    db.prepare("UPDATE matches SET signed_up = signed_up + 1 WHERE id = ?").run(mid);
  });
  tx();

  logActivity(
    gate.session.userId,
    `Zapisał się na mecz ${match.match_date} ${match.match_time} (${match.location}), id ${mid}`
  );

  return NextResponse.json({ ok: true });
}
