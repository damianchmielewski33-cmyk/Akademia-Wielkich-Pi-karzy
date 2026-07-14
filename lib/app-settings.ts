import {
  DEFAULT_FACEBOOK_DAMIAN_URL,
  DEFAULT_FACEBOOK_MATEUSZ_URL,
  DEFAULT_PUBLIC_CONTACT_EMAIL,
  MATCH_BLIK_PHONE_COPY,
  MATCH_BLIK_PHONE_DISPLAY,
  SITE_DESCRIPTION,
  SITE_NAME,
} from "@/lib/site";
import { MATCH_CANCEL_REASONS } from "@/lib/match-cancel-reasons";
import {
  resolveSiteAssets,
  type ResolvedSiteAssets,
  type SiteAssetKey,
  type SiteAssetUrls,
} from "@/lib/site-assets";

export type MatchCancelReasonEntry = { value: string; label: string };

export type AppSettings = {
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
  /** null = logika env/dev; true/false = jawne wymuszenie */
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
  /** Niestandardowe URL grafik — null = domyślny plik z `public/`. */
  asset_logo_header_url: string | null;
  asset_logo_crest_url: string | null;
  asset_logo_favicon_url: string | null;
  asset_bg_soccer_ball_url: string | null;
  asset_bg_stadium_url: string | null;
  asset_bg_pitch_lines_url: string | null;
  /** Rozwiązane URL (z fallbackiem do domyślnych). */
  site_assets: ResolvedSiteAssets;
};

export const APP_SETTINGS_DEFAULTS: AppSettings = {
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
  allow_self_registration: null,
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
  asset_logo_header_url: null,
  asset_logo_crest_url: null,
  asset_logo_favicon_url: null,
  asset_bg_soccer_ball_url: null,
  asset_bg_stadium_url: null,
  asset_bg_pitch_lines_url: null,
  site_assets: resolveSiteAssets({
    logo_header: null,
    logo_crest: null,
    logo_favicon: null,
    bg_soccer_ball: null,
    bg_stadium: null,
    bg_pitch_lines: null,
  }),
};

type DbLike = {
  prepare: (sql: string) => {
    get: (...args: unknown[]) => Promise<unknown> | unknown;
  };
};

type AppSettingsRow = {
  match_notification_prompt_enabled?: number | null;
  home_youtube_url?: string | null;
  site_name?: string | null;
  site_description?: string | null;
  contact_email?: string | null;
  blik_phone?: string | null;
  organizer_damian_name?: string | null;
  organizer_damian_phone?: string | null;
  organizer_damian_email?: string | null;
  organizer_mateusz_name?: string | null;
  organizer_mateusz_phone?: string | null;
  organizer_mateusz_email?: string | null;
  facebook_damian_url?: string | null;
  facebook_mateusz_url?: string | null;
  allow_self_registration?: number | null;
  default_match_max_slots?: number | null;
  default_match_fee_pln?: number | null;
  default_match_location?: string | null;
  ranking_pt_goal?: number | null;
  ranking_pt_assist?: number | null;
  ranking_pt_km?: number | null;
  ranking_pt_save?: number | null;
  match_email_notifications_enabled?: number | null;
  lineup_pitch_slots_min?: number | null;
  lineup_pitch_slots_max?: number | null;
  match_cancel_reasons_json?: string | null;
  asset_logo_header_url?: string | null;
  asset_logo_crest_url?: string | null;
  asset_logo_favicon_url?: string | null;
  asset_bg_soccer_ball_url?: string | null;
  asset_bg_stadium_url?: string | null;
  asset_bg_pitch_lines_url?: string | null;
};

const APP_SETTINGS_SELECT = `
  SELECT
    match_notification_prompt_enabled,
    home_youtube_url,
    site_name,
    site_description,
    contact_email,
    blik_phone,
    organizer_damian_name,
    organizer_damian_phone,
    organizer_damian_email,
    organizer_mateusz_name,
    organizer_mateusz_phone,
    organizer_mateusz_email,
    facebook_damian_url,
    facebook_mateusz_url,
    allow_self_registration,
    default_match_max_slots,
    default_match_fee_pln,
    default_match_location,
    ranking_pt_goal,
    ranking_pt_assist,
    ranking_pt_km,
    ranking_pt_save,
    match_email_notifications_enabled,
    lineup_pitch_slots_min,
    lineup_pitch_slots_max,
    match_cancel_reasons_json,
    asset_logo_header_url,
    asset_logo_crest_url,
    asset_logo_favicon_url,
    asset_bg_soccer_ball_url,
    asset_bg_stadium_url,
    asset_bg_pitch_lines_url
  FROM app_settings WHERE id = 1
`;

