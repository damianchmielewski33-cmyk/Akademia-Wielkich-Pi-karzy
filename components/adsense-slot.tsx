"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useAdsense } from "@/components/adsense-provider";
import {
  ADSENSE_FILL_TIMEOUT_MS,
  type AdFillStatus,
  type AdPlacement,
  getAnalyticsVisitorId,
  sendAdImpressionBeacon,
} from "@/lib/ad-analytics";
import { normalizeAnalyticsPathname } from "@/lib/analytics-screen";
import { isAdsensePathAllowed } from "@/lib/adsense";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    adsbygoogle?: unknown[] & { pauseAdRequests?: number };
  }
}

type Props = {
  /** Identyfikator jednostki reklamowej z panelu AdSense (np. 1234567890). */
  slot?: string | null;
  className?: string;
  /** Etykieta dostępności / wizualna nad slotem. */
  label?: string;
  placement?: AdPlacement;
  /** Ukryj cały kontener gdy Google nie wypełni reklamy (domyślnie true). */
  hideWhenEmpty?: boolean;
  onFillStatusChange?: (status: AdFillStatus) => void;
  /** Minimalna wysokość obszaru (ważne dla popupu / prostokąta). */
  minHeightPx?: number;
};

function readAdStatus(el: HTMLElement | null): AdFillStatus | null {
  if (!el) return null;
  const raw = el.getAttribute("data-ad-status")?.toLowerCase() ?? "";
  if (raw === "filled") return "filled";
  if (raw === "unfilled") return "unfilled";
  return null;
}

export function AdsenseSlot({
  slot,
  className,
  label = "Reklama",
  placement = "footer",
  hideWhenEmpty = true,
  onFillStatusChange,
  minHeightPx,
}: Props) {
  const pathname = usePathname();
  const { clientId, marketingAllowed, slotFooter, slotInline, slotPopup } = useAdsense();
  const defaultSlot =
    placement === "inline" ? slotInline : placement === "popup" ? slotPopup : slotFooter;
  const resolvedSlot = (slot?.trim() || defaultSlot || "").trim();
  const pushedKeyRef = useRef<string | null>(null);
  const statusSentRef = useRef<string | null>(null);
  const insRef = useRef<HTMLModElement | null>(null);
  const [fillStatus, setFillStatus] = useState<AdFillStatus>("pending");

  const allowed =
    marketingAllowed &&
    Boolean(clientId) &&
    Boolean(resolvedSlot) &&
    isAdsensePathAllowed(pathname);

  const pushKey = allowed ? `${pathname}|${resolvedSlot}|${placement}` : "";

  useEffect(() => {
    onFillStatusChange?.(fillStatus);
  }, [fillStatus, onFillStatusChange]);

  useEffect(() => {
    if (!allowed || !pushKey) {
      setFillStatus("pending");
      return;
    }
    if (pushedKeyRef.current === pushKey) return;

    setFillStatus("pending");
    statusSentRef.current = null;

    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      pushedKeyRef.current = pushKey;
      const path = normalizeAnalyticsPathname(pathname || "/");
      const visitorId = getAnalyticsVisitorId();
      if (visitorId && resolvedSlot) {
        sendAdImpressionBeacon({
          pathname: path,
          visitorId,
          slotId: resolvedSlot,
          placement,
          fillStatus: "pending",
        });
      }
    } catch {
      setFillStatus("unfilled");
    }
  }, [allowed, pushKey, pathname, resolvedSlot, placement]);

  useEffect(() => {
    if (!allowed || !pushKey) return;
    const el = insRef.current;
    if (!el) return;

    const report = (status: AdFillStatus) => {
      if (status === "pending") return;
      if (statusSentRef.current === pushKey) return;
      statusSentRef.current = pushKey;
      setFillStatus(status);
      const path = normalizeAnalyticsPathname(pathname || "/");
      const visitorId = getAnalyticsVisitorId();
      if (visitorId && resolvedSlot) {
        sendAdImpressionBeacon({
          pathname: path,
          visitorId,
          slotId: resolvedSlot,
          placement,
          fillStatus: status,
        });
      }
    };

    const initial = readAdStatus(el);
    if (initial) report(initial);

    const observer = new MutationObserver(() => {
      const next = readAdStatus(el);
      if (next) report(next);
    });
    observer.observe(el, { attributes: true, attributeFilter: ["data-ad-status"] });

    const timeout = window.setTimeout(() => {
      if (!readAdStatus(el) && statusSentRef.current !== pushKey) {
        report("unfilled");
      }
    }, ADSENSE_FILL_TIMEOUT_MS);

    return () => {
      observer.disconnect();
      window.clearTimeout(timeout);
    };
  }, [allowed, pushKey, pathname, resolvedSlot, placement]);

  if (!allowed) return null;
  if (hideWhenEmpty && fillStatus === "unfilled") return null;

  return (
    <aside
      className={cn(
        "mx-auto w-full max-w-6xl px-4 py-4",
        hideWhenEmpty && fillStatus === "pending" && placement !== "popup" ? "min-h-0" : null,
        className
      )}
      aria-label={label}
      aria-hidden={fillStatus === "unfilled" ? true : undefined}
      data-ad-placement={placement}
      data-ad-fill={fillStatus}
    >
      {label && (fillStatus === "filled" || !hideWhenEmpty) ? (
        <p className="mb-2 text-center text-[10px] font-medium uppercase tracking-wider text-emerald-800/55 dark:text-emerald-200/45">
          {label}
        </p>
      ) : null}
      <ins
        ref={insRef}
        key={pushKey}
        className="adsbygoogle"
        style={{
          display: "block",
          minHeight: minHeightPx ? `${minHeightPx}px` : undefined,
        }}
        data-ad-client={clientId!}
        data-ad-slot={resolvedSlot}
        data-ad-format={placement === "popup" ? "rectangle" : "auto"}
        data-full-width-responsive={placement === "popup" ? "false" : "true"}
      />
    </aside>
  );
}
