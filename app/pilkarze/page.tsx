import type { Metadata } from "next";
import { PilkarzeClient } from "@/components/pilkarze-client";
import { REALMS } from "@/lib/realm";
import { getPilkarzePageData } from "@/lib/realm-page-data";

export const metadata: Metadata = {
  title: "Piłkarze",
  description: "Lista zawodników i profile w akademii.",
};

export default async function PilkarzePage() {
  const gracze = await getPilkarzePageData(REALMS.ACADEMY);

  return <PilkarzeClient players={gracze} />;
}
