"use client";

import { useEffect, useState } from "react";
import {
  markAndroidColdStartPreloadersDone,
  shouldSuppressStartupRoutePreloader,
} from "@/components/startup-splash";
import { isInstalledAndroidAppClient } from "@/lib/app-webview";
import { PagePreloaderLayout } from "./page-preloader-layout";
import { getRoutePreloaderSpec } from "./route-preloader-config";
import { useDelayedVisible } from "./use-delayed-visible";

type Props = {
  path: string;
};

/**
 * Full-screen route loading — pokazuje się dopiero po krótkim opóźnieniu,
 * więc szybkie odpowiedzi nie migają preloaderem.
 * Przy cold starcie aplikacji (splash / WebView Android) nie dokłada drugiego loadera.
 */
export function RoutePreloaderScreen({ path }: Props) {
  const show = useDelayedVisible(true);
  const { title, subtitle, kicker } = getRoutePreloaderSpec(path);
  const [allowFullPreloader, setAllowFullPreloader] = useState(false);

  useEffect(() => {
    const sync = () => {
      setAllowFullPreloader(!shouldSuppressStartupRoutePreloader());
    };
    sync();
    const obs = new MutationObserver(sync);
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    // Android: po pierwszym paintcie treści przywróć preloadery do kolejnych nawigacji.
    let coldDoneTimer: number | undefined;
    if (isInstalledAndroidAppClient()) {
      coldDoneTimer = window.setTimeout(() => {
        markAndroidColdStartPreloadersDone();
        sync();
      }, 2500);
    }

    return () => {
      obs.disconnect();
      if (coldDoneTimer) window.clearTimeout(coldDoneTimer);
    };
  }, []);

  if (!allowFullPreloader || !show) {
    return (
      <div
        className="marketplace-bg min-h-[40vh] flex-1"
        aria-busy="true"
        aria-label={title}
      />
    );
  }

  return (
    <PagePreloaderLayout variant="full" kicker={kicker} title={title} subtitle={subtitle} />
  );
}
