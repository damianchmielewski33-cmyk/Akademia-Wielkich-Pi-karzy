"use client";

import { AwPreloader } from "./aw-preloader";
import { useDelayedVisible } from "./use-delayed-visible";
import { cn } from "@/lib/utils";

type InlinePreloaderProps = {
  label?: string;
  className?: string;
  /** Pełna szerokość z paddingiem — dialog / sekcja listy. */
  layout?: "block" | "overlay";
  /** Pokaż od razu (np. długie uploady). Domyślnie z opóźnieniem. */
  immediate?: boolean;
};

export function InlinePreloader({
  label = "Ładowanie…",
  className,
  layout = "block",
  immediate = false,
}: InlinePreloaderProps) {
  const show = useDelayedVisible(true, immediate ? 0 : undefined);

  if (!show) {
    return layout === "overlay" ? null : <div className={cn("min-h-[3.5rem]", className)} aria-hidden />;
  }

  if (layout === "overlay") {
    return (
      <div
        className={cn(
          "absolute inset-0 z-10 flex items-center justify-center rounded-[inherit] bg-white/80 backdrop-blur-[2px] dark:bg-zinc-950/80",
          className
        )}
        role="status"
        aria-live="polite"
        aria-label={label}
      >
        <AwPreloader variant="compact" label={label} />
      </div>
    );
  }

  return (
    <div className={cn("flex justify-center py-10", className)} role="status" aria-live="polite" aria-label={label}>
      <AwPreloader variant="compact" label={label} />
    </div>
  );
}
