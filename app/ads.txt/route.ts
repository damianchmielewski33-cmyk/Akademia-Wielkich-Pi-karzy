import { NextResponse } from "next/server";
import { buildAdsTxtBody, resolveAdsenseClientId } from "@/lib/adsense";
import { getAppSettings } from "@/lib/app-settings";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const db = await getDb();
  const settings = await getAppSettings(db);
  const clientId = resolveAdsenseClientId(settings.adsense_client_id);

  if (!clientId || !settings.adsense_enabled) {
    return new NextResponse("# ads.txt — AdSense nieaktywne (włącz w panelu admina)\n", {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "public, max-age=300",
      },
    });
  }

  return new NextResponse(buildAdsTxtBody(clientId), {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
