"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { getRoutePreloaderSpec, PagePreloaderLayout } from "@/components/preloaders";
import {
  PRELOADER_MIN_VISIBLE_MS,
  PRELOADER_SHOW_DELAY_MS,
} from "@/components/preloaders/use-delayed-visible";

const MAX_OVERLAY_MS = 15000;

function isReducedMotion() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function normalizePath(href: string): string | null {
  const noHash = href.split("#")[0] ?? href;
  const path = (noHash.split("?")[0] || "/").trim();
  if (!path.startsWith("/")) return null;
  return path || "/";
}

function stripQuery(p: string): string {
  return (p.split("?")[0] || "/").trim() || "/";
}

/**
 * Nakładka nawigacji V2: pojawia się dopiero po PRELOADER_SHOW_DELAY_MS.
 * Szybkie przejścia nie pokazują loadera wcale.
 */
export function NavigationLoadingOverlay() {
  const pathname = usePathname();
  const navStartRef = useRef<number | null>(null);
  const showTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shownAtRef = useRef<number | null>(null);
  const [pendingPath, setPendingPath] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  function clearAllTimers() {
    if (showTimerRef.current) {
      clearTimeout(showTimerRef.current);
      showTimerRef.current = null;
    }
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    if (maxTimerRef.current) {
      clearTimeout(maxTimerRef.current);
      maxTimerRef.current = null;
    }
  }

  function resetOverlay() {
    clearAllTimers();
    setVisible(false);
    setPendingPath(null);
    navStartRef.current = null;
    shownAtRef.current = null;
  }

  useEffect(() => {
    if (!visible) return;
    if (maxTimerRef.current) clearTimeout(maxTimerRef.current);
    maxTimerRef.current = setTimeout(() => resetOverlay(), MAX_OVERLAY_MS);
    return () => {
      if (maxTimerRef.current) clearTimeout(maxTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- resetOverlay closes overlay
  }, [visible]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (isReducedMotion()) return;

      const el = e.target as HTMLElement | null;
      const a = el?.closest("a[href]");
      if (!(a instanceof HTMLAnchorElement)) return;
      if (a.target === "_blank" || a.hasAttribute("download")) return;

      const href = a.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;
      if (href.startsWith("javascript:")) return;
      let path: string | null;
      try {
        if (href.startsWith("http://") || href.startsWith("https://")) {
          const u = new URL(href);
          if (u.origin !== window.location.origin) return;
          path = normalizePath(u.pathname);
        } else {
          path = normalizePath(href);
        }
      } catch {
        return;
      }
      if (path === null) return;
      if (path === "/") return;
      if (path.startsWith("/api/auth/logout")) return;
      if (path === "/panel-admina" || path.startsWith("/panel-admina/")) return;
      if (path.startsWith("/login") || path.startsWith("/register")) return;

      const current = pathname ?? "";
      if (path === current) return;

      clearAllTimers();
      navStartRef.current = Date.now();
      shownAtRef.current = null;
      setPendingPath(path);
      setVisible(false);

      showTimerRef.current = setTimeout(() => {
        setVisible(true);
        shownAtRef.current = Date.now();
        showTimerRef.current = null;
      }, PRELOADER_SHOW_DELAY_MS);
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    if (!pendingPath) return;
    const cur = stripQuery(pathname ?? "");
    const pending = stripQuery(pendingPath);
    if (cur !== pending) return;

    // Nawigacja skończyła się przed pokazaniem — nic nie wyświetlaj.
    if (!visible || shownAtRef.current == null) {
      resetOverlay();
      return;
    }

    const minMs = isReducedMotion() ? 0 : PRELOADER_MIN_VISIBLE_MS;
    const elapsed = Date.now() - shownAtRef.current;
    const remaining = Math.max(0, minMs - elapsed);

    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(() => {
      resetOverlay();
    }, remaining);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, visible, pendingPath]);

  useEffect(() => {
    return () => clearAllTimers();
  }, []);

  useEffect(() => {
    if (!visible) return;
    const html = document.documentElement;
    const body = document.body;
    const scrollbarGap = window.innerWidth - html.clientWidth;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    const prevBodyPaddingRight = body.style.paddingRight;
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    if (scrollbarGap > 0) {
      body.style.paddingRight = `${scrollbarGap}px`;
    }
    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
      body.style.paddingRight = prevBodyPaddingRight;
    };
  }, [visible]);

  if (!mounted || !visible || !pendingPath) return null;

  const { title, subtitle, kicker } = getRoutePreloaderSpec(pendingPath);

  return createPortal(
    <div
      className="fixed inset-0 z-[100] overflow-y-auto bg-[var(--background)]/92 backdrop-blur-[2px]"
      aria-busy="true"
      aria-live="polite"
      aria-label={title}
    >
      <PagePreloaderLayout
        variant="full"
        kicker={kicker}
        title={title}
        subtitle={subtitle}
        className="min-h-[100dvh]"
      />
    </div>,
    document.body
  );
}
