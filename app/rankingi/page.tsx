import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import type { ComponentType } from "react";
import { Route, Share2, Shield, Target, Trophy } from "lucide-react";
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
import { PlayerAvatar, PlayerNameStack } from "@/components/player-avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const metadata: Metadata = {
  title: "Rankingi",
  description: "Porównanie zawodników według goli, asyst i punktów.",
};

export default async function RankingiPage() {
  const session = await getServerSession();
  if (!session) redirect("/login");

  const db = await getDb();
  const rows = await db
    .prepare(
      `SELECT u.id AS user_id,
              u.first_name, u.last_name,
              u.player_alias AS zawodnik,
              u.profile_photo_path,
              COALESCE(ms.goals, 0) + COALESCE(sms.goals, 0) AS goals,
              COALESCE(ms.assists, 0) + COALESCE(sms.assists, 0) AS assists,
              COALESCE(ms.distance, 0) + COALESCE(sms.distance, 0) AS distance,
              COALESCE(ms.saves, 0) + COALESCE(sms.saves, 0) AS saves,
              COALESCE(ms.mecze, 0) + COALESCE(sms.mecze, 0) AS mecze
       FROM users u
       LEFT JOIN (
         SELECT user_id,
                SUM(goals) AS goals,
                SUM(assists) AS assists,
                SUM(distance) AS distance,
                SUM(saves) AS saves,
                COUNT(*) AS mecze
         FROM match_stats
         GROUP BY user_id
       ) ms ON ms.user_id = u.id
       LEFT JOIN (
         SELECT user_id,
                SUM(goals) AS goals,
                SUM(assists) AS assists,
                SUM(distance) AS distance,
                SUM(saves) AS saves,
                COUNT(*) AS mecze
         FROM standalone_match_stats
         GROUP BY user_id
       ) sms ON sms.user_id = u.id`
    )
    .all() as {
    user_id: number;
    first_name: string;
    last_name: string;
    zawodnik: string;
    profile_photo_path: string | null;
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
      userId: r.user_id,
      first_name: r.first_name,
      last_name: r.last_name,
      zawodnik: r.zawodnik,
      profile_photo_path: r.profile_photo_path ?? null,
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
    <div className="container mx-auto max-w-6xl flex-1 px-4 py-8 text-center sm:py-10">
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
          <h1 className="text-3xl font-bold tracking-tight text-emerald-950 dark:text-emerald-100 sm:text-4xl">Rankingi</h1>
          <Image
            src="/soccer-ball.svg"
            alt=""
            width={56}
            height={56}
            className="h-12 w-12 scale-x-[-1] drop-shadow-sm sm:h-14 sm:w-14"
            unoptimized
          />
        </div>
        <p className="mt-4 text-base text-zinc-600 dark:text-zinc-400 sm:text-lg">
          Tabele goli, asyst, dystansu, obron i punktów łącznie
        </p>
      </div>

      <div className="mt-10 text-left">
        <div className="relative mx-auto max-w-2xl overflow-hidden rounded-2xl border-2 border-white/30 shadow-lg shadow-emerald-950/15 ring-1 ring-emerald-950/15 lg:max-w-none">
          <div className="home-pitch-tile absolute inset-0" aria-hidden />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-white/40" aria-hidden />
          <div className="relative px-5 py-4 sm:px-6 sm:py-5">
            <div className="flex items-center gap-2">
              <Trophy className="h-6 w-6 shrink-0 text-white drop-shadow-sm" strokeWidth={2.25} aria-hidden />
              <h2 className="text-lg font-bold tracking-tight text-white drop-shadow-sm sm:text-xl">Punktacja ogólna</h2>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-emerald-50/95 sm:text-base">
              Punkty łącznie to suma ze wszystkich zapisanych meczów: gole, asysty, przebiegnięty dystans (km) i obrony
              bramkarza. Pozostałe tabele pokazują tylko jedną kategorię — kolejność i tak samo liczy się od największej
              wartości w dół.
            </p>
            <p className="mt-2 text-sm font-semibold text-white drop-shadow-sm sm:text-base">Wartość punktów za akcję</p>
            <ul className="mt-1.5 space-y-1.5 text-sm text-emerald-50/95 sm:text-base">
              <li>
                Gol: <strong className="text-white">{PT_GOAL}</strong> pkt
              </li>
              <li>
                Asysta: <strong className="text-white">{PT_ASSIST}</strong> pkt
              </li>
              <li>
                Kilometr: <strong className="text-white">{PT_KM}</strong> pkt
              </li>
              <li>
                Obrona: <strong className="text-white">{PT_SAVE}</strong> pkt
              </li>
            </ul>
            <p className="mt-3 text-sm font-semibold text-white drop-shadow-sm sm:text-base">Wzór na punkty łącznie</p>
            <p className="mt-1 font-mono text-xs leading-relaxed text-emerald-50/95 sm:text-sm">
              {PT_GOAL}×gole + {PT_ASSIST}×asysty + {PT_KM}×km + {PT_SAVE}×obrony
            </p>
            <p className="mt-3 text-sm font-semibold text-white drop-shadow-sm sm:text-base">Miejsca w rankingu</p>
            <ul className="mt-1.5 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-emerald-50/95 sm:text-base">
              <li>
                Przy <strong className="text-white">tej samej wartości</strong> zawodnicy dzielą miejsce (ex aequo); kolejne
                pozycje są pomijane (np. dwoje na 1. miejscu, następny jest 3.).
              </li>
              <li>
                Przy remisie kolejność alfabetyczna według{" "}
                <strong className="text-white">imienia i nazwiska</strong>, a przy identycznych — według pseudonimu.
              </li>
              <li>
                Wynik zaokrąglany jest do <strong className="text-white">dwóch miejsc po przecinku</strong> przy wyświetlaniu
                punktów łącznie.
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <RankBlock title="Gole" icon={Target} rows={rankingGole} col="goals" />
          <RankBlock title="Asysty" icon={Share2} rows={rankingAsysty} col="assists" />
          <RankBlock title="Dystans (km)" icon={Route} rows={rankingDystans} col="distance" format="1f" />
          <RankBlock title="Obrony" icon={Shield} rows={rankingObrony} col="saves" />
          <div className="lg:col-span-2">
            <RankBlock title="Punkty łącznie" icon={Trophy} rows={rankingOgolny} col="punkty" format="2f" accent="gold" />
          </div>
        </div>
      </div>
    </div>
  );
}