function nonEmptyString(v: string | null | undefined, fallback: string): string {
  const t = v?.trim();
  return t ? t : fallback;
}

function parseCancelReasonsJson(raw: string | null | undefined): MatchCancelReasonEntry[] {
  if (!raw?.trim()) return APP_SETTINGS_DEFAULTS.match_cancel_reasons;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed) || parsed.length === 0) return APP_SETTINGS_DEFAULTS.match_cancel_reasons;
    const out: MatchCancelReasonEntry[] = [];
    for (const item of parsed) {
      if (
        item &&
        typeof item === "object" &&
        typeof (item as MatchCancelReasonEntry).value === "string" &&
        typeof (item as MatchCancelReasonEntry).label === "string"
      ) {
        const e = item as MatchCancelReasonEntry;
        const value = e.value.trim();
        const label = e.label.trim();
        if (value && label) out.push({ value, label });
      }
    }
    return out.length > 0 ? out : APP_SETTINGS_DEFAULTS.match_cancel_reasons;
  } catch {
    return APP_SETTINGS_DEFAULTS.match_cancel_reasons;
  }
}

export function serializeMatchCancelReasons(reasons: MatchCancelReasonEntry[]): string {
  return JSON.stringify(reasons);
}

function nullableAssetUrl(v: string | null | undefined): string | null {
  const t = v?.trim();
  return t ? t : null;
}

function siteAssetUrlsFromRow(row: AppSettingsRow | null | undefined): SiteAssetUrls {
  return {
    logo_header: nullableAssetUrl(row?.asset_logo_header_url),
    logo_crest: nullableAssetUrl(row?.asset_logo_crest_url),
    logo_favicon: nullableAssetUrl(row?.asset_logo_favicon_url),
    bg_soccer_ball: nullableAssetUrl(row?.asset_bg_soccer_ball_url),
    bg_stadium: nullableAssetUrl(row?.asset_bg_stadium_url),
    bg_pitch_lines: nullableAssetUrl(row?.asset_bg_pitch_lines_url),
  };
}

export function appSettingsSiteAssetUrl(settings: AppSettings, key: SiteAssetKey): string {
  return settings.site_assets[key];
}

