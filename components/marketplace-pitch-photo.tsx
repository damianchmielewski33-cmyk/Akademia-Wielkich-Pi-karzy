"use client";

import { useState } from "react";
import Image from "next/image";
import { canOptimizeMarketplacePhoto, MARKETPLACE_PITCH_PHOTOS, resolveMarketplacePhoto } from "@/lib/marketplace-photos";
import { siteAssetNeedsUnoptimized } from "@/lib/site-assets";
import { cn } from "@/lib/utils";

type Props = {
  src: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
};

const FALLBACK_SRC = MARKETPLACE_PITCH_PHOTOS[0];

export function MarketplacePitchPhoto({ src, className, sizes = "100vw", priority }: Props) {
  const resolved = resolveMarketplacePhoto(src);
  const [failed, setFailed] = useState(false);
  const displaySrc = failed && resolved !== FALLBACK_SRC ? FALLBACK_SRC : resolved;

  function onError() {
    if (displaySrc !== FALLBACK_SRC) setFailed(true);
  }

  if (canOptimizeMarketplacePhoto(displaySrc)) {
    return (
      <Image
        src={displaySrc}
        alt=""
        fill
        priority={priority}
        sizes={sizes}
        className={cn("object-cover", className)}
        unoptimized={siteAssetNeedsUnoptimized(displaySrc)}
        onError={onError}
      />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={displaySrc} alt="" className={cn("absolute inset-0 h-full w-full object-cover", className)} onError={onError} />
  );
}
