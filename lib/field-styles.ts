import { cn } from "@/lib/utils";

/** Wspólne klasy dla pól edytowalnych (input, textarea, select). */
export const fieldBaseClasses =
  "awp-focus-ring flex w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-zinc-900 shadow-sm shadow-emerald-950/[0.04] ring-offset-transparent transition-[border-color,box-shadow,background-color] file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-zinc-400 disabled:cursor-not-allowed disabled:opacity-55 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500";

/** Natywny `<select>` — spójny z polami formularza (lista rozwijana przez przeglądarkę). */
export const nativeSelectClasses = cn(
  fieldControlClasses({ height: "min-h-11 py-2" }),
  "awp-native-select block cursor-pointer pr-9"
);

export const fieldDefaultBorder =
  "border-emerald-950/12 hover:border-emerald-700/25 focus-visible:border-emerald-500/70 dark:border-emerald-100/12 dark:hover:border-emerald-400/25 dark:focus-visible:border-emerald-400/55";

export const fieldErrorBorder =
  "border-red-400/80 hover:border-red-500/90 focus-visible:border-red-500 dark:border-red-500/70 dark:hover:border-red-400 dark:focus-visible:border-red-400";

export const fieldSuccessBorder =
  "border-emerald-500/60 focus-visible:border-emerald-500 dark:border-emerald-400/50";

export function fieldControlClasses({
  invalid,
  valid,
  className,
  height = "h-11",
}: {
  invalid?: boolean;
  valid?: boolean;
  className?: string;
  /** Dla textarea ustaw `min-h` zamiast stałej wysokości. */
  height?: string;
}) {
  return cn(
    fieldBaseClasses,
    height,
    invalid ? fieldErrorBorder : valid ? fieldSuccessBorder : fieldDefaultBorder,
    invalid && "bg-red-50/40 dark:bg-red-950/20",
    className
  );
}
