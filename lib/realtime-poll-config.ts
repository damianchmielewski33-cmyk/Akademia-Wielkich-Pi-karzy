/**
 * Interwały krótkiego HTTP poll (Render Free — bez długotrwałego SSE).
 * Agresywny poll co ~1 s w tle spala Active CPU i budzi sen Free.
 */
export const REALTIME_POLL = {
  /** Odznaka nieprzeczytanych / wątki w tle */
  badgeMs: 45_000,
  /** Otwarty wątek czatu z organizatorem */
  openThreadMs: 12_000,
  /** Wiadomości w panelu admina (nagłówek) */
  adminHeaderMs: 60_000,
} as const;
