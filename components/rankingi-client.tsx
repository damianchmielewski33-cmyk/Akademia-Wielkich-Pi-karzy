"use client";

import type { ComponentType } from "react";
import { Route, Share2, Shield, Target, Trophy } from "lucide-react";
import { MarketplacePitchPhoto } from "@/components/marketplace-pitch-photo";
import {
  MarketplaceSection,
  mpEmptyClass,
  mpInnerPanelClass,
} from "@/components/payments-card";
import { PlayerAvatar, PlayerNameStack } from "@/components/player-avatar";
import { RankingiSeasonPicker } from "@/components/rankingi-season-picker";
import { useSiteMode } from "@/components/site-mode";
import { PitchCard, PitchPageHero, pitchLabelClass } from "@/components/ui/pitch-card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MARKETPLACE_PITCH_PHOTOS } from "@/lib/marketplace-photos";
import type { RankingStatKey } from "@/lib/rankings";
import { formatMatchCountPl, rankingRate } from "@/lib/rankings";

export type RankingiSeasonOption = {
  id: number;
  name: string;
  is_active: boolean;
};

export type RankingiRow = {
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
  mecze: number;
};

export type RankingiScoring = {
  ptGoal: number;
  ptAssist: number;
  ptKm: number;
  ptSave: number;
};

type Props = {
  season: RankingiSeasonOption | null;
  seasons: RankingiSeasonOption[];
  scoring: RankingiScoring;
  rankingGole: RankingiRow[];
  rankingAsysty: RankingiRow[];
  rankingDystans: RankingiRow[];
  rankingObrony: RankingiRow[];
  rankingOgolny: RankingiRow[];
  basePath?: string;
  title?: string;
};

