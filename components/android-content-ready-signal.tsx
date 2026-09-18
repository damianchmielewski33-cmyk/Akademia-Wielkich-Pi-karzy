"use client";

import { useEffect } from "react";
import { notifyFirstScreenContentReady } from "@/lib/android-content-ready";

type Props = {
  /** Gdy false — jeszcze nie sygnalizuj (np. czekamy na dane). Domyślnie true. */
  ready?: boolean;
};

/**
 * Po namalowaniu pierwszego ekranu w WebView Androida / PWA
 * zdejmuje splash „Przygotowujemy boiska…” (WWW + most natywny).
 */
export function AndroidContentReadySignal({ ready = true }: Props) {
  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!cancelled) notifyFirstScreenContentReady();
      });
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(id);
    };
  }, [ready]);

  return null;
}
