/** Siostrzana aplikacja GymBrat — wspólne przejścia między serwisami. */

export const DEFAULT_GYMBRAT_URL = "https://gym-brat.vercel.app";
export const GYMBRAT_SITE_NAME = "GymBrat";
export const GYMBRAT_SITE_TAGLINE = "Trening i dieta — siostrzana aplikacja";

/** Publiczny URL GymBrat (bez końcowego „/”). */
export function getGymBratUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_GYMBRAT_URL?.trim();
  if (fromEnv) {
    try {
      return new URL(fromEnv).origin;
    } catch {
      /* ignore */
    }
  }
  return DEFAULT_GYMBRAT_URL;
}

/** Link do GymBrat z oznaczeniem źródła (analityka / powitalny pasek). */
export function getGymBratCrossLink(path = "/"): string {
  const base = getGymBratUrl().replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(`${base}${p === "/" ? "/" : p}`);
  url.searchParams.set("from", "awp");
  return url.toString();
}
