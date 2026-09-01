"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import type { ComponentType } from "react";
import {
  Activity,
  CalendarClock,
  CalendarRange,
  CheckCircle2,
  Route,
  Share2,
  Shield,
  Target,
  Trophy,
  Users,
} from "lucide-react";
import { MarketplacePitchPhoto } from "@/components/marketplace-pitch-photo";
import {
  MarketplaceSection,
  mpEmptyClass,
  mpIconWrapClass,
  mpInnerPanelClass,
  mpSectionCardClass,
} from "@/components/payments-card";
import { PlayerAvatar, PlayerNameStack } from "@/components/player-avatar";
import { Button } from "@/components/ui/button";
import { MARKETPLACE_PITCH_PHOTOS } from "@/lib/marketplace-photos";
import { cn } from "@/lib/utils";

const PlayerStatsBarChart = dynamic(
  () => import("@/components/player-stats-bar-chart").then((m) => m.PlayerStatsBarChart),
  {
    ssr: false,
    loading: () => (
      <div className="h-56 w-full animate-pulse rounded-xl border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900" />
    ),
  }
);

export type StatystykiPlayer = {
  first_name: string;
  last_name: string;
  player_alias: string;
  profile_photo_path: string | null;
};

export type StatystykiMatchRow = {
  match_date: string;
  match_time: string;
  location: string;
  goals: number;
  assists: number;
  distance: number;
  saves: number;
};

export type StatystykiLigaSummary = {
  playersCount: number;
  totalMatches: number;
  playedMatches: number;
  upcomingMatches: number;
};

type StatystykiClientProps = {
  me: StatystykiPlayer;
  matches: StatystykiMatchRow[];
  liga: StatystykiLigaSummary;
};

