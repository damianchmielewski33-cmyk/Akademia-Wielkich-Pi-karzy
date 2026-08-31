import type { Metadata } from "next";
import { Suspense } from "react";
import { cookies } from "next/headers";
import { getServerSession } from "@/lib/auth";
import { HomePageContent } from "@/components/home-page-content";
import { HomePageSkeleton } from "@/components/home-page-skeleton";
import { isBookingMarketplaceEnabled } from "@/lib/booking-marketplace";
import { getPzuCupAccessForUser } from "@/lib/pzu-cup-access";
import { getSiteUrl } from "@/lib/site";
import { parseSiteMode, SITE_MODE_COOKIE } from "@/lib/site-mode";

export async function generateMetadata(): Promise<Metadata> {
  if (!(await isBookingMarketplaceEnabled())) {
    return {
      title: "Start",
      description: "Terminarz, składy i społeczność akademii.",
      openGraph: { url: getSiteUrl() },
    };
  }
  return {
    title: "Rezerwacja orlika i hali",
    description:
      "Rezerwuj boisko online: Warszawa i kolejne miasta, godzina, cena od, płatność od razu. Akademia piłki — drugim wejściem.",
    openGraph: {
      url: getSiteUrl(),
    },
  };
}

export default async function HomePage() {
  const session = await getServerSession();
  const marketplaceEnabled = await isBookingMarketplaceEnabled();
  const siteMode = marketplaceEnabled
    ? parseSiteMode((await cookies()).get(SITE_MODE_COOKIE)?.value)
    : "academy";
  const canPzuCup = siteMode === "academy" && session
    ? await getPzuCupAccessForUser(session.userId, session.isAdmin)
    : false;

  return (
    <Suspense fallback={<HomePageSkeleton />}>
      <HomePageContent
        session={session}
        siteMode={siteMode}
        showPzuCupTile={canPzuCup}
        pageVariant="home"
      />
    </Suspense>
  );
}
