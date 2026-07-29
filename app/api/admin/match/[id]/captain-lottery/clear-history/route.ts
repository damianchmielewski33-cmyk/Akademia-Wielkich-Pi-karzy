import { NextResponse } from "next/server";
import { getDb, logActivity } from "@/lib/db";
import { requireAdmin } from "@/lib/api-helpers";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(_req: Request, context: RouteContext) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const { id } = await context.params;
  const mid = Number(id);
  if (!Number.isFinite(mid)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const db = await getDb();
  const match = (await db
    .prepare("SELECT match_date, match_time, location FROM matches WHERE id = ?")
    .get(mid)) as { match_date: string; match_time: string; location: string } | undefined;
  if (!match) {
    return NextResponse.json({ error: "Nie znaleziono meczu" }, { status: 404 });
  }

  const existing = (await db
    .prepare("SELECT COUNT(*) AS count FROM match_captain_lottery WHERE match_id = ?")
    .get(mid)) as { count: number };
  if (Number(existing.count) === 0) {
    return NextResponse.json({ error: "Brak historii losowania do usunięcia" }, { status: 404 });
  }

  await db.prepare("DELETE FROM match_captain_lottery WHERE match_id = ?").run(mid);
  logActivity(
    gate.session.userId,
    `Wyczyścił historię losowania kapitanów — mecz ${match.match_date} ${match.match_time} (${match.location})`
  );

  return NextResponse.json({ ok: true });
}
