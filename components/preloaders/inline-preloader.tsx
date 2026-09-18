"use client";

import { useDelayedVisible } from "./use-delayed-visible";
import { cn } from "@/lib/utils";
import { LoadingIndicator } from "./loading-indicator";

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
        <div className="flex flex-col items-center gap-3">
          <LoadingIndicator variant="inline" size="md" />
          <span className="awp-loader__label">{label}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex justify-center py-10", className)} role="status" aria-live="polite" aria-label={label}>
      <div className="flex flex-col items-center gap-3">
        <LoadingIndicator variant="inline" size="md" />
        <span className="awp-loader__label">{label}</span>
      </div>
    </div>
  );
}
