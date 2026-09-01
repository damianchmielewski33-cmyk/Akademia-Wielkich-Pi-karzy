"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { SiteAssetImage } from "@/components/site-asset-image";
import { MarketplacePitchPhoto } from "@/components/marketplace-pitch-photo";
import { useSiteMode } from "@/components/site-mode";
import { ChevronRight } from "lucide-react";
import { MARKETPLACE_PITCH_PHOTOS } from "@/lib/marketplace-photos";
import { cn } from "@/lib/utils";

function formatPln(n: number) {
  const v = Math.round(n * 100) / 100;
  return new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN" }).format(v);
}

type Props = {
  /** Gdy true — pobiera saldo z /api/wallet/me (bez blokowania SSR layoutu). */
  enabled?: boolean;
};

export function WalletBalanceFloat({ enabled = true }: Props) {
  const { mode } = useSiteMode();
  const active = enabled && mode === "academy";
  const [mounted, setMounted] = useState(false);
  const [balancePln, setBalancePln] = useState<number | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    fetch("/api/wallet/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { balance_pln?: unknown } | null) => {
        if (cancelled) return;
        if (d && typeof d.balance_pln === "number" && Number.isFinite(d.balance_pln)) {
          setBalancePln(d.balance_pln);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [active]);

  if (!mounted || !active) return null;

  const known = balancePln != null;
  const amount = balancePln ?? 0;
  const negative = known && amount < 0;
  const positive = known && amount > 0;

  const tile = (
    <Link
      href="/platnosci"
      className={cn(
        "group fixed z-[60] flex items-center gap-2 overflow-hidden px-2.5 py-2 shadow-lg transition-[transform,box-shadow] motion-safe:hover:-translate-y-0.5 hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent",
        "bottom-[max(0.75rem,env(safe-area-inset-bottom))] right-3 max-w-[min(calc(100%-1.5rem),11.5rem)] sm:bottom-5 sm:right-5",
        "rounded-xl border ring-1 focus-visible:ring-emerald-400/60",
        negative ? "border-red-300/50 ring-red-400/30" : "border-white/40 ring-emerald-300/35"
      )}
      aria-label={
        known
          ? `Twoje saldo: ${formatPln(amount)}. Przejdź do płatności.`
          : "Płatności — wczytywanie salda"
      }
    >
      <MarketplacePitchPhoto src={MARKETPLACE_PITCH_PHOTOS[0]} className="z-0" sizes="200px" />
      <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-t from-black/70 via-black/45 to-black/25" aria-hidden />
      {negative ? (
        <div className="pointer-events-none absolute inset-0 z-[2] bg-red-600/20 motion-safe:animate-pulse" aria-hidden />
      ) : null}
      <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/20 ring-1 ring-white/40 backdrop-blur-[2px]">
        <SiteAssetImage
          asset="bg_soccer_ball"
          decorative
          width={32}
          height={32}
          className="h-5 w-5 drop-shadow"
        />
      </div>
      <div className="relative z-10 min-w-0 flex-1 text-left">
        <p className="text-[0.6rem] font-bold uppercase leading-none tracking-[0.12em] text-emerald-100/85">
          Saldo
        </p>
        <p
          className={cn(
            "mt-0.5 truncate text-sm font-extrabold tabular-nums leading-tight text-white drop-shadow-sm",
            negative && "text-red-100",
            positive && "text-emerald-50",
            !known && "text-white/70"
          )}
        >
          {known ? formatPln(amount) : "…"}
        </p>
      </div>
      <ChevronRight
        className="relative z-10 h-4 w-4 shrink-0 text-white/55 transition-all group-hover:translate-x-0.5 group-hover:text-white"
        strokeWidth={2.5}
        aria-hidden
      />
    </Link>
  );

  return createPortal(tile, document.body);
}
