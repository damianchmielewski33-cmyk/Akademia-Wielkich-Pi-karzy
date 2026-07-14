import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth";
import { HomeClient } from "@/components/home-client";
import { getHomePageClientProps } from "@/lib/home-page-data";
import { getPzuCupAccessForUser } from "@/lib/pzu-cup-access";

export const metadata: Metadata = {
  title: "PZU Cup 2026",
  description: "Organizacja turnieju PZU Cup 2026.",
  robots: { index: false, follow: false },
};

export default async function PzuCupPage() {
  const session = await getServerSession();
  if (!session) {
    redirect("/login?next=/pzu-cup");
  }

  const allowed = await getPzuCupAccessForUser(session.userId, session.isAdmin);
  if (!allowed) {
    redirect("/");
  }

  const props = await getHomePageClientProps(session, {
    showPzuCupTile: false,
    pageVariant: "pzu-cup",
  });

  return <HomeClient {...props} />;
}
