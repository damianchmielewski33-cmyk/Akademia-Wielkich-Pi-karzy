"use client";

import { useEffect } from "react";
import { CLIENT_STORAGE_CLEANUP_COOKIE, VISITOR_ID_STORAGE_KEY } from "@/lib/constants";

/**
 * Po przekierowaniu z middleware (udostępniony link) czyścimy pamięć przeglądarki,
 * zachowując wyłącznie anonimowy identyfikator odwiedzin (analityka).
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
    try {
      visitorId = localStorage.getItem(VISITOR_ID_STORAGE_KEY);
      localStorage.clear();
      if (visitorId) localStorage.setItem(VISITOR_ID_STORAGE_KEY, visitorId);
    } catch {
      /* ignore */
    }
    document.cookie = `${CLIENT_STORAGE_CLEANUP_COOKIE}=; Max-Age=0; path=/`;
  }, []);
  return null;
}
