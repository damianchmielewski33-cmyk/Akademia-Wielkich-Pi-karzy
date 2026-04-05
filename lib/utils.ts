import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Kwota do wyświetlenia w UI: skończona liczba (kolumna REAL może być null lub śmieciem). */
export function isValidMatchFee(fee: number | null | undefined): fee is number {
  return fee != null && Number.isFinite(fee);
}

/** Wartość początkowa pola „kwota” w formularzach edycji meczu. */
export function matchFeeToInputString(fee: number | null | undefined): string {
  return isValidMatchFee(fee) ? String(fee) : "";
}

export type ParsedMatchFee = { ok: true; fee: number | null } | { ok: false };

/** Parsuje pole tekstowe kwoty wpisowego: puste → null, liczba nieujemna → wartość. */
export function parseMatchFeeInput(rawInput: string): ParsedMatchFee {
  const raw = rawInput.trim().replace(",", ".");
  if (raw === "") return { ok: true, fee: null };
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return { ok: false };
  return { ok: true, fee: n };
}
