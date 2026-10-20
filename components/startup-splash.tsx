"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { SiteAssetImage } from "@/components/site-asset-image";
import {
  markAndroidColdStartPreloadersDone,
  notifyFirstScreenContentReady,
  shouldSuppressStartupRoutePreloader,
  STARTUP_SPLASH_ACTIVE_CLASS,
  STARTUP_SPLASH_SESSION_KEY,
  subscribeFirstScreenContentReady,
} from "@/lib/android-content-ready";
import { isInstalledAndroidAppClient } from "@/lib/app-webview";
import { cn } from "@/lib/utils";

export {
  markAndroidColdStartPreloadersDone,
  notifyFirstScreenContentReady,
  shouldSuppressStartupRoutePreloader,
} from "@/lib/android-content-ready";

const BOOT_SPLASH_ID = "awp-boot-splash";
const MAX_VISIBLE_MS_IOS = 3200;
/** Android WebView: trzymaj splash aż do treści (lub awaryjny limit). */
const MAX_VISIBLE_MS_ANDROID = 15_000;
const FADE_MS = 320;

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
    if (sessionStorage.getItem(STARTUP_SPLASH_SESSION_KEY) === "1") return false;
  } catch {
    /* private mode */
  }
  return true;
}

export function shouldShowAndroidStartupSplash(): boolean {
  if (typeof window === "undefined") return false;
  if (!isInstalledAndroidAppClient()) return false;
  // Zawsze przy każdym załadowaniu dokumentu w APK — sessionStorage w WebView
  // przeżywa restarty i wcześniej blokowało splash (loader + zielony ekran).
  return true;
}

export function shouldShowStartupSplash(): boolean {
  return shouldShowIosStartupSplash() || shouldShowAndroidStartupSplash();
}

function removeBootSplashDom() {
  if (typeof document === "undefined") return;
  document.getElementById(BOOT_SPLASH_ID)?.remove();
  document.documentElement.classList.remove("awp-boot-splash-pending");
}

function setSplashActiveClass(active: boolean) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle(STARTUP_SPLASH_ACTIVE_CLASS, active);
}

function whenFirstScreenReady(): Promise<void> {
  if (typeof document === "undefined") return Promise.resolve();
  return new Promise((resolve) => {
    const paint = () => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    };
    if (document.readyState === "interactive" || document.readyState === "complete") {
      paint();
      return;
    }
    document.addEventListener("DOMContentLoaded", paint, { once: true });
  });
}

function whenAndroidContentReady(maxMs: number): Promise<void> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      resolve();
    };
    const unsub = subscribeFirstScreenContentReady(finish);
    window.setTimeout(() => {
      unsub();
      finish();
    }, maxMs);
  });
}

export function StartupSplash() {
  const [phase, setPhase] = useState<"hidden" | "show" | "leave">("hidden");

  useEffect(() => {
    const android = shouldShowAndroidStartupSplash();
    const ios = shouldShowIosStartupSplash();
    if (!android && !ios) {
      removeBootSplashDom();
      setSplashActiveClass(false);
      setPhase("hidden");
      return;
    }
    try {
      if (!android) sessionStorage.setItem(STARTUP_SPLASH_SESSION_KEY, "1");
    } catch {
      /* ignore */
    }
    setPhase("show");
    setSplashActiveClass(true);
    // Boot DOM (#awp-boot-splash) zostaje pod React splash — bez dziury na zieleń.
    // Zdejmujemy go dopiero przy beginLeave.

    let hideTimer: number | undefined;
    let cancelled = false;

    const beginLeave = () => {
      if (cancelled) return;
      setPhase("leave");
      setSplashActiveClass(false);
      removeBootSplashDom();
      hideTimer = window.setTimeout(() => {
        if (!cancelled) setPhase("hidden");
      }, FADE_MS);
    };

    const run = async () => {
      if (android) {
        await whenAndroidContentReady(MAX_VISIBLE_MS_ANDROID);
      } else {
        const ready = whenFirstScreenReady();
        const maxWait = new Promise<void>((resolve) => {
          window.setTimeout(resolve, MAX_VISIBLE_MS_IOS);
        });
        await Promise.race([ready, maxWait]);
      }
      if (cancelled) return;
      beginLeave();
    };

    void run();

    return () => {
      cancelled = true;
      setSplashActiveClass(false);
      if (hideTimer) window.clearTimeout(hideTimer);
    };
  }, []);

  if (phase === "hidden") return null;

  return (
    <div
      className={cn(
        "awp-boot-loader fixed inset-0 z-[300] flex items-center justify-center px-6",
        "awp-boot-loader--marketplace",
        phase === "leave" && "awp-boot-loader--leave"
      )}
      role="status"
      aria-live="polite"
      aria-busy={phase === "show"}
      aria-label="Uruchamianie aplikacji"
    >
      <div className="awp-boot-loader__backdrop" aria-hidden>
        <Image
          src="/splash/stadium-bg.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="awp-boot-loader__backdrop-photo object-cover object-[center_35%]"
        />
        <div className="awp-boot-loader__backdrop-scrim" />
      </div>

      <div className="awp-boot-loader__panel">
        <div className="awp-boot-loader__logo-frame">
          <SiteAssetImage
            asset="logo_login"
            alt=""
            width={320}
            height={320}
            className="awp-boot-loader__logo"
            sizes="(max-width: 480px) 120px, 144px"
            priority
            decorative
          />
        </div>

        <h1 className="awp-boot-loader__title">Akademia Wielkich Piłkarzy</h1>
        <p className="awp-boot-loader__status">Przygotowujemy boiska…</p>

        <div className="awp-boot-loader__dots" aria-hidden>
          <span className="awp-boot-loader__dot" />
          <span className="awp-boot-loader__dot" />
          <span className="awp-boot-loader__dot" />
        </div>
      </div>
    </div>
  );
}
