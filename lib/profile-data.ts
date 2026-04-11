import { getDb } from "@/lib/db";
import { ALL_PLAYERS } from "@/lib/constants";
import { normalizeUiTheme } from "@/lib/ui-theme";
import {
  PARTICIPATION_SURVEY_KEY,
  PARTICIPATION_SURVEY_LOCATION,
  PARTICIPATION_SURVEY_MATCH_DATE,
  PARTICIPATION_SURVEY_MATCH_TIME,
} from "@/lib/match-participation-survey";

export type ProfileMatchStatRow = {
  stat_id: number;
  match_id: number;
  /** Uzupełnianie przez `/api/stats/save` z `survey_key` zamiast `match_id`. */
  survey_key?: string;
  match_date: string;
  match_time: string;
  location: string;
  goals: number;
  assists: number;
  distance: number;
  saves: number;
  can_edit: boolean;
  edit_deadline: string;
};

export type ProfileMissingStatRow = {
  match_id: number;
  match_date: string;
  match_time: string;
  location: string;
  can_add: boolean;
  edit_deadline: string;
};

export type ProfileActivityRow = {
  action: string;
  timestamp: string;
};

export async function getAvailablePlayerAliases(exceptUserId: number): Promise<string[]> {
  const db = await getDb();
  const taken = new Set(
    (
      (await db.prepare("SELECT id, player_alias FROM users").all()) as {
        id: number;
        player_alias: string;
      }[]
    )
      .filter((r) => r.id !== exceptUserId)
      .map((r) => r.player_alias)
  );
  return ALL_PLAYERS.filter((p) => !taken.has(p));
}

export async function getProfileDashboard(userId: number) {
  const db = await getDb();
  const user = (await db
    .prepare(
      "SELECT id, first_name, last_name, player_alias, profile_photo_path, is_admin, ui_theme FROM users WHERE id = ?"
    )
    .get(userId)) as
    | {
        id: number;
        first_name: string;
        last_name: string;
        player_alias: string;
        profile_photo_path: string | null;
        is_admin: number;
        ui_theme: string | null;
      }
    | undefined;

  if (!user) return null;

  const statsRaw = (await db
    .prepare(
      `SELECT * FROM (
       SELECT s.id AS stat_id, s.match_id, m.match_date, m.match_time, m.location,
              s.goals, s.assists, s.distance, s.saves,
              CASE WHEN date('now') <= date(m.match_date, '+7 days') THEN 1 ELSE 0 END AS can_edit,
              date(m.match_date, '+7 days') AS edit_deadline,
              NULL AS survey_key
       FROM match_stats s
       JOIN matches m ON m.id = s.match_id
       WHERE s.user_id = ? AND m.played = 1
       UNION ALL
       SELECT -1 AS stat_id, 0 AS match_id,
              ? AS match_date, ? AS match_time, ? AS location,
              sms.goals, sms.assists, sms.distance, sms.saves,
              1 AS can_edit,
              '—' AS edit_deadline,
              ? AS survey_key
       FROM standalone_match_stats sms
       WHERE sms.user_id = ? AND sms.survey_key = ?
       ) ORDER BY match_date DESC, match_time DESC`
    )
    .all(
      userId,
      PARTICIPATION_SURVEY_MATCH_DATE,
      PARTICIPATION_SURVEY_MATCH_TIME,
      PARTICIPATION_SURVEY_LOCATION,
      PARTICIPATION_SURVEY_KEY,
      userId,
      PARTICIPATION_SURVEY_KEY
    )) as (Omit<ProfileMatchStatRow, "can_edit"> & { can_edit: number; survey_key: string | null })[];

  const statsRows: ProfileMatchStatRow[] = statsRaw.map((r) => ({
    ...r,
    survey_key: r.survey_key ?? undefined,
    can_edit: r.can_edit === 1,
  }));

  const missingRaw = (await db
    .prepare(
      `SELECT m.id AS match_id, m.match_date, m.match_time, m.location,
              CASE WHEN date('now') <= date(m.match_date, '+7 days') THEN 1 ELSE 0 END AS can_add,
              date(m.match_date, '+7 days') AS edit_deadline
       FROM matches m
       JOIN match_signups sig ON sig.match_id = m.id AND sig.user_id = ? AND COALESCE(sig.commitment, 1) = 1
       WHERE m.played = 1
         AND NOT EXISTS (
           SELECT 1 FROM match_stats st WHERE st.match_id = m.id AND st.user_id = ?
         )
       ORDER BY m.match_date DESC, m.match_time DESC`
    )
    .all(userId, userId)) as (Omit<ProfileMissingStatRow, "can_add"> & { can_add: number })[];

  const missingRows: ProfileMissingStatRow[] = missingRaw.map((r) => ({
    ...r,
    can_add: r.can_add === 1,
  }));

  const sumGoals = statsRows.reduce((a, r) => a + r.goals, 0);
  const sumAssists = statsRows.reduce((a, r) => a + r.assists, 0);
  const sumDist = statsRows.reduce((a, r) => a + r.distance, 0);
  const sumSaves = statsRows.reduce((a, r) => a + (r.saves ?? 0), 0);

  const recentActivity = (await db
    .prepare(
      "SELECT action, timestamp FROM activity_log WHERE user_id = ? ORDER BY timestamp DESC LIMIT 12"
    )
    .all(userId)) as ProfileActivityRow[];

  return {
    user: {
      id: user.id,
      first_name: user.first_name,
      last_name: user.last_name,
      zawodnik: user.player_alias,
      profile_photo_path: user.profile_photo_path,
      is_admin: user.is_admin,
      ui_theme: normalizeUiTheme(user.ui_theme),
    },
    available_players: await getAvailablePlayerAliases(userId),
    summary: {
      matches_with_stats: statsRows.length,
      goals: sumGoals,
      assists: sumAssists,
      distance_km: sumDist,
      saves: sumSaves,
      missing_stats_count: missingRows.length,
    },
    match_stats: statsRows,
    matches_missing_stats: missingRows,
    recent_activity: recentActivity,
  };
}

export type ProfileDashboard = NonNullable<Awaited<ReturnType<typeof getProfileDashboard>>>;
