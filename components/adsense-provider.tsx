"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import Script from "next/script";
import {
  acceptAllCookies,
  COOKIE_CONSENT_STORAGE_KEY,
  parseCookieConsent,
  rejectOptionalCookies,
  type CookieConsentState,
} from "@/lib/cookie-consent";
import { CookieConsentBanner } from "@/components/cookie-consent-banner";

type AdsenseContextValue = {
  clientId: string | null;
  enabled: boolean;
  slotFooter: string | null;
  consent: CookieConsentState | null;
  marketingAllowed: boolean;
  analyticsAllowed: boolean;
  acceptAll: () => void;
  rejectOptional: () => void;
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

type Props = {
  children: ReactNode;
  clientId: string | null;
  enabled: boolean;
  slotFooter?: string | null;
};

export function AdsenseProvider({
  children,
  clientId,
  enabled,
  slotFooter = null,
}: Props) {
  const [consent, setConsent] = useState<CookieConsentState | null>(null);
  const [hydrated, setHydrated] = useState(false);

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

  const acceptAll = useCallback(() => persist(acceptAllCookies()), [persist]);
  const rejectOptional = useCallback(() => persist(rejectOptionalCookies()), [persist]);

  const marketingAllowed = Boolean(enabled && clientId && consent?.marketing);
  const analyticsAllowed = Boolean(consent?.analytics);

  const value = useMemo<AdsenseContextValue>(
    () => ({
      clientId,
      enabled,
      slotFooter: slotFooter?.trim() || null,
      consent: hydrated ? consent : null,
      marketingAllowed,
      analyticsAllowed,
      acceptAll,
      rejectOptional,
    }),
    [
      clientId,
      enabled,
      slotFooter,
      hydrated,
      consent,
      marketingAllowed,
      analyticsAllowed,
      acceptAll,
      rejectOptional,
    ]
  );

  return (
    <AdsenseContext.Provider value={value}>
      {children}
      {hydrated ? <CookieConsentBanner /> : null}
      {marketingAllowed && clientId ? (
        <Script
          id="adsense-loader"
          async
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(clientId)}`}
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
      ) : null}
    </AdsenseContext.Provider>
  );
}
