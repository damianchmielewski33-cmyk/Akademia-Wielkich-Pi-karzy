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
    app_settings: {
      match_notification_prompt_enabled: settings.match_notification_prompt_enabled,
      home_youtube_url: settings.home_youtube_url,
      site_name: settings.site_name,
      site_description: settings.site_description,
      contact_email: settings.contact_email,
      blik_phone: settings.blik_phone,
      organizer_damian_name: settings.organizer_damian_name,
      organizer_damian_phone: settings.organizer_damian_phone,
      organizer_damian_email: settings.organizer_damian_email,
      organizer_mateusz_name: settings.organizer_mateusz_name,
      organizer_mateusz_phone: settings.organizer_mateusz_phone,
      organizer_mateusz_email: settings.organizer_mateusz_email,
      facebook_damian_url: settings.facebook_damian_url,
      facebook_mateusz_url: settings.facebook_mateusz_url,
      allow_self_registration: settings.allow_self_registration,
      default_match_max_slots: settings.default_match_max_slots,
      default_match_fee_pln: settings.default_match_fee_pln,
      default_match_location: settings.default_match_location,
      ranking_pt_goal: settings.ranking_pt_goal,
      ranking_pt_assist: settings.ranking_pt_assist,
      ranking_pt_km: settings.ranking_pt_km,
      ranking_pt_save: settings.ranking_pt_save,
      match_email_notifications_enabled: settings.match_email_notifications_enabled,
      lineup_pitch_slots_min: settings.lineup_pitch_slots_min,
      lineup_pitch_slots_max: settings.lineup_pitch_slots_max,
      match_cancel_reasons: settings.match_cancel_reasons,
    },
    site_assets: settings.site_assets,
    web_screen_blocks: settings.screen_blocks,
    screen_blocks: settings.screen_blocks_mobile,
    blocked,
    is_admin: isAdmin ? 1 : 0,
  });
}
