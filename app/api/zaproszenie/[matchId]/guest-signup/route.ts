import { NextResponse } from "next/server";
import { z } from "zod";
import { addMatchGuest } from "@/lib/add-match-guest";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ matchId: string }> };

const bodySchema = z.object({
  first_name: z.string().min(1).max(100),
  last_name: z.string().min(1).max(100),
  player_alias: z.string().min(1).max(120),
});

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export async function POST(req: Request, context: RouteContext) {
  const { matchId: raw } = await context.params;
  const mid = Number(raw);
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

  const { getDb } = await import("@/lib/db");
  const db = await getDb();
  const match = (await db
    .prepare("SELECT id, match_date, played, cancelled FROM matches WHERE id = ?")
    .get(mid)) as { id: number; match_date: string; played: number; cancelled: number } | undefined;

  if (!match) {
    return NextResponse.json({ error: "Mecz nie został znaleziony" }, { status: 404 });
  }

  if (match.cancelled === 1) {
    return NextResponse.json({ error: "Nie można zapisać gościa na anulowany mecz." }, { status: 400 });
  }

  if (match.match_date < todayISO() || match.played === 1) {
    return NextResponse.json(
      { error: "Nie można zapisać gościa na mecz po terminie lub rozegrany." },
      { status: 400 }
    );
  }

  const { first_name, last_name, player_alias } = parsed.data;
  const result = await addMatchGuest({
    matchId: mid,
    firstName: first_name,
    lastName: last_name,
    playerAlias: player_alias,
    actorUserId: null,
    activityMessage: `Gość ${first_name.trim()} ${last_name.trim()} (${player_alias.trim()}) zapisał się przez link zaproszenia na mecz id ${mid}`,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({
    ok: true,
    user_id: result.userId,
    message: "Gość zapisany na mecz",
  });
}
