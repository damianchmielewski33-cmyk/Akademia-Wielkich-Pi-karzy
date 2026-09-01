export const SITE_MODE_STORAGE_KEY = "awp-site-mode";
export const SITE_MODE_COOKIE = "awp-site-mode";

export type SiteMode = "booking" | "academy";

const BOOKING_PREFIXES = ["/obiekty", "/rezerwacje", "/dla-obiektow", "/partner"];
const ACADEMY_PREFIXES = [
  "/terminarz",
  "/pilkarze",
  "/players",
  "/sklady",
  "/galeria",
  "/statystyki",
  "/rankingi",
  "/platnosci",
  "/profil",
  "/blog",
  "/o-nas",
];

const SKIP_GATE_PREFIXES = [
  "/panel-admina",
  "/pzu-cup",
  "/gymbrat",
  "/login",
  "/register",
  "/ustaw-pin",
  "/confirm",
  "/offline",
  "/platnosci-public",
  "/zaproszenie",
  "/losowanie-kapitana",
];

function matchesPrefix(pathname: string, prefixes: string[]) {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function siteModeFromPathname(pathname: string | null | undefined): SiteMode | null {
  const path = (pathname ?? "").split("?")[0] || "/";
  if (matchesPrefix(path, BOOKING_PREFIXES)) return "booking";
  if (matchesPrefix(path, ACADEMY_PREFIXES)) return "academy";
  return null;
}

export function parseSiteMode(value: string | null | undefined): SiteMode | null {
  if (value === "booking" || value === "academy") return value;
  return null;
}

export function shouldAskSiteMode(
  pathname: string | null | undefined,
  mode: SiteMode | null
): boolean {
  if (mode) return false;
  const path = (pathname ?? "").split("?")[0] || "/";
  if (matchesPrefix(path, SKIP_GATE_PREFIXES)) return false;
  if (siteModeFromPathname(path)) return false;
  return true;
}

export function persistSiteMode(mode: SiteMode) {
  try {
    localStorage.setItem(SITE_MODE_STORAGE_KEY, mode);
  } catch {
    /* ignore */
  }
  try {
    document.cookie = `${SITE_MODE_COOKIE}=${mode};path=/;max-age=31536000;samesite=lax`;
  } catch {
    /* ignore */
  }
}
