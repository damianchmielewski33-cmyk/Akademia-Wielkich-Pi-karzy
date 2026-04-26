export const SITE_NAME = "Akademia Wielkich Piłkarzy";

/** Domyślny opis pod SEO, Open Graph i schema.org. */
export const SITE_DESCRIPTION =
  "Terminarz meczów, statystyki, rankingi i społeczność amatorskiej piłki nożnej — Akademia Wielkich Piłkarzy.";

/**
 * Publiczny email, gdy brak NEXT_PUBLIC_CONTACT_EMAIL (np. środowisko lokalne).
 * W produkcji ustaw NEXT_PUBLIC_CONTACT_EMAIL, aby nie polegać na stałej w kodzie.
 */
export const DEFAULT_PUBLIC_CONTACT_EMAIL = "damianchmielewski33@gmail.com";

/**
 * Weryfikacja Google Search Console (meta tag). Nadpisz przez NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION.
 */
export function getGoogleSiteVerification(): string {
  const fromEnv = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION?.trim();
  if (fromEnv) return fromEnv;
  return "0--nQF7hoGJ2y1MWnQa5gtlwCvDOkpfckhesMh3m53s";
}

/**
 * Kanoniczny adres witryny (bez końcowego „/”). Używany w metadataBase, sitemap i robots.
 * W produkcji ustaw NEXT_PUBLIC_SITE_URL (np. https://twoja-domena.pl). Na Vercel, gdy zmienna
 * jest pusta, używane jest VERCEL_URL.
 */
export function getSiteUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (fromEnv) {
    try {
      return new URL(fromEnv).origin;
    } catch {
      /* ignoruj nieprawidłowy URL */
    }
  }
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    const host = vercel.replace(/^https?:\/\//i, "");
    return `https://${host}`;
  }
  return "http://localhost:3000";
}

/** Numer telefonu do przelewu BLIK na wpisowe (wyświetlanie). */
export const MATCH_BLIK_PHONE_DISPLAY = "514 924 030";

/** Ten sam numer bez spacji — kopiowanie do schowka. */
export const MATCH_BLIK_PHONE_COPY = "514924030";

/** Numer w formacie E.164 (schema.org, JSON-LD). */
export const MATCH_BLIK_PHONE_E164 = `+48${MATCH_BLIK_PHONE_COPY}`;

export function getPublicContactEmail(): string | null {
  const v = process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim();
  return v || null;
}

/** Email kontaktowy do treści stron (env lub domyślny). */
export function getPublicContactEmailWithFallback(): string {
  return getPublicContactEmail() ?? DEFAULT_PUBLIC_CONTACT_EMAIL;
}

/** Profil Facebook — Damian Chmielewski (nadpisz przez NEXT_PUBLIC_FACEBOOK_DAMIAN). */
export const DEFAULT_FACEBOOK_DAMIAN_URL = "https://www.facebook.com/damian.chmielewski.1422";

export function getFacebookDamianUrl(): string {
  return process.env.NEXT_PUBLIC_FACEBOOK_DAMIAN?.trim() || DEFAULT_FACEBOOK_DAMIAN_URL;
}

/** Profil Facebook — Mateusz Wierzbicki (nadpisz przez NEXT_PUBLIC_FACEBOOK_MATEUSZ). */
export const DEFAULT_FACEBOOK_MATEUSZ_URL = "https://www.facebook.com/share/1BKjq4Jgm4/";

export function getFacebookMateuszUrl(): string {
  return process.env.NEXT_PUBLIC_FACEBOOK_MATEUSZ?.trim() || DEFAULT_FACEBOOK_MATEUSZ_URL;
}

const YT_ID_RE = /^[\w-]{11}$/;

