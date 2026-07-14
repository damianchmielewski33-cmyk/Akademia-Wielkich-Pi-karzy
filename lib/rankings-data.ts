import { getAppSettings } from "@/lib/app-settings";
import type { AppDb } from "@/lib/db";
import { getDb } from "@/lib/db";
import { REALMS, type Realm } from "@/lib/realm";
import { getActiveRankingSeason, resolveRankingSeasonForView } from "@/lib/ranking-seasons";
import { rankPlayers, type RankablePlayer, type RankedPlayer } from "@/lib/rankings";

function playersAllTimeStatsSql() {
  return `
    SELECT u.id AS user_id,
           u.first_name, u.last_name,
           u.player_alias AS zawodnik,
           u.profile_photo_path,
           COALESCE(ms.goals, 0) + COALESCE(sms.goals, 0) AS goals,
           COALESCE(ms.assists, 0) + COALESCE(sms.assists, 0) AS assists,
           COALESCE(ms.distance, 0) + COALESCE(sms.distance, 0) AS distance,
           COALESCE(ms.saves, 0) + COALESCE(sms.saves, 0) AS saves,
           COALESCE(ms.mecze, 0) + COALESCE(sms.mecze, 0) AS mecze
    FROM users u
    LEFT JOIN (
      SELECT user_id,
             SUM(goals) AS goals,
             SUM(assists) AS assists,
             SUM(distance) AS distance,
             SUM(saves) AS saves,
             COUNT(*) AS mecze
      FROM match_stats
      GROUP BY user_id
    ) ms ON ms.user_id = u.id
    LEFT JOIN (
      SELECT user_id,
             SUM(goals) AS goals,
             SUM(assists) AS assists,
             SUM(distance) AS distance,
             SUM(saves) AS saves,
             COUNT(*) AS mecze
      FROM standalone_match_stats
      GROUP BY user_id
    ) sms ON sms.user_id = u.id
    WHERE COALESCE(u.is_temporary, 0) = 0 AND COALESCE(u.realm, ?) = ?
  `;
}

function playersStatsSql() {
  return `
    SELECT u.id AS user_id,
           u.first_name, u.last_name,
           u.player_alias AS zawodnik,
           u.profile_photo_path,
           COALESCE(ms.goals, 0) + COALESCE(sms.goals, 0) AS goals,
           COALESCE(ms.assists, 0) + COALESCE(sms.assists, 0) AS assists,
           COALESCE(ms.distance, 0) + COALESCE(sms.distance, 0) AS distance,
           COALESCE(ms.saves, 0) + COALESCE(sms.saves, 0) AS saves,
           COALESCE(ms.mecze, 0) + COALESCE(sms.mecze, 0) AS mecze
    FROM users u
    LEFT JOIN (
      SELECT user_id,
             SUM(goals) AS goals,
             SUM(assists) AS assists,
             SUM(distance) AS distance,
             SUM(saves) AS saves,
             COUNT(*) AS mecze
      FROM match_stats
      WHERE season_id = ?
      GROUP BY user_id
    ) ms ON ms.user_id = u.id
    LEFT JOIN (
      SELECT user_id,
             SUM(goals) AS goals,
             SUM(assists) AS assists,
             SUM(distance) AS distance,
             SUM(saves) AS saves,
             COUNT(*) AS mecze
      FROM standalone_match_stats
      WHERE season_id = ?
      GROUP BY user_id
    ) sms ON sms.user_id = u.id
    WHERE COALESCE(u.is_temporary, 0) = 0 AND COALESCE(u.realm, ?) = ?
  `;
}

type PlayerStatsRow = {
  user_id: number;
  first_name: string;
  last_name: string;
  zawodnik: string;
  profile_photo_path: string | null;
  goals: number;
  assists: number;
  distance: number;
  saves: number;
  mecze: number;
};

