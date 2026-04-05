"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

const STORAGE_KEY = "awp_visitor_id";

function getVisitorId(): string {
  if (typeof window === "undefined") return "";
  try {
    let id = localStorage.getItem(STORAGE_KEY);
    if (!id || id.length < 8) {
      id = crypto.randomUUID();
      localStorage.setItem(STORAGE_KEY, id);
    }
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

/** Rejestruje wejście na ekran (ścieżka → ekran po stronie serwera). */
export function AnalyticsTracker() {
  const pathname = usePathname();
  const lastRef = useRef<{ path: string; t: number } | null>(null);

  useEffect(() => {
    if (!pathname) return;
    const now = Date.now();
    const last = lastRef.current;
    if (last && last.path === pathname && now - last.t < 1500) return;
    lastRef.current = { path: pathname, t: now };

    const visitorId = getVisitorId();
    if (!visitorId) return;

    void fetch("/api/analytics/page-view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pathname, visitorId }),
    }).catch(() => {});
  }, [pathname]);

  return null;
}
