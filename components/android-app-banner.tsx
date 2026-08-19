"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { isRunningInAppWebView } from "@/lib/app-webview";

const STORAGE_KEY = "awp-android-app-banner-dismissed";

function isAndroidUa(ua: string): boolean {
  return /Android/i.test(ua) && !/Windows Phone/i.test(ua);
}

/**
 * Pasek u góry strony — tylko na Androidzie w zwykłej przeglądarce (RWD).
 * Wewnątrz WebView aplikacji (użytkownik już ją ma) baner jest zawsze ukryty. Zamykany (localStorage).
 */
export function AndroidAppBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (typeof navigator === "undefined") return;
      if (isRunningInAppWebView()) return;
      if (!isAndroidUa(navigator.userAgent)) return;
      if (localStorage.getItem(STORAGE_KEY) === "1") return;
      setVisible(true);
    } catch {
      /* private mode / brak storage */
    }
  }, []);

  function dismiss() {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      className="relative z-40 border-b border-zinc-200 bg-white text-zinc-800 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
      role="region"
      aria-label="Pobierz aplikację Android"
    >
      <div className="mx-auto flex max-w-6xl items-center gap-2 px-3 py-2.5 xs:gap-3 xs:px-4 sm:py-3">
        <p className="min-w-0 flex-1 text-left text-xs leading-snug xs:text-sm">
          Masz Androida?{" "}
          <span className="font-semibold text-zinc-950 dark:text-white">Pobierz aplikację</span>
          <span className="hidden xs:inline"> — rezerwacje, terminarz i portfel bez przeglądarki.</span>
        </p>
        <a
          href="/api/android/download?source=banner"
          className="awp-focus-ring inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-[var(--mp-teal)] px-3 py-2 text-xs font-bold text-white transition hover:bg-[var(--mp-teal-dark)] xs:px-3.5 xs:text-sm"
        >
          <Download className="size-3.5 shrink-0 xs:size-4" aria-hidden />
          Pobierz
        </a>
        <button
          type="button"
          onClick={dismiss}
          className="awp-focus-ring inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-950 dark:hover:bg-zinc-800 dark:hover:text-white"
          aria-label="Zamknij pasek"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