function trimEnvRaw(raw: string | undefined): string {
  if (!raw) return "";
  return raw
    .replace(/^\uFEFF/, "")
    .trim()
    .replace(/^["']|["']$/g, "");
}

/**
 * Wyciąga 11-znakowe ID filmu YouTube (transmisja na żywo, zapowiedź, zwykły film).
 * Używane też w panelu admina przy zapisie linku.
 */
export function parseYoutubeVideoIdFromUserInput(raw: string): string | null {
  return parseYoutubeVideoIdFromInputInner(raw);
}

function parseYoutubeVideoIdFromInputInner(raw: string): string | null {
  const s0 = trimEnvRaw(raw);
  if (!s0) return null;
  if (YT_ID_RE.test(s0)) return s0;

  const mV = s0.match(/[?&#]v=([\w-]{11})(?:$|[&#"'/?\s]|%)/);
  if (mV?.[1] && YT_ID_RE.test(mV[1])) return mV[1];
  const mBe = s0.match(/(?:https?:\/\/)?(?:www\.)?youtu\.be\/([\w-]{11})(?:$|[?&#"'/\s]|%)/i);
  if (mBe?.[1] && YT_ID_RE.test(mBe[1])) return mBe[1];
  const mLive = s0.match(/\/live\/([\w-]{11})(?:$|[?&#"'/\s]|%)/i);
  if (mLive?.[1] && YT_ID_RE.test(mLive[1])) return mLive[1];
  const mEmb = s0.match(/\/embed\/([\w-]{11})(?:$|[?&#"'/\s]|%)/i);
  if (mEmb?.[1] && YT_ID_RE.test(mEmb[1])) return mEmb[1];
  const mShorts = s0.match(/\/shorts\/([\w-]{11})(?:$|[?&#"'/\s]|%)/i);
  if (mShorts?.[1] && YT_ID_RE.test(mShorts[1])) return mShorts[1];

  try {
    const href = s0.startsWith("http") ? s0 : `https://${s0}`;
    const u = new URL(href);
    const host = u.hostname.toLowerCase();
    if (host === "youtu.be" || host.endsWith(".youtu.be")) {
      const id = u.pathname.split("/").filter(Boolean)[0];
      return id && YT_ID_RE.test(id) ? id : null;
    }
    if (host.includes("youtube.com")) {
      const v = u.searchParams.get("v");
      if (v && YT_ID_RE.test(v)) return v;
      const segs = u.pathname.split("/").filter(Boolean);
      for (let i = 0; i < segs.length; i++) {
        if ((segs[i] === "live" || segs[i] === "embed" || segs[i] === "shorts" || segs[i] === "v") && segs[i + 1]) {
          const id = segs[i + 1];
          if (YT_ID_RE.test(id)) return id;
        }
      }
    }
  } catch {
    /* ignore */
  }
  return null;
}

/**
 * ID osadzanej transmisji (dane publiczne — i tak widać je w `src` iframe).
 * Brak = sekcja na starcie ukryta.
 *
 * Odczyt (pierwsza skuteczna):
 * - `NEXT_PUBLIC_YOUTUBE_LIVE_URL` — pełny link do transmisji / filmu
 * - `NEXT_PUBLIC_YOUTUBE_LIVE_VIDEO_ID` — same 11 znaków
 * - `YOUTUBE_LIVE_URL` / `YOUTUBE_LIVE_VIDEO_ID` — to samo, ale **bez** `NEXT_PUBLIC_` (dostępne na serwerze; strona główna czyta je przy renderze)
 */
export function getPublicYoutubeLiveVideoId(): string | null {
  const keys = [
    "NEXT_PUBLIC_YOUTUBE_LIVE_URL",
    "YOUTUBE_LIVE_URL",
    "NEXT_PUBLIC_YOUTUBE_LIVE_VIDEO_ID",
    "YOUTUBE_LIVE_VIDEO_ID",
  ] as const;
  for (const k of keys) {
    const s = trimEnvRaw(process.env[k]);
    if (!s) continue;
    const id = parseYoutubeVideoIdFromInputInner(s);
    if (id) return id;
  }
  return null;
}

/**
 * Wartość z bazy (panel admina) ma pierwszeństwo; gdy pusta / nie da się sparsować — zmienne środowiskowe.
 */
export function resolveHomeYoutubeVideoId(
  homeYoutubeUrlFromDb: string | null | undefined
): string | null {
  const fromDb = trimEnvRaw(homeYoutubeUrlFromDb ?? undefined);
  if (fromDb) {
    const id = parseYoutubeVideoIdFromInputInner(fromDb);
    if (id) return id;
  }
  return getPublicYoutubeLiveVideoId();
}
