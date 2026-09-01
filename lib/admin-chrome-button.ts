import { cn } from "@/lib/utils";

/** Styl domyślnego przycisku admina (teal V2). */
export const adminGoldBtnClass =
  "border border-[var(--mp-teal)]/80 bg-[var(--mp-teal)] text-white shadow-sm hover:bg-[var(--mp-teal-dark)]";

/** Aktywny / włączony — teal V2. */
export const adminGoldBtnActiveClass =
  "border-[var(--mp-teal-dark)] bg-[var(--mp-teal-dark)] text-white shadow-sm hover:brightness-110";

/**
 * Chrome sidebara: pełna szerokość, ikona w ramce, tytuł + opcjonalny podtytuł.
 * Bazuje na stylu przycisku „Tryb testowy”.
 */
export const adminChromeBtnBaseClass =
  "awp-focus-ring group relative flex h-10 w-full items-center gap-2 overflow-hidden rounded-lg border px-2.5 text-left shadow-sm transition-[transform,box-shadow,background-color] active:translate-y-px disabled:pointer-events-none disabled:opacity-60";

export const adminChromeBtnIdleClass = cn(adminGoldBtnClass);

export const adminChromeBtnActiveClass = adminGoldBtnActiveClass;
