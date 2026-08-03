"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useAdsense } from "@/components/adsense-provider";
import { isAdsensePathAllowed } from "@/lib/adsense";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

type Props = {
  /** Identyfikator jednostki reklamowej z panelu AdSense (np. 1234567890). */
  slot?: string | null;
  className?: string;
  /** Etykieta dostępności / wizualna nad slotem. */
  label?: string;
};

export function AdsenseSlot({ slot, className, label = "Reklama" }: Props) {
  const pathname = usePathname();
  const { clientId, marketingAllowed, slotFooter } = useAdsense();
  const resolvedSlot = (slot?.trim() || slotFooter || "").trim();
  const pushedRef = useRef(false);

  const allowed =
    marketingAllowed &&
    Boolean(clientId) &&
    Boolean(resolvedSlot) &&
    isAdsensePathAllowed(pathname);

  useEffect(() => {
    if (!allowed || pushedRef.current) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      pushedRef.current = true;
    } catch {
      /* AdSense może nie być jeszcze gotowy */
    }
  }, [allowed, pathname, resolvedSlot]);

  if (!allowed) return null;

  return (
    <aside
      className={cn("mx-auto w-full max-w-6xl px-4 py-4", className)}
      aria-label={label}
    >
      <p className="mb-2 text-center text-[10px] font-medium uppercase tracking-wider text-emerald-800/55 dark:text-emerald-200/45">
        {label}
      </p>
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={clientId!}
        data-ad-slot={resolvedSlot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </aside>
  );
}
