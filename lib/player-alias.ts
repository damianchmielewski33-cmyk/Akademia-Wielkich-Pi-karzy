/** Minimalna i maksymalna długość pseudonimu piłkarza (awatar) po normalizacji. */
export const PLAYER_ALIAS_MIN_LEN = 2;
export const PLAYER_ALIAS_MAX_LEN = 120;

/**
 * Normalizuje wpis użytkownika: trim, NFC, pojedyncze spacje.
 * Zwraca null przy nieprawidłowej długości lub pustym ciągu.
 */
export function normalizePlayerAlias(input: string): string | null {
  const collapsed = input.trim().replace(/\s+/g, " ");
  if (!collapsed) return null;
  const n = collapsed.normalize("NFC");
  if (n.length < PLAYER_ALIAS_MIN_LEN || n.length > PLAYER_ALIAS_MAX_LEN) return null;
  return n;
}