export function StatystykiClient({ me, matches, liga }: StatystykiClientProps) {
  const hasRows = matches.length > 0;
  const sumGoals = matches.reduce((a, r) => a + r.goals, 0);
  const sumAssists = matches.reduce((a, r) => a + r.assists, 0);
  const sumDist = matches.reduce((a, r) => a + r.distance, 0);
  const sumSaves = matches.reduce((a, r) => a + (r.saves ?? 0), 0);

  const chartData = hasRows
    ? [
        { name: "Gole", v: sumGoals },
        { name: "Asysty", v: sumAssists },
        { name: "Dystans", v: sumDist },
        { name: "Obrony", v: sumSaves },
      ]
    : [];

  const profileCard = (
    <section className={cn(mpSectionCardClass, "mx-auto max-w-md")}>
      <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
        <PlayerAvatar
          photoPath={me.profile_photo_path}
          firstName={me.first_name}
          lastName={me.last_name}
          size="lg"
          ringClassName="ring-2 ring-[var(--mp-teal)]/30"
        />
        <div className="min-w-0 flex-1">
          <p className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-[var(--mp-teal-dark)]">Zawodnik</p>
          <PlayerNameStack
            className="mt-1"
            firstName={me.first_name}
            lastName={me.last_name}
            nick={me.player_alias}
            primaryClassName="text-lg font-bold tracking-tight text-zinc-950 dark:text-white"
            secondaryClassName="text-sm text-zinc-500 dark:text-zinc-400"
          />
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button asChild className="h-11 flex-1 rounded-full font-bold sm:flex-none">
          <Link href="/profil">Edytuj statystyki</Link>
        </Button>
        <Button asChild variant="outline" className="h-11 flex-1 rounded-full font-bold sm:flex-none">
          <Link href="/rankingi">
            <Trophy className="mr-1.5 h-4 w-4" aria-hidden />
            Rankingi
          </Link>
        </Button>
      </div>
    </section>
  );

  const summarySection = (
    <MarketplaceSection
      icon={Activity}
      title="Twoje podsumowanie"
      description="Suma z wszystkich rozegranych meczów ze zapisanymi statystykami."
      className="mx-auto max-w-5xl"
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <SummaryTile icon={Activity} label="Mecze" value={hasRows ? matches.length : "—"} />
        <SummaryTile icon={Target} label="Gole" value={hasRows ? sumGoals : "—"} accent />
        <SummaryTile icon={Share2} label="Asysty" value={hasRows ? sumAssists : "—"} />
        <SummaryTile icon={Route} label="Dystans (km)" value={hasRows ? sumDist.toFixed(1) : "—"} />
        <SummaryTile icon={Shield} label="Obrony" value={hasRows ? sumSaves : "—"} />
      </div>
    </MarketplaceSection>
  );

  const chartSection = hasRows ? (
    <MarketplaceSection
      icon={Target}
      title="Wykres"
      description="Porównanie kategorii w Twoich statystykach."
      className="mx-auto max-w-5xl"
    >
      <div className={cn(mpInnerPanelClass, "overflow-hidden p-2 sm:p-3")}>
        <PlayerStatsBarChart data={chartData} />
      </div>
    </MarketplaceSection>
  ) : null;

  const historySection = (
    <MarketplaceSection
      icon={Activity}
      title="Historia meczów"
      description="Statystyki z poszczególnych spotkań."
      className="mx-auto max-w-5xl"
    >
      {!hasRows ? (
        <p className={mpEmptyClass}>
          Brak zapisanych statystyk z meczów. Uzupełnij je w profilu po rozegranym spotkaniu.
        </p>
      ) : (
        <div className="-mx-5 -mb-5 overflow-hidden rounded-b-3xl sm:-mx-6 sm:-mb-6">
          <MatchHistoryList matches={matches} />
        </div>
      )}
    </MarketplaceSection>
  );

  const ligaSection = (
    <details className={cn(mpSectionCardClass, "group mx-auto max-w-5xl")}>
      <summary className="awp-focus-ring cursor-pointer list-none [&::-webkit-details-marker]:hidden">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <span className={mpIconWrapClass}>
              <Users className="h-4 w-4" strokeWidth={2.25} aria-hidden />
            </span>
            <div>
              <p className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-[var(--mp-teal-dark)]">
                Akademia
              </p>
              <h2 className="mt-1 text-lg font-black tracking-tight text-zinc-950 dark:text-white">
                Podsumowanie ligi
              </h2>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                Liczby całej akademii — gracze i mecze w terminarzu.
              </p>
            </div>
          </div>
          <span className="shrink-0 text-xs font-medium text-zinc-400 group-open:hidden">Rozwiń</span>
          <span className="hidden shrink-0 text-xs font-medium text-zinc-400 group-open:inline">Zwiń</span>
        </div>
      </summary>
      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <LigaTile icon={Users} label="Wszyscy gracze" value={liga.playersCount} />
        <LigaTile icon={CalendarRange} label="Wszystkie mecze" value={liga.totalMatches} />
        <LigaTile icon={CheckCircle2} label="Rozegrane mecze" value={liga.playedMatches} />
        <LigaTile icon={CalendarClock} label="Nadchodzące mecze" value={liga.upcomingMatches} />
      </div>
    </details>
  );

  const body = (
    <div className="space-y-8 text-left">
      {profileCard}
      {summarySection}
      {chartSection}
      {historySection}
      {ligaSection}
    </div>
  );

  return (
    <div className="relative flex flex-1 flex-col text-zinc-900 dark:text-zinc-50">
      <section className="mp-hero mp-hero--photo relative z-10 flex flex-col justify-end overflow-hidden pb-10 pt-12 sm:pb-16 sm:pt-20">
        <MarketplacePitchPhoto src={MARKETPLACE_PITCH_PHOTOS[4]} priority className="z-0" />
        <div className="absolute inset-0 z-[1] bg-gradient-to-t from-black/75 via-black/40 to-black/20" />
        <div className="relative z-10 mx-auto w-full max-w-6xl px-3 xs:px-4">
          <p className="text-[0.65rem] font-black uppercase tracking-[0.22em] text-white/80 sm:text-xs">Akademia</p>
          <h1 className="mt-2 text-[1.85rem] font-black leading-tight tracking-tight text-white xs:text-4xl sm:text-5xl">
            Statystyki
          </h1>
          <p className="mt-3 max-w-xl text-sm text-white/85 sm:text-base">
            Twoje gole, asysty, dystans i obrony z rozegranych meczów
            {hasRows ? ` · ${matches.length} wpisów` : ""}
          </p>
        </div>
      </section>
      <div className="relative z-10 mx-auto w-full min-w-0 max-w-6xl px-3 py-8 xs:px-4 sm:py-10">{body}</div>
    </div>
  );
}

