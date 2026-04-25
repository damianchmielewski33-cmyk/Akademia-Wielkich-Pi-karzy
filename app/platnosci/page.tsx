import type { Metadata } from "next";
import { getDb, type MatchRow } from "@/lib/db";
import { getServerSession } from "@/lib/auth";
import { PlatnosciClient, type PlatnosciSignup, type PlatnosciUserLite } from "@/components/platnosci-client";
import { formatPonderingPlayersPolish } from "@/lib/terminarz-shared";

export const metadata: Metadata = {
  title: "Płatności",
  description: "Wpłata BLIK i portfel zawodnika — ostatni mecz (data przeszła), autoryzacje i rozliczenia.",
};

const SQL_LAST_PAST_MATCH = `
  SELECT * FROM matches
  WHERE datetime(match_date || ' ' || match_time) <= datetime('now', 'localtime')
  ORDER BY match_date DESC, match_time DESC
  LIMIT 1
`;

const SQL_SIGNUPS_WITH_USERS_FOR_MATCH = `
  SELECT ms.user_id, ms.paid,
         u.first_name, u.last_name, u.player_alias AS zawodnik, u.profile_photo_path
  FROM match_signups ms
  JOIN users u ON u.id = ms.user_id
  WHERE ms.match_id = ? AND COALESCE(ms.commitment, 1) = 1
  ORDER BY u.first_name, u.last_name
`;

const SQL_ALL_PLAYERS = `
  SELECT id, first_name, last_name, player_alias AS zawodnik, profile_photo_path
  FROM users
  WHERE COALESCE(is_admin, 0) = 0
  ORDER BY first_name, last_name
`;

export default async function PlatnosciPage() {
  const db = await getDb();
  const session = await getServerSession();

  const nextMatch = await db.prepare(SQL_LAST_PAST_MATCH).get() as MatchRow | undefined;

  let signups: PlatnosciSignup[] = [];
  let userSigned = false;
  let userPaid: boolean | null = null;

  let nextMatchTentativeLine = "";
  if (nextMatch) {
    signups = await db.prepare(SQL_SIGNUPS_WITH_USERS_FOR_MATCH).all(nextMatch.id) as PlatnosciSignup[];

    const tRow = (await db
      .prepare(
        `SELECT COUNT(*) AS c FROM match_signups WHERE match_id = ? AND COALESCE(commitment, 1) = 0`
      )
      .get(nextMatch.id)) as { c: number } | undefined;
    nextMatchTentativeLine = formatPonderingPlayersPolish(Number(tRow?.c ?? 0));

    if (session) {
      const mine = signups.find((s) => s.user_id === session.userId);
      userSigned = Boolean(mine);
      userPaid = mine ? mine.paid === 1 : null;
    }
  }

  const allPlayers = (await db.prepare(SQL_ALL_PLAYERS).all()) as PlatnosciUserLite[];

  return (
    <PlatnosciClient
      nextMatch={nextMatch ?? null}
      nextMatchTentativeLine={nextMatchTentativeLine}
      signups={session ? signups : []}
      allPlayers={allPlayers}
      isLoggedIn={Boolean(session)}
      isAdmin={session?.isAdmin ?? false}
      userSigned={userSigned}
      userPaid={userPaid}
    />
  );
}
