import { cn } from "@/lib/utils";

/** Wspólne klasy dla pól edytowalnych (input, textarea, select). */
export const fieldBaseClasses =
  "awp-focus-ring flex w-full rounded-xl border bg-zinc-50/90 px-3.5 py-2.5 text-sm text-zinc-900 shadow-[inset_0_1px_2px_rgba(15,23,42,0.04)] ring-offset-transparent transition-[border-color,box-shadow,background-color] file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-zinc-400 disabled:cursor-not-allowed disabled:opacity-55 dark:bg-zinc-900/70 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:shadow-[inset_0_1px_2px_rgba(0,0,0,0.2)]";

/** Natywny `<select>` — spójny z polami formularza (lista rozwijana przez przeglądarkę). */
export const nativeSelectClasses = cn(
  fieldControlClasses({ height: "min-h-12 py-2" }),
  "awp-native-select block cursor-pointer pr-9"
);

export const fieldDefaultBorder =
  "border-zinc-200/90 hover:border-zinc-300 focus-visible:border-emerald-500/70 focus-visible:bg-white focus-visible:shadow-[0_0_0_4px_rgba(16,185,129,0.12)] dark:border-zinc-600/80 dark:hover:border-zinc-500 dark:focus-visible:border-emerald-400/60 dark:focus-visible:bg-zinc-900 dark:focus-visible:shadow-[0_0_0_4px_rgba(52,211,153,0.14)]";

export const fieldErrorBorder =
  "border-red-400/80 hover:border-red-500/90 focus-visible:border-red-500 focus-visible:shadow-[0_0_0_4px_rgba(239,68,68,0.12)] dark:border-red-500/70 dark:hover:border-red-400 dark:focus-visible:border-red-400 dark:focus-visible:shadow-[0_0_0_4px_rgba(248,113,113,0.14)]";

export const fieldSuccessBorder =
  "border-emerald-500/60 focus-visible:border-emerald-500 focus-visible:shadow-[0_0_0_4px_rgba(16,185,129,0.12)] dark:border-emerald-400/50 dark:focus-visible:border-emerald-400";

export function fieldControlClasses({
  invalid,
  valid,
  className,
  height = "h-12",
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
    invalid && "bg-red-50/50 dark:bg-red-950/25",
    className
  );
}
