import { getDb, type MatchRow } from "@/lib/db";
import { getServerSession } from "@/lib/auth";
import { HomeClient } from "@/components/home-client";

export default async function HomePage() {
  const db = getDb();
  const session = await getServerSession();

  const nextMatch = db
    .prepare(
      "SELECT * FROM matches WHERE match_date >= date('now') ORDER BY match_date, match_time LIMIT 1"
    )
    .get() as MatchRow | undefined;

  let userSigned = false;
  if (nextMatch && session) {
    const signup = db
      .prepare("SELECT id FROM match_signups WHERE user_id = ? AND match_id = ?")
      .get(session.userId, nextMatch.id);
    userSigned = Boolean(signup);
  }

  const lineupPublicNextMatch = Boolean(nextMatch && nextMatch.lineup_public === 1);

  return (
    <HomeClient
      nextMatch={nextMatch ?? null}
      lineupPublicNextMatch={lineupPublicNextMatch}
      userSigned={userSigned}
      isLoggedIn={Boolean(session)}
      isAdmin={session?.isAdmin ?? false}
      firstName={session?.firstName ?? ""}
      lastName={session?.lastName ?? ""}
    />
  );
}
