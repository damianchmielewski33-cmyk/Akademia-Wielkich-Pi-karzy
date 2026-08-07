"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  acceptAllCookies,
  COOKIE_CONSENT_STORAGE_KEY,
  parseCookieConsent,
  rejectOptionalCookies,
  type CookieConsentState,
} from "@/lib/cookie-consent";
import { getAnalyticsVisitorId, sendCookieConsentBeacon } from "@/lib/ad-analytics";
import { CookieConsentBanner } from "@/components/cookie-consent-banner";
import { AdsensePopup } from "@/components/adsense-popup";

declare global {
  interface Window {
    adsbygoogle?: unknown[] & { pauseAdRequests?: number };
  }
}

type AdsenseContextValue = {
  clientId: string | null;
  enabled: boolean;
  slotFooter: string | null;
  slotInline: string | null;
  slotPopup: string | null;
  popupEnabled: boolean;
  consent: CookieConsentState | null;
  marketingAllowed: boolean;
  analyticsAllowed: boolean;
  acceptAll: () => void;
  rejectOptional: () => void;
  /** Czyści zgodę i pokazuje baner ponownie. */
  resetConsent: () => void;
};

const AdsenseContext = createContext<AdsenseContextValue | null>(null);

export function useCookieConsent() {
  const ctx = useContext(AdsenseContext);
  if (!ctx) {
    throw new Error("useCookieConsent must be used within AdsenseProvider");
  }
  return ctx;
}

export function useAdsense() {
  return useCookieConsent();
}

function setAdsensePause(paused: boolean) {
  try {
    window.adsbygoogle = window.adsbygoogle || [];
    window.adsbygoogle.pauseAdRequests = paused ? 1 : 0;
  } catch {
    /* ignore */
  }
}

/** Ładuje skrypt AdSense dopiero po zgodzie marketingowej (zgodnie z polityką cookies). */
function ensureAdsenseScript(clientId: string) {
  const src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(clientId)}`;
  if (document.querySelector(`script[src^="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"]`)) {
    return;
  }
  try {
    window.adsbygoogle = window.adsbygoogle || [];
    window.adsbygoogle.pauseAdRequests = 0;
  } catch {
    /* ignore */
  }
  const s = document.createElement("script");
  s.async = true;
  s.src = src;
  s.crossOrigin = "anonymous";
  document.head.appendChild(s);
}

type Props = {
  children: ReactNode;
  clientId: string | null;
  enabled: boolean;
  slotFooter?: string | null;
  slotInline?: string | null;
  slotPopup?: string | null;
  popupEnabled?: boolean;
};

export function AdsenseProvider({
  children,
  clientId,
  enabled,
  slotFooter = null,
  slotInline = null,
  slotPopup = null,
  popupEnabled = false,
}: Props) {
  const [consent, setConsent] = useState<CookieConsentState | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const scriptLoadedRef = useRef(false);

  useEffect(() => {
    try {
      setConsent(parseCookieConsent(localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY)));
    } catch {
      setConsent(null);
    }
    setHydrated(true);
  }, []);

  const persist = useCallback((next: CookieConsentState) => {
    setConsent(next);
    try {
      localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore quota / private mode */
    }
  }, []);

  const acceptAll = useCallback(() => {
    persist(acceptAllCookies());
    const visitorId = getAnalyticsVisitorId();
    if (visitorId) sendCookieConsentBeacon("accept_all", visitorId);
  }, [persist]);

  const rejectOptional = useCallback(() => {
    persist(rejectOptionalCookies());
    const visitorId = getAnalyticsVisitorId();
    if (visitorId) sendCookieConsentBeacon("reject_marketing", visitorId);
  }, [persist]);

  const resetConsent = useCallback(() => {
    try {
      localStorage.removeItem(COOKIE_CONSENT_STORAGE_KEY);
    } catch {
      /* ignore */
    }
    setConsent(null);
    setAdsensePause(true);
  }, []);

  const marketingAllowed = Boolean(enabled && clientId && consent?.marketing);
  const analyticsAllowed = Boolean(consent?.analytics);

  useEffect(() => {
    if (!enabled || !clientId) return;
    if (marketingAllowed) {
      if (!scriptLoadedRef.current) {
        ensureAdsenseScript(clientId);
        scriptLoadedRef.current = true;
      }
      setAdsensePause(false);
    } else {
      setAdsensePause(true);
    }
  }, [enabled, clientId, marketingAllowed]);

  const value = useMemo<AdsenseContextValue>(
    () => ({
      clientId,
      enabled,
      slotFooter: slotFooter?.trim() || null,
      slotInline: slotInline?.trim() || null,
      slotPopup: slotPopup?.trim() || null,
      popupEnabled,
      consent: hydrated ? consent : null,
      marketingAllowed,
      analyticsAllowed,
      acceptAll,
      rejectOptional,
      resetConsent,
    }),
    [
      clientId,
      enabled,
      slotFooter,
      slotInline,
      slotPopup,
      popupEnabled,
      hydrated,
      consent,
      marketingAllowed,
      analyticsAllowed,
      acceptAll,
      rejectOptional,
      resetConsent,
    ]
  );

  return (
    <AdsenseContext.Provider value={value}>
      {children}
      {hydrated ? <CookieConsentBanner /> : null}
      {hydrated ? <AdsensePopup /> : null}
    </AdsenseContext.Provider>
  );
}
