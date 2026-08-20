import type { ReactNode } from "react";
import { MarketplacePitchPhoto } from "@/components/marketplace-pitch-photo";
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

/** Zdjęcie boiska w tle z przyciemnieniem — ten sam układ co kafelki na stronie startowej. */
export function PhotoPanel({
  src,
  className,
  contentClassName,
  overlayClassName,
  sizes = "(max-width: 768px) 100vw, 720px",
  priority,
  children,
}: Props) {
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
