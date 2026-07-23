import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { getRankingsPageData } from "@/lib/rankings-data";
import { rankPlayers } from "@/lib/rankings";
import { getAppSettings } from "@/lib/app-settings";
import { getDb } from "@/lib/db";
import { getApiRealm } from "@/lib/request-realm";
import { screenBlockApiResponse } from "@/lib/screen-block-api";

export const runtime = "nodejs";

/** Rankingi dla aplikacji Android. */
export async function GET(req: Request) {
  const blocked = await screenBlockApiResponse(req);
  if (blocked) return blocked;

  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Wymagane logowanie" }, { status: 401 });
  }

  const url = new URL(req.url);
  const seasonParam = url.searchParams.get("season");
  const requestedSeasonId = seasonParam ? Number(seasonParam) : null;
  const realm = getApiRealm(req);

  const { season, seasons, players } = await getRankingsPageData(
    requestedSeasonId != null && Number.isFinite(requestedSeasonId) ? requestedSeasonId : null,
    realm
  );

  if (!season) {
    return NextResponse.json({
      season: null,
      seasons,
      rankings: { punkty: [], goals: [], assists: [], distance: [], saves: [] },
      points: null,
    });
  }

  const db = await getDb();
  const appSettings = await getAppSettings(db);

  const mapRow = (
    p: ReturnType<typeof rankPlayers>[number],
    key: "punkty" | "goals" | "assists" | "distance" | "saves"
  ) => ({
    rank: p.rank,
    userId: p.userId,
    firstName: p.first_name,
    lastName: p.last_name,
    zawodnik: p.zawodnik,
    value: p[key],
    goals: p.goals,
    assists: p.assists,
    distance: p.distance,
    saves: p.saves,
    punkty: p.punkty,
  });

  return NextResponse.json({
    season: {
      id: season.id,
      name: season.name,
      isActive: Boolean(season.is_active),
    },
    seasons: seasons.map((s) => ({
      id: s.id,
      name: s.name,
      isActive: Boolean(s.is_active),
    })),
    points: {
      goal: appSettings.ranking_pt_goal,
      assist: appSettings.ranking_pt_assist,
      km: appSettings.ranking_pt_km,
      save: appSettings.ranking_pt_save,
    },
    rankings: {
      punkty: rankPlayers(players, "punkty").map((p) => mapRow(p, "punkty")),
      goals: rankPlayers(players, "goals").map((p) => mapRow(p, "goals")),
      assists: rankPlayers(players, "assists").map((p) => mapRow(p, "assists")),
      distance: rankPlayers(players, "distance").map((p) => mapRow(p, "distance")),
      saves: rankPlayers(players, "saves").map((p) => mapRow(p, "saves")),
    },
  });
}
