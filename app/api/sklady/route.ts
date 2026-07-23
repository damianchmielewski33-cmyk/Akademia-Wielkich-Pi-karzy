import { NextResponse } from "next/server";
import { getDb, type MatchRow } from "@/lib/db";
import { getAppSettings } from "@/lib/app-settings";
import { pitchHalfSlotCounts, pitchSlotTotalFromSignupCount } from "@/lib/lineup-pitch-slots";
import { screenBlockApiResponse } from "@/lib/screen-block-api";

export const runtime = "nodejs";

/** Publiczne składy dla aplikacji Android. */
export async function GET(req: Request) {
  const blocked = await screenBlockApiResponse(req);
  if (blocked) return blocked;

  const db = await getDb();
  const url = new URL(req.url);
  const matchParam = url.searchParams.get("m");

  const publicMatches = (await db
    .prepare(
      `SELECT id, match_date, match_time, location FROM matches WHERE lineup_public = 1
       ORDER BY match_date DESC, match_time DESC`
    )
    .all()) as Array<{
    id: number;
    match_date: string;
    match_time: string;
    location: string;
  }>;

  if (publicMatches.length === 0) {
    return NextResponse.json({ matches: [], selected: null });
  }

  const defaultUpcoming = (await db
    .prepare(
      `SELECT id FROM matches WHERE lineup_public = 1
       AND datetime(match_date || ' ' || match_time) > datetime('now', 'localtime')
       ORDER BY match_date ASC, match_time ASC
       LIMIT 1`
    )
    .get()) as { id: number } | undefined;

  const parsed = matchParam ? Number.parseInt(matchParam, 10) : NaN;
  const ids = new Set(publicMatches.map((x) => x.id));
  const selectedId =
    Number.isFinite(parsed) && ids.has(parsed)
      ? parsed
      : (defaultUpcoming?.id ?? publicMatches[0].id);

  const row = (await db
    .prepare(
      "SELECT id, match_date, match_time, location FROM matches WHERE id = ? AND lineup_public = 1"
    )
    .get(selectedId)) as MatchRow | undefined;

  if (!row) {
    return NextResponse.json({ matches: publicMatches, selected: null });
  }

  const appSettings = await getAppSettings(db);
  const pitchLimits = {
    min: appSettings.lineup_pitch_slots_min,
    max: appSettings.lineup_pitch_slots_max,
  };

  const playersRaw = (await db
    .prepare(
      `SELECT u.id AS user_id, u.first_name, u.last_name, u.player_alias AS zawodnik
       FROM match_signups ms
       JOIN users u ON u.id = ms.user_id
       WHERE ms.match_id = ? AND COALESCE(ms.commitment, 1) = 1
       ORDER BY u.first_name ASC, u.last_name ASC`
    )
    .all(selectedId)) as Array<{
    user_id: number;
    first_name: string;
    last_name: string;
    zawodnik: string;
  }>;

  const players = playersRaw.map((p) => ({
    userId: p.user_id,
    firstName: (p.first_name || "").trim(),
    lastName: (p.last_name || "").trim(),
    zawodnik: p.zawodnik || "",
    displayName:
      `${(p.first_name || "").trim()} ${(p.last_name || "").trim()}`.trim() ||
      p.zawodnik ||
      "Zawodnik",
  }));

  const lineupRows = (await db
    .prepare(`SELECT team, slot_index, user_id FROM match_lineup_slots WHERE match_id = ?`)
    .all(selectedId)) as Array<{ team: string; slot_index: number; user_id: number }>;

  const pitchTotal = pitchSlotTotalFromSignupCount(playersRaw.length, pitchLimits);
  const { home: homeSlots, away: awaySlots } = pitchHalfSlotCounts(pitchTotal);
  const home: (number | null)[] = Array(homeSlots).fill(null);
  const away: (number | null)[] = Array(awaySlots).fill(null);
  for (const r of lineupRows) {
    if (r.team === "home" && r.slot_index >= 0 && r.slot_index < home.length) {
      home[r.slot_index] = r.user_id;
    } else if (r.team === "away" && r.slot_index >= 0 && r.slot_index < away.length) {
      away[r.slot_index] = r.user_id;
    }
  }

  const byId = new Map(players.map((p) => [p.userId, p]));
  const mapTeam = (slots: (number | null)[]) =>
    slots.map((uid) => (uid == null ? null : byId.get(uid) ?? { userId: uid, displayName: `#${uid}` }));

  return NextResponse.json({
    matches: publicMatches.map((m) => ({
      id: m.id,
      matchDate: m.match_date,
      matchTime: m.match_time,
      location: m.location,
    })),
    selected: {
      id: row.id,
      matchDate: row.match_date,
      matchTime: row.match_time,
      location: row.location,
      home: mapTeam(home),
      away: mapTeam(away),
      players,
    },
  });
}
