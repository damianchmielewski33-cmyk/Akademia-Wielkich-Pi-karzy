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

/**
 * Wyciąga 11-znakowe ID filmu YouTube (transmisja na żywo, zapowiedź, zwykły film).
 * Obsługa: samo ID, pełny link watch/live/embed, skrót youtu.be.
 * Ustaw `NEXT_PUBLIC_YOUTUBE_LIVE_URL` (np. link do trwającej transmisji) albo
 * `NEXT_PUBLIC_YOUTUBE_LIVE_VIDEO_ID` (tylko ID).
 */
function parseYoutubeVideoIdFromInput(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  if (YT_ID_RE.test(s)) return s;
  try {
    const href = s.startsWith("http") ? s : `https://${s}`;
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

/** ID osadzanej transmisji (publiczne — tylko do embedu). Brak = sekcja ukryta. */
export function getPublicYoutubeLiveVideoId(): string | null {
  const fromUrl = process.env.NEXT_PUBLIC_YOUTUBE_LIVE_URL?.trim();
  if (fromUrl) {
    const id = parseYoutubeVideoIdFromInput(fromUrl);
    if (id) return id;
  }
  const fromId = process.env.NEXT_PUBLIC_YOUTUBE_LIVE_VIDEO_ID?.trim();
  if (fromId) return parseYoutubeVideoIdFromInput(fromId);
  return null;
}
