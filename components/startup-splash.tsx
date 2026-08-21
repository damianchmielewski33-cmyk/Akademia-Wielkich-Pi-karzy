"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { HomeFallingDecor } from "@/components/home-falling-decor";
import { SiteAssetImage } from "@/components/site-asset-image";
import { isInstalledAndroidAppClient } from "@/lib/app-webview";
import { cn } from "@/lib/utils";

const SESSION_KEY = "awp-startup-splash-shown";
const ANDROID_COLD_PRELOADER_KEY = "awp-android-route-preloader-ok";
const BOOT_SPLASH_ID = "awp-boot-splash";
const ACTIVE_CLASS = "awp-startup-splash-active";
/** Minimalny czas marki — nie dłuższy niż realne ładowanie + ta wartość. */
const MIN_VISIBLE_MS = 1400;
/** Górny limit, gdy treść długo nie jest gotowa. */
const MAX_VISIBLE_MS = 4500;
const FADE_MS = 420;

function isIosDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return (
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

function isStandaloneApp(): boolean {
  if (typeof window === "undefined") return false;
  const mq = window.matchMedia("(display-mode: standalone)").matches;
  const iosStandalone =
    "standalone" in navigator &&
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return mq || iosStandalone;
}

export function shouldShowIosStartupSplash(): boolean {
  if (typeof window === "undefined") return false;
  if (isInstalledAndroidAppClient()) return false;
  if (!isIosDevice()) return false;
  if (!isStandaloneApp()) return false;
  try {
    if (sessionStorage.getItem(SESSION_KEY) === "1") return false;
  } catch {
    /* private mode */
  }
  return true;
}

/** Czy trasy mają pominąć full-screen preloader (splash startowy go zastępuje). */
export function shouldSuppressStartupRoutePreloader(): boolean {
  if (typeof document === "undefined") return false;
  if (document.documentElement.classList.contains(ACTIVE_CLASS)) return true;
  if (document.documentElement.classList.contains("awp-boot-splash-pending")) return true;
  if (isInstalledAndroidAppClient()) {
    try {
      return sessionStorage.getItem(ANDROID_COLD_PRELOADER_KEY) !== "1";
    } catch {
      return true;
    }
  }
  return false;
}

/** Po cold starcie Android WebView — przywróć zwykłe preloadery tras. */
export function markAndroidColdStartPreloadersDone(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(ANDROID_COLD_PRELOADER_KEY, "1");
  } catch {
    /* ignore */
  }
}

function removeBootSplashDom() {
  if (typeof document === "undefined") return;
  document.getElementById(BOOT_SPLASH_ID)?.remove();
  document.documentElement.classList.remove("awp-boot-splash-pending");
}

function setSplashActiveClass(active: boolean) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle(ACTIVE_CLASS, active);
}

function whenDocumentReady(): Promise<void> {
  if (typeof document === "undefined") return Promise.resolve();
  if (document.readyState === "complete") {
    return new Promise((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });
  }
  return new Promise((resolve) => {
    const done = () => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    };
    window.addEventListener("load", done, { once: true });
  });
}

function PhotographicJuggler({ className }: { className?: string }) {
  return (
    <div className={cn("awp-juggle-photo", className)} aria-hidden>
      <Image
        src="/splash/juggle-player.jpg"
        alt=""
        width={480}
        height={640}
        className="awp-juggle-photo__img h-full w-full object-contain object-bottom"
        sizes="(max-width: 480px) 70vw, 220px"
        priority
      />
    </div>
  );
}

export function StartupSplash({ marketplaceEnabled = false }: { marketplaceEnabled?: boolean }) {
  const [phase, setPhase] = useState<"hidden" | "show" | "leave">("hidden");

  useEffect(() => {
    if (!shouldShowIosStartupSplash()) {
      removeBootSplashDom();
      setSplashActiveClass(false);
      setPhase("hidden");
      return;
    }
    try {
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      /* ignore */
    }
    setPhase("show");
    setSplashActiveClass(true);
    removeBootSplashDom();

    const startedAt = Date.now();
    let leaveTimer: number | undefined;
    let hideTimer: number | undefined;
    let cancelled = false;

    const beginLeave = () => {
      if (cancelled) return;
      setPhase("leave");
      setSplashActiveClass(false);
      hideTimer = window.setTimeout(() => {
        if (!cancelled) setPhase("hidden");
      }, FADE_MS);
    };

    const run = async () => {
      const ready = whenDocumentReady();
      const maxWait = new Promise<void>((resolve) => {
        window.setTimeout(resolve, MAX_VISIBLE_MS);
      });
      await Promise.race([ready, maxWait]);
      if (cancelled) return;
      const elapsed = Date.now() - startedAt;
      const remainMin = Math.max(0, MIN_VISIBLE_MS - elapsed);
      leaveTimer = window.setTimeout(beginLeave, remainMin);
    };

    void run();

    return () => {
      cancelled = true;
      setSplashActiveClass(false);
      if (leaveTimer) window.clearTimeout(leaveTimer);
      if (hideTimer) window.clearTimeout(hideTimer);
    };
  }, []);

  if (phase === "hidden") return null;

  return (
    <div
      className={cn(
        "awp-startup-splash awp-startup-splash--stadium fixed inset-0 z-[300] flex flex-col items-center justify-center px-6",
        marketplaceEnabled && "awp-startup-splash--v2",
        phase === "leave" && "awp-startup-splash--leave"
      )}
      role="status"
      aria-live="polite"
      aria-busy={phase === "show"}
      aria-label="Uruchamianie aplikacji"
    >
      <div className="awp-startup-splash__stadium" aria-hidden>
        <Image
          src="/splash/stadium-bg.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
        <div className="awp-startup-splash__stadium-scrim" />
      </div>
      <HomeFallingDecor cover />
      <div className="relative z-10 flex flex-col items-center text-center">
        <p
          className={cn(
            "text-[0.65rem] font-bold uppercase tracking-[0.2em] text-white/90 drop-shadow-sm",
            marketplaceEnabled ? "text-[var(--mp-teal)]" : "text-[var(--mundial-gold,#f5c518)]"
          )}
        >
          {marketplaceEnabled ? "Wersja V2" : "Akademia"}
        </p>
        <SiteAssetImage
          asset="logo_crest"
          alt=""
          width={144}
          height={144}
          className="mt-3 h-[4.5rem] w-[4.5rem] drop-shadow-md"
          sizes="72px"
          priority
        />
        <p className="mt-3 font-[family-name:var(--font-display)] text-2xl font-black tracking-tight text-white drop-shadow-md">
          Akademia Wielkich Piłkarzy
        </p>
        <p className="mt-1 text-sm text-white/85 drop-shadow-sm">
          {marketplaceEnabled ? "Przygotowujemy boiska…" : "Rozgrzewka…"}
        </p>
        <PhotographicJuggler className="mt-6 h-[14.5rem] w-[11rem] sm:h-[16rem] sm:w-[12rem]" />
      </div>
    </div>
  );
}
