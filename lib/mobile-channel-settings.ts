import type { MatchCancelReasonEntry } from "@/lib/app-settings";
import {
  DEFAULT_FACEBOOK_DAMIAN_URL,
  DEFAULT_FACEBOOK_MATEUSZ_URL,
  DEFAULT_PUBLIC_CONTACT_EMAIL,
  MATCH_BLIK_PHONE_DISPLAY,
  SITE_DESCRIPTION,
  SITE_NAME,
} from "@/lib/site";
import { MATCH_CANCEL_REASONS } from "@/lib/match-cancel-reasons";

/**
 * Ustawienia kanału „aplikacja” — te same pola biznesowe co strona,
 * przechowywane osobno w `mobile_settings_json` (panel admina: przełącznik Aplikacja).
 */
export type MobileChannelSettings = {
  match_notification_prompt_enabled: boolean;
  home_youtube_url: string | null;
  site_name: string;
  site_description: string;
  contact_email: string;
  blik_phone: string;
  organizer_damian_name: string;
  organizer_damian_phone: string;
  organizer_damian_email: string;
  organizer_mateusz_name: string;
  organizer_mateusz_phone: string;
  organizer_mateusz_email: string;
  facebook_damian_url: string;
  facebook_mateusz_url: string;
  allow_self_registration: boolean | null;
  default_match_max_slots: number;
  default_match_fee_pln: number | null;
  default_match_location: string;
  ranking_pt_goal: number;
  ranking_pt_assist: number;
  ranking_pt_km: number;
  ranking_pt_save: number;
  match_email_notifications_enabled: boolean;
  lineup_pitch_slots_min: number;
  lineup_pitch_slots_max: number;
  match_cancel_reasons: MatchCancelReasonEntry[];
  /** Czy pokazywać kafelek / pozycję PZU Cup w menu aplikacji. */
  show_pzu_cup: boolean;
  /** Komunikat na ekranie logowania aplikacji (opcjonalny). */
  login_banner: string;
  /**
   * Tryb UI aplikacji Android:
   * - `native` — wszystkie ekrany Compose
   * - `webview` — cała aplikacja w WebView (strona WWW)
   */
  android_ui_mode: "native" | "webview";
};

export const MOBILE_CHANNEL_SETTINGS_DEFAULTS: MobileChannelSettings = {
  match_notification_prompt_enabled: false,
  home_youtube_url: null,
  site_name: SITE_NAME,
  site_description: SITE_DESCRIPTION,
  contact_email: DEFAULT_PUBLIC_CONTACT_EMAIL,
  blik_phone: MATCH_BLIK_PHONE_DISPLAY,
  organizer_damian_name: "Damian Chmielewski",
  organizer_damian_phone: MATCH_BLIK_PHONE_DISPLAY,
  organizer_damian_email: DEFAULT_PUBLIC_CONTACT_EMAIL,
  organizer_mateusz_name: "Mateusz Wierzbicki",
  organizer_mateusz_phone: "797 233 615",
  organizer_mateusz_email: "mateusz.wierzbicki@opoczta.pl",
  facebook_damian_url: DEFAULT_FACEBOOK_DAMIAN_URL,
  facebook_mateusz_url: DEFAULT_FACEBOOK_MATEUSZ_URL,
  allow_self_registration: true,
  default_match_max_slots: 14,
  default_match_fee_pln: null,
  default_match_location: "",
  ranking_pt_goal: 5,
  ranking_pt_assist: 2,
  ranking_pt_km: 0.5,
  ranking_pt_save: 2,
  match_email_notifications_enabled: true,
  lineup_pitch_slots_min: 12,
  lineup_pitch_slots_max: 16,
  match_cancel_reasons: [...MATCH_CANCEL_REASONS],
  show_pzu_cup: true,
  login_banner: "",
  android_ui_mode: "native",
};

