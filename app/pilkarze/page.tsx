import Link from "next/link";
import { getDb } from "@/lib/db";
import { PilkarzeClient } from "@/components/pilkarze-client";

export default async function PilkarzePage() {
  const db = getDb();
  const gracze = db
    .prepare(
      "SELECT id, first_name, last_name, player_alias AS zawodnik FROM users ORDER BY first_name ASC"
    )
    .all() as { id: number; first_name: string; last_name: string; zawodnik: string }[];

  return (
    <div className="container mx-auto max-w-5xl px-4 py-10">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-light text-emerald-950">Pilkarze</h1>
          <p className="mt-1 text-emerald-800/70">Wszyscy zarejestrowani zawodnicy</p>
        </div>
        <Link
          href="/"
          className="rounded-xl border border-emerald-200 bg-white px-4 py-2 text-sm font-semibold text-emerald-800 shadow-sm hover:bg-emerald-50"
        >
          Strona glowna
        </Link>
      </div>
      <PilkarzeClient players={gracze} />
    </div>
  );
}
