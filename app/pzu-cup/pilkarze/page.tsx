import type { Metadata } from "next";
import { PilkarzeClient } from "@/components/pilkarze-client";
import { REALMS } from "@/lib/realm";
import { getPilkarzePageData } from "@/lib/realm-page-data";

export const metadata: Metadata = {
  title: "Piłkarze",
  description: "Zawodnicy turnieju PZU Cup.",
};

export default async function PzuCupPilkarzePage() {
  const gracze = await getPilkarzePageData(REALMS.PZU_CUP);

  return (
    <div className="container mx-auto max-w-5xl flex-1 px-4 py-8 text-center sm:py-10">
      <div className="mx-auto max-w-2xl rounded-2xl border border-sky-400/25 bg-sky-950/40 px-6 py-8">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-400">PZU Cup</p>
        <h1 className="mt-2 text-3xl font-bold text-white">Piłkarze</h1>
        <p className="mt-2 text-sm text-sky-200/80">Zawodnicy zarejestrowani w turnieju — osobna baza od Akademii</p>
      </div>
      <div className="mt-10 text-left">
        <PilkarzeClient players={gracze} />
      </div>
    </div>
  );
}
