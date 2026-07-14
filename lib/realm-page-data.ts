import type { AppSession } from "@/lib/auth";
import { getDb, type MatchRow } from "@/lib/db";
import { getAppSettings } from "@/lib/app-settings";
import { REALMS, type Realm } from "@/lib/realm";
import {
  buildPlayersData,
  categorizeMatches,
  userSignupKindMap,
  type SignupRow,
} from "@/lib/terminarz-shared";

export async function getTerminarzPageData(realm: Realm, session: AppSession | null) {
  const db = await getDb();
  const appSettings = await getAppSettings(db, realm);

  const matches = (await db
    .prepare(
      "SELECT * FROM matches WHERE realm = ? ORDER BY match_date ASC, match_time ASC"
    )
    .all(realm)) as MatchRow[];

  const signups = (await db
    .prepare(
      `SELECT ms.match_id, ms.paid, COALESCE(ms.commitment, 1) AS commitment,
              u.id AS user_id, u.first_name, u.last_name,
              u.player_alias AS zawodnik, u.profile_photo_path
       FROM match_signups ms
       JOIN users u ON u.id = ms.user_id
       JOIN matches m ON m.id = ms.match_id
       WHERE m.realm = ?
       ORDER BY u.first_name ASC`
    )
    .all(realm)) as SignupRow[];

  const playersData = buildPlayersData(matches, signups);
  const userSignupKind = userSignupKindMap(signups, session?.zawodnik);
  const { upcoming, playedConfirmed } = categorizeMatches(matches);

  let playedMissingStatsMatchIds: number[] = [];
  if (session) {
    const missingRows = (await db
      .prepare(
        `SELECT m.id
         FROM matches m
         JOIN match_signups s ON s.match_id = m.id AND s.user_id = ? AND COALESCE(s.commitment, 1) = 1
         WHERE m.realm = ? AND m.played = 1
           AND NOT EXISTS (
             SELECT 1 FROM match_stats st
             WHERE st.user_id = ? AND st.match_id = m.id
           )`
      )
      .all(session.userId, realm, session.userId)) as { id: number }[];
    playedMissingStatsMatchIds = missingRows.map((r) => r.id);
  }

  return {
    appSettings,
    matches,
    upcoming,
    playedConfirmed,
    playersData,
    userSignupKind,
    playedMissingStatsMatchIds,
  };
}

export async function getPilkarzePageData(realm: Realm) {
  const db = await getDb();
  const gracze = (await db
    .prepare(
      `SELECT id, first_name, last_name, player_alias AS zawodnik, profile_photo_path
       FROM users
       WHERE COALESCE(realm, ?) = ? AND COALESCE(is_temporary, 0) = 0
       ORDER BY first_name ASC`
    )
    .all(REALMS.ACADEMY, realm)) as {
    id: number;
    first_name: string;
    last_name: string;
    zawodnik: string;
    profile_photo_path: string | null;
  }[];
  return gracze;
}
