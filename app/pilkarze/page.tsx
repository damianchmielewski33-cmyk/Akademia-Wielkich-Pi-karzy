import type { Metadata } from "next";
import Image from "next/image";
import { getDb } from "@/lib/db";
import { PilkarzeClient } from "@/components/pilkarze-client";

export const metadata: Metadata = {
  title: "Piłkarze",
  description: "Lista zawodników i profile w akademii.",
};

export default async function PilkarzePage() {
  const db = getDb();
  const gracze = db
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
      <div className="relative mx-auto max-w-2xl">
        <div className="pitch-rule mx-auto mb-5 w-40 sm:w-48" />
        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-5">
          <Image
            src="/soccer-ball.svg"
            alt=""
            width={56}
            height={56}
            className="h-12 w-12 drop-shadow-sm sm:h-14 sm:w-14"
            unoptimized
          />
          <h1 className="text-3xl font-bold tracking-tight text-emerald-950 sm:text-4xl">Piłkarze</h1>
          <Image
            src="/soccer-ball.svg"
            alt=""
            width={56}
            height={56}
            className="h-12 w-12 scale-x-[-1] drop-shadow-sm sm:h-14 sm:w-14"
            unoptimized
          />
        </div>
        <p className="mt-4 text-base text-zinc-600 sm:text-lg">Wszyscy zarejestrowani zawodnicy akademii</p>
      </div>

      <div className="mt-10 text-left">
        <PilkarzeClient players={gracze} />
      </div>
    </div>
  );
}
