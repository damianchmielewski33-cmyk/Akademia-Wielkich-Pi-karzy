"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import { siteAssetNeedsUnoptimized, type SiteAssetKey } from "@/lib/site-assets";
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
  const src = useSiteAsset(asset);
  const resolvedAlt = decorative ? "" : alt;
  const needsUnopt = unoptimized ?? siteAssetNeedsUnoptimized(src);

  const objectClass = cn("object-contain object-center", className);

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
    />
  );
}
