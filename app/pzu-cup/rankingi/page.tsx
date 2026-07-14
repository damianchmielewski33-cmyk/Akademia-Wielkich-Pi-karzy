import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth";
import { canAccessPzuCup } from "@/lib/pzu-cup-access";
import { getAppSettings } from "@/lib/app-settings";
import { getDb } from "@/lib/db";
import { getRankingsPageData } from "@/lib/rankings-data";
import { REALMS } from "@/lib/realm";
import { rankPlayers } from "@/lib/rankings";
import { RankingiSeasonPicker } from "@/components/rankingi-season-picker";
import { PlayerAvatar, PlayerNameStack } from "@/components/player-avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const metadata: Metadata = {
  title: "Rankingi",
  description: "Rankingi turnieju PZU Cup.",
};

type Props = {
  searchParams: Promise<{ season?: string }>;
};

export default async function PzuCupRankingiPage({ searchParams }: Props) {
  const session = await getServerSession();
  if (!session) redirect("/pzu-cup/login?next=/pzu-cup/rankingi");
  if (!(await canAccessPzuCup(session))) redirect("/");

  const params = await searchParams;
  const requestedSeasonId = params.season ? Number(params.season) : null;
  const { season, seasons, players } = await getRankingsPageData(
    requestedSeasonId != null && Number.isFinite(requestedSeasonId) ? requestedSeasonId : null,
    REALMS.PZU_CUP
  );

  if (params.season && !season) {
    redirect("/pzu-cup/rankingi");
  }

  if (!season) {
    return (
      <div className="container mx-auto max-w-6xl flex-1 px-4 py-8 text-center sm:py-10">
        <div className="mx-auto max-w-lg rounded-2xl border border-sky-400/25 bg-sky-950/40 px-6 py-10">
          <h1 className="text-2xl font-bold text-white">Rankingi PZU Cup</h1>
          <p className="mt-2 text-sm text-sky-200/80">Brak sezonów rankingu do wyświetlenia.</p>
        </div>
      </div>
    );
  }

  const db = await getDb();
  const appSettings = await getAppSettings(db, REALMS.PZU_CUP);
  const PT_GOAL = appSettings.ranking_pt_goal;
  const PT_ASSIST = appSettings.ranking_pt_assist;
  const PT_KM = appSettings.ranking_pt_km;
  const PT_SAVE = appSettings.ranking_pt_save;

  const ranked = rankPlayers(players, "punkty");

  return (
    <div className="container mx-auto max-w-6xl flex-1 px-4 py-8 sm:py-10">
      <div className="mb-8 rounded-2xl border border-sky-400/25 bg-sky-950/40 px-6 py-8 text-center">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-400">PZU Cup</p>
        <h1 className="mt-2 text-3xl font-bold text-white">Rankingi</h1>
        <p className="mt-2 text-sm text-sky-200/80">Sezon: {season.name}</p>
      </div>

      <RankingiSeasonPicker
        seasons={seasons}
        selectedSeasonId={season.id}
        basePath="/pzu-cup/rankingi"
      />

      <div className="mt-8 overflow-hidden rounded-2xl border border-sky-400/20 bg-sky-950/30">
        <Table>
          <TableHeader>
            <TableRow className="border-sky-400/20 hover:bg-transparent">
              <TableHead className="text-sky-200">#</TableHead>
              <TableHead className="text-sky-200">Zawodnik</TableHead>
              <TableHead className="text-right text-sky-200">Gole</TableHead>
              <TableHead className="text-right text-sky-200">Asysty</TableHead>
              <TableHead className="text-right text-sky-200">Km</TableHead>
              <TableHead className="text-right text-sky-200">Obrony</TableHead>
              <TableHead className="text-right text-sky-200">Pkt</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ranked.map((p) => (
              <TableRow key={p.userId} className="border-sky-400/10">
                <TableCell className="font-semibold text-amber-300">{p.rank}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <PlayerAvatar
                      photoPath={p.profile_photo_path}
                      firstName={p.first_name}
                      lastName={p.last_name}
                      size="sm"
                    />
                    <PlayerNameStack firstName={p.first_name} lastName={p.last_name} nick={p.zawodnik} />
                  </div>
                </TableCell>
                <TableCell className="text-right text-white">{p.goals}</TableCell>
                <TableCell className="text-right text-white">{p.assists}</TableCell>
                <TableCell className="text-right text-white">{p.distance}</TableCell>
                <TableCell className="text-right text-white">{p.saves}</TableCell>
                <TableCell className="text-right font-bold text-amber-300">{p.punkty}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <p className="mt-6 text-center text-xs text-sky-200/60">
        Punkty: gol {PT_GOAL}, asysta {PT_ASSIST}, km {PT_KM}, obrona {PT_SAVE}
      </p>
    </div>
  );
}
