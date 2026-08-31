import { HomeClient } from "@/components/home-client";
import { getHomePageClientProps } from "@/lib/home-page-data";
import type { AppSession } from "@/lib/auth";
import type { SiteMode } from "@/lib/site-mode";

type Props = {
  session: AppSession | null;
  siteMode: SiteMode | null;
  showPzuCupTile: boolean;
  pageVariant?: "home" | "pzu-cup";
};

export async function HomePageContent({
  session,
  siteMode,
  showPzuCupTile,
  pageVariant = "home",
}: Props) {
  const props = await getHomePageClientProps(session, {
    showPzuCupTile,
    pageVariant,
    siteMode,
  });

  return <HomeClient {...props} serverSiteMode={siteMode} />;
}
