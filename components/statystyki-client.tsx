"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import type { ComponentType, ReactNode } from "react";
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
import { PlayerAvatar, PlayerNameStack } from "@/components/player-avatar";
import { Button } from "@/components/ui/button";
import { pitchLabelClass } from "@/components/ui/pitch-card";
import { cn } from "@/lib/utils";

const PlayerStatsBarChart = dynamic(
  () => import("@/components/player-stats-bar-chart").then((m) => m.PlayerStatsBarChart),
  {
    ssr: false,
    loading: () => (
      <div className="h-56 w-full animate-pulse rounded-xl border border-emerald-900/10 bg-emerald-100/40 dark:bg-emerald-950/40" />
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

  return (
    <div className="mt-10 space-y-8 text-left">
      <div className="relative mx-auto max-w-md overflow-hidden rounded-2xl border-2 border-white/30 shadow-md shadow-emerald-950/12 ring-1 ring-emerald-950/10">
        <div className="home-pitch-tile absolute inset-0" aria-hidden />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-0.5 bg-white/45" aria-hidden />
        <div
          className="pointer-events-none absolute left-0 top-0 h-7 w-7 rounded-br-md border-b-2 border-r-2 border-white/40"
          aria-hidden
        />
        <div className="relative p-5 sm:p-6">
          <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
            <PlayerAvatar
              photoPath={me.profile_photo_path}
              firstName={me.first_name}
              lastName={me.last_name}
              size="lg"
              ringClassName="ring-2 ring-white/40"
              className="backdrop-blur-[2px]"
            />
            <div className="min-w-0 flex-1">
              <span className={pitchLabelClass}>Zawodnik</span>
              <PlayerNameStack
                className="mt-1"
                firstName={me.first_name}
                lastName={me.last_name}
                nick={me.player_alias}
                primaryClassName="text-lg font-bold tracking-tight text-white drop-shadow-sm"
                secondaryClassName="text-sm text-emerald-50/90"
              />
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button asChild variant="pitch" className="flex-1 sm:flex-none">
              <Link href="/profil">Edytuj statystyki</Link>
            </Button>
            <Button asChild variant="stadium" className="flex-1 sm:flex-none">
              <Link href="/rankingi">
                <Trophy className="mr-1.5 h-4 w-4" aria-hidden />
                Rankingi
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <section className="awp-card-surface mx-auto max-w-5xl">
        <SectionHeading
          title="Twoje podsumowanie"
          description="Suma z wszystkich rozegranych meczów ze zapisanymi statystykami."
        />
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <SummaryTile icon={Activity} label="Mecze" value={hasRows ? matches.length : "—"} />
          <SummaryTile icon={Target} label="Gole" value={hasRows ? sumGoals : "—"} variant="gold" />
          <SummaryTile icon={Share2} label="Asysty" value={hasRows ? sumAssists : "—"} />
          <SummaryTile icon={Route} label="Dystans (km)" value={hasRows ? sumDist.toFixed(1) : "—"} />
          <SummaryTile icon={Shield} label="Obrony" value={hasRows ? sumSaves : "—"} />
        </div>
      </section>

      {hasRows ? (
        <section className="awp-card-surface mx-auto max-w-5xl">
          <SectionHeading title="Wykres" description="Porównanie kategorii w Twoich statystykach." />
          <div className="mt-4 overflow-hidden rounded-xl border border-emerald-900/10 bg-white/98 p-1 dark:border-emerald-800/30 dark:bg-zinc-900/95">
            <PlayerStatsBarChart data={chartData} />
          </div>
        </section>
      ) : null}

      <section className="mx-auto max-w-5xl">
        <PitchFramedPanel
          title="Historia meczów"
          icon={Activity}
          empty={!hasRows}
          emptyMessage="Brak zapisanych statystyk z meczów. Uzupełnij je w profilu po rozegranym spotkaniu."
        >
          {hasRows ? (
            <>
              <ul className="space-y-0 sm:hidden">
                {matches.map((m, i) => (
                  <li
                    key={`${m.match_date}-${m.match_time}-${i}`}
                    className={cn(
                      "border-b border-emerald-100/90 px-3 py-3 last:border-b-0 dark:border-emerald-800/40",
                      i % 2 === 0 ? "bg-emerald-50/40 dark:bg-emerald-950/30" : "bg-white/60 dark:bg-zinc-900/40"
                    )}
                  >
                    <p className="font-semibold tabular-nums text-emerald-950 dark:text-emerald-100">
                      {m.match_date} · {m.match_time}
                    </p>
                    <p className="mt-0.5 text-sm text-emerald-800/90 dark:text-emerald-300/90">{m.location}</p>
                    <p className="mt-1.5 text-xs font-medium tabular-nums text-emerald-700 dark:text-emerald-400">
                      G: {m.goals} · A: {m.assists} · D: {m.distance.toFixed(1)} km · O: {m.saves ?? 0}
                    </p>
                  </li>
                ))}
              </ul>

              <div className="hidden overflow-x-auto sm:block">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead className="border-b border-emerald-200/80 bg-emerald-50/90 text-emerald-950 dark:border-emerald-800/80 dark:bg-emerald-950/55 dark:text-emerald-100">
                    <tr>
                      <th className="px-3 py-2.5 font-semibold">Data</th>
                      <th className="px-3 py-2.5 font-semibold">Godzina</th>
                      <th className="px-3 py-2.5 font-semibold">Lokalizacja</th>
                      <th className="px-3 py-2.5 font-semibold">Gole</th>
                      <th className="px-3 py-2.5 font-semibold">Asysty</th>
                      <th className="px-3 py-2.5 font-semibold">Dystans</th>
                      <th className="px-3 py-2.5 font-semibold">Obrony</th>
                    </tr>
                  </thead>
                  <tbody>
                    {matches.map((m, i) => (
                      <tr
                        key={`${m.match_date}-${m.match_time}-${i}-desktop`}
                        className={cn(
                          "border-b border-emerald-100/80 last:border-b-0 dark:border-emerald-900/35",
                          i % 2 === 0
                            ? "bg-emerald-50/35 dark:bg-emerald-950/25"
                            : "bg-white/60 dark:bg-zinc-900/40"
                        )}
                      >
                        <td className="px-3 py-2.5 font-medium text-emerald-950 dark:text-emerald-100">{m.match_date}</td>
                        <td className="px-3 py-2.5 tabular-nums">{m.match_time}</td>
                        <td className="max-w-[220px] truncate px-3 py-2.5">{m.location}</td>
                        <td className="px-3 py-2.5 tabular-nums">{m.goals}</td>
                        <td className="px-3 py-2.5 tabular-nums">{m.assists}</td>
                        <td className="px-3 py-2.5 tabular-nums">{m.distance.toFixed(1)}</td>
                        <td className="px-3 py-2.5 tabular-nums">{m.saves ?? 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : null}
        </PitchFramedPanel>
      </section>

      <details className="awp-card-surface group mx-auto max-w-5xl">
        <summary className="awp-focus-ring cursor-pointer list-none [&::-webkit-details-marker]:hidden">
          <div className="flex items-center justify-between gap-3">
            <div>
              <span className={pitchLabelClass}>Akademia</span>
              <h2 className="mt-1 text-lg font-bold text-white">Podsumowanie ligi</h2>
              <p className="mt-1 text-sm text-emerald-100/85">Liczby całej akademii — gracze i mecze w terminarzu.</p>
            </div>
            <span className="shrink-0 text-xs font-medium text-emerald-100/80 group-open:hidden">Rozwiń</span>
            <span className="hidden shrink-0 text-xs font-medium text-emerald-100/80 group-open:inline">Zwiń</span>
          </div>
        </summary>
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <LigaTile icon={Users} label="Wszyscy gracze" value={liga.playersCount} />
          <LigaTile icon={CalendarRange} label="Wszystkie mecze" value={liga.totalMatches} />
          <LigaTile icon={CheckCircle2} label="Rozegrane mecze" value={liga.playedMatches} />
          <LigaTile icon={CalendarClock} label="Nadchodzące mecze" value={liga.upcomingMatches} />
        </div>
      </details>
    </div>
  );
}

function SectionHeading({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <span className={pitchLabelClass}>Statystyki</span>
      <h2 className="mt-1 text-lg font-bold text-white sm:text-xl">{title}</h2>
      <p className="mt-1 text-sm text-emerald-100/85">{description}</p>
      <div className="pitch-rule mt-3 w-24 max-w-full opacity-80" />
    </div>
  );
}

function SummaryTile({
  icon: Icon,
  label,
  value,
  variant = "pitch",
}: {
  icon: ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  value: string | number;
  variant?: "pitch" | "gold";
}) {
  const bgClass = variant === "gold" ? "home-pitch-tile-gold" : "home-pitch-tile";

  return (
    <div className="relative min-h-[5.5rem] overflow-hidden rounded-xl border-2 border-white/30 shadow-sm ring-1 ring-emerald-950/10">
      <div className={`absolute inset-0 ${bgClass}`} aria-hidden />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-white/40" aria-hidden />
      <div className="relative flex h-full flex-col justify-between gap-2 px-3 py-3 sm:px-3.5 sm:py-3.5">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/15 ring-2 ring-white/30">
            <Icon className="h-4 w-4 text-white" strokeWidth={2.25} aria-hidden />
          </div>
          <p className="text-[0.65rem] font-bold uppercase leading-snug tracking-wide text-white/95 sm:text-xs">{label}</p>
        </div>
        <p className={cn("text-xl font-bold tabular-nums text-white sm:text-2xl", value === "—" && "text-white/75")}>{value}</p>
      </div>
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
    <div className="rounded-xl border border-white/25 bg-black/10 px-4 py-3 backdrop-blur-sm">
      <div className="flex items-center gap-2 text-emerald-50/95">
        <Icon className="h-4 w-4 shrink-0" strokeWidth={2.2} aria-hidden />
        <span className="text-xs font-bold uppercase tracking-wide">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-bold tabular-nums text-white">{value}</p>
    </div>
  );
}

function PitchFramedPanel({
  title,
  icon: Icon,
  children,
  empty,
  emptyMessage,
}: {
  title: string;
  icon: ComponentType<{ className?: string; strokeWidth?: number }>;
  children: ReactNode;
  empty?: boolean;
  emptyMessage?: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border-2 border-white/35 shadow-lg shadow-emerald-950/15 ring-1 ring-emerald-950/15">
      <div className="home-pitch-tile absolute inset-0 opacity-[0.2]" aria-hidden />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-white/45" aria-hidden />
      <div className="pointer-events-none absolute bottom-0 left-0 h-9 w-9 rounded-tr-full border-t-2 border-r-2 border-white/40" aria-hidden />
      <div className="pointer-events-none absolute bottom-0 right-0 h-9 w-9 rounded-tl-full border-t-2 border-l-2 border-white/40" aria-hidden />
      <div className="relative rounded-[0.85rem] bg-white/98 p-0.5 backdrop-blur-[2px] dark:bg-zinc-900/95">
        <div className="overflow-hidden rounded-[0.8rem] border border-emerald-900/10 bg-white dark:border-emerald-800/30 dark:bg-zinc-900/90">
          <div className="flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-950 via-emerald-900 to-emerald-950 px-4 py-3">
            <Icon className="h-5 w-5 shrink-0 text-white" strokeWidth={2.25} aria-hidden />
            <h2 className="text-center text-base font-bold tracking-tight text-white sm:text-lg">{title}</h2>
          </div>
          {empty ? (
            <p className="px-4 py-10 text-center text-sm text-zinc-600 dark:text-zinc-400">{emptyMessage}</p>
          ) : (
            children
          )}
        </div>
      </div>
    </div>
  );
}