function MatchHistoryList({ matches }: { matches: StatystykiMatchRow[] }) {
  return (
    <>
      <ul className="space-y-0 sm:hidden">
        {matches.map((m, i) => (
          <li
            key={`${m.match_date}-${m.match_time}-${i}`}
            className={cn(
              "border-b px-4 py-3 last:border-b-0 sm:px-5",
              i % 2 === 0
                ? "border-zinc-100 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/60"
                : "border-zinc-100 dark:border-zinc-800"
            )}
          >
            <p className="font-semibold tabular-nums text-zinc-950 dark:text-zinc-100">
              {m.match_date} · {m.match_time}
            </p>
            <p className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-400">{m.location}</p>
            <p className="mt-1.5 text-xs font-medium tabular-nums text-zinc-500">
              G: {m.goals} · A: {m.assists} · D: {m.distance.toFixed(1)} km · O: {m.saves ?? 0}
            </p>
          </li>
        ))}
      </ul>

      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900/80 dark:text-zinc-200">
            <tr>
              <th className="px-3 py-2.5 font-semibold sm:px-5">Data</th>
              <th className="px-3 py-2.5 font-semibold">Godzina</th>
              <th className="px-3 py-2.5 font-semibold">Lokalizacja</th>
              <th className="px-3 py-2.5 font-semibold">Gole</th>
              <th className="px-3 py-2.5 font-semibold">Asysty</th>
              <th className="px-3 py-2.5 font-semibold">Dystans</th>
              <th className="px-3 py-2.5 font-semibold sm:px-5">Obrony</th>
            </tr>
          </thead>
          <tbody>
            {matches.map((m, i) => (
              <tr
                key={`${m.match_date}-${m.match_time}-${i}-desktop`}
                className={cn(
                  "border-b last:border-b-0",
                  i % 2 === 0
                    ? "border-zinc-100 bg-zinc-50/80 dark:border-zinc-800 dark:bg-zinc-900/40"
                    : "border-zinc-100 dark:border-zinc-800"
                )}
              >
                <td className="px-3 py-2.5 font-medium text-zinc-950 dark:text-zinc-100 sm:px-5">
                  {m.match_date}
                </td>
                <td className="px-3 py-2.5 tabular-nums">{m.match_time}</td>
                <td className="max-w-[220px] truncate px-3 py-2.5">{m.location}</td>
                <td className="px-3 py-2.5 tabular-nums">{m.goals}</td>
                <td className="px-3 py-2.5 tabular-nums">{m.assists}</td>
                <td className="px-3 py-2.5 tabular-nums">{m.distance.toFixed(1)}</td>
                <td className="px-3 py-2.5 tabular-nums sm:px-5">{m.saves ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function SummaryTile({
  icon: Icon,
  label,
  value,
  accent = false,
}: {
  icon: ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  value: string | number;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex min-h-[5.5rem] flex-col justify-between gap-2 rounded-2xl border px-3 py-3 sm:px-3.5 sm:py-3.5",
        accent
          ? "border-teal-200 bg-teal-50 dark:border-teal-900 dark:bg-teal-950/40"
          : "border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/60"
      )}
    >
      <div className="flex items-center gap-2">
        <div
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl",
            accent
              ? "bg-[var(--mp-teal)] text-white"
              : "bg-white text-zinc-700 ring-1 ring-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:ring-zinc-700"
          )}
        >
          <Icon className="h-4 w-4" strokeWidth={2.25} aria-hidden />
        </div>
        <p
          className={cn(
            "text-[0.65rem] font-bold uppercase leading-snug tracking-wide sm:text-xs",
            accent ? "text-[var(--mp-teal-dark)] dark:text-teal-200" : "text-zinc-500"
          )}
        >
          {label}
        </p>
      </div>
      <p
        className={cn(
          "text-xl font-bold tabular-nums sm:text-2xl",
          accent ? "text-[var(--mp-teal-dark)] dark:text-teal-100" : "text-zinc-950 dark:text-white",
          value === "—" && "opacity-60"
        )}
      >
        {value}
      </p>
    </div>
  );
}

function LigaTile({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  value: number;
}) {
  return (
    <div className={cn(mpInnerPanelClass, "px-4 py-3")}>
      <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-300">
        <Icon className="h-4 w-4 shrink-0 text-[var(--mp-teal-dark)]" strokeWidth={2.2} aria-hidden />
        <span className="text-xs font-bold uppercase tracking-wide">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-bold tabular-nums text-zinc-950 dark:text-white">{value}</p>
    </div>
  );
}
