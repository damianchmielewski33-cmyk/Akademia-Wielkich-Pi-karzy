import { cn } from "@/lib/utils";

/** Styl jak „Tryb testowy” (złoty) — domyślny przycisk admina. */
export const adminGoldBtnClass =
  "border border-[var(--mundial-gold,#f5c518)] bg-[var(--mundial-gold,#f5c518)]/90 text-[var(--mundial-navy,#0a1628)] shadow-md shadow-black/25 hover:bg-[var(--mundial-gold,#f5c518)]";

/** Aktywny / włączony — jak tryb testowy ON. */
export const adminGoldBtnActiveClass =
  "border-amber-300/80 bg-gradient-to-br from-amber-500 via-orange-600 to-red-700 text-white shadow-amber-950/40 hover:brightness-110";

/**
 * Chrome sidebara: pełna szerokość, ikona w ramce, tytuł + opcjonalny podtytuł.
 * Bazuje na stylu przycisku „Tryb testowy”.
 */
export const adminChromeBtnBaseClass =
  "awp-focus-ring group relative flex h-10 w-full items-center gap-2 overflow-hidden rounded-lg border px-2.5 text-left shadow-sm transition-[transform,box-shadow,background-color] active:translate-y-px disabled:pointer-events-none disabled:opacity-60";

export const adminChromeBtnIdleClass = cn(adminGoldBtnClass);

export const adminChromeBtnActiveClass = adminGoldBtnActiveClass;
