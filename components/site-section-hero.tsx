import type { ReactNode } from "react";
import { SiteAssetImage } from "@/components/site-asset-image";
import { cn } from "@/lib/utils";

export const PAGE_HERO_KICKER = "Akademia Wielkich Piłkarzy";

type Props = {
  kicker: string;
  title: string;
  subtitle?: ReactNode;
  className?: string;
  showCrest?: boolean;
  align?: "left" | "center";
  size?: "default" | "compact";
  titleId?: string;
  children?: ReactNode;
};

export function SiteSectionHero({
  kicker,
  title,
  subtitle,
  className,
  showCrest = true,
  align = "left",
  size = "default",
  titleId,
  children,
}: Props) {
  const centered = align === "center";

  return (
    <header
      className={cn(
        "awp-section-hero",
        size === "compact" && "awp-section-hero--compact",
        centered && "awp-section-hero--center",
        className
      )}
    >
      <div className="awp-section-hero__glow" aria-hidden />
      <div className="awp-section-hero__stripes" aria-hidden />

      <div
        className={cn(
          "awp-section-hero__inner",
          centered
            ? "flex flex-col items-center text-center"
            : "flex flex-col items-center gap-4 text-center sm:flex-row sm:items-center sm:gap-5 sm:text-left"
        )}
      >
        {showCrest ? (
          <span className="awp-section-hero__crest">
            <SiteAssetImage
              asset="logo_crest"
              alt=""
              width={160}
              height={160}
              className="h-9 w-9 sm:h-10 sm:w-10"
              sizes="40px"
            />
          </span>
        ) : null}

        <div className={cn("min-w-0 flex-1", centered && "flex flex-col items-center")}>
          <p className="awp-section-hero__kicker">{kicker}</p>
          <h1 id={titleId} className="awp-section-hero__title">
            {title}
          </h1>
          {subtitle ? <p className="awp-section-hero__subtitle">{subtitle}</p> : null}
          {children ? <div className="awp-section-hero__extra">{children}</div> : null}
        </div>
      </div>

      <div className="awp-section-hero__rule" aria-hidden />
    </header>
  );
}
