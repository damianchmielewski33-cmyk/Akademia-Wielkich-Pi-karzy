import type { Metadata } from "next";
import { PilkarzeClient } from "@/components/pilkarze-client";
import { PitchPageHero } from "@/components/ui/pitch-card";
import { REALMS } from "@/lib/realm";
import { getPilkarzePageData } from "@/lib/realm-page-data";

export const metadata: Metadata = {
  title: "Piłkarze",
  description: "Lista zawodników i profile w akademii.",
};

export default async function PilkarzePage() {
  const gracze = await getPilkarzePageData(REALMS.ACADEMY);

  return (
    <div className="awp-page awp-page--default text-center">
      <PitchPageHero title="Piłkarze" subtitle="Wszyscy zarejestrowani zawodnicy akademii" />

      <div className="mt-10 text-left">
        <PilkarzeClient players={gracze} />
      </div>
    </div>
  );
}
