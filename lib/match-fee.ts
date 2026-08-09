/**
 * Składka za wynajem boiska.
 * `matches.fee_pln` = całkowita kwota wynajmu; koszt na osobę = wynajem / zapisani, zaokrąglony w górę do 0,50 zł.
 */

function roundPln(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Zaokrągla kwotę w górę do pełnych 50 groszy (0,50 PLN). */
export function ceilToHalfPln(amount: number): number {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  return Math.ceil(amount * 2 - Number.EPSILON) / 2;
}

/**
 * Dokładny koszt na osobę (bez zawyżenia do 0,50 zł).
 * Zwraca `null`, gdy brak wynajmu lub brak zapisanych osób.
 */
export function exactPerPersonMatchFeePln(
  rentalTotalPln: number | null | undefined,
  signedUp: number
): number | null {
  if (rentalTotalPln == null || !Number.isFinite(rentalTotalPln) || rentalTotalPln < 0) {
    return null;
  }
  if (!Number.isFinite(signedUp) || signedUp <= 0) return null;
  return rentalTotalPln / signedUp;
}

/**
 * Różnica między składką pobraną (ceil do 0,50) a dokładnym podziałem wynajmu.
 * Ta kwota może pokryć część prowizji operatora płatności.
 */
export function perPersonFeeRoundingMarkupPln(
  rentalTotalPln: number | null | undefined,
  signedUp: number
): number {
  const exact = exactPerPersonMatchFeePln(rentalTotalPln, signedUp);
  if (exact == null) return 0;
  const charged = ceilToHalfPln(exact);
  return roundPln(Math.max(0, charged - exact));
}

/**
 * Zawyżenie składki dla konkretnego obciążenia portfela.
 * Kredyt przyznajemy tylko gdy kwota obciążenia zgadza się z standardowym ceil do 0,50.
 */
export function matchChargeRoundingMarkupPln(
  chargedAmountPln: number,
  rentalTotalPln: number | null | undefined,
  signedUp: number
): number {
  if (!Number.isFinite(chargedAmountPln) || chargedAmountPln <= 0) return 0;
  const exact = exactPerPersonMatchFeePln(rentalTotalPln, signedUp);
  if (exact == null) return 0;
  const expectedCharged = ceilToHalfPln(exact);
  if (Math.abs(chargedAmountPln - expectedCharged) > 0.011) return 0;
  return roundPln(Math.max(0, chargedAmountPln - exact));
}

/**
 * Zawyżenie składki dla koszyka (N osób × markup na osobę).
 */
export function matchCartRoundingMarkupPln(
  rentalTotalPln: number | null | undefined,
  signedUp: number,
  beneficiaryCount: number
): number {
  const n = Math.max(0, Math.floor(beneficiaryCount));
  if (n <= 0) return 0;
  return roundPln(perPersonFeeRoundingMarkupPln(rentalTotalPln, signedUp) * n);
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
  const v = roundPln(amount);
  return new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN" }).format(v);
}
