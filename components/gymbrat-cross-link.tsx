"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Dumbbell } from "lucide-react";
import { useSiteMode } from "@/components/site-mode";
import {
  GYMBRAT_GYM_PHOTO,
  GYMBRAT_SITE_NAME,
  GYMBRAT_SITE_TAGLINE,
  getGymBratEmbedPath,
} from "@/lib/sister-sites";
import { cn } from "@/lib/utils";

/** Kafelek / pasek do GymBrat osadzonego w iframe (/gymbrat) — APK i RWD. */
export function GymBratCrossLink({
  className,
  variant = "tile",
  photoSrc = GYMBRAT_GYM_PHOTO,
}: {
  className?: string;
  variant?: "tile" | "footer" | "inline" | "row";
  /** Nadpisanie zdjęcia; domyślnie siłownia (nie boisko). */
  photoSrc?: string | null;
}) {
  const href = getGymBratEmbedPath("/");
  const { marketplaceEnabled } = useSiteMode();

  if (variant === "row") {
    return (
      <Link
        href={href}
        className={cn(
          "flex min-h-14 items-center gap-3 rounded-2xl border border-zinc-200 bg-white px-3 py-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-950",
          className
        )}
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-200">
          <Dumbbell className="h-4 w-4" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold text-zinc-950 dark:text-white">{GYMBRAT_SITE_NAME}</span>
          <span className="block text-xs text-zinc-500">{GYMBRAT_SITE_TAGLINE}</span>
        </span>
        <ArrowRight className="h-4 w-4 shrink-0 text-zinc-400" aria-hidden />
      </Link>
    );
  }

  if (variant === "footer" || variant === "inline") {
    return (
      <Link
        href={href}
        className={cn(
          "inline-flex items-center gap-1.5 font-medium underline-offset-2 hover:underline",
          variant === "footer" ? "text-xs text-zinc-400 hover:text-white" : "text-sm text-zinc-600",
          className
        )}
      >
        <Dumbbell className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
        {GYMBRAT_SITE_NAME}
        <ArrowRight className="h-3 w-3 opacity-60" aria-hidden />
      </Link>
    );
  }

  const gymPhoto = photoSrc?.trim() || GYMBRAT_GYM_PHOTO;
  const photoTile = Boolean(gymPhoto);
  const stadiumFallback = !marketplaceEnabled && !photoTile;

  return (
    <Link
      href={href}
      className={cn(
        "flex h-full min-h-[7rem] items-start justify-between gap-3 rounded-2xl p-5 text-left transition hover:-translate-y-0.5",
        photoTile
          ? "relative overflow-hidden text-white shadow-lg hover:shadow-xl"
          : stadiumFallback
            ? "relative overflow-hidden border-2 border-white/30 text-white shadow-md shadow-emerald-950/12 ring-1 ring-emerald-950/10 hover:shadow-lg"
            : "border border-zinc-200 bg-white shadow-sm hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950",
        className
      )}
    >
      {photoTile ? (
        <>
          <Image
            src={gymPhoto}
            alt=""
            fill
            sizes="(max-width: 768px) 100vw, 400px"
            className="absolute inset-0 z-0 object-cover"
          />
          <div
            className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-b from-black/45 via-black/55 to-black/70"
            aria-hidden
          />
        </>
      ) : stadiumFallback ? (
        <div className="home-pitch-tile absolute inset-0" aria-hidden />
      ) : null}
      <div className={cn("min-w-0", (photoTile || stadiumFallback) && "relative z-10")}>
        <p
          className={cn(
            "font-black",
            photoTile || stadiumFallback ? "text-white drop-shadow-sm" : "text-zinc-950 dark:text-white"
          )}
        >
          {GYMBRAT_SITE_NAME}
        </p>
        <p className={cn("mt-1 text-sm", photoTile || stadiumFallback ? "text-white/80" : "text-zinc-500")}>
          {GYMBRAT_SITE_TAGLINE}
        </p>
        <span
          className={cn(
            "mt-3 inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wide",
            photoTile || stadiumFallback ? "text-white/90" : "text-[var(--mp-teal-dark)]"
          )}
        >
          Otwórz
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </span>
      </div>
      <span
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
          photoTile || stadiumFallback
            ? "relative z-10 bg-white/15 text-white ring-1 ring-white/30"
            : "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-200"
        )}
      >
        <Dumbbell className="h-5 w-5" aria-hidden />
      </span>
    </Link>
  );
}
