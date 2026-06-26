export const MATCH_CANCEL_REASONS = [
  { value: "no-lineup", label: "Brak składu" },
  { value: "weather", label: "Pogoda" },
  { value: "field-unavailable", label: "Boisko niedostępne" },
  { value: "insufficient-players", label: "Niewystarczająca liczba zawodników" },
  { value: "admin-decision", label: "Decyzja administratora" },
] as const;

export type MatchCancelReason = (typeof MATCH_CANCEL_REASONS)[number]["value"];

export function matchCancelReasonLabel(value: string): string {
  return MATCH_CANCEL_REASONS.find((r) => r.value === value)?.label ?? value;
}
