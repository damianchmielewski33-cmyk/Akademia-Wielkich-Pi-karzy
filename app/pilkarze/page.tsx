import type { Metadata } from "next";
import { getDb } from "@/lib/db";
import { PilkarzeClient } from "@/components/pilkarze-client";
import { PitchPageHero } from "@/components/ui/pitch-card";

export const metadata: Metadata = {
  title: "Piłkarze",
  description: "Lista zawodników i profile w akademii.",
};

export default async function PilkarzePage() {
  const db = await getDb();
  const gracze = await db
    .prepare(
      "SELECT id, first_name, last_name, player_alias AS zawodnik, profile_photo_path FROM users ORDER BY first_name ASC"
    )
    .all() as {
    id: number;
    first_name: string;
    last_name: string;
    zawodnik: string;
    profile_photo_path: string | null;
  }[];

  return (
    <div className="container mx-auto max-w-5xl flex-1 px-4 py-8 text-center sm:py-10">
      <PitchPageHero title="Piłkarze" subtitle="Wszyscy zarejestrowani zawodnicy akademii" />

      <div className="mt-10 text-left">
        <PilkarzeClient players={gracze} />
      </div>
    </div>
  );
}
