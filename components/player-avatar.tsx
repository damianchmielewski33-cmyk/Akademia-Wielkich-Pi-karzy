"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

const SIZE_CLASS = {
  xs: "h-7 w-7 text-[10px]",
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-xl",
  /** Duży awatar (np. karta „Mój profil”) */
  profile: "h-32 w-32 text-3xl",
} as const;

const IMG_PX = { xs: 28, sm: 32, md: 40, lg: 56, profile: 128 } as const;

type Props = {
  photoPath?: string | null;
  firstName: string;
  lastName: string;
  className?: string;
  size?: keyof typeof SIZE_CLASS;
  ringClassName?: string;
};

export function PlayerAvatar({
  photoPath,
  firstName,
  lastName,
  className,
  size = "md",
  ringClassName = "ring-2 ring-white/35",
}: Props) {
  const initials =
    `${(firstName || "").trim()[0] ?? ""}${(lastName || "").trim()[0] ?? ""}`.toUpperCase() || "?";
  const src = (photoPath || "").trim();

  if (src) {
    return (
      <span
        className={cn(
          "relative inline-block shrink-0 overflow-hidden rounded-full bg-zinc-200",
          ringClassName,
          SIZE_CLASS[size],
          className
        )}
      >
        <Image
          src={src}
          alt=""
          fill
          className="object-cover"
          sizes={`${IMG_PX[size]}px`}
          unoptimized
        />
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-700 to-emerald-600 font-bold text-white",
        ringClassName,
        SIZE_CLASS[size],
        className
      )}
      aria-hidden={!firstName && !lastName}
    >
      {initials}
    </span>
  );
}

/** Imię i nazwisko wyraźnie, pseudonim z listy piłkarzy mniejszym tekstem pod spodem. */
export function PlayerNameStack({
  firstName,
  lastName,
  nick,
  className,
  primaryClassName,
  secondaryClassName,
}: {
  firstName: string;
  lastName: string;
  nick: string;
  className?: string;
  primaryClassName?: string;
  secondaryClassName?: string;
}) {
  const full = `${(firstName || "").trim()} ${(lastName || "").trim()}`.trim();
  const primary = full || nick || "—";
  const showNick = Boolean(nick && full && nick !== full);
  return (
    <div className={cn("min-w-0 text-left", className)}>
      <div
        className={cn(
          "truncate font-medium text-emerald-950 dark:text-emerald-100",
          primaryClassName
        )}
      >
        {primary}
      </div>
      {showNick ? (
        <div className={cn("truncate text-xs text-zinc-500 dark:text-zinc-400", secondaryClassName)}>
          {nick}
        </div>
      ) : null}
    </div>
  );
}
