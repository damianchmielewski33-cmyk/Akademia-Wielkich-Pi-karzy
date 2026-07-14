import { getAccountNavFields } from "@/lib/account-server";
import type { AppSession } from "@/lib/auth";
import { getDb, type MatchRow } from "@/lib/db";
import { getHomeTopPlayers, type HomeTopPlayer } from "@/lib/rankings-data";
import { formatPonderingPlayersPolish } from "@/lib/terminarz-shared";
import { parseYoutubeVideoIdFromUserInput } from "@/lib/site";
import { isLocalMatchDay } from "@/lib/transport";

export type HomePageClientProps = {
  nextMatch: MatchRow | null;
  nextMatchTentativeLine: string;
  lineupPublicNextMatch: boolean;
  nextMatchSignup: "none" | "tentative" | "confirmed" | "declined";
  transportHomeActive: boolean;
  isLoggedIn: boolean;
  isAdmin: boolean;
  firstName: string;
  lastName: string;
  zawodnik: string;
  profilePhotoPath: string | null;
  youtubeLiveVideoId: string | null;
  showPzuCupTile: boolean;
  pageVariant: "home" | "pzu-cup";
  topRankedPlayers: HomeTopPlayer[];
};
export async function getHomePageClientProps(
  session: AppSession | null,
  options?: { showPzuCupTile?: boolean; pageVariant?: "home" | "pzu-cup" }
): Promise<HomePageClientProps> {
  const db = await getDb();

  const nextMatch = (await db
    .prepare(
      "SELECT * FROM matches WHERE played = 0 AND COALESCE(cancelled, 0) = 0 AND datetime(match_date || ' ' || match_time) > datetime('now', 'localtime') ORDER BY match_date, match_time LIMIT 1"
    )
    .get()) as MatchRow | undefined;

  let nextMatchSignup: "none" | "tentative" | "confirmed" | "declined" = "none";
  if (nextMatch && session) {
    const signup = (await db
      .prepare(
        `SELECT COALESCE(commitment, 1) AS commitment FROM match_signups WHERE user_id = ? AND match_id = ?`
      )
      .get(session.userId, nextMatch.id)) as { commitment: number } | undefined;
    if (signup) {
      nextMatchSignup =
        signup.commitment === 0 ? "tentative" : signup.commitment === 2 ? "declined" : "confirmed";
    }
  }

  const transportHomeActive = Boolean(nextMatch && isLocalMatchDay(nextMatch));

  let nextMatchTentativeLine = "";
  if (nextMatch) {
    const row = (await db
      .prepare(
        `SELECT COUNT(*) AS c FROM match_signups WHERE match_id = ? AND COALESCE(commitment, 1) = 0`
      )
      .get(nextMatch.id)) as { c: number } | undefined;
    nextMatchTentativeLine = formatPonderingPlayersPolish(Number(row?.c ?? 0));
  }

  const lineupPublicNextMatch = Boolean(nextMatch && nextMatch.lineup_public === 1);

  let profilePhotoPath: string | null = null;
  let zawodnik = "";
  if (session) {
    const nav = await getAccountNavFields(session.userId);
    profilePhotoPath = nav?.profilePhotoPath ?? null;
    zawodnik = nav?.zawodnik ?? session.zawodnik;
  }

  const settingsRow = (await db
    .prepare("SELECT home_youtube_url FROM app_settings WHERE id = 1")
    .get()) as { home_youtube_url: string | null } | undefined;
  const youtubeLiveVideoId = settingsRow?.home_youtube_url
    ? parseYoutubeVideoIdFromUserInput(settingsRow.home_youtube_url)
    : null;

  const nextMatchForClient =
    nextMatch && nextMatchSignup === "confirmed"
      ? nextMatch
      : nextMatch
        ? { ...nextMatch, gate_pin: null }
        : null;

  const topRankedPlayers =
    options?.pageVariant === "pzu-cup" ? [] : await getHomeTopPlayers(3);

  return {
    nextMatch: nextMatchForClient,
    nextMatchTentativeLine,
    lineupPublicNextMatch,
    nextMatchSignup,
    transportHomeActive,
    isLoggedIn: Boolean(session),
    isAdmin: session?.isAdmin ?? false,
    firstName: session?.firstName ?? "",
    lastName: session?.lastName ?? "",
    zawodnik,
    profilePhotoPath,
    youtubeLiveVideoId,
    showPzuCupTile: options?.showPzuCupTile ?? false,
    pageVariant: options?.pageVariant ?? "home",
    topRankedPlayers,
  };
}
