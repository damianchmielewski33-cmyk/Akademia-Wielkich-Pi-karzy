"use client";

import { Dumbbell, ExternalLink } from "lucide-react";
import { MarketplacePitchPhoto } from "@/components/marketplace-pitch-photo";
import { useSiteMode } from "@/components/site-mode";
import { GYMBRAT_SITE_NAME, GYMBRAT_SITE_TAGLINE, getGymBratCrossLink } from "@/lib/sister-sites";
import { cn } from "@/lib/utils";

/** Kafelek / pasek do przejścia na GymBrat (nowa karta — sesja AWP zostaje). */
export function GymBratCrossLink({
  className,
  variant = "tile",
  photoSrc,
}: {
  className?: string;
  variant?: "tile" | "footer" | "inline";
  photoSrc?: string;
}) {
  const href = getGymBratCrossLink("/");
  const { marketplaceEnabled } = useSiteMode();

  if (variant === "footer" || variant === "inline") {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "inline-flex items-center gap-1.5 font-medium underline-offset-2 hover:underline",
          variant === "footer" ? "text-xs text-zinc-400 hover:text-white" : "text-sm text-zinc-600",
          className
        )}
      >
        <Dumbbell className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
        {GYMBRAT_SITE_NAME}
        <ExternalLink className="h-3 w-3 opacity-60" aria-hidden />
      </a>
    );
  }

  const photoTile = Boolean(photoSrc);
  const stadiumTile = !photoTile && !marketplaceEnabled;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "flex h-full min-h-[7rem] items-start justify-between gap-3 rounded-2xl p-5 text-left transition hover:-translate-y-0.5",
        photoTile
          ? "relative overflow-hidden text-white shadow-lg hover:shadow-xl"
          : stadiumTile
            ? "relative overflow-hidden border-2 border-white/30 text-white shadow-md shadow-emerald-950/12 ring-1 ring-emerald-950/10 hover:shadow-lg"
            : "border border-zinc-200 bg-white shadow-sm hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950",
        className
      )}
    >
      {photoSrc ? (
        <>
          <MarketplacePitchPhoto
            src={photoSrc}
            className="absolute inset-0 z-0 h-full w-full"
            sizes="(max-width: 768px) 100vw, 400px"
          />
          <div
            className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-b from-black/45 via-black/55 to-black/70"
            aria-hidden
          />
        </>
      ) : stadiumTile ? (
        <div className="home-pitch-tile absolute inset-0" aria-hidden />
      ) : null}
      <div className={cn("min-w-0", (photoTile || stadiumTile) && "relative z-10")}>
        <p
          className={cn(
            "font-black",
            photoTile || stadiumTile ? "text-white drop-shadow-sm" : "text-zinc-950 dark:text-white"
          )}
        >
          {GYMBRAT_SITE_NAME}
        </p>
        <p className={cn("mt-1 text-sm", photoTile || stadiumTile ? "text-white/80" : "text-zinc-500")}>
          {GYMBRAT_SITE_TAGLINE}
        </p>
        <span
          className={cn(
            "mt-3 inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wide",
            photoTile || stadiumTile ? "text-white/90" : "text-[var(--mp-teal-dark)]"
          )}
        >
          Otwórz
          <ExternalLink className="h-3.5 w-3.5" aria-hidden />
        </span>
      </div>
      <span
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
          photoTile || stadiumTile
            ? "relative z-10 bg-white/15 text-white ring-1 ring-white/30"
            : "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-200"
        )}
      >
        <Dumbbell className="h-5 w-5" aria-hidden />
      </span>
    </a>
  );
}
