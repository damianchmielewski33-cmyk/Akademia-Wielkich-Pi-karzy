export const SITE_NAME = "Akademia Wielkich Piłkarzy";

/** Domyślny opis pod SEO, Open Graph i schema.org. */
export const SITE_DESCRIPTION =
  "Terminarz meczów, statystyki, rankingi i społeczność amatorskiej piłki nożnej — Akademia Wielkich Piłkarzy.";

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

export function getPublicContactEmail(): string | null {
  const v = process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim();
  return v || null;
}
