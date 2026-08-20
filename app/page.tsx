import type { Metadata } from "next";
import { Suspense } from "react";
import { cookies } from "next/headers";
import { getServerSession } from "@/lib/auth";
import { HomeClient } from "@/components/home-client";
import { getHomePageClientProps } from "@/lib/home-page-data";
import { getPzuCupAccessForUser } from "@/lib/pzu-cup-access";
import { getSiteUrl } from "@/lib/site";
import { parseSiteMode, SITE_MODE_COOKIE } from "@/lib/site-mode";

export const metadata: Metadata = {
  title: "Start",
  description: "Rezerwuj boiska online albo dołącz do terminarza akademii — to dwa osobne miejsca.",
  openGraph: {
    url: getSiteUrl(),
  },
};

export default async function HomePage() {
  const session = await getServerSession();
  const siteMode = parseSiteMode((await cookies()).get(SITE_MODE_COOKIE)?.value);
  const canPzuCup = siteMode === "academy" && session
    ? await getPzuCupAccessForUser(session.userId, session.isAdmin)
    : false;
  const props = await getHomePageClientProps(session, {
    showPzuCupTile: canPzuCup,
    pageVariant: "home",
    siteMode,
  });

  return (
    <Suspense fallback={<p className="p-8 text-center text-sm text-zinc-500">Ładowanie…</p>}>
      <HomeClient {...props} />
    </Suspense>
  );
}
