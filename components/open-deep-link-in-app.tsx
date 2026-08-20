"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { isInstalledAndroidAppClient } from "@/lib/app-webview";
import {
  buildAndroidAppIntentUrl,
  isNativeAppDeepLinkPath,
  shouldTryOpenAndroidApp,
} from "@/lib/open-in-native-app";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const TRIED_KEY_PREFIX = "awp-open-app-tried:";

/**
 * Na Androidzie (przeglądarka, nie WebView APK) próbuje otworzyć zainstalowaną aplikację
 * dla linków zaproszenia i płatności. Gdy App Links nie przejęły URL-a automatycznie,
 * Intent jest zapasem. Jedna próba na ścieżkę w sesji (bez pętli z fallbackiem).
 */
export function OpenDeepLinkInApp({ className }: { className?: string }) {
  const pathname = usePathname() || "";
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!isNativeAppDeepLinkPath(pathname)) return;
    if (isInstalledAndroidAppClient()) return;

    const ua = navigator.userAgent || "";
    if (!shouldTryOpenAndroidApp(ua)) return;

    const triedKey = `${TRIED_KEY_PREFIX}${pathname}`;
    try {
      if (sessionStorage.getItem(triedKey) === "1") {
        setShowHint(true);
        return;
      }
      sessionStorage.setItem(triedKey, "1");
    } catch {
      /* private mode — nadal spróbuj raz */
    }

    const intentUrl = buildAndroidAppIntentUrl(window.location.href);
    // Krótkie opóźnienie: nie blokuj pierwszego paintu treści (fallback).
    const t = window.setTimeout(() => {
      window.location.href = intentUrl;
    }, 120);
    setShowHint(true);
    return () => window.clearTimeout(t);
  }, [pathname]);

  if (!showHint || !isNativeAppDeepLinkPath(pathname)) return null;

  return (
    <div
      className={cn(
        "sticky top-0 z-40 border-b border-[var(--mp-teal)]/30 bg-[var(--mp-teal)] px-3 py-2 text-center text-sm text-white shadow-sm",
        className
      )}
    >
      <p className="font-semibold">Masz aplikację Akademii?</p>
      <Button
        type="button"
        size="sm"
        variant="secondary"
        className="mt-1.5 rounded-full bg-white font-bold text-[var(--mp-teal-dark)] hover:bg-zinc-100"
        onClick={() => {
          if (typeof window === "undefined") return;
          window.location.href = buildAndroidAppIntentUrl(window.location.href);
        }}
      >
        Otwórz w aplikacji
      </Button>
    </div>
  );
}
