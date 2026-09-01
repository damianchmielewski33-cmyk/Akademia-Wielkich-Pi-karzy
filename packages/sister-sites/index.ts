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

/** Ścieżka w AWP — pełnoekranowy iframe z GymBrat (APK WebView i RWD). */
export const GYMBRAT_EMBED_PATH = "/gymbrat";

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

/** Link wewnętrzny AWP — iframe z GymBrat (zamiast Custom Tabs / nowej karty). */
export function getGymBratEmbedPath(path = "/"): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  if (p === "/") return GYMBRAT_EMBED_PATH;
  return `${GYMBRAT_EMBED_PATH}?path=${encodeURIComponent(p)}`;
}

/** Originy AWP, które mogą osadzać GymBrat w iframe. */
export function getAwpEmbedOrigins(): string[] {
  const origins = new Set<string>([
    getAwpUrl(),
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://10.0.2.2:3000",
  ]);
  const extra = process.env.NEXT_PUBLIC_AWP_EMBED_ORIGINS?.split(",") ?? [];
  for (const raw of extra) {
    const o = raw.trim();
    if (o) origins.add(o);
  }
  return Array.from(origins);
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
