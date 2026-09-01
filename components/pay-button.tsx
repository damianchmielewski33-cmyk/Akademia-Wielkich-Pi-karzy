"use client";

import { Loader2, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

function formatPln(n: number) {
  return new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN" }).format(
    Math.round(n * 100) / 100
  );
}

export type PayButtonVariant =
  /** Duży przycisk — teal na jasnej karcie */
  | "hero"
  /** Kompaktowy przycisk (profil, modal, strona publiczna) */
  | "default"
  /** Pasek akcji w terminarzu */
  | "action";

type Props = {
  variant?: PayButtonVariant;
  amountPln?: number | null;
  label?: string;
  sublabel?: string;
  busy?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  href?: string;
  onClick?: () => void;
  className?: string;
};

export function PayButton({
  variant = "default",
  amountPln,
  label,
  sublabel,
  busy = false,
  disabled,
  fullWidth = false,
  href,
  onClick,
  className,
}: Props) {
  const isDebt = amountPln != null && amountPln < 0;
  const absAmount = amountPln != null ? Math.abs(amountPln) : null;
  const defaultLabel = label ?? (isDebt ? "Opłać zaległość" : "Zapłać kartą lub Blikiem");
  const isDisabled = disabled ?? busy;

  if (variant === "hero") {
    return (
      <button
        type="button"
        disabled={isDisabled}
        onClick={onClick}
        className={cn(
          "group relative flex items-center gap-3 overflow-hidden rounded-2xl px-4 py-3.5 text-left text-white shadow-md transition-all",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mp-teal)]/70 focus-visible:ring-offset-2",
          "disabled:pointer-events-none disabled:opacity-60 active:translate-y-px",
          isDebt
            ? "bg-red-600 shadow-red-900/20 hover:bg-red-700"
            : "bg-[var(--mp-teal)] shadow-teal-950/15 hover:bg-[var(--mp-teal-dark)]",
          fullWidth ? "w-full" : "",
          className
        )}
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 ring-2 ring-white/30">
          {busy ? (
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
          ) : (
            <Wallet className="h-5 w-5" strokeWidth={2.25} aria-hidden />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold uppercase tracking-wide text-white/90">
            {defaultLabel}
          </span>
          {absAmount != null ? (
            <span className="block text-2xl font-extrabold tabular-nums leading-tight tracking-tight">
              {formatPln(absAmount)}
            </span>
          ) : null}
          {sublabel ? (
            <span className="mt-0.5 block text-[11px] leading-snug text-white/75">{sublabel}</span>
          ) : null}
        </span>
        <span className="shrink-0 text-lg font-bold text-white/70 transition-transform group-hover:translate-x-0.5" aria-hidden>
          ›
        </span>
      </button>
    );
  }

  if (variant === "action") {
    return (
      <button
        type="button"
        disabled={isDisabled}
        onClick={onClick}
        className={cn(
          "awp-match-btn awp-match-btn--primary h-auto min-h-9 w-full justify-start gap-2 whitespace-normal py-2 text-left font-semibold",
          className
        )}
      >
        {busy ? (
          <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
        ) : (
          <Wallet className="h-4 w-4 shrink-0" aria-hidden />
        )}
        <span>
          <span className="block leading-tight">{defaultLabel}</span>
          {absAmount != null ? (
            <span className="mt-0.5 block text-[11px] font-bold tabular-nums leading-snug text-emerald-100/95">
              {formatPln(absAmount)}
            </span>
          ) : null}
          {sublabel && !absAmount ? (
            <span className="mt-0.5 block text-[11px] font-normal leading-snug text-emerald-100/80">
              {sublabel}
            </span>
          ) : null}
        </span>
      </button>
    );
  }

  const defaultCls = cn(
    "group inline-flex items-center gap-2.5 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
    "active:translate-y-px",
    isDebt
      ? "bg-red-600 shadow-red-900/25 hover:bg-red-700 focus-visible:ring-red-500"
      : "bg-[var(--mp-teal)] shadow-teal-950/15 hover:bg-[var(--mp-teal-dark)] focus-visible:ring-[var(--mp-teal)]",
    isDisabled && "pointer-events-none opacity-60",
    fullWidth ? "w-full justify-center" : "",
    className
  );

  const defaultContent = (
    <>
      {busy ? (
        <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
      ) : (
        <Wallet className="h-4 w-4 shrink-0" aria-hidden />
      )}
      <span>{defaultLabel}</span>
      {absAmount != null ? (
        <span className="rounded-md bg-white/20 px-1.5 py-0.5 text-xs font-bold tabular-nums">
          {formatPln(absAmount)}
        </span>
      ) : null}
    </>
  );

  if (href) {
    return (
      <a href={href} className={defaultCls}>
        {defaultContent}
      </a>
    );
  }

  return (
    <button type="button" disabled={isDisabled} onClick={onClick} className={defaultCls}>
      {defaultContent}
    </button>
  );
}
