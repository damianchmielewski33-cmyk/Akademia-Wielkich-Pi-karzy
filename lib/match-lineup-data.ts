import { getAppSettings } from "@/lib/app-settings";
import type { AppDb } from "@/lib/db";
import { pitchHalfSlotCounts, pitchSlotTotalFromSignupCount } from "@/lib/lineup-pitch-slots";

export type MatchLineupPlayerView = {
  userId: number;
  displayName: string;
  firstName: string;
  lastName: string;
  zawodnik: string;
  initials: string;
  profilePhotoPath: string | null;
};

export type MatchLineupViewData = {
  matchId: number;
  matchDate: string;
  matchTime: string;
  location: string;
  lineupPublic: boolean;
  players: MatchLineupPlayerView[];
  home: (number | null)[];
  away: (number | null)[];
};

function initialsFor(firstName: string, lastName: string, zawodnik: string): string {
  const fn = (firstName || "").trim();
  const ln = (lastName || "").trim();
  let initials = "";
  if (fn) initials += fn[0];
  if (ln) initials += ln[0];
  if (!initials && zawodnik.trim()) initials = zawodnik.trim().slice(0, 2);
  return initials.toUpperCase() || "?";
}

export async function getMatchLineupViewData(
  db: AppDb,
  matchId: number,
  opts?: { requirePublic?: boolean }
): Promise<MatchLineupViewData | null> {
  const row = (await db
    .prepare(
      `SELECT id, match_date, match_time, location, lineup_public
       FROM matches
       WHERE id = ? ${opts?.requirePublic ? "AND lineup_public = 1" : ""}`
    )
    .get(matchId)) as
    | {
        id: number;
        match_date: string;
        match_time: string;
        location: string;
        lineup_public: number;
      }
    | undefined;

  if (!row) return null;

  const appSettings = await getAppSettings(db);
  const pitchLimits = {
    min: appSettings.lineup_pitch_slots_min,
    max: appSettings.lineup_pitch_slots_max,
  };

  const playersRaw = (await db
    .prepare(
      `SELECT u.id AS user_id, u.first_name, u.last_name, u.player_alias AS zawodnik, u.profile_photo_path
       FROM match_signups ms
       JOIN users u ON u.id = ms.user_id
       WHERE ms.match_id = ? AND COALESCE(ms.commitment, 1) = 1
       ORDER BY u.first_name ASC, u.last_name ASC`
    )
    .all(matchId)) as Array<{
    user_id: number;
    first_name: string;
    last_name: string;
    zawodnik: string;
    profile_photo_path: string | null;
  }>;

  const players: MatchLineupPlayerView[] = playersRaw.map((player) => {
    const firstName = (player.first_name || "").trim();
    const lastName = (player.last_name || "").trim();
    return {
      userId: Number(player.user_id),
      displayName: `${firstName} ${lastName}`.trim() || player.zawodnik || "Zawodnik",
      firstName,
      lastName,
      zawodnik: player.zawodnik || "",
      initials: initialsFor(firstName, lastName, player.zawodnik || ""),
      profilePhotoPath: player.profile_photo_path ?? null,
    };
  });

  const lineupRows = (await db
    .prepare("SELECT team, slot_index, user_id FROM match_lineup_slots WHERE match_id = ?")
    .all(matchId)) as Array<{ team: string; slot_index: number; user_id: number }>;

  const pitchTotal = pitchSlotTotalFromSignupCount(players.length, pitchLimits);
  const { home: homeSlots, away: awaySlots } = pitchHalfSlotCounts(pitchTotal);
  const home: (number | null)[] = Array(homeSlots).fill(null);
  const away: (number | null)[] = Array(awaySlots).fill(null);

  for (const slot of lineupRows) {
    if (slot.team === "home" && slot.slot_index >= 0 && slot.slot_index < home.length) {
      home[slot.slot_index] = Number(slot.user_id);
    } else if (slot.team === "away" && slot.slot_index >= 0 && slot.slot_index < away.length) {
      away[slot.slot_index] = Number(slot.user_id);
    }
  }

  return {
    matchId: row.id,
    matchDate: row.match_date,
    matchTime: row.match_time,
    location: row.location,
    lineupPublic: row.lineup_public === 1,
    players,
    home,
    away,
  };
}
