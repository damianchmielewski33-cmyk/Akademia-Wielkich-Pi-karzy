import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/api-helpers";
import {
  APP_SETTINGS_DEFAULTS,
  getAppSettings,
  saveAppSettings,
  type AppSettings,
  type MatchCancelReasonEntry,
} from "@/lib/app-settings";
import { getDb } from "@/lib/db";
import { isMailConfigured } from "@/lib/mail";
import { parseYoutubeVideoIdFromUserInput } from "@/lib/site";
import { parseRealm, REALMS } from "@/lib/realm";
import { BLOCKABLE_SCREENS } from "@/lib/screen-blocks";

export const runtime = "nodejs";

const MAX_YT_URL_LEN = 2048;
const MAX_TEXT_LEN = 500;
const MAX_URL_LEN = 2048;

const cancelReasonSchema = z.object({
  value: z.string().trim().min(1).max(64),
  label: z.string().trim().min(1).max(120),
});

const screenBlockEntrySchema = z.object({
  disabled: z.boolean(),
  message: z.string().max(500),
  active_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  active_until: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

const putBodySchema = z
  .object({
    match_notification_prompt_enabled: z.boolean().optional(),
    home_youtube_url: z.string().max(MAX_YT_URL_LEN).optional(),
    site_name: z.string().trim().min(1).max(120).optional(),
    site_description: z.string().trim().max(500).optional(),
    contact_email: z.string().trim().email().max(200).optional(),
    blik_phone: z.string().trim().min(7).max(30).optional(),
    organizer_damian_name: z.string().trim().min(1).max(120).optional(),
    organizer_damian_phone: z.string().trim().max(30).optional(),
    organizer_damian_email: z.string().trim().email().max(200).optional(),
    organizer_mateusz_name: z.string().trim().min(1).max(120).optional(),
    organizer_mateusz_phone: z.string().trim().max(30).optional(),
    organizer_mateusz_email: z.string().trim().email().max(200).optional(),
    facebook_damian_url: z.string().trim().max(MAX_URL_LEN).optional(),
    facebook_mateusz_url: z.string().trim().max(MAX_URL_LEN).optional(),
    allow_self_registration: z.union([z.boolean(), z.null()]).optional(),
    default_match_max_slots: z.number().int().min(1).max(99).optional(),
    default_match_fee_pln: z.union([z.number().nonnegative().max(9999), z.null()]).optional(),
    default_match_location: z.string().trim().max(MAX_TEXT_LEN).optional(),
    ranking_pt_goal: z.number().min(0).max(100).optional(),
    ranking_pt_assist: z.number().min(0).max(100).optional(),
    ranking_pt_km: z.number().min(0).max(100).optional(),
    ranking_pt_save: z.number().min(0).max(100).optional(),
    match_email_notifications_enabled: z.boolean().optional(),
    lineup_pitch_slots_min: z.number().int().min(1).max(32).optional(),
    lineup_pitch_slots_max: z.number().int().min(1).max(32).optional(),
    match_cancel_reasons: z.array(cancelReasonSchema).min(1).max(20).optional(),
    screen_blocks: z.record(z.string(), screenBlockEntrySchema).optional(),
  })
  .strict();

export type AppSettingsApiResponse = AppSettings & {
  system: {
    smtp_configured: boolean;
    self_registration_env_override: boolean;
    is_production: boolean;
  };
};

function toApiResponse(settings: AppSettings): AppSettingsApiResponse {
  return {
    ...settings,
    system: {
      smtp_configured: isMailConfigured(),
      self_registration_env_override: process.env.ALLOW_SELF_REGISTRATION === "1",
      is_production: process.env.NODE_ENV === "production",
    },
  };
}

export async function GET(req: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;
  const url = new URL(req.url);
  const realm = parseRealm(url.searchParams.get("realm"), REALMS.ACADEMY);
  const db = await getDb();
  const settings = await getAppSettings(db, realm);
  return NextResponse.json(toApiResponse(settings));
}

function parseYoutubeUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (trimmed.length === 0) return null;
  if (trimmed.length > MAX_YT_URL_LEN) return null;
  const id = parseYoutubeVideoIdFromUserInput(trimmed);
  if (!id) return null;
  return trimmed;
}

function validateFacebookUrl(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  if (t.length > MAX_URL_LEN) return null;
  try {
    const u = new URL(t.startsWith("http") ? t : `https://${t}`);
    if (!["http:", "https:"].includes(u.protocol)) return null;
    return u.toString();
  } catch {
    return null;
  }
}

export async function PUT(req: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Nieprawidłowy JSON" }, { status: 400 });
  }

  const parsed = putBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const body = parsed.data;

  const db = await getDb();
  const url = new URL(req.url);
  const realm = parseRealm(url.searchParams.get("realm"), REALMS.ACADEMY);
  const current = await getAppSettings(db, realm);
  const next: AppSettings = { ...current };

  if (body.match_notification_prompt_enabled !== undefined) {
    next.match_notification_prompt_enabled = body.match_notification_prompt_enabled;
  }

  if (body.home_youtube_url !== undefined) {
    const yt = parseYoutubeUrl(body.home_youtube_url);
    if (body.home_youtube_url.trim().length > 0 && !yt) {
      return NextResponse.json(
        { error: "Nie rozpoznano prawidłowego linku YouTube ani ID filmu (11 znaków)" },
        { status: 400 }
      );
    }
    next.home_youtube_url = yt;
  }

  if (body.site_name !== undefined) next.site_name = body.site_name;
  if (body.site_description !== undefined) next.site_description = body.site_description;
  if (body.contact_email !== undefined) next.contact_email = body.contact_email;
  if (body.blik_phone !== undefined) next.blik_phone = body.blik_phone;
  if (body.organizer_damian_name !== undefined) next.organizer_damian_name = body.organizer_damian_name;
  if (body.organizer_damian_phone !== undefined) next.organizer_damian_phone = body.organizer_damian_phone;
  if (body.organizer_damian_email !== undefined) next.organizer_damian_email = body.organizer_damian_email;
  if (body.organizer_mateusz_name !== undefined) next.organizer_mateusz_name = body.organizer_mateusz_name;
  if (body.organizer_mateusz_phone !== undefined) next.organizer_mateusz_phone = body.organizer_mateusz_phone;
  if (body.organizer_mateusz_email !== undefined) next.organizer_mateusz_email = body.organizer_mateusz_email;

  if (body.facebook_damian_url !== undefined) {
    const url = validateFacebookUrl(body.facebook_damian_url);
    if (body.facebook_damian_url.trim() && !url) {
      return NextResponse.json({ error: "Nieprawidłowy adres Facebook (Damian)" }, { status: 400 });
    }
    next.facebook_damian_url = url ?? APP_SETTINGS_DEFAULTS.facebook_damian_url;
  }
  if (body.facebook_mateusz_url !== undefined) {
    const url = validateFacebookUrl(body.facebook_mateusz_url);
    if (body.facebook_mateusz_url.trim() && !url) {
      return NextResponse.json({ error: "Nieprawidłowy adres Facebook (Mateusz)" }, { status: 400 });
    }
    next.facebook_mateusz_url = url ?? APP_SETTINGS_DEFAULTS.facebook_mateusz_url;
  }

  if (body.allow_self_registration !== undefined) {
    next.allow_self_registration = body.allow_self_registration;
  }

  if (body.default_match_max_slots !== undefined) {
    next.default_match_max_slots = body.default_match_max_slots;
  }
  if (body.default_match_fee_pln !== undefined) {
    next.default_match_fee_pln = body.default_match_fee_pln;
  }
  if (body.default_match_location !== undefined) {
    next.default_match_location = body.default_match_location;
  }

  if (body.ranking_pt_goal !== undefined) next.ranking_pt_goal = body.ranking_pt_goal;
  if (body.ranking_pt_assist !== undefined) next.ranking_pt_assist = body.ranking_pt_assist;
  if (body.ranking_pt_km !== undefined) next.ranking_pt_km = body.ranking_pt_km;
  if (body.ranking_pt_save !== undefined) next.ranking_pt_save = body.ranking_pt_save;

  if (body.match_email_notifications_enabled !== undefined) {
    next.match_email_notifications_enabled = body.match_email_notifications_enabled;
  }

  if (body.lineup_pitch_slots_min !== undefined) next.lineup_pitch_slots_min = body.lineup_pitch_slots_min;
  if (body.lineup_pitch_slots_max !== undefined) next.lineup_pitch_slots_max = body.lineup_pitch_slots_max;

  if (next.lineup_pitch_slots_min > next.lineup_pitch_slots_max) {
    return NextResponse.json(
      { error: "Minimalna liczba pól składu nie może być większa od maksymalnej" },
      { status: 400 }
    );
  }

  if (body.match_cancel_reasons !== undefined) {
    const seen = new Set<string>();
    const cleaned: MatchCancelReasonEntry[] = [];
    for (const r of body.match_cancel_reasons) {
      if (seen.has(r.value)) continue;
      seen.add(r.value);
      cleaned.push({ value: r.value, label: r.label });
    }
    if (cleaned.length === 0) {
      return NextResponse.json({ error: "Wymagany co najmniej jeden powód anulowania" }, { status: 400 });
    }
    next.match_cancel_reasons = cleaned;
  }

  if (body.screen_blocks !== undefined) {
    const merged = { ...current.screen_blocks };
    for (const screen of BLOCKABLE_SCREENS) {
      const entry = body.screen_blocks[screen.key];
      if (!entry) {
        merged[screen.key] = { disabled: false, message: "" };
        continue;
      }
      merged[screen.key] = {
        disabled: entry.disabled,
        message: entry.message.trim().slice(0, 500),
        ...(entry.active_from ? { active_from: entry.active_from } : {}),
        ...(entry.active_until ? { active_until: entry.active_until } : {}),
      };
    }
    next.screen_blocks = merged;
  }

  await saveAppSettings(db, realm, next);

  return NextResponse.json(toApiResponse(next));
}
