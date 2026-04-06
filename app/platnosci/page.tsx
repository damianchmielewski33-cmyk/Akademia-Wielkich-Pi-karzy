import type { Metadata } from "next";
import { getDb, type MatchRow } from "@/lib/db";
import { getServerSession } from "@/lib/auth";
import { PlatnosciClient, type PlatnosciSignup } from "@/components/platnosci-client";

export const metadata: Metadata = {
  title: "Płatności",
  description: "Wpłata BLIK na najbliższy mecz — numer telefonu i status opłaty.",
};

const SQL_NEXT_UPCOMING_MATCH = `
  SELECT * FROM matches
  WHERE played = 0
    AND datetime(match_date || ' ' || match_time) > datetime('now', 'localtime')
  ORDER BY match_date, match_time
  LIMIT 1
`;

const SQL_SIGNUPS_WITH_USERS_FOR_MATCH = `
  SELECT ms.user_id, ms.paid,
         u.first_name, u.last_name, u.player_alias AS zawodnik, u.profile_photo_path
  FROM match_signups ms
  JOIN users u ON u.id = ms.user_id
  WHERE ms.match_id = ?
  ORDER BY u.first_name, u.last_name
`;

export default async function PlatnosciPage() {
  const db = await getDb();
  const session = await getServerSession();

  const nextMatch = await db.prepare(SQL_NEXT_UPCOMING_MATCH).get() as MatchRow | undefined;

  let signups: PlatnosciSignup[] = [];
  let userSigned = false;
  let userPaid: boolean | null = null;

  if (nextMatch) {
    signups = await db.prepare(SQL_SIGNUPS_WITH_USERS_FOR_MATCH).all(nextMatch.id) as PlatnosciSignup[];

    if (session) {
      const mine = signups.find((s) => s.user_id === session.userId);
      userSigned = Boolean(mine);
      userPaid = mine ? mine.paid === 1 : null;
    }
  }

  return (
    <PlatnosciClient
      nextMatch={nextMatch ?? null}
      signups={session ? signups : []}
      isLoggedIn={Boolean(session)}
      isAdmin={session?.isAdmin ?? false}
      userSigned={userSigned}
      userPaid={userPaid}
    />
  );
}