export function RankingiClient({
  season,
  seasons,
  scoring,
  rankingGole,
  rankingAsysty,
  rankingDystans,
  rankingObrony,
  rankingOgolny,
  basePath = "/rankingi",
  title = "Rankingi",
}: Props) {
  const { marketplaceEnabled } = useSiteMode();
  const light = marketplaceEnabled;

  if (!season) {
    if (light) {
      return (
        <div className="relative flex flex-1 flex-col text-zinc-900 dark:text-zinc-50">
          <Hero light title={title} subtitle="Brak sezonów rankingu do wyświetlenia." />
          <div className="relative z-10 mx-auto w-full max-w-6xl px-3 py-8 xs:px-4 sm:py-10">
            <p className={mpEmptyClass}>Administrator nie utworzył jeszcze sezonu rankingu.</p>
          </div>
        </div>
      );
    }
    return (
      <div className="awp-page awp-page--wide text-center">
        <PitchPageHero title={title} subtitle="Brak sezonów rankingu do wyświetlenia." />
      </div>
    );
  }

  const seasonSubtitle = season.is_active
    ? `${season.name} — sezon aktywny`
    : `${season.name} — sezon zakończony`;

  const picker =
    seasons.length > 1 ? (
      <RankingiSeasonPicker
        seasons={seasons}
        selectedSeasonId={season.id}
        basePath={basePath}
      />
    ) : light ? (
      <p className="mx-auto mt-4 max-w-md text-center text-sm text-zinc-500 dark:text-zinc-400">{season.name}</p>
    ) : (
      <p className="mx-auto mt-4 max-w-md text-sm text-zinc-500">{season.name}</p>
    );

  const scoringCard = light ? (
    <MarketplaceSection
      icon={Trophy}
      title="Punktacja ogólna"
      description="Ranking porównuje średnią na mecz, nie sumę ze wszystkich spotkań. 2 mecze i 8 meczów liczą się tak samo — wyżej stoi lepsza średnia."
      className="mx-auto max-w-2xl lg:max-w-none"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className={mpInnerPanelClass}>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--mp-teal-dark)]">
            Wartość punktów
          </p>
          <ul className="mt-2 space-y-1.5 text-sm text-zinc-700 dark:text-zinc-300">
            <li>
              Gol: <strong className="text-zinc-950 dark:text-white">{scoring.ptGoal}</strong> pkt
            </li>
            <li>
              Asysta: <strong className="text-zinc-950 dark:text-white">{scoring.ptAssist}</strong> pkt
            </li>
            <li>
              Kilometr: <strong className="text-zinc-950 dark:text-white">{scoring.ptKm}</strong> pkt
            </li>
            <li>
              Obrona: <strong className="text-zinc-950 dark:text-white">{scoring.ptSave}</strong> pkt
            </li>
          </ul>
        </div>
        <div className={mpInnerPanelClass}>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--mp-teal-dark)]">Wzór</p>
          <p className="mt-2 font-mono text-xs leading-relaxed text-zinc-700 dark:text-zinc-300 sm:text-sm">
            ({scoring.ptGoal}×gole + {scoring.ptAssist}×asysty + {scoring.ptKm}×km + {scoring.ptSave}×obrony) / mecze
          </p>
        </div>
      </div>
    </MarketplaceSection>
  ) : (
    <PitchCard className="mx-auto max-w-2xl lg:max-w-none" contentClassName="px-5 py-4 sm:px-6 sm:py-5">
      <span className={pitchLabelClass}>Punktacja</span>
      <div className="mt-2 flex items-center gap-2">
        <Trophy className="h-6 w-6 shrink-0 text-white drop-shadow-sm" strokeWidth={2.25} aria-hidden />
        <h2 className="text-lg font-bold tracking-tight text-white drop-shadow-sm sm:text-xl">Punktacja ogólna</h2>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-emerald-50/95 sm:text-base">
        Ranking jest według średniej na mecz (gole, asysty, km, obrony i punkty dzielone przez liczbę spotkań). Liczba
        meczów nie podnosi pozycji — zawodnik po dwóch meczach konkuruje na równych zasadach z kimś po ośmiu.
      </p>
      <p className="mt-2 text-sm font-semibold text-white drop-shadow-sm sm:text-base">Wartość punktów za akcję</p>
      <ul className="mt-1.5 space-y-1.5 text-sm text-emerald-50/95 sm:text-base">
        <li>
          Gol: <strong className="text-white">{scoring.ptGoal}</strong> pkt
        </li>
        <li>
          Asysta: <strong className="text-white">{scoring.ptAssist}</strong> pkt
        </li>
        <li>
          Kilometr: <strong className="text-white">{scoring.ptKm}</strong> pkt
        </li>
        <li>
          Obrona: <strong className="text-white">{scoring.ptSave}</strong> pkt
        </li>
      </ul>
      <p className="mt-3 text-sm font-semibold text-white drop-shadow-sm sm:text-base">Wzór na punkty / mecz</p>
      <p className="mt-1 font-mono text-xs leading-relaxed text-emerald-50/95 sm:text-sm">
        ({scoring.ptGoal}×gole + {scoring.ptAssist}×asysty + {scoring.ptKm}×km + {scoring.ptSave}×obrony) / mecze
      </p>
    </PitchCard>
  );

  const boards = (
    <div className="mt-8 grid gap-6 lg:grid-cols-2">
      <RankBlock light={light} title="Gole" icon={Target} rows={rankingGole} col="goals" />
      <RankBlock light={light} title="Asysty" icon={Share2} rows={rankingAsysty} col="assists" />
      <RankBlock light={light} title="Dystans (km)" icon={Route} rows={rankingDystans} col="distance" format="1f" />
      <RankBlock light={light} title="Obrony" icon={Shield} rows={rankingObrony} col="saves" />
      <div className="lg:col-span-2">
        <RankBlock
          light={light}
          title="Punkty / mecz"
          icon={Trophy}
          rows={rankingOgolny}
          col="punkty"
          format="2f"
          accent={light ? "teal" : "gold"}
        />
      </div>
    </div>
  );

  if (light) {
    return (
      <div className="relative flex flex-1 flex-col text-zinc-900 dark:text-zinc-50">
        <Hero light title={title} subtitle={seasonSubtitle} />
        <div className="relative z-10 mx-auto w-full min-w-0 max-w-6xl px-3 py-8 text-left xs:px-4 sm:py-10">
          {picker}
          <div className="mt-8">{scoringCard}</div>
          {boards}
        </div>
      </div>
    );
  }

  return (
    <div className="awp-page awp-page--wide text-center">
      <PitchPageHero title={title} subtitle={seasonSubtitle} />
      {picker}
      <div className="mt-10 text-left">
        {scoringCard}
        {boards}
      </div>
    </div>
  );
}

function Hero({ light, title, subtitle }: { light: boolean; title: string; subtitle: string }) {
  if (!light) return null;
  return (
    <section className="mp-hero mp-hero--photo relative z-10 flex flex-col justify-end overflow-hidden pb-10 pt-12 sm:pb-16 sm:pt-20">
      <MarketplacePitchPhoto src={MARKETPLACE_PITCH_PHOTOS[7]} priority className="z-0" />
      <div className="absolute inset-0 z-[1] bg-gradient-to-t from-black/75 via-black/40 to-black/20" />
      <div className="relative z-10 mx-auto w-full max-w-6xl px-3 xs:px-4">
        <p className="text-[0.65rem] font-black uppercase tracking-[0.22em] text-white/80 sm:text-xs">Akademia</p>
        <h1 className="mt-2 text-[1.85rem] font-black leading-tight tracking-tight text-white xs:text-4xl sm:text-5xl">
          {title}
        </h1>
        <p className="mt-3 max-w-xl text-sm text-white/85 sm:text-base">{subtitle}</p>
      </div>
    </section>
  );
}

