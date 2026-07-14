import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth";
import { PzuCupHomeClient } from "@/components/pzu-cup-shell";
import { getPzuCupHomeClientProps } from "@/lib/pzu-cup-home-data";
import { canAccessPzuCup } from "@/lib/pzu-cup-access";

export const metadata: Metadata = {
  title: "Start",
};

export default async function PzuCupPage() {
  const session = await getServerSession();
  if (session && !(await canAccessPzuCup(session))) {
    redirect("/");
  }

  const props = await getPzuCupHomeClientProps(session);

  return (
    <PzuCupHomeClient
      siteName={props.siteName}
      siteDescription={props.siteDescription}
      isLoggedIn={props.isLoggedIn}
      firstName={props.firstName}
      lastName={props.lastName}
      zawodnik={props.zawodnik}
      profilePhotoPath={props.profilePhotoPath}
    />
  );
}
