"use client";

import { Loader2, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatPln(n: number) {
  return new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN" }).format(
    Math.round(n * 100) / 100
  );
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type PayButtonVariant =
  /** Duży przycisk na ciemnym tle karty boiska (PitchCard / hero) */
  | "hero"
  /** Kompaktowy przycisk na białym / jasnym tle (profil, strona publiczna) */
  | "default"
  /** Pasek akcji w terminarzu (ciemna karta meczu, awp-match-btn) */
  | "action";

type Props = {
  variant?: PayButtonVariant;
  /** Kwota w PLN; <0 = zaległość (czerwona kolorystyka), >0 = doładowanie */
  amountPln?: number | null;
  /** Nadpisanie domyślnego tekstu ("Opłać zaległość" / "Doładuj saldo") */
  label?: string;
  /** Dodatkowy tekst pod główną etykietą */
  sublabel?: string;
  busy?: boolean;
  disabled?: boolean;
  /** Pełna szerokość */
  fullWidth?: boolean;
  /** Renderuj jako link <a> zamiast <button> */
  href?: string;
  onClick?: () => void;
  className?: string;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
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
  const defaultLabel = label ?? (isDebt ? "Opłać zaległość" : "Doładuj saldo");
  const isDisabled = disabled ?? busy;

  // ── HERO variant ────────────────────────────────────────────────────────
  if (variant === "hero") {
    return (
      <button
        type="button"
        disabled={isDisabled}
        onClick={onClick}
        className={cn(
          "group relative flex items-center gap-3 overflow-hidden rounded-2xl px-4 py-3.5 text-left",
          "border backdrop-blur-sm transition-all",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70",
          "disabled:pointer-events-none disabled:opacity-60",
          "active:translate-y-px",
          isDebt
            ? "border-red-400/30 bg-red-950/25 hover:bg-red-900/30"
            : "border-white/25 bg-black/10 hover:bg-white/10",
          fullWidth ? "w-full" : "",
          className
        )}
      >
        {/* Icon circle */}
        <span
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-full ring-2",
            isDebt
              ? "bg-red-500/20 ring-red-400/40"
              : "bg-emerald-400/20 ring-emerald-300/30"
          )}
        >
          {busy ? (
            <Loader2 className="h-5 w-5 animate-spin text-white" aria-hidden />
          ) : (
            <Wallet className="h-5 w-5 text-white" strokeWidth={2.25} aria-hidden />
          )}
        </span>

        {/* Text */}
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold uppercase tracking-wide text-white/80">
            {defaultLabel}
          </span>
          {absAmount != null && (
            <span
              className={cn(
                "block text-2xl font-extrabold tabular-nums leading-tight tracking-tight",
                isDebt ? "text-red-200" : "text-white"
              )}
            >
              {formatPln(absAmount)}
            </span>
          )}
          {sublabel && (
            <span className="mt-0.5 block text-[11px] leading-snug text-white/60">
              {sublabel}
            </span>
          )}
        </span>

        {/* Chevron */}
        <span
          className={cn(
            "shrink-0 text-lg font-bold transition-transform group-hover:translate-x-0.5 group-disabled:translate-x-0",
            isDebt ? "text-red-200/60" : "text-white/40"
          )}
          aria-hidden
        >
          ›
        </span>
      </button>
    );
  }

  // ── ACTION variant (terminarz ciemna karta meczu) ───────────────────────
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
          {absAmount != null && (
            <span className="mt-0.5 block text-[11px] font-bold tabular-nums leading-snug text-emerald-100/95">
              {formatPln(absAmount)}
            </span>
          )}
          {sublabel && !absAmount && (
            <span className="mt-0.5 block text-[11px] font-normal leading-snug text-emerald-100/80">
              {sublabel}
            </span>
          )}
        </span>
      </button>
    );
  }

  // ── DEFAULT variant (jasne tło, np. profil, strona publiczna) ─────────────
  const defaultCls = cn(
    "group inline-flex items-center gap-2.5 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
    "active:translate-y-px",
    isDebt
      ? "bg-red-600 shadow-red-900/25 hover:bg-red-700 focus-visible:ring-red-500"
      : "bg-emerald-600 shadow-emerald-900/20 hover:bg-emerald-700 focus-visible:ring-emerald-500",
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
      {absAmount != null && (
        <span className="rounded-md bg-white/20 px-1.5 py-0.5 text-xs font-bold tabular-nums">
          {formatPln(absAmount)}
        </span>
      )}
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
    <button
      type="button"
      disabled={isDisabled}
      onClick={onClick}
      className={defaultCls}
    >
      {defaultContent}
    </button>
  );
}
