"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { SiteAssetImage } from "@/components/site-asset-image";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

function formatPln(n: number) {
  const v = Math.round(n * 100) / 100;
  return new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN" }).format(v);
}

type Props = {
  balancePln: number;
};

export function WalletBalanceFloat({ balancePln }: Props) {
  const [mounted, setMounted] = useState(false);
  const negative = balancePln < 0;
  const positive = balancePln > 0;

  useEffect(() => {
    setMounted(true);
  }, []);

  const tile = (
    <Link
      href="/platnosci"
      className={cn(
        "group fixed z-[60] flex items-center gap-3 overflow-hidden rounded-2xl border-2 px-4 py-3.5 shadow-2xl ring-2 transition-[transform,box-shadow] motion-safe:hover:-translate-y-1 hover:shadow-[0_20px_50px_-12px_rgba(5,80,55,0.55)] focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent",
        "bottom-[max(1.25rem,env(safe-area-inset-bottom))] right-4 min-w-[11.5rem] max-w-[min(calc(100%-2rem),20rem)] sm:bottom-6 sm:right-6 sm:min-w-[13rem] sm:gap-3.5 sm:px-5 sm:py-4",
        negative
          ? "border-red-300/55 shadow-red-950/35 ring-red-400/35"
          : "border-white/45 shadow-emerald-950/40 ring-emerald-300/40"
      )}
      aria-label={`Twoje saldo: ${formatPln(balancePln)}. Przejdź do płatności.`}
    >
      <div className="home-pitch-tile absolute inset-0" aria-hidden />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1 bg-white/50" aria-hidden />
      {negative ? (
        <div
          className="pointer-events-none absolute inset-0 bg-red-600/20 motion-safe:animate-pulse"
          aria-hidden
        />
      ) : null}
      <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/20 ring-2 ring-white/45 backdrop-blur-[2px] sm:h-14 sm:w-14">
        <SiteAssetImage
          asset="bg_soccer_ball"
          decorative
          width={56}
          height={56}
          className="h-9 w-9 drop-shadow sm:h-10 sm:w-10"
        />
      </div>
      <div className="relative min-w-0 flex-1 text-left">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-100/90 sm:text-[0.8rem]">Saldo</p>
        <p
          className={cn(
            "truncate text-lg font-extrabold tabular-nums text-white drop-shadow-md sm:text-xl",
            negative && "text-red-100",
            positive && "text-emerald-50"
          )}
        >
          {formatPln(balancePln)}
        </p>
      </div>
      <ChevronRight
        className="relative h-5 w-5 shrink-0 text-white/60 transition-all group-hover:translate-x-0.5 group-hover:text-white sm:h-6 sm:w-6"
        strokeWidth={2.75}
        aria-hidden
      />
    </Link>
  );

  if (!mounted) return null;
  return createPortal(tile, document.body);
}
