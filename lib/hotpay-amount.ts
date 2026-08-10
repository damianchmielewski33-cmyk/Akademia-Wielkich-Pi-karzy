/**
 * Czyste helpery kwot HotPay — bez Node crypto / env.
 * Bezpieczne w komponentach klienckich.
 */

/** Kwota w formacie wymaganym przez HotPay (np. "50.00"). */
export function formatHotpayAmount(amountPln: number): string {
  const n = Math.round(Number(amountPln) * 100) / 100;
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error("Nieprawidłowa kwota HotPay");
  }
  return n.toFixed(2);
}

/**
 * Oblicza kwotę brutto (do operatora) z kwoty netto.
 *
 * Wzór bazowy: gross = ⌈ (net + fixed) / (1 − pct/100) × 100 ⌉ / 100
 *
 * `commissionOffsetPln` — kwota odjęta od prowizji zawodnika (np. zawyżenie składki
 * meczu do pełnych 0,50 zł). Nie może obniżyć brutto poniżej netto.
 *
 * Gdy pct = 0 i fixed = 0 → gross = net (bez powiększania).
 */
export function grossUpHotpayAmount(
  netPln: number,
  commissionPct: number,
  commissionFixedPln: number,
  commissionOffsetPln = 0
): number {
  if ((commissionPct <= 0 || !Number.isFinite(commissionPct)) && commissionFixedPln <= 0) {
    return netPln;
  }
  const pct = Math.max(0, Math.min(commissionPct, 99)); // 0–99%
  const fixed = Math.max(0, commissionFixedPln);
  const rate = pct / 100;
  const rawGross = Math.ceil(((netPln + fixed) / (1 - rate)) * 100) / 100;
  const commission = Math.round((rawGross - netPln) * 100) / 100;
  const offset = Math.min(
    Math.max(0, Number.isFinite(commissionOffsetPln) ? commissionOffsetPln : 0),
    commission
  );
  return Math.round((netPln + commission - offset) * 100) / 100;
}
