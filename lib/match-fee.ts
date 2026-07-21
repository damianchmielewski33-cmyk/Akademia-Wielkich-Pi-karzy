/**
 * Składka za wynajem boiska.
 * `matches.fee_pln` = całkowita kwota wynajmu; koszt na osobę = wynajem / zapisani, zaokrąglony w górę do 0,50 zł.
 */

/** Zaokrągla kwotę w górę do pełnych 50 groszy (0,50 PLN). */
export function ceilToHalfPln(amount: number): number {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  return Math.ceil(amount * 2 - Number.EPSILON) / 2;
}

/**
 * Koszt na jedną osobę przy danej liczbie zapisanych (confirmed / `signed_up`).
 * Zwraca `null`, gdy brak wynajmu lub brak zapisanych osób.
 */
export function perPersonMatchFeePln(
  rentalTotalPln: number | null | undefined,
  signedUp: number
): number | null {
  if (rentalTotalPln == null || !Number.isFinite(rentalTotalPln) || rentalTotalPln < 0) {
    return null;
  }
  if (!Number.isFinite(signedUp) || signedUp <= 0) return null;
  return ceilToHalfPln(rentalTotalPln / signedUp);
}

/** Formatowanie kwoty PLN (pl-PL). */
export function formatMatchFeePln(amount: number): string {
  const v = Math.round(amount * 100) / 100;
  return new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN" }).format(v);
}
