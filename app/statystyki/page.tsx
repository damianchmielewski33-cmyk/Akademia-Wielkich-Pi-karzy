import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAccountNavFields } from "@/lib/account-server";
import { getServerSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import {
  PARTICIPATION_SURVEY_KEY,
  PARTICIPATION_SURVEY_LOCATION,
  PARTICIPATION_SURVEY_MATCH_DATE,
  PARTICIPATION_SURVEY_MATCH_TIME,
} from "@/lib/match-participation-survey";
import { StatystykiClient } from "@/components/statystyki-client";
import { PitchPageHero } from "@/components/ui/pitch-card";

export const metadata: Metadata = {
  title: "Statystyki",
  description: "Twoje gole, asysty, dystans i obrony z rozegranych meczów.",
};

export default async function StatystykiPage() {
  const session = await getServerSession();
  if (!session) redirect("/login");

  const db = await getDb();
  const totalMatches = (await db.prepare("SELECT COUNT(*) AS c FROM matches").get() as { c: number }).c;
  const playedMatches = (
    await db.prepare("SELECT COUNT(*) AS c FROM matches WHERE played = 1").get() as { c: number }
  ).c;
  const upcomingMatches = (
    (await db
      .prepare("SELECT COUNT(*) AS c FROM matches WHERE match_date >= date('now') AND played = 0 AND COALESCE(cancelled, 0) = 0")
      .get()) as { c: number }
  ).c;
  const playersCount = (await db.prepare("SELECT COUNT(*) AS c FROM users").get() as { c: number }).c;

  const nav = await getAccountNavFields(session.userId);
  const me = {
    first_name: nav?.firstName ?? session.firstName,
    last_name: nav?.lastName ?? session.lastName,
    player_alias: nav?.zawodnik ?? session.zawodnik,
    profile_photo_path: nav?.profilePhotoPath ?? null,
  };

  const userStats = (await db
    .prepare(
      `SELECT * FROM (
        SELECT m.match_date, m.match_time, m.location, s.goals, s.assists, s.distance, s.saves
        FROM match_stats s JOIN matches m ON m.id = s.match_id WHERE s.user_id = ?
        UNION ALL
        SELECT ? AS match_date, ? AS match_time, ? AS location,
               sms.goals, sms.assists, sms.distance, sms.saves
        FROM standalone_match_stats sms
        WHERE sms.user_id = ? AND sms.survey_key = ?
      ) ORDER BY match_date DESC, match_time DESC`
    )
    .all(
      session.userId,
      PARTICIPATION_SURVEY_MATCH_DATE,
      PARTICIPATION_SURVEY_MATCH_TIME,
      PARTICIPATION_SURVEY_LOCATION,
      session.userId,
      PARTICIPATION_SURVEY_KEY
    )) as {
    match_date: string;
    match_time: string;
    location: string;
    goals: number;
    assists: number;
    distance: number;
    saves: number;
  }[];

  return (
    <div className="awp-page awp-page--default text-center">
      <PitchPageHero
        title="Statystyki"
        subtitle="Twoje gole, asysty, dystans i obrony z rozegranych meczów"
      />

      <StatystykiClient
        me={me}
        matches={userStats}
        liga={{
          playersCount,
          totalMatches,
          playedMatches,
          upcomingMatches,
        }}
      />
    </div>
  );
}
