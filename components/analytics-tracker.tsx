"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { normalizeAnalyticsPathname } from "@/lib/analytics-screen";
import { VISITOR_ID_STORAGE_KEY } from "@/lib/constants";

const LAST_PAGE_VIEW_KEY = "awp_analytics_last_pv";
/** Min. odstęp między dwoma odsłonami tej samej ścieżki (React Strict Mode / szybkie remounty). */
const DEDUPE_MS = 2500;

function getVisitorId(): string {
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

function shouldSkipDuplicate(pathname: string, now: number): boolean {
  try {
    const raw = sessionStorage.getItem(LAST_PAGE_VIEW_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as { path: string; t: number };
    return parsed.path === pathname && now - parsed.t < DEDUPE_MS;
  } catch {
    return false;
  }
}

function markSent(pathname: string, now: number) {
  try {
    sessionStorage.setItem(LAST_PAGE_VIEW_KEY, JSON.stringify({ path: pathname, t: now }));
  } catch {
    /* ignore */
  }
}

function sendPageView(pathname: string, visitorId: string) {
  const body = JSON.stringify({ pathname, visitorId });
  try {
    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      const blob = new Blob([body], { type: "application/json" });
      if (navigator.sendBeacon("/api/analytics/page-view", blob)) return;
    }
  } catch {
    /* fallback poniżej */
  }
  void fetch("/api/analytics/page-view", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {});
}

/**
 * Rejestruje wejście na ekran (ścieżka → ekran po stronie serwera).
 * Pierwsza strona analityka (własna baza) — bez bramki zgody reklamowej, żeby
 * liczyć też zaproszenia i linki płatności przy pierwszym wejściu.
 */
export function AnalyticsTracker() {
  const pathname = usePathname();
  const lastRef = useRef<{ path: string; t: number } | null>(null);

  useEffect(() => {
    if (!pathname) return;
    const path = normalizeAnalyticsPathname(pathname);
    const now = Date.now();
    const last = lastRef.current;
    if (last && last.path === path && now - last.t < DEDUPE_MS) return;
    if (shouldSkipDuplicate(path, now)) return;

    lastRef.current = { path, t: now };
    markSent(path, now);

    const visitorId = getVisitorId();
    if (!visitorId) return;

    sendPageView(path, visitorId);
  }, [pathname]);

  return null;
}
