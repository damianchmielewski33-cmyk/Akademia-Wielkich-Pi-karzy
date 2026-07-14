import { PagePreloaderLayout } from "./page-preloader-layout";
import { getRoutePreloaderSpec } from "./route-preloader-config";

type Props = {
  path: string;
};

export function RoutePreloaderScreen({ path }: Props) {
  const { title, subtitle, kicker } = getRoutePreloaderSpec(path);
  return (
    <PagePreloaderLayout variant="full" kicker={kicker} title={title} subtitle={subtitle} />
  );
}
