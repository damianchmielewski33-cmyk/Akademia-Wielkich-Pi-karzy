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
  active,
  disabled,
  compact,
  badge,
  onClick,
  href,
  className,
}: Props) {
  const inner = (
    <span
      className={cn(
        "flex h-full w-full items-center gap-3 rounded-2xl border px-3 shadow-sm transition-colors",
        compact ? "min-h-[3.25rem] py-2" : "min-h-[3.25rem] py-2 lg:min-h-[5rem] lg:py-3.5",
        active
          ? "border-transparent bg-[var(--mp-teal)] text-white shadow-md shadow-teal-950/15"
          : "border-zinc-200/90 bg-white text-zinc-900 hover:border-teal-200 hover:bg-teal-50/70 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:hover:border-teal-800",
        disabled && "opacity-60"
      )}
    >
      <span
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
          active
            ? "bg-white/20 text-white"
            : "bg-teal-50 text-[var(--mp-teal-dark)] dark:bg-teal-950/50 dark:text-teal-300"
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
              active ? "text-white/85" : "text-zinc-500 dark:text-zinc-400"
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
