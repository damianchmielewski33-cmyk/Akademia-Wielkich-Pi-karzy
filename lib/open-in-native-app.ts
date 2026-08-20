/**
 * Otwieranie linków zaproszeń / płatności w zainstalowanej aplikacji Android.
 * iOS: natywna aplikacja nie jest w sklepie — PWA nie przejmuje uniwersalnych linków z Safari.
 */

export const ANDROID_APP_PACKAGE =
  (typeof process !== "undefined" && process.env.NEXT_PUBLIC_ANDROID_APP_PACKAGE_NAME?.trim()) ||
  "pl.akademiawielkichpilkarzy.player";

/** Ścieżki, które aplikacja Android obsługuje przez App Links / intent. */
export function isNativeAppDeepLinkPath(pathname: string): boolean {
  return (
    pathname.startsWith("/zaproszenie") ||
    pathname.startsWith("/platnosci-public") ||
    pathname === "/platnosci" ||
    pathname.startsWith("/platnosci/")
  );
}

/** Detekcja Androida w zwykłej przeglądarce (nie WebView APK). */
export function shouldTryOpenAndroidApp(ua: string): boolean {
  if (!ua) return false;
  if (/AWPAndroidApp/i.test(ua)) return false;
  return /Android/i.test(ua);
}

/**
 * Intent URL: system próbuje otworzyć naszą aplikację; gdy brak — wraca do HTTPS (fallback).
 * @see https://developer.chrome.com/docs/android/intents
 */
export function buildAndroidAppIntentUrl(absoluteHttpsUrl: string, packageName = ANDROID_APP_PACKAGE): string {
  let u: URL;
  try {
    u = new URL(absoluteHttpsUrl);
  } catch {
    return absoluteHttpsUrl;
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return absoluteHttpsUrl;
  const hostPath = `${u.host}${u.pathname}${u.search}`;
  const fallback = encodeURIComponent(u.toString());
  return `intent://${hostPath}#Intent;scheme=${u.protocol.replace(":", "")};package=${packageName};S.browser_fallback_url=${fallback};end`;
}
