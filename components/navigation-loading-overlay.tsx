"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { getRoutePreloaderSpec, PagePreloaderLayout } from "@/components/preloaders";

const MIN_VISIBLE_MS = 4000;
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

/**
 * Next.js usuwa `loading.tsx` natychmiast po zakończeniu segmentu — animacje znikają po ułamku sekundy.
 * Nakładka włącza się po pełnym `click` na linku (bubble) i zostaje min. MIN_VISIBLE_MS lub do zmiany pathname.
 * Scena SVG i teksty są takie jak dla docelowej trasy (`getRoutePreloaderSpec`).
 */
export function NavigationLoadingOverlay() {
  const pathname = usePathname();
  const prevPathname = useRef(pathname);
  const navStartRef = useRef<number | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [visible, setVisible] = useState(false);
  const [pendingPath, setPendingPath] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!visible) return;
    if (maxTimerRef.current) clearTimeout(maxTimerRef.current);
    maxTimerRef.current = setTimeout(() => {
      setVisible(false);
      setPendingPath(null);
      navStartRef.current = null;
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
      maxTimerRef.current = null;
    }, MAX_OVERLAY_MS);
    return () => {
      if (maxTimerRef.current) clearTimeout(maxTimerRef.current);
    };
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
      if (path.startsWith("/api/auth/logout")) return;
      if (path === "/panel-admina" || path.startsWith("/panel-admina/")) return;

      const current = pathname ?? "";
      if (path === current) return;

      navStartRef.current = Date.now();
      setPendingPath(path);
      setVisible(true);
    };

    document.addEventListener("click", onClick, false);
    return () => document.removeEventListener("click", onClick, false);
  }, [pathname]);

  useEffect(() => {
    const prev = prevPathname.current;
    if (prev === pathname) return;
    prevPathname.current = pathname;

    if (navStartRef.current === null) return;

    const minMs = isReducedMotion() ? 0 : MIN_VISIBLE_MS;
    const elapsed = Date.now() - navStartRef.current;
    const remaining = Math.max(0, minMs - elapsed);

    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(() => {
      setVisible(false);
      setPendingPath(null);
      navStartRef.current = null;
      closeTimerRef.current = null;
    }, remaining);
  }, [pathname]);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
      if (maxTimerRef.current) clearTimeout(maxTimerRef.current);
    };
  }, []);

  if (!mounted || !visible || !pendingPath) return null;

  const { title, subtitle, Preloader } = getRoutePreloaderSpec(pendingPath);

  return createPortal(
    <div
      className="fixed inset-0 z-[100] overflow-y-auto bg-[var(--background)]/95 backdrop-blur-[2px]"
      aria-busy="true"
      aria-live="polite"
      aria-label={title}
    >
      <PagePreloaderLayout variant="full" title={title} subtitle={subtitle} className="min-h-[100dvh]">
        <Preloader />
      </PagePreloaderLayout>
    </div>,
    document.body
  );
}
