export const SITE_NAME = "Akademia Wielkich Piłkarzy";

/** Numer telefonu do przelewu BLIK na wpisowe (wyświetlanie). */
export const MATCH_BLIK_PHONE_DISPLAY = "514 924 030";

/** Ten sam numer bez spacji — kopiowanie do schowka. */
export const MATCH_BLIK_PHONE_COPY = "514924030";

export function getPublicContactEmail(): string | null {
  const v = process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim();
  return v || null;
}
