import Link from "next/link";
import { getDb, type MatchRow } from "@/lib/db";
import { getServerSession } from "@/lib/auth";
import {
  buildPlayersData,
  categorizeMatches,
  userSignedMap,
  type SignupRow,
} from "@/lib/terminarz-shared";
import { TerminarzClient } from "@/components/terminarz-client";

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
  const { upcoming, afterDate, playedConfirmed } = categorizeMatches(matches);

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <TerminarzClient
        upcoming={upcoming}
        afterDate={afterDate}
        playedConfirmed={playedConfirmed}
        allMatches={matches}
        playersData={playersData}
        userSigned={signedMap}
        isLoggedIn={Boolean(session)}
        isAdmin={session?.isAdmin ?? false}
      />
      <Link
        href="/"
        className="mt-10 block text-center text-emerald-700 hover:underline"
      >
        Powrot na strone glowna
      </Link>
    </div>
  );
}
