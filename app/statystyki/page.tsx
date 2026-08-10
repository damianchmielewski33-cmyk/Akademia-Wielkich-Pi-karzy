import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAccountNavFields } from "@/lib/account-server";
import { getServerSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
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
      `SELECT m.match_date, m.match_time, m.location, s.goals, s.assists, s.distance, s.saves
       FROM match_stats s
       JOIN matches m ON m.id = s.match_id
       WHERE s.user_id = ?
       ORDER BY m.match_date DESC, m.match_time DESC`
    )
    .all(session.userId)) as {
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
