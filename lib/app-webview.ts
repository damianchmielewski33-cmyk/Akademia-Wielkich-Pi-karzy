/**
 * WebView aplikacji Android dokleja ten token do User-Agenta (patrz WebPortalScreen.kt).
 * Dzięki temu strona odróżnia zwykłą przeglądarkę mobilną (RWD) od tego samego contentu
 * wyświetlanego wewnątrz natywnej aplikacji — np. nie ma sensu tam pokazywać banera
 * z zachętą do pobrania aplikacji, skoro użytkownik już w niej jest.
 */
const APP_WEBVIEW_UA_MARKER = "AWPAndroidApp";

export function isAppWebViewUserAgent(ua: string | null | undefined): boolean {
  if (!ua) return false;
  return ua.includes(APP_WEBVIEW_UA_MARKER);
}

/** Do użycia w komponentach klienckich — bezpieczne poza przeglądarką (SSR). */
export function isRunningInAppWebView(): boolean {
  if (typeof navigator === "undefined") return false;
  return isAppWebViewUserAgent(navigator.userAgent);
}