function RankBlock({
  title,
  icon: Icon,
  rows,
  col,
  format,
  accent = "emerald",
}: {
  title: string;
  icon: ComponentType<{ className?: string; strokeWidth?: number }>;
  rows: {
    rank: number;
    userId: number;
    first_name: string;
    last_name: string;
    zawodnik: string;
    profile_photo_path: string | null;
    goals: number;
    assists: number;
    distance: number;
    saves: number;
    punkty: number;
  }[];
  col: keyof Pick<RankablePlayer, "goals" | "assists" | "distance" | "saves" | "punkty">;
  format?: "1f" | "2f";
  accent?: "emerald" | "gold";
}) {
  const headerBar =
    accent === "gold"
      ? "bg-gradient-to-r from-amber-900 via-amber-800 to-amber-900"
      : "bg-gradient-to-r from-emerald-950 via-emerald-900 to-emerald-950";

  return (
    <div className="relative overflow-hidden rounded-2xl border-2 border-white/35 shadow-lg shadow-emerald-950/15 ring-1 ring-emerald-950/15">
      <div className="home-pitch-tile absolute inset-0 opacity-[0.2]" aria-hidden />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-white/45" aria-hidden />
      <div className="pointer-events-none absolute bottom-0 left-0 h-9 w-9 rounded-tr-full border-t-2 border-r-2 border-white/40" aria-hidden />
      <div className="pointer-events-none absolute bottom-0 right-0 h-9 w-9 rounded-tl-full border-t-2 border-l-2 border-white/40" aria-hidden />
      <div className="relative rounded-[0.85rem] bg-white/98 p-0.5 backdrop-blur-[2px] dark:bg-zinc-900/95">
        <div className="overflow-hidden rounded-[0.8rem] border border-emerald-900/10 bg-white dark:border-emerald-800/30 dark:bg-zinc-900/90">
          <div className={`flex items-center justify-center gap-2 px-4 py-3 ${headerBar}`}>
            <Icon className="h-5 w-5 shrink-0 text-white" strokeWidth={2.25} aria-hidden />
            <h2 className="text-center text-base font-bold tracking-tight text-white sm:text-lg">{title}</h2>
          </div>
          <Table>
            <TableHeader className="border-b border-emerald-200/80 bg-emerald-50/90 text-emerald-950 [&_th]:text-emerald-900 dark:border-emerald-800/80 dark:bg-emerald-950/55 dark:text-emerald-100 dark:[&_th]:text-emerald-200">
              <TableRow className="border-0 hover:bg-transparent dark:hover:bg-transparent">
                <TableHead className="w-12">#</TableHead>
                <TableHead>Zawodnik</TableHead>
                <TableHead className="text-right">Wartość</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r, i) => (
                <TableRow
                  key={`${r.userId}-${r.rank}-${col}`}
                  className={
                    i % 2 === 0
                      ? "border-emerald-100/80 bg-emerald-50/35 hover:bg-emerald-50/55 dark:border-emerald-900/35 dark:bg-emerald-950/25 dark:hover:bg-emerald-950/40"
                      : "border-emerald-100/80 hover:bg-emerald-50/40 dark:border-emerald-900/35 dark:hover:bg-emerald-950/30"
                  }
                >
                  <TableCell className="font-bold tabular-nums text-emerald-800 dark:text-emerald-200">{r.rank}</TableCell>
                  <TableCell>
                    <div className="flex min-w-0 items-center gap-2">
                      <PlayerAvatar
                        photoPath={r.profile_photo_path}
                        firstName={r.first_name}
                        lastName={r.last_name}
                        size="sm"
                        ringClassName="ring-2 ring-emerald-200/80"
                      />
                      <PlayerNameStack
                        firstName={r.first_name}
                        lastName={r.last_name}
                        nick={r.zawodnik}
                      />
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums text-emerald-900 dark:text-emerald-200">
                    {format === "1f"
                      ? Number(r[col]).toFixed(1)
                      : format === "2f"
                        ? Number(r[col]).toFixed(2)
                        : r[col]}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
