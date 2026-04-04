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
    <div className="container mx-auto max-w-5xl flex-1 px-4 py-10">
      <div className="mb-8">
        <div className="pitch-rule mb-4 w-32" />
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">Piłkarze</h1>
        <p className="mt-2 text-zinc-600">Wszyscy zarejestrowani zawodnicy akademii</p>
      </div>
      <PilkarzeClient players={gracze} />
    </div>
  );
}