export function resolveAppSettings(row: AppSettingsRow | null | undefined): AppSettings {
  const d = APP_SETTINGS_DEFAULTS;
  const allowRaw = row?.allow_self_registration;
  const assetUrls = siteAssetUrlsFromRow(row);
  return {
    match_notification_prompt_enabled: (row?.match_notification_prompt_enabled ?? 0) === 1,
    home_youtube_url: row?.home_youtube_url?.trim() || null,
    site_name: nonEmptyString(row?.site_name, d.site_name),
    site_description: nonEmptyString(row?.site_description, d.site_description),
    contact_email: nonEmptyString(row?.contact_email, d.contact_email),
    blik_phone: nonEmptyString(row?.blik_phone, d.blik_phone),
    organizer_damian_name: nonEmptyString(row?.organizer_damian_name, d.organizer_damian_name),
    organizer_damian_phone: nonEmptyString(row?.organizer_damian_phone, d.organizer_damian_phone),
    organizer_damian_email: nonEmptyString(row?.organizer_damian_email, d.organizer_damian_email),
    organizer_mateusz_name: nonEmptyString(row?.organizer_mateusz_name, d.organizer_mateusz_name),
    organizer_mateusz_phone: nonEmptyString(row?.organizer_mateusz_phone, d.organizer_mateusz_phone),
    organizer_mateusz_email: nonEmptyString(row?.organizer_mateusz_email, d.organizer_mateusz_email),
    facebook_damian_url: nonEmptyString(row?.facebook_damian_url, d.facebook_damian_url),
    facebook_mateusz_url: nonEmptyString(row?.facebook_mateusz_url, d.facebook_mateusz_url),
    allow_self_registration:
      allowRaw === null || allowRaw === undefined ? null : allowRaw === 1,
    default_match_max_slots:
      typeof row?.default_match_max_slots === "number" && row.default_match_max_slots >= 1
        ? row.default_match_max_slots
        : d.default_match_max_slots,
    default_match_fee_pln:
      typeof row?.default_match_fee_pln === "number" && Number.isFinite(row.default_match_fee_pln)
        ? row.default_match_fee_pln
        : null,
    default_match_location: row?.default_match_location?.trim() ?? d.default_match_location,
    ranking_pt_goal:
      typeof row?.ranking_pt_goal === "number" && row.ranking_pt_goal >= 0
        ? row.ranking_pt_goal
        : d.ranking_pt_goal,
    ranking_pt_assist:
      typeof row?.ranking_pt_assist === "number" && row.ranking_pt_assist >= 0
        ? row.ranking_pt_assist
        : d.ranking_pt_assist,
    ranking_pt_km:
      typeof row?.ranking_pt_km === "number" && row.ranking_pt_km >= 0 ? row.ranking_pt_km : d.ranking_pt_km,
    ranking_pt_save:
      typeof row?.ranking_pt_save === "number" && row.ranking_pt_save >= 0
        ? row.ranking_pt_save
        : d.ranking_pt_save,
    match_email_notifications_enabled: (row?.match_email_notifications_enabled ?? 1) === 1,
    lineup_pitch_slots_min:
      typeof row?.lineup_pitch_slots_min === "number" && row.lineup_pitch_slots_min >= 1
        ? row.lineup_pitch_slots_min
        : d.lineup_pitch_slots_min,
    lineup_pitch_slots_max:
      typeof row?.lineup_pitch_slots_max === "number" && row.lineup_pitch_slots_max >= 1
        ? row.lineup_pitch_slots_max
        : d.lineup_pitch_slots_max,
    match_cancel_reasons: parseCancelReasonsJson(row?.match_cancel_reasons_json),
    asset_logo_header_url: assetUrls.logo_header,
    asset_logo_crest_url: assetUrls.logo_crest,
    asset_logo_favicon_url: assetUrls.logo_favicon,
    asset_bg_soccer_ball_url: assetUrls.bg_soccer_ball,
    asset_bg_stadium_url: assetUrls.bg_stadium,
    asset_bg_pitch_lines_url: assetUrls.bg_pitch_lines,
    site_assets: resolveSiteAssets(assetUrls),
  };
}

export async function getAppSettings(db: DbLike): Promise<AppSettings> {
  const row = (await db.prepare(APP_SETTINGS_SELECT).get()) as AppSettingsRow | undefined;
  return resolveAppSettings(row);
}

export function blikPhoneToCopy(display: string): string {
  const digits = display.replace(/\D/g, "");
  return digits || MATCH_BLIK_PHONE_COPY;
}

export function blikPhoneToE164(display: string): string {
  const copy = blikPhoneToCopy(display);
  return copy.startsWith("+") ? copy : `+48${copy}`;
}

export function matchCancelReasonLabelFromSettings(
  value: string,
  settings?: Pick<AppSettings, "match_cancel_reasons">
): string {
  const reasons = settings?.match_cancel_reasons ?? APP_SETTINGS_DEFAULTS.match_cancel_reasons;
  return reasons.find((r) => r.value === value)?.label ?? value;
}