/** Snapshot ustawień strony → startowa konfiguracja aplikacji. */
export function mobileSettingsFromWeb(web: {
  match_notification_prompt_enabled: boolean;
  home_youtube_url: string | null;
  site_name: string;
  site_description: string;
  contact_email: string;
  blik_phone: string;
  organizer_damian_name: string;
  organizer_damian_phone: string;
  organizer_damian_email: string;
  organizer_mateusz_name: string;
  organizer_mateusz_phone: string;
  organizer_mateusz_email: string;
  facebook_damian_url: string;
  facebook_mateusz_url: string;
  allow_self_registration: boolean | null;
  default_match_max_slots: number;
  default_match_fee_pln: number | null;
  default_match_location: string;
  ranking_pt_goal: number;
  ranking_pt_assist: number;
  ranking_pt_km: number;
  ranking_pt_save: number;
  match_email_notifications_enabled: boolean;
  lineup_pitch_slots_min: number;
  lineup_pitch_slots_max: number;
  match_cancel_reasons: MatchCancelReasonEntry[];
}): MobileChannelSettings {
  return {
    match_notification_prompt_enabled: web.match_notification_prompt_enabled,
    home_youtube_url: web.home_youtube_url,
    site_name: web.site_name,
    site_description: web.site_description,
    contact_email: web.contact_email,
    blik_phone: web.blik_phone,
    organizer_damian_name: web.organizer_damian_name,
    organizer_damian_phone: web.organizer_damian_phone,
    organizer_damian_email: web.organizer_damian_email,
    organizer_mateusz_name: web.organizer_mateusz_name,
    organizer_mateusz_phone: web.organizer_mateusz_phone,
    organizer_mateusz_email: web.organizer_mateusz_email,
    facebook_damian_url: web.facebook_damian_url,
    facebook_mateusz_url: web.facebook_mateusz_url,
    allow_self_registration: web.allow_self_registration,
    default_match_max_slots: web.default_match_max_slots,
    default_match_fee_pln: web.default_match_fee_pln,
    default_match_location: web.default_match_location,
    ranking_pt_goal: web.ranking_pt_goal,
    ranking_pt_assist: web.ranking_pt_assist,
    ranking_pt_km: web.ranking_pt_km,
    ranking_pt_save: web.ranking_pt_save,
    match_email_notifications_enabled: web.match_email_notifications_enabled,
    lineup_pitch_slots_min: web.lineup_pitch_slots_min,
    lineup_pitch_slots_max: web.lineup_pitch_slots_max,
    match_cancel_reasons: web.match_cancel_reasons.map((r) => ({ ...r })),
    show_pzu_cup: true,
    login_banner: "",
    android_ui_mode: "native",
  };
}

function parseCancelReasons(raw: unknown): MatchCancelReasonEntry[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return [...MOBILE_CHANNEL_SETTINGS_DEFAULTS.match_cancel_reasons];
  }
  const out: MatchCancelReasonEntry[] = [];
  for (const item of raw) {
    if (
      item &&
      typeof item === "object" &&
      typeof (item as MatchCancelReasonEntry).value === "string" &&
      typeof (item as MatchCancelReasonEntry).label === "string"
    ) {
      const value = (item as MatchCancelReasonEntry).value.trim();
      const label = (item as MatchCancelReasonEntry).label.trim();
      if (value && label) out.push({ value, label });
    }
  }
  return out.length > 0 ? out : [...MOBILE_CHANNEL_SETTINGS_DEFAULTS.match_cancel_reasons];
}

