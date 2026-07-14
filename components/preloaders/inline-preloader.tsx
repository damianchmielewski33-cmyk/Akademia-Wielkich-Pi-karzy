"use client";

import { AwPreloader } from "./aw-preloader";
import { cn } from "@/lib/utils";

type InlinePreloaderProps = {
  label?: string;
  className?: string;
  /** Pełna szerokość z paddingiem — dialog / sekcja listy. */
  layout?: "block" | "overlay";
};

export function InlinePreloader({
  label = "Ładowanie…",
  className,
  layout = "block",
}: InlinePreloaderProps) {
  if (layout === "overlay") {
    return (
      <div
        className={cn(
          "absolute inset-0 z-10 flex items-center justify-center rounded-[inherit] bg-emerald-950/70 backdrop-blur-[2px]",
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
