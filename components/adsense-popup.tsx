"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { AdsenseSlot } from "@/components/adsense-slot";
import { useAdsense } from "@/components/adsense-provider";
import {
  ADSENSE_POPUP_COOLDOWN_MS,
  ADSENSE_POPUP_DELAY_MS,
  ADSENSE_POPUP_STORAGE_KEY,
  type AdFillStatus,
} from "@/lib/ad-analytics";
import { isAdsensePathAllowed } from "@/lib/adsense";
import { cn } from "@/lib/utils";

function canShowPopupNow(): boolean {
  try {
    const raw = localStorage.getItem(ADSENSE_POPUP_STORAGE_KEY);
    if (!raw) return true;
    const last = Number.parseInt(raw, 10);
    if (!Number.isFinite(last)) return true;
    return Date.now() - last >= ADSENSE_POPUP_COOLDOWN_MS;
  } catch {
    return true;
  }
}

function markPopupShown() {
  try {
    localStorage.setItem(ADSENSE_POPUP_STORAGE_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
}

/**
 * Popup z reklamą — ładuje slot niewidocznie i pokazuje okno dopiero gdy AdSense wypełni reklamę.
 */
export function AdsensePopup() {
  const pathname = usePathname();
  const { marketingAllowed, popupEnabled, slotPopup, consent } = useAdsense();
  const [armed, setArmed] = useState(false);
  const [visible, setVisible] = useState(false);
  const [closed, setClosed] = useState(false);

  const eligible =
    Boolean(consent?.marketing) &&
    marketingAllowed &&
    popupEnabled &&
    Boolean(slotPopup) &&
    isAdsensePathAllowed(pathname) &&
    !closed;

  useEffect(() => {
    setArmed(false);
    setVisible(false);
    setClosed(false);
  }, [pathname]);

  useEffect(() => {
    if (!eligible) return;
    if (!canShowPopupNow()) return;

    const t = window.setTimeout(() => {
      setArmed(true);
    }, ADSENSE_POPUP_DELAY_MS);

    return () => window.clearTimeout(t);
  }, [eligible, pathname]);

  const dismiss = useCallback(() => {
    setClosed(true);
    setArmed(false);
    setVisible(false);
  }, []);

  const onFillStatusChange = useCallback((status: AdFillStatus) => {
    if (status === "filled") {
      setVisible(true);
      markPopupShown();
    } else if (status === "unfilled") {
      setArmed(false);
      setVisible(false);
    }
  }, []);

  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [visible, dismiss]);

  if (!eligible || !armed) return null;

  return (
    <div className="contents">
      {visible ? (
        <button
          type="button"
          className="fixed inset-0 z-[70] bg-emerald-950/55 backdrop-blur-sm"
          aria-label="Zamknij reklamę"
          onClick={dismiss}
        />
      ) : null}
      <div
        role={visible ? "dialog" : undefined}
        aria-modal={visible || undefined}
        aria-labelledby={visible ? "awp-ad-popup-title" : undefined}
        aria-hidden={!visible}
        className={cn(
          "fixed left-1/2 top-1/2 z-[71] w-[min(100%-1.5rem,28rem)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-emerald-800/40 bg-emerald-950 p-4 text-emerald-50 shadow-[0_24px_80px_-24px_rgba(0,0,0,0.65)]",
          visible ? "opacity-100" : "pointer-events-none opacity-0"
        )}
      >
        {visible ? (
          <div className="mb-2 flex items-start justify-between gap-3 pr-1">
            <div>
              <p id="awp-ad-popup-title" className="text-sm font-semibold text-white">
                Reklama
              </p>
              <p className="mt-0.5 text-xs text-emerald-100/75">
                Możesz zamknąć to okno w każdej chwili.
              </p>
            </div>
            <button
              type="button"
              onClick={dismiss}
              className="awp-focus-ring flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition hover:bg-white/15"
            >
              <X className="h-4 w-4" aria-hidden />
              <span className="sr-only">Zamknij</span>
            </button>
          </div>
        ) : null}
        <AdsenseSlot
          placement="popup"
          label=""
          hideWhenEmpty={false}
          minHeightPx={250}
          className="max-w-none px-0 py-0"
          onFillStatusChange={onFillStatusChange}
        />
      </div>
    </div>
  );
}
