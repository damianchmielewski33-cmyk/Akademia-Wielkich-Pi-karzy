/**
 * Sygnał „pierwszy ekran gotowy” dla cold startu Androida / splash WWW.
 * Bez zależności od React/Next — da się testować w Vitest (node).
 */

import { isInstalledAndroidAppClient } from "@/lib/app-webview";

export const ANDROID_COLD_PRELOADER_KEY = "awp-android-route-preloader-ok";
export const STARTUP_SPLASH_SESSION_KEY = "awp-startup-splash-shown";
export const STARTUP_SPLASH_ACTIVE_CLASS = "awp-startup-splash-active";

type ContentReadyListener = () => void;

let contentReadyListeners: ContentReadyListener[] = [];
let contentReadyFired = false;

/** Tylko do testów. */
export function resetAndroidContentReadyStateForTests(): void {
  contentReadyListeners = [];
  contentReadyFired = false;
}

export function markAndroidColdStartPreloadersDone(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(ANDROID_COLD_PRELOADER_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function shouldSuppressStartupRoutePreloader(): boolean {
  if (typeof document === "undefined") return false;
  if (document.documentElement.classList.contains(STARTUP_SPLASH_ACTIVE_CLASS)) return true;
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

/**
 * Pierwszy ekran (np. nagłówek „Najbliższy mecz”) jest namalowany —
 * zdejmij splash WWW + poinformuj natywny most Androida.
 */
export function notifyFirstScreenContentReady(): void {
  if (typeof window === "undefined") return;
  if (contentReadyFired) return;
  contentReadyFired = true;

  try {
    document.documentElement.setAttribute("data-awp-content-ready", "1");
  } catch {
    /* ignore */
  }

  markAndroidColdStartPreloadersDone();

  try {
    window.AwpAndroid?.notifyContentReady?.();
  } catch {
    /* most niedostępny / stary APK */
  }

  const listeners = contentReadyListeners;
  contentReadyListeners = [];
  for (const listener of listeners) {
    try {
      listener();
    } catch {
      /* ignore */
    }
  }
}

export function subscribeFirstScreenContentReady(listener: ContentReadyListener): () => void {
  if (contentReadyFired) {
    listener();
    return () => {};
  }
  contentReadyListeners = [...contentReadyListeners, listener];
  return () => {
    contentReadyListeners = contentReadyListeners.filter((l) => l !== listener);
  };
}
