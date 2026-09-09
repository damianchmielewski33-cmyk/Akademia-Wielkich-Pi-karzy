"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

type IconType = React.ComponentType<{ className?: string; strokeWidth?: number; "aria-hidden"?: boolean }>;

type Props = {
  title: string;
  desc?: string;
  icon: IconType;
  photoKey: string;
  active?: boolean;
  disabled?: boolean;
  compact?: boolean;
  /**
   * Na mobile (w siatce 2 kolumny): ikona u góry, tytuł pod spodem.
   * Od `lg` wraca do wiersza z opisem — jak pozostałe kafelki boczne.
   */
  mobileStack?: boolean;
  badge?: React.ReactNode;
  onClick?: () => void;
  href?: string;
  className?: string;
};

export function adminPhotoIndex(key: string): number {
  let h = 7;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return h % 12;
}

export function AdminNavTile({
  title,
  desc,
  icon: Icon,
  photoKey: _photoKey,
  active,
  disabled,
  compact,
  mobileStack,
  badge,
  onClick,
  href,
  className,
}: Props) {
  void _photoKey;

  const inner = (
    <span
      className={cn(
        "flex h-full w-full rounded-2xl border shadow-sm transition-colors",
        mobileStack
          ? "min-h-[5.25rem] flex-col items-stretch justify-between gap-2.5 p-3 touch-manipulation lg:min-h-[5rem] lg:flex-row lg:items-center lg:gap-3 lg:px-3 lg:py-3.5"
          : compact
            ? "min-h-12 items-center gap-3 px-3 py-2"
            : "min-h-12 items-center gap-3 px-3 py-2.5 touch-manipulation lg:min-h-[5rem] lg:py-3.5",
        active
          ? "border-transparent bg-[var(--mp-teal)] text-white shadow-md shadow-teal-950/15"
          : "border-zinc-200/90 bg-white text-zinc-900 hover:border-teal-200 hover:bg-teal-50/70 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:hover:border-teal-800",
        disabled && "opacity-60"
      )}
    >
      <span
        className={cn(
          "flex shrink-0 items-center justify-center rounded-xl",
          mobileStack ? "h-10 w-10 lg:h-9 lg:w-9" : "h-9 w-9",
          active
            ? "bg-white/20 text-white"
            : "bg-teal-50 text-[var(--mp-teal-dark)] dark:bg-teal-950/50 dark:text-teal-300"
        )}
      >
        <Icon className="h-4 w-4" strokeWidth={2.25} aria-hidden />
      </span>
      <span
        className={cn(
          "min-w-0 flex-1",
          mobileStack ? "text-left lg:text-left" : "text-left"
        )}
      >
        <span
          className={cn(
            "block text-sm font-bold leading-snug",
            mobileStack ? "line-clamp-2 lg:truncate lg:leading-tight" : "truncate leading-tight"
          )}
        >
          {title}
        </span>
        {!compact && desc ? (
          <span
            className={cn(
              "mt-0.5 text-xs leading-snug",
              mobileStack ? "hidden lg:line-clamp-2" : "line-clamp-2",
              active ? "text-white/85" : "text-zinc-500 dark:text-zinc-400"
            )}
          >
            {desc}
          </span>
        ) : null}
      </span>
      {badge ? (
        <span
          className={cn(
            "relative z-10 shrink-0",
            mobileStack && "absolute right-2.5 top-2.5 lg:static"
          )}
        >
          {badge}
        </span>
      ) : null}
    </span>
  );

  const wrapClass = cn(
    "block w-full text-left disabled:pointer-events-none",
    mobileStack && "relative",
    className
  );
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
