import type { Metadata } from "next";
import { getDb, type MatchRow } from "@/lib/db";
import { getServerSession } from "@/lib/auth";
import {
  buildPlayersData,
  categorizeMatches,
  userSignedMap,
  type SignupRow,
} from "@/lib/terminarz-shared";
import { TerminarzClient } from "@/components/terminarz-client";

export const metadata: Metadata = {
  title: "Terminarz",
  description: "Zapisy na mecze, lista terminów, archiwum i eksport do kalendarza (.ics).",
};

export default async function TerminarzPage() {
  const db = getDb();
  const session = await getServerSession();
  const matches = db
    .prepare("SELECT * FROM matches ORDER BY match_date ASC, match_time ASC")
    .all() as MatchRow[];

  const signups = db
    .prepare(
      `SELECT ms.match_id, ms.paid, u.first_name, u.last_name, u.player_alias AS zawodnik
       FROM match_signups ms
       JOIN users u ON u.id = ms.user_id
       ORDER BY u.first_name ASC`
    )
    .all() as SignupRow[];

  const playersData = buildPlayersData(matches, signups);
  const signedMap = userSignedMap(signups, session?.zawodnik);
  const { upcoming, playedConfirmed } = categorizeMatches(matches);

  let playedMissingStatsMatchIds: number[] = [];
  if (session) {
    const missingRows = db
      .prepare(
        `SELECT m.id
         FROM matches m
         JOIN match_signups s ON s.match_id = m.id AND s.user_id = ?
         WHERE m.played = 1
           AND NOT EXISTS (
             SELECT 1 FROM match_stats st
             WHERE st.user_id = ? AND st.match_id = m.id
           )`
      )
      .all(session.userId, session.userId) as { id: number }[];
    playedMissingStatsMatchIds = missingRows.map((r) => r.id);
  }

  return (
    <div className="container mx-auto max-w-6xl flex-1 px-4 py-8 sm:py-10">
      <TerminarzClient
        upcoming={upcoming}
        playedConfirmed={playedConfirmed}
        allMatches={matches}
        playersData={playersData}
        userSigned={signedMap}
        playedMissingStatsMatchIds={playedMissingStatsMatchIds}
        isLoggedIn={Boolean(session)}
        isAdmin={session?.isAdmin ?? false}
      />
    </div>
  );
}
