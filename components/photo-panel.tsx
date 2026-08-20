"use client";

import type { ReactNode } from "react";
import { MarketplacePitchPhoto } from "@/components/marketplace-pitch-photo";
import { PitchCardDecorations } from "@/components/ui/pitch-card";
import { useSiteMode } from "@/components/site-mode";
import { cn } from "@/lib/utils";

type Props = {
  src: string;
  className?: string;
  contentClassName?: string;
  overlayClassName?: string;
  sizes?: string;
  priority?: boolean;
  children: ReactNode;
};

/** Zdjęcie boiska (marketplace) albo kafelek murawy (produkcja akademii). */
export function PhotoPanel({
  src,
  className,
  contentClassName,
  overlayClassName,
  sizes = "(max-width: 768px) 100vw, 720px",
  priority,
  children,
}: Props) {
  const { marketplaceEnabled } = useSiteMode();

  if (!marketplaceEnabled) {
    return (
      <div className={cn("relative isolate overflow-hidden rounded-2xl text-white shadow-lg home-pitch-tile", className)}>
        <PitchCardDecorations />
        <div className={cn("relative z-10", contentClassName)}>{children}</div>
      </div>
    );
  }

  return (
    <div className={cn("relative isolate overflow-hidden rounded-2xl text-white shadow-lg", className)}>
      <div className="absolute inset-0 z-0 bg-zinc-800">
        <MarketplacePitchPhoto src={src} sizes={sizes} priority={priority} />
      </div>
      <div
        className={cn(
          "pointer-events-none absolute inset-0 z-[1] bg-gradient-to-t from-black/80 via-black/45 to-black/20",
          overlayClassName
        )}
        aria-hidden
      />
      <div className={cn("relative z-10", contentClassName)}>{children}</div>
    </div>
  );
}