export function parseMobileSettingsJson(
  raw: string | null | undefined,
  webFallback?: MobileChannelSettings
): MobileChannelSettings {
  const base = webFallback ? { ...webFallback } : { ...MOBILE_CHANNEL_SETTINGS_DEFAULTS };
  if (!raw?.trim()) return base;
  try {
    const parsed = JSON.parse(raw) as Partial<MobileChannelSettings>;
    if (!parsed || typeof parsed !== "object") return base;
    return {
      match_notification_prompt_enabled:
        typeof parsed.match_notification_prompt_enabled === "boolean"
          ? parsed.match_notification_prompt_enabled
          : base.match_notification_prompt_enabled,
      home_youtube_url:
        parsed.home_youtube_url === null
          ? null
          : typeof parsed.home_youtube_url === "string"
            ? parsed.home_youtube_url.trim() || null
            : base.home_youtube_url,
      site_name:
        typeof parsed.site_name === "string" && parsed.site_name.trim()
          ? parsed.site_name.trim()
          : base.site_name,
      site_description:
        typeof parsed.site_description === "string" ? parsed.site_description.trim() : base.site_description,
      contact_email:
        typeof parsed.contact_email === "string" && parsed.contact_email.trim()
          ? parsed.contact_email.trim()
          : base.contact_email,
      blik_phone:
        typeof parsed.blik_phone === "string" && parsed.blik_phone.trim()
          ? parsed.blik_phone.trim()
          : base.blik_phone,
      organizer_damian_name:
        typeof parsed.organizer_damian_name === "string" && parsed.organizer_damian_name.trim()
          ? parsed.organizer_damian_name.trim()
          : base.organizer_damian_name,
      organizer_damian_phone:
        typeof parsed.organizer_damian_phone === "string"
          ? parsed.organizer_damian_phone.trim()
          : base.organizer_damian_phone,
      organizer_damian_email:
        typeof parsed.organizer_damian_email === "string" && parsed.organizer_damian_email.trim()
          ? parsed.organizer_damian_email.trim()
          : base.organizer_damian_email,
      organizer_mateusz_name:
        typeof parsed.organizer_mateusz_name === "string" && parsed.organizer_mateusz_name.trim()
          ? parsed.organizer_mateusz_name.trim()
          : base.organizer_mateusz_name,
      organizer_mateusz_phone:
        typeof parsed.organizer_mateusz_phone === "string"
          ? parsed.organizer_mateusz_phone.trim()
          : base.organizer_mateusz_phone,
      organizer_mateusz_email:
        typeof parsed.organizer_mateusz_email === "string" && parsed.organizer_mateusz_email.trim()
          ? parsed.organizer_mateusz_email.trim()
          : base.organizer_mateusz_email,
      facebook_damian_url:
        typeof parsed.facebook_damian_url === "string" && parsed.facebook_damian_url.trim()
          ? parsed.facebook_damian_url.trim()
          : base.facebook_damian_url,
      facebook_mateusz_url:
        typeof parsed.facebook_mateusz_url === "string" && parsed.facebook_mateusz_url.trim()
          ? parsed.facebook_mateusz_url.trim()
          : base.facebook_mateusz_url,
      allow_self_registration:
        parsed.allow_self_registration === null || typeof parsed.allow_self_registration === "boolean"
          ? parsed.allow_self_registration
          : base.allow_self_registration,
      default_match_max_slots:
        typeof parsed.default_match_max_slots === "number" && parsed.default_match_max_slots >= 1
          ? parsed.default_match_max_slots
          : base.default_match_max_slots,
      default_match_fee_pln:
        parsed.default_match_fee_pln === null
          ? null
          : typeof parsed.default_match_fee_pln === "number"
            ? parsed.default_match_fee_pln
            : base.default_match_fee_pln,
      default_match_location:
        typeof parsed.default_match_location === "string"
          ? parsed.default_match_location.trim()
          : base.default_match_location,
      ranking_pt_goal:
        typeof parsed.ranking_pt_goal === "number" ? parsed.ranking_pt_goal : base.ranking_pt_goal,
      ranking_pt_assist:
        typeof parsed.ranking_pt_assist === "number" ? parsed.ranking_pt_assist : base.ranking_pt_assist,
      ranking_pt_km: typeof parsed.ranking_pt_km === "number" ? parsed.ranking_pt_km : base.ranking_pt_km,
      ranking_pt_save:
        typeof parsed.ranking_pt_save === "number" ? parsed.ranking_pt_save : base.ranking_pt_save,
      match_email_notifications_enabled:
        typeof parsed.match_email_notifications_enabled === "boolean"
          ? parsed.match_email_notifications_enabled
          : base.match_email_notifications_enabled,
      lineup_pitch_slots_min:
        typeof parsed.lineup_pitch_slots_min === "number"
          ? parsed.lineup_pitch_slots_min
          : base.lineup_pitch_slots_min,
      lineup_pitch_slots_max:
        typeof parsed.lineup_pitch_slots_max === "number"
          ? parsed.lineup_pitch_slots_max
          : base.lineup_pitch_slots_max,
      match_cancel_reasons: parseCancelReasons(parsed.match_cancel_reasons),
      show_pzu_cup: typeof parsed.show_pzu_cup === "boolean" ? parsed.show_pzu_cup : base.show_pzu_cup,
      login_banner: typeof parsed.login_banner === "string" ? parsed.login_banner.trim().slice(0, 300) : base.login_banner,
      android_ui_mode:
        parsed.android_ui_mode === "webview" || parsed.android_ui_mode === "native"
          ? parsed.android_ui_mode
          : base.android_ui_mode,
    };
  } catch {
    return base;
  }
}

export function serializeMobileSettings(settings: MobileChannelSettings): string {
  return JSON.stringify(settings);
}

export type ClientChannel = "web" | "mobile";

export function parseClientChannel(raw: string | null | undefined): ClientChannel {
  return raw === "mobile" ? "mobile" : "web";
}