function RankBlock({
  title,
  icon: Icon,
  rows,
  col,
  format,
  accent = "emerald",
  light = false,
}: {
  title: string;
  icon: ComponentType<{ className?: string; strokeWidth?: number }>;
  rows: RankingiRow[];
  col: RankingStatKey;
  format?: "1f" | "2f";
  accent?: "emerald" | "gold" | "teal";
  light?: boolean;
}) {
  if (light) {
    return (
      <MarketplaceSection
        icon={Icon}
        title={title}
        headerExtra={
          accent === "teal" ? (
            <span className="rounded-full bg-[var(--mp-teal)]/15 px-3 py-1 text-xs font-bold uppercase tracking-wide text-[var(--mp-teal-dark)] dark:text-teal-200">
              Główny ranking
            </span>
          ) : undefined
        }
        className={accent === "teal" ? "ring-1 ring-[var(--mp-teal)]/20" : undefined}
      >
        {rows.length === 0 ? (
          <p className={mpEmptyClass}>Brak zawodników w tym rankingu.</p>
        ) : (
          <div className="-mx-5 -mb-5 overflow-hidden rounded-b-3xl sm:-mx-6 sm:-mb-6">
            <div className="overflow-x-auto [scrollbar-width:thin]">
              <Table>
                <TableHeader className="border-b border-zinc-200 bg-zinc-50 text-zinc-700 [&_th]:text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/80 dark:text-zinc-200 dark:[&_th]:text-zinc-300">
                  <TableRow className="border-0 hover:bg-transparent dark:hover:bg-transparent">
                    <TableHead className="w-12 pl-5">#</TableHead>
                    <TableHead>Zawodnik</TableHead>
                    <TableHead className="pr-5 text-right">Śr. / mecz</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r, i) => (
                    <TableRow
                      key={`${r.userId}-${r.rank}-${col}`}
                      className={
                        i % 2 === 0
                          ? "border-zinc-100 bg-zinc-50/80 hover:bg-zinc-100/80 dark:border-zinc-800 dark:bg-zinc-900/40 dark:hover:bg-zinc-900/70"
                          : "border-zinc-100 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900/50"
                      }
                    >
                      <TableCell className="pl-5 font-bold tabular-nums text-[var(--mp-teal-dark)] dark:text-teal-300">
                        {r.rank}
                      </TableCell>
                      <TableCell>
                        <div className="flex min-w-0 items-center gap-2">
                          <PlayerAvatar
                            photoPath={r.profile_photo_path}
                            firstName={r.first_name}
                            lastName={r.last_name}
                            size="sm"
                            ringClassName="ring-2 ring-[var(--mp-teal)]/25"
                          />
                          <PlayerNameStack firstName={r.first_name} lastName={r.last_name} nick={r.zawodnik} />
                        </div>
                      </TableCell>
                      <TableCell className="pr-5 text-right font-semibold tabular-nums text-zinc-950 dark:text-zinc-100">
                        <span>{formatValue(rankingRate(r, col), format ?? "2f")}</span>
                        <span className="mt-0.5 block text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                          łącznie {formatValue(r[col], format)} · {formatMatchCountPl(r.mecze)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </MarketplaceSection>
    );
  }

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
          <div className="overflow-x-auto [scrollbar-width:thin]">
            <Table>
              <TableHeader className="border-b border-emerald-200/80 bg-emerald-50/90 text-emerald-950 [&_th]:text-emerald-900 dark:border-emerald-800/80 dark:bg-emerald-950/55 dark:text-emerald-100 dark:[&_th]:text-emerald-200">
                <TableRow className="border-0 hover:bg-transparent dark:hover:bg-transparent">
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Zawodnik</TableHead>
                  <TableHead className="text-right">Śr. / mecz</TableHead>
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
                        <PlayerNameStack firstName={r.first_name} lastName={r.last_name} nick={r.zawodnik} />
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular-nums text-emerald-900 dark:text-emerald-200">
                      <span>{formatValue(rankingRate(r, col), format ?? "2f")}</span>
                      <span className="mt-0.5 block text-[11px] font-medium text-emerald-800/70 dark:text-emerald-200/70">
                        łącznie {formatValue(r[col], format)} · {formatMatchCountPl(r.mecze)}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatValue(value: number, format?: "1f" | "2f") {
  if (format === "1f") return Number(value).toFixed(1);
  if (format === "2f") return Number(value).toFixed(2);
  return Number.isInteger(value) ? String(value) : String(value);
}
