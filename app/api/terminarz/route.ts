import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { getApiRealm } from "@/lib/request-realm";
import { getTerminarzPageData } from "@/lib/realm-page-data";
import { screenBlockApiResponse } from "@/lib/screen-block-api";

export const runtime = "nodejs";

/** Lista terminarza dla klientów mobile (JSON zamiast SSR). */
export async function GET(req: Request) {
  const blocked = await screenBlockApiResponse(req);
  if (blocked) return blocked;

  const session = await getServerSession();
  const realm = getApiRealm(req);
  const data = await getTerminarzPageData(realm, session);

  return NextResponse.json({
    upcoming: data.upcoming,
    playedConfirmed: data.playedConfirmed,
    matches: data.matches,
    playersData: data.playersData,
    userSignupKind: data.userSignupKind,
    playedMissingStatsMatchIds: data.playedMissingStatsMatchIds,
    isLoggedIn: Boolean(session),
    isAdmin: session?.isAdmin ?? false,
    matchDefaults: {
      maxSlots: data.appSettings.default_match_max_slots,
      location: data.appSettings.default_match_location,
      feePln: data.appSettings.default_match_fee_pln,
    },
  });
}
