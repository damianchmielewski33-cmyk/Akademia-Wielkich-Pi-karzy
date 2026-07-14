/** Klucze konfigurowalnych grafik witryny (admin → Ustawienia → Grafiki). */
export const SITE_ASSET_KEYS = [
  "logo_header",
  "logo_crest",
  "logo_favicon",
  "bg_soccer_ball",
  "bg_stadium",
  "bg_pitch_lines",
] as const;

export type SiteAssetKey = (typeof SITE_ASSET_KEYS)[number];

/** Domyślne pliki z katalogu `public/`. */
export const SITE_ASSET_DEFAULTS: Record<SiteAssetKey, string> = {
  logo_header: "/mundial-2026-logo.svg",
  logo_crest: "/logo-akademia.svg",
  logo_favicon: "/logo-akademia.svg",
  bg_soccer_ball: "/soccer-ball.svg",
  bg_stadium: "/stadium-bg.svg",
  bg_pitch_lines: "/pitch-lines.svg",
};

export type SiteAssetMeta = {
  label: string;
  hint: string;
  /** Zalecane proporcje / format dla admina. */
  recommended: string;
};

export const SITE_ASSET_META: Record<SiteAssetKey, SiteAssetMeta> = {
  logo_header: {
    label: "Logo w nagłówku",
    hint: "Ikona obok nazwy strony (np. logo turnieju).",
    recommended: "Kwadrat, SVG lub PNG z przezroczystością, min. 160×160 px",
  },
  logo_crest: {
    label: "Herb / logo akademii",
    hint: "Stopka, hero stron, preloader, panel admina.",
    recommended: "Kwadrat, SVG lub PNG, min. 256×256 px",
  },
  logo_favicon: {
    label: "Favicon i ikona PWA",
    hint: "Ikona w karcie przeglądarki i manifestcie.",
    recommended: "SVG lub PNG 512×512 px",
  },
  bg_soccer_ball: {
    label: "Dekoracja — piłka",
    hint: "Półprzezroczyste piłki w tle strony i panelu admina.",
    recommended: "SVG lub PNG z przezroczystością",
  },
  bg_stadium: {
    label: "Tło — murawa / stadion",
    hint: "Główne tło strony (tryb jasny i ciemny).",
    recommended: "Szeroki baner, min. 1920×1080 px lub SVG",
  },
  bg_pitch_lines: {
    label: "Tło — linie boiska",
    hint: "Dekoracja w stopce i na kartach „boiskowych”.",
    recommended: "Szeroki wzór, SVG lub PNG",
  },
};

/** Kolumna w `app_settings` dla danego klucza grafiki. */
export const SITE_ASSET_DB_COLUMNS: Record<SiteAssetKey, string> = {
  logo_header: "asset_logo_header_url",
  logo_crest: "asset_logo_crest_url",
  logo_favicon: "asset_logo_favicon_url",
  bg_soccer_ball: "asset_bg_soccer_ball_url",
  bg_stadium: "asset_bg_stadium_url",
  bg_pitch_lines: "asset_bg_pitch_lines_url",
};

export type SiteAssetUrls = Record<SiteAssetKey, string | null>;

export type ResolvedSiteAssets = Record<SiteAssetKey, string>;

export function isSiteAssetKey(v: string): v is SiteAssetKey {
  return (SITE_ASSET_KEYS as readonly string[]).includes(v);
}

export function resolveSiteAssetUrl(key: SiteAssetKey, custom: string | null | undefined): string {
  const trimmed = custom?.trim();
  return trimmed ? trimmed : SITE_ASSET_DEFAULTS[key];
}

export function resolveSiteAssets(urls: SiteAssetUrls): ResolvedSiteAssets {
  const out = {} as ResolvedSiteAssets;
  for (const key of SITE_ASSET_KEYS) {
    out[key] = resolveSiteAssetUrl(key, urls[key]);
  }
  return out;
}

/** Czy grafika wymaga `unoptimized` w next/image (SVG, lokalne API uploadów). */
export function siteAssetNeedsUnoptimized(src: string): boolean {
  const lower = src.toLowerCase();
  return lower.endsWith(".svg") || src.startsWith("/api/uploads/");
}

export function siteAssetCssUrl(src: string): string {
  if (src.startsWith("http://") || src.startsWith("https://") || src.startsWith("/")) {
    return `url("${src.replace(/"/g, "%22")}")`;
  }
  return `url("${src}")`;
}
