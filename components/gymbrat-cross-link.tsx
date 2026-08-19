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

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "flex h-full min-h-[7rem] items-start justify-between gap-3 rounded-2xl border border-zinc-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950",
        className
      )}
    >
      <div className="min-w-0">
        <p className="font-black text-zinc-950 dark:text-white">{GYMBRAT_SITE_NAME}</p>
        <p className="mt-1 text-sm text-zinc-500">{GYMBRAT_SITE_TAGLINE}</p>
        <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-[var(--mp-teal-dark)]">
          Otwórz
          <ExternalLink className="h-3.5 w-3.5" aria-hidden />
        </span>
      </div>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-200">
        <Dumbbell className="h-5 w-5" aria-hidden />
      </span>
    </a>
  );
}
