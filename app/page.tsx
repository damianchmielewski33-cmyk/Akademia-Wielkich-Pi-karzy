import type { Metadata } from "next";
import { getAccountNavFields } from "@/lib/account-server";
import { getServerSession } from "@/lib/auth";
import { getDb, type MatchRow } from "@/lib/db";
import { HomeClient } from "@/components/home-client";
import { isLocalMatchDay } from "@/lib/transport";

export const metadata: Metadata = {
  title: "Start",
  description: "Najbliższy mecz, zapisy, terminarz i społeczność akademii.",
};

export default async function HomePage() {
  const db = await getDb();
  const session = await getServerSession();

  const nextMatch = (await db
    .prepare(
      "SELECT * FROM matches WHERE played = 0 AND datetime(match_date || ' ' || match_time) > datetime('now', 'localtime') ORDER BY match_date, match_time LIMIT 1"
    )
    .get()) as MatchRow | undefined;

  let userSigned = false;
  if (nextMatch && session) {
    const signup = (await db
      .prepare(`SELECT id FROM match_signups WHERE user_id = ? AND match_id = ?`)
      .get(session.userId, nextMatch.id)) as { id: number } | undefined;
    userSigned = Boolean(signup);
  }

  const transportHomeActive = Boolean(nextMatch && isLocalMatchDay(nextMatch));

  const lineupPublicNextMatch = Boolean(nextMatch && nextMatch.lineup_public === 1);

  let profilePhotoPath: string | null = null;
  let zawodnik = "";
  if (session) {
    const nav = await getAccountNavFields(session.userId);
    profilePhotoPath = nav?.profilePhotoPath ?? null;
    zawodnik = nav?.zawodnik ?? session.zawodnik;
  }

  return (
    <HomeClient
      nextMatch={nextMatch ?? null}
      lineupPublicNextMatch={lineupPublicNextMatch}
      userSigned={userSigned}
      transportHomeActive={transportHomeActive}
      isLoggedIn={Boolean(session)}
      isAdmin={session?.isAdmin ?? false}
      firstName={session?.firstName ?? ""}
      lastName={session?.lastName ?? ""}
      zawodnik={zawodnik}
      profilePhotoPath={profilePhotoPath}
    />
  );
}
