import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/api-helpers";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ userId: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const gate = await requireUser();
  if (!gate.ok) return gate.response;

  const { userId } = await ctx.params;
  const uid = Number(userId);
  if (!Number.isFinite(uid)) {
    return NextResponse.json({ error: "Invalid user" }, { status: 400 });
  }
  const db = getDb();
  const user = db
    .prepare("SELECT first_name, last_name, player_alias, profile_photo_path FROM users WHERE id = ?")
    .get(uid) as {
    first_name: string;
    last_name: string;
    player_alias: string;
    profile_photo_path: string | null;
  } | undefined;
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const stats = db
    .prepare(
      `SELECT m.match_date, m.match_time, m.location,
              s.goals, s.assists, s.distance, s.saves
       FROM match_stats s
       JOIN matches m ON m.id = s.match_id
       WHERE s.user_id = ?
       ORDER BY m.match_date DESC`
    )
    .all(uid) as {
    match_date: string;
    match_time: string;
    location: string;
    goals: number;
    assists: number;
    distance: number;
    saves: number;
  }[];

  const totalGoals = stats.reduce((s, r) => s + r.goals, 0);
  const totalAssists = stats.reduce((s, r) => s + r.assists, 0);
  const totalDistance = stats.reduce((s, r) => s + r.distance, 0);
  const totalSaves = stats.reduce((s, r) => s + (r.saves ?? 0), 0);

  return NextResponse.json({
    first_name: user.first_name,
    last_name: user.last_name,
    zawodnik: user.player_alias,
    profile_photo_path: user.profile_photo_path ?? null,
    matches: stats.length,
    goals: totalGoals,
    assists: totalAssists,
    distance: totalDistance,
    saves: totalSaves,
    games: stats.map((s) => ({
      date: s.match_date,
      time: s.match_time,
      location: s.location,
      goals: s.goals,
      assists: s.assists,
      distance: s.distance,
      saves: s.saves ?? 0,
    })),
  });
}
