import Link from "next/link";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { getServerSession } from "@/lib/auth";
import {
  PT_ASSIST,
  PT_GOAL,
  PT_KM,
  PT_SAVE,
  rankPlayers,
  type RankablePlayer,
} from "@/lib/rankings";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function RankingiPage() {
  const session = await getServerSession();
  if (!session) redirect("/login");

  const db = getDb();
  const rows = db
    .prepare(
      `SELECT u.player_alias AS zawodnik,
              COALESCE(SUM(s.goals), 0) AS goals,
              COALESCE(SUM(s.assists), 0) AS assists,
              COALESCE(SUM(s.distance), 0) AS distance,
              COALESCE(SUM(s.saves), 0) AS saves,
              COUNT(s.id) AS mecze
       FROM users u
       LEFT JOIN match_stats s ON s.user_id = u.id
       GROUP BY u.id, u.player_alias`
    )
    .all() as {
    zawodnik: string;
    goals: number;
    assists: number;
    distance: number;
    saves: number;
    mecze: number;
  }[];

  const players: RankablePlayer[] = rows.map((r) => {
    const g = Number(r.goals) || 0;
    const a = Number(r.assists) || 0;
    const d = Number(r.distance) || 0;
    const sv = Number(r.saves) || 0;
    const mecze = Number(r.mecze) || 0;
    const punkty = PT_GOAL * g + PT_ASSIST * a + PT_KM * d + PT_SAVE * sv;
    return {
      zawodnik: r.zawodnik,
      goals: g,
      assists: a,
      distance: d,
      saves: sv,
      mecze,
      punkty: Math.round(punkty * 100) / 100,
    };
  });

  const rankingGole = rankPlayers(players, "goals");
  const rankingAsysty = rankPlayers(players, "assists");
  const rankingDystans = rankPlayers(players, "distance");
  const rankingObrony = rankPlayers(players, "saves");
  const rankingOgolny = rankPlayers(players, "punkty");

  return (
    <div className="container mx-auto max-w-6xl px-4 py-10">
      <Link href="/" className="mb-6 inline-block font-medium text-emerald-700 hover:underline">
        ⬅ Powrót
      </Link>
      <h1 className="text-center text-3xl font-bold text-emerald-950">🏆 Rankingi</h1>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="text-lg text-emerald-900">Punktacja ogólna</CardTitle>
        </CardHeader>
        <CardContent className="text-sm leading-relaxed text-emerald-800/90">
          <ul className="list-disc space-y-1 pl-5">
            <li>Gol: {PT_GOAL} pkt</li>
            <li>Asysta: {PT_ASSIST} pkt</li>
            <li>Kilometr: {PT_KM} pkt</li>
            <li>Obrona: {PT_SAVE} pkt</li>
          </ul>
        </CardContent>
      </Card>

      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        <RankBlock title="⚽ Gole" rows={rankingGole} col="goals" />
        <RankBlock title="🎯 Asysty" rows={rankingAsysty} col="assists" />
        <RankBlock title="🏃 Dystans (km)" rows={rankingDystans} col="distance" format="1f" />
        <RankBlock title="🧤 Obrony" rows={rankingObrony} col="saves" />
        <div className="lg:col-span-2">
          <RankBlock title="🏆 Punkty łącznie" rows={rankingOgolny} col="punkty" format="2f" />
        </div>
      </div>
    </div>
  );
}

function RankBlock({
  title,
  rows,
  col,
  format,
}: {
  title: string;
  rows: { rank: number; zawodnik: string; goals: number; assists: number; distance: number; saves: number; punkty: number }[];
  col: keyof Pick<RankablePlayer, "goals" | "assists" | "distance" | "saves" | "punkty">;
  format?: "1f" | "2f";
}) {
  return (
    <div className="rounded-xl border border-emerald-100 bg-white/95 p-4 shadow-sm">
      <h2 className="mb-3 text-center text-lg font-semibold text-emerald-950">{title}</h2>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">#</TableHead>
            <TableHead>Zawodnik</TableHead>
            <TableHead className="text-right">Wartość</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={`${r.zawodnik}-${r.rank}`}>
              <TableCell className="font-bold text-emerald-800">{r.rank}</TableCell>
              <TableCell>{r.zawodnik}</TableCell>
              <TableCell className="text-right font-medium">
                {format === "1f" ? Number(r[col]).toFixed(1) : format === "2f" ? Number(r[col]).toFixed(2) : r[col]}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
