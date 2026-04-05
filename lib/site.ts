export const SITE_NAME = "Akademia Wielkich Piłkarzy";

export function getPublicContactEmail(): string | null {
  const v = process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim();
  return v || null;
}
