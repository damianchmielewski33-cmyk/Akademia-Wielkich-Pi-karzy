import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth";
import { canAccessPzuCup } from "@/lib/pzu-cup-access";
import { getAppSettings } from "@/lib/app-settings";
import { getDb } from "@/lib/db";
import { getRankingsPageData } from "@/lib/rankings-data";
import { REALMS } from "@/lib/realm";
import { formatMatchCountPl, rankPlayers, rankingRate } from "@/lib/rankings";
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
      <div className="awp-page awp-page--wide text-center">
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
    <div className="awp-page awp-page--wide">
      <div className="mb-8 rounded-2xl border border-sky-400/25 bg-sky-950/40 px-6 py-8 text-center">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-400">PZU Cup</p>
        <h1 className="mt-2 text-3xl font-bold text-white">Rankingi</h1>
        <p className="mt-2 text-sm text-sky-200/80">
          Sezon: {season.name}. Klasyfikacja według średniej na mecz — liczba spotkań nie zmienia pozycji.
        </p>
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
              <TableHead className="text-right text-sky-200">Gole/mecz</TableHead>
              <TableHead className="text-right text-sky-200">Asysty/mecz</TableHead>
              <TableHead className="text-right text-sky-200">Km/mecz</TableHead>
              <TableHead className="text-right text-sky-200">Obrony/mecz</TableHead>
              <TableHead className="text-right text-sky-200">Pkt/mecz</TableHead>
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
                    <div className="min-w-0">
                      <PlayerNameStack firstName={p.first_name} lastName={p.last_name} nick={p.zawodnik} />
                      <p className="mt-0.5 text-xs text-sky-200/70">{formatMatchCountPl(p.mecze)}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-right text-white">{rankingRate(p, "goals").toFixed(2)}</TableCell>
                <TableCell className="text-right text-white">{rankingRate(p, "assists").toFixed(2)}</TableCell>
                <TableCell className="text-right text-white">{rankingRate(p, "distance").toFixed(2)}</TableCell>
                <TableCell className="text-right text-white">{rankingRate(p, "saves").toFixed(2)}</TableCell>
                <TableCell className="text-right font-bold text-amber-300">{rankingRate(p, "punkty").toFixed(2)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <p className="mt-6 text-center text-xs text-sky-200/60">
        Punkty / mecz: gol {PT_GOAL}, asysta {PT_ASSIST}, km {PT_KM}, obrona {PT_SAVE}. Suma dzielona przez liczbę meczów.
      </p>
    </div>
  );
}
