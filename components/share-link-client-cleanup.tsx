"use client";

import { useEffect } from "react";
import {
  CLIENT_STORAGE_CLEANUP_COOKIE,
  VISITOR_ID_STORAGE_KEY,
} from "@/lib/constants";
import { COOKIE_CONSENT_STORAGE_KEY } from "@/lib/cookie-consent";
import { CANCEL_SEEN_STORAGE_KEY } from "@/lib/match-cancel-notice";
import { ADSENSE_POPUP_STORAGE_KEY } from "@/lib/ad-analytics";

/**
 * Po przekierowaniu z middleware (udostępniony link) czyścimy pamięć przeglądarki,
 * zachowując identyfikator odwiedzin, decyzję cookies oraz „już widziałem” anulowań /
 * popupu reklam (żeby te same komunikaty nie wracały po każdym zaproszeniu).
 */
export function ShareLinkClientCleanup() {
  useEffect(() => {
    if (typeof document === "undefined") return;
    const hasFlag = document.cookie
      .split("; ")
      .some((c) => c.startsWith(`${CLIENT_STORAGE_CLEANUP_COOKIE}=`));
    if (!hasFlag) return;
    try {
      sessionStorage.clear();
    } catch {
      /* ignore */
    }
    let visitorId: string | null = null;
    let cookieConsent: string | null = null;
    let cancelSeen: string | null = null;
    let adsensePopupLast: string | null = null;
    try {
      visitorId = localStorage.getItem(VISITOR_ID_STORAGE_KEY);
      cookieConsent = localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
      cancelSeen = localStorage.getItem(CANCEL_SEEN_STORAGE_KEY);
      adsensePopupLast = localStorage.getItem(ADSENSE_POPUP_STORAGE_KEY);
      localStorage.clear();
      if (visitorId) localStorage.setItem(VISITOR_ID_STORAGE_KEY, visitorId);
      if (cookieConsent) localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, cookieConsent);
      if (cancelSeen) localStorage.setItem(CANCEL_SEEN_STORAGE_KEY, cancelSeen);
      if (adsensePopupLast) localStorage.setItem(ADSENSE_POPUP_STORAGE_KEY, adsensePopupLast);
    } catch {
      /* ignore */
    }
    document.cookie = `${CLIENT_STORAGE_CLEANUP_COOKIE}=; Max-Age=0; path=/`;
  }, []);
  return null;
}
