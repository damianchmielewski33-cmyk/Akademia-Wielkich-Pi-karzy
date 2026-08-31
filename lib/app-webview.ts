/**
 * WebView aplikacji Android dokleja ten token do User-Agenta (patrz WebPortalScreen.kt).
 * Dzięki temu strona odróżnia zwykłą przeglądarkę mobilną (RWD) od tego samego contentu
 * wyświetlanego wewnątrz natywnej aplikacji — np. nie ma sensu tam pokazywać banera
 * z zachętą do pobrania aplikacji, skoro użytkownik już w niej jest.
 */
const APP_WEBVIEW_UA_MARKER = "AWPAndroidApp";
const APP_WEBVIEW_VERSION_RE = /AWPAndroidApp\/([^\s]+)/;
const APP_WEBVIEW_CODE_RE = /AWPAndroidCode\/(\d+)/;

export const ANDROID_UPDATE_LATER_STORAGE_PREFIX = "awp-android-update-later:";

declare global {
  interface Window {
    AwpAndroid?: {
      getVersionName: () => string;
      getVersionCode: () => number;
      checkUpdate: () => void;
      /** Otwiera URL poza WebView (Custom Tabs) — np. GymBrat. */
      openExternalUrl?: (url: string) => void;
      /** CSV ms: "40" albo "0,40,60,40" (vibrate/pause). */
      vibrate?: (patternCsv: string) => void;
    };
  }
}

export function isAppWebViewUserAgent(ua: string | null | undefined): boolean {
  if (!ua) return false;
  return ua.includes(APP_WEBVIEW_UA_MARKER);
}

/** Do użycia w komponentach klienckich — bezpieczne poza przeglądarką (SSR). */
export function isRunningInAppWebView(): boolean {
  if (typeof navigator === "undefined") return false;
  return isAppWebViewUserAgent(navigator.userAgent);
}

/** Zainstalowany APK: most JS albo User-Agent WebView. Zwykła przeglądarka / PWA — nie. */
export function isInstalledAndroidAppClient(): boolean {
  if (typeof window === "undefined") return false;
  if (window.AwpAndroid) return true;
  return isRunningInAppWebView();
}

/** W APK otwiera link w Custom Tabs — bez nawigacji WebView i utraty sesji AWP. */
export function openExternalAppUrl(url: string): boolean {
  if (typeof window === "undefined") return false;
  const trimmed = url.trim();
  if (!trimmed) return false;
  try {
    const bridge = window.AwpAndroid;
    if (bridge?.openExternalUrl) {
      bridge.openExternalUrl(trimmed);
      return true;
    }
  } catch {
    /* most niedostępny */
  }
  return false;
}

export type AndroidAppIdentity = {
  versionName: string;
  versionCode: number | null;
};

export type AndroidLatestVersion = {
  versionName: string;
  versionCode: number;
};

export function readInstalledAndroidAppIdentity(): AndroidAppIdentity | null {
  if (typeof window === "undefined") return null;
  try {
    const bridge = window.AwpAndroid;
    if (bridge) {
      const versionName = String(bridge.getVersionName?.() ?? "").trim();
      const versionCode = Number(bridge.getVersionCode?.());
      if (versionName) {
        return {
          versionName,
          versionCode: Number.isFinite(versionCode) ? versionCode : null,
        };
      }
    }
  } catch {
    /* most niedostępny */
  }
  return parseAndroidAppIdentity(typeof navigator === "undefined" ? "" : navigator.userAgent);
}

export function parseAndroidAppIdentity(ua: string | null | undefined): AndroidAppIdentity | null {
  if (!isAppWebViewUserAgent(ua)) return null;
  const name = ua?.match(APP_WEBVIEW_VERSION_RE)?.[1]?.trim();
  if (!name) return { versionName: "nieznana", versionCode: null };
  const codeRaw = ua?.match(APP_WEBVIEW_CODE_RE)?.[1];
  const versionCode = codeRaw ? Number(codeRaw) : null;
  return {
    versionName: name,
    versionCode: Number.isFinite(versionCode) ? versionCode : null,
  };
}

/** Dodatnie, gdy `latest` jest nowsza od `current`. */
export function compareAndroidAppVersion(
  current: AndroidAppIdentity,
  latest: AndroidLatestVersion
): number {
  if (current.versionCode != null && Number.isFinite(current.versionCode)) {
    return latest.versionCode - current.versionCode;
  }
  return compareVersionName(latest.versionName, current.versionName);
}

export function compareVersionName(a: string, b: string): number {
  const pa = a.split(/[^\d]+/).map((x) => Number(x)).filter((n) => Number.isFinite(n));
  const pb = b.split(/[^\d]+/).map((x) => Number(x)).filter((n) => Number.isFinite(n));
  const n = Math.max(pa.length, pb.length);
  for (let i = 0; i < n; i++) {
    const da = pa[i] ?? 0;
    const db = pb[i] ?? 0;
    if (da !== db) return da - db;
  }
  return 0;
}

export function androidUpdateLaterStorageKey(versionCode: number): string {
  return `${ANDROID_UPDATE_LATER_STORAGE_PREFIX}${versionCode}`;
}

/** Popup tylko w zainstalowanym APK, gdy serwer ma nowszą kompilację. */
export function shouldShowAndroidUpdatePrompt(args: {
  inInstalledApp: boolean;
  current: AndroidAppIdentity | null;
  latest: AndroidLatestVersion | null;
  postponedVersionCode?: number | null;
}): boolean {
  if (!args.inInstalledApp || !args.current || !args.latest) return false;
  if (compareAndroidAppVersion(args.current, args.latest) <= 0) return false;
  if (args.postponedVersionCode === args.latest.versionCode) return false;
  return true;
}