export async function getAllTimeRankablePlayers(
  db: AppDb,
  realm: Realm = REALMS.ACADEMY
): Promise<RankablePlayer[]> {
  const appSettings = await getAppSettings(db, realm);
  const PT_GOAL = appSettings.ranking_pt_goal;
  const PT_ASSIST = appSettings.ranking_pt_assist;
  const PT_KM = appSettings.ranking_pt_km;
  const PT_SAVE = appSettings.ranking_pt_save;

  const rows = (await db
    .prepare(playersAllTimeStatsSql())
    .all(REALMS.ACADEMY, realm)) as PlayerStatsRow[];

  return rows.map((r) => {
    const g = Number(r.goals) || 0;
    const a = Number(r.assists) || 0;
    const d = Number(r.distance) || 0;
    const sv = Number(r.saves) || 0;
    const mecze = Number(r.mecze) || 0;
    const punkty = PT_GOAL * g + PT_ASSIST * a + PT_KM * d + PT_SAVE * sv;
    return {
      userId: r.user_id,
      first_name: r.first_name,
      last_name: r.last_name,
      zawodnik: r.zawodnik,
      profile_photo_path: r.profile_photo_path ?? null,
      goals: g,
      assists: a,
      distance: d,
      saves: sv,
      mecze,
      punkty: Math.round(punkty * 100) / 100,
    };
  });
}

export async function getRankablePlayers(
  db: AppDb,
  seasonId: number,
  realm: Realm = REALMS.ACADEMY
): Promise<RankablePlayer[]> {
  const appSettings = await getAppSettings(db, realm);
  const PT_GOAL = appSettings.ranking_pt_goal;
  const PT_ASSIST = appSettings.ranking_pt_assist;
  const PT_KM = appSettings.ranking_pt_km;
  const PT_SAVE = appSettings.ranking_pt_save;

  const rows = (await db
    .prepare(playersStatsSql())
    .all(seasonId, seasonId, REALMS.ACADEMY, realm)) as PlayerStatsRow[];

  return rows.map((r) => {
    const g = Number(r.goals) || 0;
    const a = Number(r.assists) || 0;
    const d = Number(r.distance) || 0;
    const sv = Number(r.saves) || 0;
    const mecze = Number(r.mecze) || 0;
    const punkty = PT_GOAL * g + PT_ASSIST * a + PT_KM * d + PT_SAVE * sv;
    return {
      userId: r.user_id,
      first_name: r.first_name,
      last_name: r.last_name,
      zawodnik: r.zawodnik,
      profile_photo_path: r.profile_photo_path ?? null,
      goals: g,
      assists: a,
      distance: d,
      saves: sv,
      mecze,
      punkty: Math.round(punkty * 100) / 100,
    };
  });
}

export async function getTopOverallRankedPlayersForSeason(
  seasonId: number,
  limit = 3,
  realm: Realm = REALMS.ACADEMY
): Promise<RankedPlayer[]> {
  const db = await getDb();
  const players = await getRankablePlayers(db, seasonId, realm);
  return rankPlayers(players, "punkty")
    .filter((p) => p.punkty > 0 || p.mecze > 0)
    .slice(0, limit);
}

export async function getTopOverallRankedPlayers(limit = 3): Promise<RankedPlayer[]> {
  const db = await getDb();
  const active = await getActiveRankingSeason(db);
  if (!active) return [];
  return getTopOverallRankedPlayersForSeason(active.id, limit);
}

export type HomeTopPlayer = {
  rank: number;
  userId: number;
  firstName: string;
  lastName: string;
  zawodnik: string;
  profilePhotoPath: string | null;
  punkty: number;
  goals: number;
  assists: number;
};

export async function getHomeTopPlayers(limit = 3): Promise<HomeTopPlayer[]> {
  const db = await getDb();
  const players = await getAllTimeRankablePlayers(db, REALMS.ACADEMY);
  const top = rankPlayers(players, "punkty")
    .filter((p) => p.punkty > 0 || p.mecze > 0)
    .slice(0, limit);
  return top.map((p) => ({
    rank: p.rank,
    userId: p.userId,
    firstName: p.first_name,
    lastName: p.last_name,
    zawodnik: p.zawodnik,
    profilePhotoPath: p.profile_photo_path,
    punkty: p.punkty,
    goals: p.goals,
    assists: p.assists,
  }));
}

export async function getRankingsPageData(
  requestedSeasonId?: number | null,
  realm: Realm = REALMS.ACADEMY
) {
  const db = await getDb();
  const { season, seasons } = await resolveRankingSeasonForView(db, requestedSeasonId, realm);
  if (!season) {
    return { season: null, seasons, players: [] as RankablePlayer[] };
  }
  const players = await getRankablePlayers(db, season.id, realm);
  return { season, seasons, players };
}
