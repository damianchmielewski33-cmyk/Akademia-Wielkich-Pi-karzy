"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import {
  SITE_ASSET_DEFAULTS,
  siteAssetNeedsUnoptimized,
  type SiteAssetKey,
} from "@/lib/site-assets";
import { useSiteAsset } from "@/components/site-assets-provider";

type SiteAssetImageProps = {
  asset: SiteAssetKey;
  alt?: string;
  className?: string;
  width?: number;
  height?: number;
  fill?: boolean;
  priority?: boolean;
  sizes?: string;
  /** Gdy true — alt="" i aria-hidden (dekoracja). */
  decorative?: boolean;
  unoptimized?: boolean;
};

/**
 * Obraz grafiki witryny z konfiguracji admina.
 * Domyślnie `object-contain` — grafika zachowuje proporcje w każdym kontenerze.
 * Przy 404 (np. zniknięty plik z `/tmp` na Vercel) wraca do domyślnej grafiki.
 */
export function SiteAssetImage({
  asset,
  alt = "",
  className,
  width,
  height,
  fill,
  priority,
  sizes,
  decorative,
  unoptimized,
}: SiteAssetImageProps) {
  const configured = useSiteAsset(asset);
  const defaultSrc = SITE_ASSET_DEFAULTS[asset];
  const [src, setSrc] = useState(configured);

  useEffect(() => {
    setSrc(configured);
  }, [configured]);

  const resolvedAlt = decorative ? "" : alt;
  const needsUnopt = unoptimized ?? siteAssetNeedsUnoptimized(src);
  const objectClass = cn("object-contain object-center", className);

  const onError = () => {
    if (src !== defaultSrc) setSrc(defaultSrc);
  };

  if (fill) {
    return (
      <Image
        src={src}
        alt={resolvedAlt}
        fill
        className={objectClass}
        priority={priority}
        sizes={sizes ?? "100vw"}
        unoptimized={needsUnopt}
        aria-hidden={decorative || undefined}
        onError={onError}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={resolvedAlt}
      width={width ?? 256}
      height={height ?? 256}
      className={objectClass}
      priority={priority}
      sizes={sizes}
      unoptimized={needsUnopt}
      aria-hidden={decorative || undefined}
      onError={onError}
    />
  );
}
