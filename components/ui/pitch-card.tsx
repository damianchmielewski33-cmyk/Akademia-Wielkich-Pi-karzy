"use client";

import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";
import { SiteSectionHero, PAGE_HERO_KICKER } from "@/components/site-section-hero";
import { useSiteMode } from "@/components/site-mode";
import { cn } from "@/lib/utils";

export const pitchLabelClass =
  "pitch-label text-xs font-semibold uppercase tracking-[0.14em] text-[var(--mp-teal-dark)]";

/** Tło ustawia CSS: jasne na marketplace, półprzezroczyste na kafelkach murawy. */
export const pitchPanelClass = "pitch-panel rounded-xl";

/** Przyciski na karcie meczu / murawie — nie używać marketplace’owego dark:bg-zinc-900. */
export const pitchSecondaryBtnClass =
  "inline-flex w-full items-center justify-center gap-2 rounded-lg border border-white/25 bg-black/10 px-4 py-2.5 text-sm font-semibold text-white/95 backdrop-blur-sm transition-colors hover:bg-white/10 disabled:pointer-events-none disabled:opacity-50";

type PitchCardProps<T extends ElementType = "section"> = {
  as?: T;
  variant?: "marketplace" | "pitch" | "gold";
  showDecorations?: boolean;
  contentClassName?: string;
  children: ReactNode;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "children">;

export function PitchCard<T extends ElementType = "section">({
  as,
  variant,
  showDecorations,
  className,
  contentClassName,
  children,
  ...props
}: PitchCardProps<T>) {
  const { marketplaceEnabled } = useSiteMode();
  const Comp = as ?? "section";
  const resolvedVariant = variant ?? (marketplaceEnabled ? "marketplace" : "pitch");
  const stadium = resolvedVariant === "pitch" || resolvedVariant === "gold";
  const bgClass = resolvedVariant === "gold" ? "home-pitch-tile-gold" : resolvedVariant === "pitch" ? "home-pitch-tile" : "";
  const decorations = showDecorations ?? stadium;

  return (
    <Comp className={cn("pitch-card", bgClass, className)} {...props}>
      {decorations ? <PitchCardDecorations /> : null}
      <div className={cn("relative", contentClassName)}>{children}</div>
    </Comp>
  );
}

export function PitchCardDecorations({ className }: { className?: string }) {
  return (
    <>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-white/40" aria-hidden />
      <div
        className="pointer-events-none absolute bottom-0 left-0 h-10 w-10 rounded-tr-full border-t-2 border-r-2 border-white/45"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute bottom-0 right-0 h-10 w-10 rounded-tl-full border-t-2 border-l-2 border-white/45"
        aria-hidden
      />
      {className ? <div className={cn("pointer-events-none absolute", className)} aria-hidden /> : null}
    </>
  );
}

type PitchPageHeroProps = {
  title: string;
  subtitle?: ReactNode;
  kicker?: string;
  className?: string;
  align?: "left" | "center";
  showCrest?: boolean;
  titleId?: string;
  children?: ReactNode;
};

/** Nagłówek podstrony — ten sam styl co na stronie głównej i zaproszeniu. */
export function PitchPageHero({
  title,
  subtitle,
  kicker = PAGE_HERO_KICKER,
  className,
  align = "center",
  showCrest = true,
  titleId,
  children,
}: PitchPageHeroProps) {
  const { marketplaceEnabled } = useSiteMode();
  return (
    <SiteSectionHero
      kicker={kicker}
      title={title}
      subtitle={subtitle}
      align={align}
      showCrest={showCrest}
      titleId={titleId}
      variant={marketplaceEnabled ? "marketplace" : "stadium"}
      className={cn("mx-auto w-full max-w-3xl", className)}
    >
      {children}
    </SiteSectionHero>
  );
}
