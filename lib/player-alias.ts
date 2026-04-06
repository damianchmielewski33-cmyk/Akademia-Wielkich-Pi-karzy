import { ALL_PLAYERS } from "@/lib/constants";

/**
 * Mapuje wartość z formularza na dokładny wpis z ALL_PLAYERS.
 * Ujednolica Unicode (NFC), żeby uniknąć rozjazdu NFD/NFC między klientem a serwerem.
 */
export function resolveCanonicalPlayerAlias(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const n = trimmed.normalize("NFC");
  for (const p of ALL_PLAYERS) {
    if (p.normalize("NFC") === n) return p;
  }
  return null;
}
