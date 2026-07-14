"use client";

import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";
import { SiteSectionHero, PAGE_HERO_KICKER } from "@/components/site-section-hero";
import { cn } from "@/lib/utils";

export const pitchLabelClass =
  "text-xs font-semibold uppercase tracking-[0.14em] text-[var(--mundial-gold,#f5c518)]";

export const pitchPanelClass = "rounded-xl border border-white/25 bg-black/10 backdrop-blur-sm";

export const pitchSecondaryBtnClass =
  "inline-flex w-full items-center justify-center gap-2 rounded-lg border border-white/25 bg-black/10 px-4 py-2.5 text-sm font-semibold text-white/95 backdrop-blur-sm transition-colors hover:bg-white/10 disabled:pointer-events-none disabled:opacity-50";

type PitchCardProps<T extends ElementType = "section"> = {
  as?: T;
  variant?: "pitch" | "gold";
  showDecorations?: boolean;
  contentClassName?: string;
  children: ReactNode;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "children">;

export function PitchCard<T extends ElementType = "section">({
  as,
  variant = "pitch",
  showDecorations = true,
  className,
  contentClassName,
  children,
  ...props
}: PitchCardProps<T>) {
  const Comp = as ?? "section";
  const bgClass = variant === "gold" ? "home-pitch-tile-gold" : "home-pitch-tile";

  return (
    <Comp className={cn("pitch-card", bgClass, className)} {...props}>
      {showDecorations ? <PitchCardDecorations /> : null}
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
  children,
}: PitchPageHeroProps) {
  return (
    <SiteSectionHero
      kicker={kicker}
      title={title}
      subtitle={subtitle}
      align={align}
      showCrest={showCrest}
      className={cn("mx-auto w-full max-w-3xl", className)}
    >
      {children}
    </SiteSectionHero>
  );
}
