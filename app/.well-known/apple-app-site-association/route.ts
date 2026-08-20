import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Apple App Site Association — Universal Links (natywna aplikacja iOS).
 * PWA „Dodaj do ekranu początkowego” nie przejmuje linków z Safari — do tego
 * potrzebna jest natywna aplikacja z Associated Domains.
 *
 * Env (opcjonalnie):
 *   IOS_APP_TEAM_ID=ABCDE12345
 *   IOS_APP_BUNDLE_ID=pl.akademiawielkichpilkarzy.app
 */
export async function GET() {
  const teamId = process.env.IOS_APP_TEAM_ID?.trim();
  const bundleId = process.env.IOS_APP_BUNDLE_ID?.trim() || "pl.akademiawielkichpilkarzy.app";

  const appID = teamId ? `${teamId}.${bundleId}` : null;

  const body = {
    applinks: {
      apps: [],
      details: appID
        ? [
            {
              appID,
              paths: [
                "/zaproszenie/*",
                "/platnosci",
                "/platnosci/*",
                "/platnosci-public/*",
                "/terminarz",
                "/terminarz/*",
              ],
            },
          ]
        : [],
    },
    webcredentials: appID
      ? {
          apps: [appID],
        }
      : undefined,
  };

  return new NextResponse(JSON.stringify(body), {
    status: 200,
    headers: {
      // Apple wymaga application/json (bez charset bywa bezpieczniej)
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=300",
    },
  });
}
