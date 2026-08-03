"use client";

import { useEffect } from "react";
import {
  CLIENT_STORAGE_CLEANUP_COOKIE,
  VISITOR_ID_STORAGE_KEY,
} from "@/lib/constants";
import { COOKIE_CONSENT_STORAGE_KEY } from "@/lib/cookie-consent";

/**
 * Po przekierowaniu z middleware (udostępniony link) czyścimy pamięć przeglądarki,
 * zachowując identyfikator odwiedzin oraz decyzję cookies (żeby analityka / baner
 * nie resetowały się przy każdym zaproszeniu lub linku płatności).
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
    try {
      visitorId = localStorage.getItem(VISITOR_ID_STORAGE_KEY);
      cookieConsent = localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
      localStorage.clear();
      if (visitorId) localStorage.setItem(VISITOR_ID_STORAGE_KEY, visitorId);
      if (cookieConsent) localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, cookieConsent);
    } catch {
      /* ignore */
    }
    document.cookie = `${CLIENT_STORAGE_CLEANUP_COOKIE}=; Max-Age=0; path=/`;
  }, []);
  return null;
}
