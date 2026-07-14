import type { Metadata } from "next";
import { getServerSession } from "@/lib/auth";
import { HomeClient } from "@/components/home-client";
import { getHomePageClientProps } from "@/lib/home-page-data";
import { getPzuCupAccessForUser } from "@/lib/pzu-cup-access";
import { getSiteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Start",
  description: "Najbliższy mecz, zapisy, terminarz i społeczność akademii.",
  openGraph: {
    url: getSiteUrl(),
  },
};

export default async function HomePage() {
  const session = await getServerSession();
  const canPzuCup = session ? await getPzuCupAccessForUser(session.userId, session.isAdmin) : false;
  const props = await getHomePageClientProps(session, {
    showPzuCupTile: canPzuCup,
    pageVariant: "home",
  });

  return <HomeClient {...props} />;
}
