import { getAccountNavFields } from "@/lib/account-server";
import type { AppSession } from "@/lib/auth";
import { listVenueCards, type VenueCard } from "@/lib/booking";
import { getDb, type MatchRow } from "@/lib/db";
import { getHomeTopPlayers, type HomeTopPlayer } from "@/lib/rankings-data";
import { REALMS } from "@/lib/realm";
import {
  buildPlayersData,
  type PlayersDataEntry,
  type SignupRow,
  MATCH_SIGNUPS_PLAYER_SQL,
  formatPonderingPlayersPolish,
} from "@/lib/terminarz-shared";
import { parseYoutubeVideoIdFromUserInput } from "@/lib/site";
import { isLocalMatchDay } from "@/lib/transport";
import { getRequestAppSettings } from "@/lib/request-app-settings";
import { isHotpayConfigured } from "@/lib/hotpay";
import type { SiteMode } from "@/lib/site-mode";

export type HomePageClientProps = {
  nextMatch: MatchRow | null;
  /** Potwierdzeni + wstępni + odmówienia — podgląd składu na karcie „Najbliższy mecz”. */
  nextMatchPlayersData: PlayersDataEntry | null;
  nextMatchTentativeLine: string;
  lineupPublicNextMatch: boolean;
  nextMatchSignup: "none" | "tentative" | "confirmed" | "declined";
  transportHomeActive: boolean;
  hotpayEnabled: boolean;
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
  featuredVenues: VenueCard[];
};
export async function getHomePageClientProps(
  session: AppSession | null,
  options?: { showPzuCupTile?: boolean; pageVariant?: "home" | "pzu-cup"; siteMode?: SiteMode | null }
): Promise<HomePageClientProps> {
  const db = await getDb();
  const pageVariant = options?.pageVariant ?? "home";
  const loadAcademy = pageVariant === "pzu-cup" || options?.siteMode === "academy";

  const [nextMatch, appSettings, topRankedPlayers, featuredVenues, nav] = await Promise.all([
    loadAcademy
      ? db
          .prepare(
            `SELECT * FROM matches
       WHERE realm = ? AND played = 0 AND COALESCE(cancelled, 0) = 0
         AND datetime(match_date || ' ' || match_time) > datetime('now', 'localtime')
       ORDER BY match_date, match_time LIMIT 1`
          )
          .get(REALMS.ACADEMY) as Promise<MatchRow | undefined>
      : Promise.resolve(undefined),
    getRequestAppSettings(),
    loadAcademy && pageVariant !== "pzu-cup" ? getHomeTopPlayers(3) : Promise.resolve([] as HomeTopPlayer[]),
    pageVariant === "home" ? listVenueCards(db, { limit: 8 }) : Promise.resolve([] as VenueCard[]),
    session ? getAccountNavFields(session.userId) : Promise.resolve(null),
  ]);

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

  let nextMatchPlayersData: PlayersDataEntry | null = null;
  if (nextMatch) {
    const signups = (await db
      .prepare(`${MATCH_SIGNUPS_PLAYER_SQL} WHERE ms.match_id = ? ORDER BY u.first_name ASC, u.last_name ASC`)
      .all(nextMatch.id)) as SignupRow[];
    nextMatchPlayersData = buildPlayersData([nextMatch], signups)[nextMatch.id] ?? null;
  }

  let profilePhotoPath: string | null = null;
  let zawodnik = "";
  if (session) {
    profilePhotoPath = nav?.profilePhotoPath ?? null;
    zawodnik = nav?.zawodnik ?? session.zawodnik;
  }

  const youtubeLiveVideoId =
    loadAcademy && appSettings.home_youtube_url
      ? parseYoutubeVideoIdFromUserInput(appSettings.home_youtube_url)
      : null;

  const nextMatchForClient =
    nextMatch && nextMatchSignup === "confirmed"
      ? nextMatch
      : nextMatch
        ? { ...nextMatch, gate_pin: null }
        : null;

  const hotpayEnabled = isHotpayConfigured() && appSettings.hotpay_enabled;

  return {
    nextMatch: nextMatchForClient,
    nextMatchPlayersData,
    nextMatchTentativeLine,
    lineupPublicNextMatch,
    nextMatchSignup,
    transportHomeActive,
    hotpayEnabled,
    isLoggedIn: Boolean(session),
    isAdmin: session?.isAdmin ?? false,
    firstName: session?.firstName ?? "",
    lastName: session?.lastName ?? "",
    zawodnik,
    profilePhotoPath,
    youtubeLiveVideoId,
    showPzuCupTile: loadAcademy ? (options?.showPzuCupTile ?? false) : false,
    pageVariant,
    topRankedPlayers,
    featuredVenues,
  };
}
