"use client";

import { useEffect, useState, type ComponentType, type ReactNode } from "react";
import Link from "next/link";
import { PhotoPanel } from "@/components/photo-panel";
import { useSiteMode } from "@/components/site-mode";
import { pitchPhotoAt } from "@/lib/marketplace-photos";
import { cn } from "@/lib/utils";

function useDesktopNavChrome() {
  const [desktop, setDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const sync = () => setDesktop(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return desktop;
}

export function adminPhotoIndex(key: string): number {
  let h = 7;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return h % 12;
}

type IconType = ComponentType<{ className?: string; strokeWidth?: number; "aria-hidden"?: boolean }>;

type Props = {
  title: string;
  desc?: string;
  icon: IconType;
  photoKey: string;
  active?: boolean;
  disabled?: boolean;
  compact?: boolean;
  badge?: ReactNode;
  onClick?: () => void;
  href?: string;
  className?: string;
};

export function AdminNavTile({
  title,
  desc,
  icon: Icon,
  photoKey,
  active,
  disabled,
  compact,
  badge,
  onClick,
  href,
  className,
}: Props) {
  const { marketplaceEnabled } = useSiteMode();
  const desktop = useDesktopNavChrome();
  const photoTile = !marketplaceEnabled && desktop;

  if (!photoTile) {
    const inner = (
      <span
        className={cn(
          "flex h-full w-full items-center gap-3 rounded-2xl border px-3 shadow-sm transition-colors",
          compact ? "min-h-[3.25rem] py-2" : "min-h-[3.25rem] py-2 lg:min-h-[5rem] lg:py-3.5",
          marketplaceEnabled
            ? active
              ? "border-transparent bg-[var(--mp-teal)] text-white shadow-md shadow-teal-950/15"
              : "border-zinc-200/90 bg-white text-zinc-900 hover:border-teal-200 hover:bg-teal-50/70 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:hover:border-teal-800"
            : active
              ? "border-[var(--mundial-gold,#f5c518)]/80 bg-white/15 text-white"
              : "border-white/20 bg-white/10 text-white hover:bg-white/15",
          disabled && "opacity-60"
        )}
      >
        <span
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
            marketplaceEnabled
              ? active
                ? "bg-white/20 text-white"
                : "bg-teal-50 text-[var(--mp-teal-dark)] dark:bg-teal-950/50 dark:text-teal-300"
              : "bg-white/15 text-white"
          )}
        >
          <Icon className="h-4 w-4" strokeWidth={2.25} aria-hidden />
        </span>
        <span className="min-w-0 flex-1 text-left">
          <span className="block truncate text-sm font-bold leading-tight">{title}</span>
          {!compact && desc ? (
            <span
              className={cn(
                "mt-0.5 hidden truncate text-xs leading-snug lg:block",
                marketplaceEnabled
                  ? active
                    ? "text-white/85"
                    : "text-zinc-500 dark:text-zinc-400"
                  : "text-white/75"
              )}
            >
              {desc}
            </span>
          ) : null}
        </span>
        {badge ? <span className="relative z-10 shrink-0">{badge}</span> : null}
      </span>
    );

    const wrapClass = cn("block w-full text-left disabled:pointer-events-none", className);
    if (href && !disabled) {
      return (
        <Link href={href} className={wrapClass} aria-current={active ? "page" : undefined}>
          {inner}
        </Link>
      );
    }
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={onClick}
        className={wrapClass}
        aria-current={active ? "page" : undefined}
      >
        {inner}
      </button>
    );
  }

  const inner = (
    <PhotoPanel
      src={pitchPhotoAt(adminPhotoIndex(photoKey))}
      className={cn(
        "h-full border-2 border-white/30 shadow-md shadow-emerald-950/12 ring-1 ring-emerald-950/10 transition-[transform,box-shadow] motion-safe:hover:-translate-y-0.5 hover:shadow-xl",
        compact ? "min-h-[3.75rem] rounded-xl" : "min-h-[5.5rem]",
        active &&
          "ring-2 ring-[var(--mundial-gold,#f5c518)] ring-offset-2 ring-offset-[var(--mundial-navy,#0a1628)]",
        disabled && "opacity-60"
      )}
      contentClassName={cn("flex h-full items-center gap-3", compact ? "px-3 py-2" : "px-4 py-3.5 sm:gap-4 sm:py-4")}
      overlayClassName="bg-gradient-to-r from-black/75 via-black/50 to-black/25"
      sizes="320px"
    >
      <span
        className={cn(
          "flex shrink-0 items-center justify-center rounded-full bg-white/15 ring-2 ring-white/35 backdrop-blur-[2px]",
          compact ? "h-9 w-9" : "h-11 w-11 sm:h-12 sm:w-12"
        )}
      >
        <Icon className={cn("text-white", compact ? "h-4 w-4" : "h-5 w-5 sm:h-6 sm:w-6")} strokeWidth={2.25} aria-hidden />
      </span>
      <span className="min-w-0 flex-1 text-left">
        <span
          className={cn(
            "block truncate font-bold leading-tight tracking-tight text-white drop-shadow-sm",
            compact ? "text-sm" : "text-base sm:text-[1.05rem]"
          )}
        >
          {title}
        </span>
        {!compact && desc ? (
          <span className="mt-0.5 block truncate text-xs leading-snug text-emerald-50/90 sm:text-sm">{desc}</span>
        ) : null}
      </span>
      {badge ? <span className="relative z-10 shrink-0">{badge}</span> : null}
    </PhotoPanel>
  );

  const wrapClass = cn("block w-full text-left disabled:pointer-events-none", className);

  if (href && !disabled) {
    return (
      <Link href={href} className={wrapClass} aria-current={active ? "page" : undefined}>
        {inner}
      </Link>
    );
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={wrapClass}
      aria-current={active ? "page" : undefined}
    >
      {inner}
    </button>
  );
}
