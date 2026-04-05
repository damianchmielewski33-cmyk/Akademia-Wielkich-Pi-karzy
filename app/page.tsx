import type { Metadata } from "next";
import { getDb, type MatchRow } from "@/lib/db";
import { getServerSession } from "@/lib/auth";
import { HomeClient } from "@/components/home-client";

export const metadata: Metadata = {
  title: "Start",
  description: "Najbliższy mecz, zapisy, terminarz i społeczność akademii.",
};

export default async function HomePage() {
  const db = getDb();
  const session = await getServerSession();

  const nextMatch = db
    .prepare(
      "SELECT * FROM matches WHERE played = 0 AND datetime(match_date || ' ' || match_time) > datetime('now', 'localtime') ORDER BY match_date, match_time LIMIT 1"
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

  let profilePhotoPath: string | null = null;
  let zawodnik = "";
  if (session) {
    const u = db
      .prepare("SELECT profile_photo_path, player_alias FROM users WHERE id = ?")
      .get(session.userId) as { profile_photo_path: string | null; player_alias: string } | undefined;
    if (u) {
      profilePhotoPath = u.profile_photo_path ?? null;
      zawodnik = u.player_alias ?? "";
    }
  }

  return (
    <HomeClient
      nextMatch={nextMatch ?? null}
      lineupPublicNextMatch={lineupPublicNextMatch}
      userSigned={userSigned}
      isLoggedIn={Boolean(session)}
      isAdmin={session?.isAdmin ?? false}
      firstName={session?.firstName ?? ""}
      lastName={session?.lastName ?? ""}
      zawodnik={zawodnik}
      profilePhotoPath={profilePhotoPath}
    />
  );
}
