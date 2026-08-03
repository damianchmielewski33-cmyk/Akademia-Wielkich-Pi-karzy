/** Publisher ID z AdSense: `ca-pub-…` */
const CLIENT_ID_RE = /^ca-pub-\d{10,20}$/i;

/** Prefiksy ścieżek bez reklam (płatności, auth, admin, prywatne). */
const ADS_BLOCKED_PREFIXES = [
  "/panel-admina",
  "/platnosci",
  "/login",
  "/register",
  "/ustaw-pin",
  "/profil",
  "/transport",
  "/confirm",
  "/api",
  "/offline",
  "/pzu-cup",
] as const;

export function normalizeAdsenseClientId(raw: string | null | undefined): string | null {
  const t = raw?.trim() ?? "";
  if (!t) return null;
  const lower = t.toLowerCase();
  if (CLIENT_ID_RE.test(lower)) return lower;
  // Użytkownik mógł wkleić sam `pub-…` z ads.txt
  if (/^pub-\d{10,20}$/i.test(t)) return `ca-${t.toLowerCase()}`;
  return null;
}

export function adsensePublisherIdFromClient(clientId: string): string {
  return clientId.replace(/^ca-/i, "");
}

export function resolveAdsenseClientId(settingsClientId: string | null | undefined): string | null {
  const fromSettings = normalizeAdsenseClientId(settingsClientId);
  if (fromSettings) return fromSettings;
  return normalizeAdsenseClientId(process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID);
}

export function isAdsensePathAllowed(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  const path = pathname.split("?")[0] || "/";
  for (const prefix of ADS_BLOCKED_PREFIXES) {
    if (path === prefix || path.startsWith(`${prefix}/`)) return false;
  }
  return true;
}

export function buildAdsTxtBody(clientId: string): string {
  const pub = adsensePublisherIdFromClient(clientId);
  return [
    `# ads.txt — Google AdSense`,
    `google.com, ${pub}, DIRECT, f08c47fec0942fa0`,
    "",
  ].join("\n");
}
