/** Wspólna konfiguracja przejść między Akademią Wielkich Piłkarzy a GymBrat. */

export const DEFAULT_GYMBRAT_URL = "https://gym-brat.vercel.app";
export const GYMBRAT_SITE_NAME = "GymBrat";
export const GYMBRAT_SITE_TAGLINE = "Trening i dieta — siostrzana aplikacja";

/** Zdjęcie siłowni na kafelku GymBrat (ekran główny) — nie boisko. */
export const GYMBRAT_GYM_PHOTO =
  "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1600&q=80";

export const DEFAULT_AWP_URL = "https://akademia-wielkich-pilkarzy.vercel.app";
export const AWP_SITE_NAME = "Akademia Wielkich Piłkarzy";
export const AWP_SITE_TAGLINE = "Terminarz, mecze i rankingi — siostrzana aplikacja";

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

export function getAwpUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_AWP_URL?.trim();
  if (fromEnv) {
    try {
      return new URL(fromEnv).origin;
    } catch {
      /* ignore */
    }
  }
  return DEFAULT_AWP_URL;
}

export function getAwpCrossLink(path = "/"): string {
  const base = getAwpUrl().replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(`${base}${p === "/" ? "/" : p}`);
  url.searchParams.set("from", "gymbrat");
  return url.toString();
}
