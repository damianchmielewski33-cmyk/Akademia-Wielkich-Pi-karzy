import { NextResponse } from "next/server";
import { getAppSettings } from "@/lib/app-settings";
import { getDb } from "@/lib/db";
import { REALMS } from "@/lib/realm";
import { checkRateLimitDistributed } from "@/lib/rate-limit-db";
import { rateLimitKey, rateLimitedResponse, RATE } from "@/lib/rate-limit";
import {
  isMobileScreenDisabledForUser,
  mobileScreenBlockMessage,
  type BlockableMobileScreenKey,
} from "@/lib/screen-blocks-mobile";
import { getServerSession } from "@/lib/auth";

export const runtime = "nodejs";

/**
 * Publiczny config aplikacji Android — ustawienia kanału „mobile” + aktywne zaślepki.
 */
export async function GET(req: Request) {
  const rl = await checkRateLimitDistributed(
    rateLimitKey("mobileConfig", req),
    RATE.mobileConfig.limit,
    RATE.mobileConfig.windowMs
  );
  if (!rl.ok) return rateLimitedResponse(rl.retryAfterSec);

  const db = await getDb();
  const settings = await getAppSettings(db, REALMS.ACADEMY);
  const session = await getServerSession();
  const isAdmin = session?.isAdmin ?? false;

  const blocked: Partial<Record<BlockableMobileScreenKey, { message: string }>> = {};
  for (const key of Object.keys(settings.screen_blocks_mobile)) {
    const k = key as BlockableMobileScreenKey;
    if (isMobileScreenDisabledForUser(settings.screen_blocks_mobile, k, isAdmin)) {
      blocked[k] = { message: mobileScreenBlockMessage(settings.screen_blocks_mobile, k) };
    }
  }

  return NextResponse.json({
    ok: true,
    channel: "mobile" as const,
    settings: settings.mobile_settings,
    screen_blocks: settings.screen_blocks_mobile,
    blocked,
    is_admin: isAdmin ? 1 : 0,
  });
}
