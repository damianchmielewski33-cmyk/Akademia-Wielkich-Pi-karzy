import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/api-helpers";
import { getDb, logActivity } from "@/lib/db";
import { generateBalancedLineupProposal } from "@/lib/lineup-generator";
import { pitchHalfSlotCounts, pitchSlotTotalFromSignupCount } from "@/lib/lineup-pitch-slots";
import { getAppSettings } from "@/lib/app-settings";

export const runtime = "nodejs";

const bodySchema = z.object({
  match_id: z.coerce.number().int().positive(),
  seed: z.coerce.number().int().nonnegative().optional(),
});

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export async function POST(req: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

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
  const today = todayIso();
  const match = (await db
    .prepare(
      `SELECT id, match_date, match_time, location
       FROM matches
       WHERE id = ? AND played = 0 AND COALESCE(cancelled, 0) = 0 AND match_date >= ?`
    )
    .get(parsed.data.match_id, today)) as
    | {
        id: number;
        match_date: string;
        match_time: string;
        location: string;
      }
    | undefined;

  if (!match) {
    return NextResponse.json({ error: "Mecz niedostępny do losowania składów." }, { status: 400 });
  }

  const playersRaw = (await db
    .prepare(
      `SELECT u.id AS user_id, u.first_name, u.last_name, u.player_alias AS zawodnik, u.profile_photo_path
       FROM match_signups ms
       JOIN users u ON u.id = ms.user_id
       WHERE ms.match_id = ? AND COALESCE(ms.commitment, 1) = 1
       ORDER BY u.first_name ASC, u.last_name ASC`
    )
    .all(match.id)) as Array<{
    user_id: number;
    first_name: string;
    last_name: string;
    zawodnik: string;
    profile_photo_path: string | null;
  }>;

  if (playersRaw.length < 2) {
    return NextResponse.json(
      { error: "Do losowania potrzeba co najmniej 2 potwierdzonych zawodników." },
      { status: 400 }
    );
  }

  const statRows = (await db
    .prepare(
      `SELECT s.user_id, m.match_date, s.goals, s.assists, s.distance, s.saves
       FROM match_stats s
       JOIN matches m ON m.id = s.match_id
       WHERE s.user_id IN (
         SELECT user_id
         FROM match_signups
         WHERE match_id = ? AND COALESCE(commitment, 1) = 1
       )
       ORDER BY m.match_date DESC, m.match_time DESC`
    )
    .all(match.id)) as Array<{
    user_id: number;
    match_date: string;
    goals: number;
    assists: number;
    distance: number;
    saves: number;
  }>;

  const statsByUser = new Map<number, typeof statRows>();
  for (const row of statRows) {
    const list = statsByUser.get(Number(row.user_id)) ?? [];
    list.push(row);
    statsByUser.set(Number(row.user_id), list);
  }

  const appSettings = await getAppSettings(db);
  const pitchLimits = {
    min: appSettings.lineup_pitch_slots_min,
    max: appSettings.lineup_pitch_slots_max,
  };
  const pitchSlotTotal = pitchSlotTotalFromSignupCount(playersRaw.length, pitchLimits);
  const { home: homeSlotCount, away: awaySlotCount } = pitchHalfSlotCounts(pitchSlotTotal);

  const proposal = generateBalancedLineupProposal({
    players: playersRaw.map((player) => ({
      userId: Number(player.user_id),
      firstName: (player.first_name || "").trim(),
      lastName: (player.last_name || "").trim(),
      zawodnik: player.zawodnik || "",
      profilePhotoPath: player.profile_photo_path ?? null,
      matches: (statsByUser.get(Number(player.user_id)) ?? []).map((stat) => ({
        matchDate: stat.match_date,
        goals: Number(stat.goals) || 0,
        assists: Number(stat.assists) || 0,
        distance: Number(stat.distance) || 0,
        saves: Number(stat.saves) || 0,
      })),
    })),
    pitchSlotTotal,
    homeSlotCount,
    awaySlotCount,
    seed: parsed.data.seed,
  });

  await logActivity(
    gate.session.userId,
    `Wylosował propozycję składów dla meczu ${match.match_date} ${match.match_time} (${match.location}), id ${match.id}`
  );

  return NextResponse.json({
    match: {
      id: match.id,
      match_date: match.match_date,
      match_time: match.match_time,
      location: match.location,
    },
    proposal,
  });
}
