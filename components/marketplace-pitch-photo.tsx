import Image from "next/image";
import { canOptimizeMarketplacePhoto } from "@/lib/marketplace-photos";
import { siteAssetNeedsUnoptimized } from "@/lib/site-assets";
import { cn } from "@/lib/utils";

type Props = {
  src: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
};

export function MarketplacePitchPhoto({ src, className, sizes = "100vw", priority }: Props) {
  if (canOptimizeMarketplacePhoto(src)) {
    return (
      <Image
        src={src}
        alt=""
        fill
        priority={priority}
        sizes={sizes}
        className={cn("object-cover", className)}
        unoptimized={siteAssetNeedsUnoptimized(src)}
      />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" className={cn("absolute inset-0 h-full w-full object-cover", className)} />
  );
}
