"use client";

import { useEffect, useState } from "react";
import { shouldSuppressStartupRoutePreloader } from "@/components/startup-splash";
import { PagePreloaderLayout } from "./page-preloader-layout";
import { getRoutePreloaderSpec } from "./route-preloader-config";
import { useDelayedVisible } from "./use-delayed-visible";

type Props = {
  path: string;
};

/**
 * Full-screen route loading — pokazuje się dopiero po krótkim opóźnieniu,
 * więc szybkie odpowiedzi nie migają preloaderem.
 * Przy cold starcie aplikacji (splash / WebView Android) nie dokłada drugiego loadera
 * ani pustego zielonego tła — splash zostaje do treści (np. „Najbliższy mecz”).
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
      attributeFilter: ["class", "data-awp-content-ready"],
    });
    const poll = window.setInterval(sync, 400);

    return () => {
      obs.disconnect();
      window.clearInterval(poll);
    };
  }, []);

  if (!allowFullPreloader || !show) {
    return null;
  }

  return (
    <PagePreloaderLayout variant="full" kicker={kicker} title={title} subtitle={subtitle} />
  );
}
