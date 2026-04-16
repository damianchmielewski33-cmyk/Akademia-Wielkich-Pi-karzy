import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  /** `full` — prawie cały viewport, duża scena SVG (loading + overlay nawigacji). */
  variant?: "default" | "full";
  /** `crest` — czarne tło pod herbem PNG (jak w materiale źródłowym). */
  surface?: "murawa" | "crest";
};

export function PagePreloaderLayout({
  title,
  subtitle,
  children,
  className,
  variant = "default",
  surface = "murawa",
}: Props) {
  const full = variant === "full";
  const crest = surface === "crest";
  return (
    <div
      className={cn(
        "flex flex-1 flex-col items-center justify-center",
        crest ? "bg-black" : "murawa-bg",
        full ? "min-h-[100dvh] px-3 py-8 sm:px-6 sm:py-12" : "min-h-[50vh] px-4 py-14 sm:py-20",
        className
      )}
      aria-busy="true"
      aria-live="polite"
      aria-label={title}
    >
      <div className={cn("w-full text-center", full ? "max-w-[min(96vw,80rem)]" : "max-w-lg")}>
        {crest ? (
          <>
            <div
              className={cn(
                "mx-auto flex w-full justify-center",
                full ? "min-h-0 items-center sm:mt-2" : "mt-0"
              )}
            >
              {children}
            </div>
            <h2
              className={cn(
                "mt-8 font-semibold tracking-tight text-zinc-100 sm:mt-10",
                full ? "text-lg sm:text-2xl md:text-3xl" : "text-base"
              )}
            >
              {title}
            </h2>
            {subtitle ? (
              <p
                className={cn(
                  "mt-2 text-zinc-500 sm:mt-3",
                  full ? "text-sm sm:text-base md:text-lg" : "mt-1.5 text-sm"
                )}
              >
                {subtitle}
              </p>
            ) : null}
          </>
        ) : (
          <>
            <h2
              className={cn(
                "font-semibold tracking-tight text-emerald-900 dark:text-emerald-100",
                full ? "text-xl sm:text-3xl md:text-4xl" : "text-base"
              )}
            >
              {title}
            </h2>
            {subtitle ? (
              <p
                className={cn(
                  "text-zinc-600 dark:text-zinc-400",
                  full ? "mt-3 text-base sm:text-lg md:text-xl" : "mt-1.5 text-sm"
                )}
              >
                {subtitle}
              </p>
            ) : null}
            <div
              className={cn(
                "mx-auto flex w-full justify-center",
                full ? "mt-6 min-h-[min(72dvh,48rem)] items-center sm:mt-10" : "mt-8"
              )}
            >
              {children}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
