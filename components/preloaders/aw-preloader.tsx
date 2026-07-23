"use client";

import { SiteAssetImage } from "@/components/site-asset-image";
import { cn } from "@/lib/utils";

type AwPreloaderProps = {
  /** Krótki opis pod paskiem postępu (inline / overlay). */
  label?: string;
  className?: string;
  /** `page` — pełna karta; `compact` — sam wskaźnik bez tła karty. */
  variant?: "page" | "compact";
};

export function AwPreloader({ label, className, variant = "page" }: AwPreloaderProps) {
  if (variant === "compact") {
    return (
      <div className={cn("awp-preloader awp-preloader--compact", className)} role="status" aria-live="polite">
        <div className="awp-preloader__spinner" aria-hidden />
        {label ? <p className="awp-preloader__label">{label}</p> : null}
      </div>
    );
  }

  return (
    <div className={cn("awp-preloader awp-preloader--page", className)} role="status" aria-live="polite">
      <div className="awp-preloader__crest">
        <SiteAssetImage asset="logo_header" alt="" width={160} height={160} className="h-11 w-11 drop-shadow" sizes="44px" priority />
      </div>
      <div className="awp-preloader__track" aria-hidden>
        <div className="awp-preloader__bar" />
      </div>
      {label ? <p className="awp-preloader__label">{label}</p> : null}
    </div>
  );
}
