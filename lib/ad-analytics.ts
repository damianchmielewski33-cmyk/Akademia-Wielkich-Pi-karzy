import { VISITOR_ID_STORAGE_KEY } from "@/lib/constants";

export type AdPlacement = "footer" | "inline" | "popup";
export type AdFillStatus = "pending" | "filled" | "unfilled";

export const AD_PLACEMENT_LABELS: Record<AdPlacement, string> = {
  footer: "Stopka",
  inline: "W treści",
  popup: "Popup",
};

export function getAnalyticsVisitorId(): string {
  if (typeof window === "undefined") return "";
  try {
    let id = localStorage.getItem(VISITOR_ID_STORAGE_KEY);
    if (!id || id.length < 8) {
      id = crypto.randomUUID();
      localStorage.setItem(VISITOR_ID_STORAGE_KEY, id);
    }
    return id;
  } catch {
    try {
      return crypto.randomUUID();
    } catch {
      return "";
    }
  }
}

export function sendAdImpressionBeacon(payload: {
  pathname: string;
  visitorId: string;
  slotId: string;
  placement: AdPlacement;
  fillStatus: AdFillStatus;
}) {
  const body = JSON.stringify(payload);
  try {
    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      const blob = new Blob([body], { type: "application/json" });
      if (navigator.sendBeacon("/api/analytics/ad-impression", blob)) return;
    }
  } catch {
    /* fallback */
  }
  void fetch("/api/analytics/ad-impression", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {});
}

export function sendCookieConsentBeacon(choice: "accept_all" | "reject_marketing", visitorId: string) {
  const body = JSON.stringify({ choice, visitorId });
  try {
    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      const blob = new Blob([body], { type: "application/json" });
      if (navigator.sendBeacon("/api/analytics/cookie-consent", blob)) return;
    }
  } catch {
    /* fallback */
  }
  void fetch("/api/analytics/cookie-consent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {});
}

/** Ścieżki z dodatkowym slotem w treści. */
export function isAdsenseInlinePath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  const path = pathname.split("?")[0] || "/";
  return path === "/" || path === "/terminarz" || path === "/galeria";
}

export const ADSENSE_POPUP_COOLDOWN_MS = 12 * 60 * 60 * 1000;
export const ADSENSE_POPUP_DELAY_MS = 10_000;
export const ADSENSE_POPUP_STORAGE_KEY = "awp_adsense_popup_last";
export const ADSENSE_FILL_TIMEOUT_MS = 12_000;
