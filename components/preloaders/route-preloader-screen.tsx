"use client";

import { PagePreloaderLayout } from "./page-preloader-layout";
import { getRoutePreloaderSpec } from "./route-preloader-config";
import { useDelayedVisible } from "./use-delayed-visible";

type Props = {
  path: string;
};

/**
 * Full-screen route loading — pokazuje się dopiero po krótkim opóźnieniu,
 * więc szybkie odpowiedzi nie migają preloaderem.
 */
export function RoutePreloaderScreen({ path }: Props) {
  const show = useDelayedVisible(true);
  const { title, subtitle, kicker } = getRoutePreloaderSpec(path);

  if (!show) {
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
