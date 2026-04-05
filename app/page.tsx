import type { Metadata } from "next";
import { getAccountNavFields } from "@/lib/account-server";
import { getServerSession } from "@/lib/auth";
import { getDb, type MatchRow } from "@/lib/db";
import { HomeClient } from "@/components/home-client";
import { isTransportChatEligible, isWithinSixHoursBeforeMatch, type SignupTransportRow } from "@/lib/transport";

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
  let signupTransport: SignupTransportRow | null = null;
  if (nextMatch && session) {
    const signup = db
      .prepare(
        `SELECT id, drives_car, can_take_passengers, needs_transport FROM match_signups WHERE user_id = ? AND match_id = ?`
      )
      .get(session.userId, nextMatch.id) as
      | {
          id: number;
          drives_car: number;
          can_take_passengers: number;
          needs_transport: number;
        }
      | undefined;
    userSigned = Boolean(signup);
    if (signup) {
      signupTransport = {
        drives_car: signup.drives_car,
        can_take_passengers: signup.can_take_passengers,
        needs_transport: signup.needs_transport,
      };
    }
  }

  const showTransportOnHome = Boolean(
    session &&
      nextMatch &&
      userSigned &&
      (isWithinSixHoursBeforeMatch(nextMatch) ||
        (signupTransport != null && isTransportChatEligible(signupTransport)))
  );

  const lineupPublicNextMatch = Boolean(nextMatch && nextMatch.lineup_public === 1);

  let profilePhotoPath: string | null = null;
  let zawodnik = "";
  if (session) {
    const nav = getAccountNavFields(session.userId);
    profilePhotoPath = nav?.profilePhotoPath ?? null;
    zawodnik = nav?.zawodnik ?? session.zawodnik;
  }

  return (
    <HomeClient
      nextMatch={nextMatch ?? null}
      lineupPublicNextMatch={lineupPublicNextMatch}
      userSigned={userSigned}
      showTransportOnHome={showTransportOnHome}
      isLoggedIn={Boolean(session)}
      isAdmin={session?.isAdmin ?? false}
      firstName={session?.firstName ?? ""}
      lastName={session?.lastName ?? ""}
      zawodnik={zawodnik}
      profilePhotoPath={profilePhotoPath}
    />
  );
}
