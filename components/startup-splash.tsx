"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { SiteAssetImage } from "@/components/site-asset-image";
import { isInstalledAndroidAppClient } from "@/lib/app-webview";
import { cn } from "@/lib/utils";

const SESSION_KEY = "awp-startup-splash-shown";
const ANDROID_COLD_PRELOADER_KEY = "awp-android-route-preloader-ok";
const BOOT_SPLASH_ID = "awp-boot-splash";
const ACTIVE_CLASS = "awp-startup-splash-active";
const MAX_VISIBLE_MS = 3200;
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
    if (sessionStorage.getItem(SESSION_KEY) === "1") return false;
  } catch {
    /* private mode */
  }
  return true;
}

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

export function StartupSplash() {
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
      const ready = whenFirstScreenReady();
      const maxWait = new Promise<void>((resolve) => {
        window.setTimeout(resolve, MAX_VISIBLE_MS);
      });
      await Promise.race([ready, maxWait]);
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
        <p className="awp-boot-loader__status">
          Przygotowujemy boiska…
        </p>

        <div className="awp-boot-loader__dots" aria-hidden>
          <span className="awp-boot-loader__dot" />
          <span className="awp-boot-loader__dot" />
          <span className="awp-boot-loader__dot" />
        </div>
      </div>
    </div>
  );
}
