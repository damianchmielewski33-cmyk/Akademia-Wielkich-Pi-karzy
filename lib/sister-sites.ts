/** Konfiguracja przejść między Akademią Wielkich Piłkarzy a GymBrat (osobne aplikacje). */

export const DEFAULT_GYMBRAT_URL = "https://gym-brat.vercel.app";
export const GYMBRAT_SITE_NAME = "GymBrat";
export const GYMBRAT_SITE_TAGLINE = "Trening i dieta";

/** Zdjęcie siłowni na kafelku GymBrat (ekran główny) — nie boisko. */
export const GYMBRAT_GYM_PHOTO =
  "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1600&q=80";

export const DEFAULT_AWP_URL = "https://akademia-wielkich-pilkarzy.vercel.app";
export const AWP_SITE_NAME = "Akademia Wielkich Piłkarzy";
export const AWP_SITE_TAGLINE = "Terminarz, mecze i rankingi — siostrzana aplikacja";

/** Ścieżka w AWP — pełnoekranowy iframe z GymBrat (APK WebView i RWD). */
export const GYMBRAT_EMBED_PATH = "/gymbrat";

/** Typ postMessage z iframe GymBrat — prośba o JWT sesji Akademii. */
export const GYMBRAT_REQUEST_AWP_SESSION = "gymbrat-request-awp-session";

/** Odpowiedź shella AWP do iframe GymBrat (SSO). */
export const AWP_SESSION_MESSAGE_TYPE = "awp-session";

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

/**
 * Originy GymBrat, do których wolno wysłać JWT sesji AWP (postMessage / SSO).
 * Env `NEXT_PUBLIC_GYMBRAT_URL` + localhost:3001 + podglądy Vercel z „gym”.
 */
export function getTrustedGymBratOrigins(): string[] {
  const origins = new Set<string>([
    getGymBratUrl(),
    "http://localhost:3001",
    "http://127.0.0.1:3001",
    "http://10.0.2.2:3001",
  ]);
  const extra = process.env.NEXT_PUBLIC_GYMBRAT_TRUSTED_ORIGINS?.split(",") ?? [];
  for (const raw of extra) {
    const o = raw.trim();
    if (!o) continue;
    try {
      origins.add(new URL(o).origin);
    } catch {
      /* ignore */
    }
  }
  return Array.from(origins);
}

/** Czy Origin należy do zaufanego hosta GymBrat (SSO / postMessage). */
export function isTrustedGymBratOrigin(origin: string | null | undefined): boolean {
  if (!origin) return false;
  try {
    const o = new URL(origin).origin;
    if (getTrustedGymBratOrigins().includes(o)) return true;
    const host = new URL(o).hostname.toLowerCase();
    // Preview / team deployments GymBrat na Vercel.
    if (host.endsWith(".vercel.app") && (host.includes("gym-brat") || host.includes("gymbrat"))) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Decyzja odpowiedzi na `gymbrat-request-awp-session`.
 * Zwraca payload postMessage albo `null` (obcy origin / brak sesji / zły typ).
 */
export function buildAwpSessionPostMessage(
  origin: string | null | undefined,
  messageData: unknown,
  sessionToken: string | null | undefined
): { type: typeof AWP_SESSION_MESSAGE_TYPE; token: string } | null {
  if (!isTrustedGymBratOrigin(origin)) return null;
  if (!messageData || typeof messageData !== "object") return null;
  const type = (messageData as { type?: unknown }).type;
  if (type !== GYMBRAT_REQUEST_AWP_SESSION) return null;
  const token = typeof sessionToken === "string" ? sessionToken.trim() : "";
  if (!token) return null;
  return { type: AWP_SESSION_MESSAGE_TYPE, token };
}

export type GymBratCrossLinkOptions = {
  /** JWT sesji AWP — jednorazowy bilet SSO dla GymBrat (`awp_token`). Nie logować. */
  awpToken?: string | null;
};

/** Link do GymBrat z oznaczeniem źródła (analityka / powitalny pasek / SSO). */
export function getGymBratCrossLink(path = "/", opts?: GymBratCrossLinkOptions): string {
  const base = getGymBratUrl().replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(`${base}${p === "/" ? "/" : p}`);
  url.searchParams.set("from", "awp");
  const token = opts?.awpToken?.trim();
  if (token) {
    url.searchParams.set("awp_token", token);
  }
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
    // Preview / team deployments AWP na Vercel (CSP3 host wildcard).
    "https://*.vercel.app",
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
