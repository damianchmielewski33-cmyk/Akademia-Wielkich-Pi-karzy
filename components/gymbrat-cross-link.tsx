"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Dumbbell } from "lucide-react";
import {
  GYMBRAT_GYM_PHOTO,
  GYMBRAT_SITE_NAME,
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
  const gymPhoto = photoSrc?.trim() || GYMBRAT_GYM_PHOTO;

  if (variant === "row") {
    return (
      <Link
        href={href}
        className={cn(
          "relative isolate flex min-h-[6.5rem] items-end justify-between gap-3 overflow-hidden rounded-2xl p-3 text-white shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl",
          className
        )}
      >
        <Image
          src={gymPhoto}
          alt=""
          fill
          sizes="(max-width: 768px) 100vw, 400px"
          className="absolute inset-0 z-0 object-cover"
        />
        <div
          className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-t from-black/70 via-black/25 to-black/10"
          aria-hidden
        />
        <span className="relative z-10 flex min-w-0 flex-col justify-between gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 text-white ring-1 ring-white/30">
            <Dumbbell className="h-4 w-4" aria-hidden />
          </span>
          <span className="text-sm font-bold leading-tight drop-shadow-sm">{GYMBRAT_SITE_NAME}</span>
        </span>
        <ArrowRight className="relative z-10 h-4 w-4 shrink-0 self-end text-white/80" aria-hidden />
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

  return (
    <Link
      href={href}
      className={cn(
        "relative flex h-full min-h-[7rem] items-start justify-between gap-3 overflow-hidden rounded-2xl p-5 text-left text-white shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl",
        className
      )}
    >
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
      <div className="relative z-10 min-w-0">
        <p className="font-black text-white drop-shadow-sm">{GYMBRAT_SITE_NAME}</p>
        <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-white/90">
          Otwórz
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </span>
      </div>
      <span className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15 text-white ring-1 ring-white/30">
        <Dumbbell className="h-5 w-5" aria-hidden />
      </span>
    </Link>
  );
}
