import { HomeClient } from "@/components/home-client";
import { getHomePageClientProps } from "@/lib/home-page-data";
import type { AppSession } from "@/lib/auth";
import type { SiteMode } from "@/lib/site-mode";

type Props = {
  session: AppSession | null;
  siteMode: SiteMode | null;
};

export async function HomePageContent({ session, siteMode }: Props) {
  const props = await getHomePageClientProps(session, { siteMode });
  return <HomeClient {...props} serverSiteMode={siteMode} />;
}
