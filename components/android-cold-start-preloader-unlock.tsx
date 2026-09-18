"use client";

/**
 * Odblokowanie preloaderów tras po cold starcie Androida dzieje się
 * w `notifyFirstScreenContentReady` (gdy widać treść, np. „Najbliższy mecz”).
 * Ten komponent zostaje jako no-op, żeby nie odpalać loadera po sztucznym timeoutcie.
 */
export function AndroidColdStartPreloaderUnlock() {
  return null;
}
