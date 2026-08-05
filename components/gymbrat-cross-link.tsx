"use client";

import { Dumbbell, ExternalLink } from "lucide-react";
import { GYMBRAT_SITE_NAME, GYMBRAT_SITE_TAGLINE, getGymBratCrossLink } from "@/lib/sister-sites";
import { cn } from "@/lib/utils";

/** Kafelek / pasek do przejścia na GymBrat (nowa karta — sesja AWP zostaje). */
export function GymBratCrossLink({
  className,
  variant = "tile",
}: {
  className?: string;
  variant?: "tile" | "footer" | "inline";
}) {
  const href = getGymBratCrossLink("/");

  if (variant === "footer" || variant === "inline") {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "inline-flex items-center gap-1.5 font-medium underline-offset-2 hover:underline",
          variant === "footer" ? "text-xs text-emerald-200/85" : "text-sm text-emerald-100",
          className
        )}
      >
        <Dumbbell className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
        {GYMBRAT_SITE_NAME}
        <ExternalLink className="h-3 w-3 opacity-60" aria-hidden />
      </a>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "group relative block h-full min-h-[5.5rem] overflow-hidden rounded-2xl border-2 border-rose-300/35 shadow-md shadow-rose-950/20 ring-1 ring-rose-950/15 transition-[transform,box-shadow] motion-safe:hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2",
        className
      )}
    >
      <div
        className="absolute inset-0 bg-gradient-to-br from-rose-900 via-zinc-900 to-emerald-950"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-40 bg-[repeating-linear-gradient(115deg,transparent,transparent_12px,rgba(255,255,255,0.05)_12px,rgba(255,255,255,0.05)_24px)]"
        aria-hidden
      />
      <div className="relative flex h-full items-center gap-3 px-4 py-3.5 text-left sm:gap-4 sm:px-4 sm:py-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-rose-500/25 ring-2 ring-rose-300/40 sm:h-12 sm:w-12">
          <Dumbbell className="h-5 w-5 text-rose-100 sm:h-6 sm:w-6" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-base font-bold tracking-tight text-white drop-shadow-sm sm:text-[1.05rem]">
            {GYMBRAT_SITE_NAME}
          </p>
          <p className="mt-0.5 text-xs leading-snug text-rose-50/90 sm:text-sm">{GYMBRAT_SITE_TAGLINE}</p>
        </div>
        <ExternalLink
          className="h-5 w-5 shrink-0 text-white/50 transition-all group-hover:translate-x-0.5 group-hover:text-white/90"
          aria-hidden
        />
      </div>
    </a>
  );
}
