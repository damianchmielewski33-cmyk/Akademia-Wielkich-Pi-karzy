/**
 * WebView aplikacji Android dokleja ten token do User-Agenta (patrz WebPortalScreen.kt).
 * Dzięki temu strona odróżnia zwykłą przeglądarkę mobilną (RWD) od tego samego contentu
 * wyświetlanego wewnątrz natywnej aplikacji — np. nie ma sensu tam pokazywać banera
 * z zachętą do pobrania aplikacji, skoro użytkownik już w niej jest.
 */
const APP_WEBVIEW_UA_MARKER = "AWPAndroidApp";
const APP_WEBVIEW_VERSION_RE = /AWPAndroidApp\/([^\s]+)/;
const APP_WEBVIEW_CODE_RE = /AWPAndroidCode\/(\d+)/;

export function isAppWebViewUserAgent(ua: string | null | undefined): boolean {
  if (!ua) return false;
  return ua.includes(APP_WEBVIEW_UA_MARKER);
}

/** Do użycia w komponentach klienckich — bezpieczne poza przeglądarką (SSR). */
export function isRunningInAppWebView(): boolean {
  if (typeof navigator === "undefined") return false;
  return isAppWebViewUserAgent(navigator.userAgent);
}

export type AndroidAppIdentity = {
  versionName: string;
  versionCode: number | null;
};

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
  latest: { versionName: string; versionCode: number }
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
