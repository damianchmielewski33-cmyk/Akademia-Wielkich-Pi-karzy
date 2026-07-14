import type { ReactNode } from "react";
import { AwPreloader } from "./aw-preloader";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  subtitle?: string;
  kicker?: string;
  className?: string;
  variant?: "default" | "full";
  children?: ReactNode;
};

export function PagePreloaderLayout({
  title,
  subtitle,
  kicker = "Mundial 2026",
  className,
  variant = "default",
  children,
}: Props) {
  const full = variant === "full";

  return (
    <div
      className={cn(
        "flex flex-1 flex-col items-center justify-center murawa-bg",
        full ? "min-h-[100dvh] px-4 py-10 sm:px-6 sm:py-12" : "min-h-[50vh] px-4 py-14 sm:py-20",
        className
      )}
      aria-busy="true"
      aria-live="polite"
      aria-label={title}
    >
      <div className={cn("w-full", full ? "max-w-lg" : "max-w-md")}>
        <div className="awp-preloader-shell">
          <p className="awp-preloader-shell__kicker">{kicker}</p>
          <h2 className="awp-preloader-shell__title">{title}</h2>
          {subtitle ? <p className="awp-preloader-shell__subtitle">{subtitle}</p> : null}
          <div className="awp-preloader-shell__body">
            {children ?? <AwPreloader />}
          </div>
          <div className="awp-preloader-shell__rule" aria-hidden />
        </div>
      </div>
    </div>
  );
}
