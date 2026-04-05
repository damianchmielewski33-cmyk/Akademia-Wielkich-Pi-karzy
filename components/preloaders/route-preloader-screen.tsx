import { PagePreloaderLayout } from "./page-preloader-layout";
import { getRoutePreloaderSpec } from "./route-preloader-config";

type Props = {
  path: string;
};

/** Jednolity, duży ekran ładowania dla segmentu — treść zależy od ścieżki. */
export function RoutePreloaderScreen({ path }: Props) {
  const { title, subtitle, Preloader } = getRoutePreloaderSpec(path);
  return (
    <PagePreloaderLayout variant="full" title={title} subtitle={subtitle}>
      <Preloader />
    </PagePreloaderLayout>
  );
}