const APP_SETTINGS_MIGRATION_COLUMNS: { name: string; ddl: string }[] = [
  { name: "home_youtube_url", ddl: "ALTER TABLE app_settings ADD COLUMN home_youtube_url TEXT" },
  { name: "site_name", ddl: "ALTER TABLE app_settings ADD COLUMN site_name TEXT" },
  { name: "site_description", ddl: "ALTER TABLE app_settings ADD COLUMN site_description TEXT" },
  { name: "contact_email", ddl: "ALTER TABLE app_settings ADD COLUMN contact_email TEXT" },
  { name: "blik_phone", ddl: "ALTER TABLE app_settings ADD COLUMN blik_phone TEXT" },
  { name: "organizer_damian_name", ddl: "ALTER TABLE app_settings ADD COLUMN organizer_damian_name TEXT" },
  { name: "organizer_damian_phone", ddl: "ALTER TABLE app_settings ADD COLUMN organizer_damian_phone TEXT" },
  { name: "organizer_damian_email", ddl: "ALTER TABLE app_settings ADD COLUMN organizer_damian_email TEXT" },
  { name: "organizer_mateusz_name", ddl: "ALTER TABLE app_settings ADD COLUMN organizer_mateusz_name TEXT" },
  { name: "organizer_mateusz_phone", ddl: "ALTER TABLE app_settings ADD COLUMN organizer_mateusz_phone TEXT" },
  { name: "organizer_mateusz_email", ddl: "ALTER TABLE app_settings ADD COLUMN organizer_mateusz_email TEXT" },
  { name: "facebook_damian_url", ddl: "ALTER TABLE app_settings ADD COLUMN facebook_damian_url TEXT" },
  { name: "facebook_mateusz_url", ddl: "ALTER TABLE app_settings ADD COLUMN facebook_mateusz_url TEXT" },
  { name: "allow_self_registration", ddl: "ALTER TABLE app_settings ADD COLUMN allow_self_registration INTEGER" },
  {
    name: "default_match_max_slots",
    ddl: "ALTER TABLE app_settings ADD COLUMN default_match_max_slots INTEGER",
  },
  { name: "default_match_fee_pln", ddl: "ALTER TABLE app_settings ADD COLUMN default_match_fee_pln REAL" },
  { name: "default_match_location", ddl: "ALTER TABLE app_settings ADD COLUMN default_match_location TEXT" },
  { name: "ranking_pt_goal", ddl: "ALTER TABLE app_settings ADD COLUMN ranking_pt_goal REAL" },
  { name: "ranking_pt_assist", ddl: "ALTER TABLE app_settings ADD COLUMN ranking_pt_assist REAL" },
  { name: "ranking_pt_km", ddl: "ALTER TABLE app_settings ADD COLUMN ranking_pt_km REAL" },
  { name: "ranking_pt_save", ddl: "ALTER TABLE app_settings ADD COLUMN ranking_pt_save REAL" },
  {
    name: "match_email_notifications_enabled",
    ddl: "ALTER TABLE app_settings ADD COLUMN match_email_notifications_enabled INTEGER NOT NULL DEFAULT 1",
  },
  { name: "lineup_pitch_slots_min", ddl: "ALTER TABLE app_settings ADD COLUMN lineup_pitch_slots_min INTEGER" },
  { name: "lineup_pitch_slots_max", ddl: "ALTER TABLE app_settings ADD COLUMN lineup_pitch_slots_max INTEGER" },
  { name: "match_cancel_reasons_json", ddl: "ALTER TABLE app_settings ADD COLUMN match_cancel_reasons_json TEXT" },
  { name: "asset_logo_header_url", ddl: "ALTER TABLE app_settings ADD COLUMN asset_logo_header_url TEXT" },
  { name: "asset_logo_crest_url", ddl: "ALTER TABLE app_settings ADD COLUMN asset_logo_crest_url TEXT" },
  { name: "asset_logo_favicon_url", ddl: "ALTER TABLE app_settings ADD COLUMN asset_logo_favicon_url TEXT" },
  { name: "asset_bg_soccer_ball_url", ddl: "ALTER TABLE app_settings ADD COLUMN asset_bg_soccer_ball_url TEXT" },
  { name: "asset_bg_stadium_url", ddl: "ALTER TABLE app_settings ADD COLUMN asset_bg_stadium_url TEXT" },
  { name: "asset_bg_pitch_lines_url", ddl: "ALTER TABLE app_settings ADD COLUMN asset_bg_pitch_lines_url TEXT" },
];

/** Migracja kolumn `app_settings` — SQLite (sync exec). */
export function migrateAppSettingsColumnsSqlite(
  existingColumnNames: string[],
  exec: (sql: string) => void
): void {
  for (const col of APP_SETTINGS_MIGRATION_COLUMNS) {
    if (!existingColumnNames.includes(col.name)) {
      exec(col.ddl);
    }
  }
}

/** Migracja kolumn `app_settings` — Turso/libSQL (async execute). */
export async function migrateAppSettingsColumnsLibsql(
  existingColumnNames: string[],
  execute: (sql: string) => Promise<unknown>
): Promise<void> {
  for (const col of APP_SETTINGS_MIGRATION_COLUMNS) {
    if (!existingColumnNames.includes(col.name)) {
      await execute(col.ddl);
    }
  }
}
