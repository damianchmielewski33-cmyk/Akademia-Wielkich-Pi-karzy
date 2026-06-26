import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";
import Image from "next/image";
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
  className?: string;
  children?: ReactNode;
};

export function PitchPageHero({ title, subtitle, className, children }: PitchPageHeroProps) {
  return (
    <PitchCard
      as="div"
      className={cn("mx-auto max-w-2xl", className)}
      contentClassName="px-5 py-8 text-center sm:px-8 sm:py-9"
    >
      <div className="mb-4 flex flex-col items-center gap-2">
        <span className={pitchLabelClass}>Akademia</span>
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15 ring-2 ring-white/30 backdrop-blur-[2px]">
          <Image
            src="/logo-akademia-crest.png"
            alt=""
            width={128}
            height={128}
            className="h-8 w-8 object-contain drop-shadow"
            sizes="32px"
          />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-white drop-shadow-sm sm:text-4xl">{title}</h1>
        {subtitle ? <p className="text-base text-emerald-100/90 sm:text-lg">{subtitle}</p> : null}
        {children}
      </div>
    </PitchCard>
  );
}
