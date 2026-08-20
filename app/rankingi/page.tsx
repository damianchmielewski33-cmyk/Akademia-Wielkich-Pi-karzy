import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAppSettings } from "@/lib/app-settings";
import { getDb } from "@/lib/db";
import { getServerSession } from "@/lib/auth";
import { getRankingsPageData } from "@/lib/rankings-data";
import { rankPlayers } from "@/lib/rankings";
import { RankingiClient } from "@/components/rankingi-client";

export const metadata: Metadata = {
  title: "Rankingi",
  description: "Porównanie zawodników według goli, asyst i punktów.",
};

type Props = {
  searchParams: Promise<{ season?: string }>;
};

export default async function RankingiPage({ searchParams }: Props) {
  const session = await getServerSession();
  if (!session) redirect("/login");

  const params = await searchParams;
  const requestedSeasonId = params.season ? Number(params.season) : null;
  const { season, seasons, players } = await getRankingsPageData(
    requestedSeasonId != null && Number.isFinite(requestedSeasonId) ? requestedSeasonId : null
  );

  if (params.season && !season) {
    redirect("/rankingi");
  }

  const db = await getDb();
  const appSettings = await getAppSettings(db);
  const scoring = {
    ptGoal: appSettings.ranking_pt_goal,
    ptAssist: appSettings.ranking_pt_assist,
    ptKm: appSettings.ranking_pt_km,
    ptSave: appSettings.ranking_pt_save,
  };

  const seasonOpt = season
    ? { id: season.id, name: season.name, is_active: Boolean(season.is_active) }
    : null;

  const seasonsOpt = seasons.map((s) => ({
    id: s.id,
    name: s.name,
    is_active: Boolean(s.is_active),
  }));

  return (
    <RankingiClient
      season={seasonOpt}
      seasons={seasonsOpt}
      scoring={scoring}
      rankingGole={season ? rankPlayers(players, "goals") : []}
      rankingAsysty={season ? rankPlayers(players, "assists") : []}
      rankingDystans={season ? rankPlayers(players, "distance") : []}
      rankingObrony={season ? rankPlayers(players, "saves") : []}
      rankingOgolny={season ? rankPlayers(players, "punkty") : []}
    />
  );
}
