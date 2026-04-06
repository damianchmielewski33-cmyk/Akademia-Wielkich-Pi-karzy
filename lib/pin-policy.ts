/** Komunikat przy odrzuceniu zbyt przewidywalnego PIN-u. */
export const WEAK_PIN_MESSAGE =
  "Ten PIN jest zbyt przewidywalny (np. 1234, same cyfry). Wybierz inny.";

/** PIN: 4–6 cyfr (string). */
export function isValidPinFormat(pin: string): boolean {
  return /^[0-9]{4,6}$/.test(pin.trim());
}

const WEAK_SEQUENCES = [
  "0123",
  "1234",
  "2345",
  "3456",
  "4567",
  "5678",
  "6789",
  "9876",
  "8765",
  "7654",
  "6543",
  "5432",
  "4321",
  "3210",
];

/** Prosta heurystyka słabych PIN-ów (sekwencje, powtórzenia). */
export function isWeakPin(pin: string): boolean {
  const p = pin.trim();
  if (!isValidPinFormat(p)) return true;
  if (/^(\d)\1+$/.test(p)) return true;
  for (let i = 0; i <= p.length - 4; i++) {
    const slice = p.slice(i, i + 4);
    if (WEAK_SEQUENCES.includes(slice)) return true;
  }
  if (p === "1212" || p === "6969" || p === "1004" || p === "2000" || p === "2020" || p === "2021") {
    return true;
  }
  return false;
}
