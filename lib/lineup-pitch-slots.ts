/** Łączna liczba pól na boisku zależy od liczby zapisów (min–max). */

export const LINEUP_PITCH_SLOTS_MIN = 12;
export const LINEUP_PITCH_SLOTS_MAX = 16;

/** Liczba pól = liczba zapisanych (commitment=1), ograniczona do [12, 16]. */
export function pitchSlotTotalFromSignupCount(signupCount: number): number {
  return Math.min(Math.max(signupCount, LINEUP_PITCH_SLOTS_MIN), LINEUP_PITCH_SLOTS_MAX);
}

/** Drużyna A (home) — dolna połowa: więcej pól przy nieparzystej sumie. */
export function pitchHalfSlotCounts(total: number): { home: number; away: number } {
  return {
    home: Math.ceil(total / 2),
    away: Math.floor(total / 2),
  };
}
