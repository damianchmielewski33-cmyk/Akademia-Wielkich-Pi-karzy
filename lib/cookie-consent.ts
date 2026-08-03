export const COOKIE_CONSENT_STORAGE_KEY = "awp_cookie_consent";

export type CookieConsentState = {
  v: 1;
  necessary: true;
  analytics: boolean;
  marketing: boolean;
  ts: number;
};

export function parseCookieConsent(raw: string | null | undefined): CookieConsentState | null {
  if (!raw?.trim()) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<CookieConsentState>;
    if (parsed?.v !== 1) return null;
    if (parsed.necessary !== true) return null;
    if (typeof parsed.analytics !== "boolean") return null;
    if (typeof parsed.marketing !== "boolean") return null;
    return {
      v: 1,
      necessary: true,
      analytics: parsed.analytics,
      marketing: parsed.marketing,
      ts: typeof parsed.ts === "number" ? parsed.ts : Date.now(),
    };
  } catch {
    return null;
  }
}

export function acceptAllCookies(): CookieConsentState {
  return { v: 1, necessary: true, analytics: true, marketing: true, ts: Date.now() };
}

/** Odrzuca tylko marketing (AdSense). Własne statystyki odwiedzin zostają włączone. */
export function rejectOptionalCookies(): CookieConsentState {
  return { v: 1, necessary: true, analytics: true, marketing: false, ts: Date.now() };
}
