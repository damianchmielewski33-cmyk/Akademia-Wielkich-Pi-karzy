import { getAccountNavFields } from "@/lib/account-server";
import type { AppSession } from "@/lib/auth";
import { getDb, type MatchRow } from "@/lib/db";
import { getAppSettings } from "@/lib/app-settings";
import { REALMS } from "@/lib/realm";
import { formatPonderingPlayersPolish } from "@/lib/terminarz-shared";
import { parseYoutubeVideoIdFromUserInput } from "@/lib/site";
import { isLocalMatchDay } from "@/lib/transport";

export type PzuCupHomeClientProps = {
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
  siteName: string;
  siteDescription: string;
};

export async function getPzuCupHomeClientProps(session: AppSession | null): Promise<PzuCupHomeClientProps> {
  const db = await getDb();
  const settings = await getAppSettings(db, REALMS.PZU_CUP);

  const nextMatch = (await db
    .prepare(
      `SELECT * FROM matches
       WHERE realm = ? AND played = 0 AND COALESCE(cancelled, 0) = 0
         AND datetime(match_date || ' ' || match_time) > datetime('now', 'localtime')
       ORDER BY match_date, match_time LIMIT 1`
    )
    .get(REALMS.PZU_CUP)) as MatchRow | undefined;

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

  const youtubeLiveVideoId = settings.home_youtube_url
    ? parseYoutubeVideoIdFromUserInput(settings.home_youtube_url)
    : null;

  const nextMatchForClient =
    nextMatch && nextMatchSignup === "confirmed"
      ? nextMatch
      : nextMatch
        ? { ...nextMatch, gate_pin: null }
        : null;

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
    siteName: settings.site_name,
    siteDescription: settings.site_description,
  };
}
