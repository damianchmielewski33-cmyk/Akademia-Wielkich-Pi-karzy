"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { Users } from "lucide-react";
import { toast } from "@/lib/app-toast";
import { InlinePreloader } from "@/components/preloaders";
import { MarketplacePitchPhoto } from "@/components/marketplace-pitch-photo";
import { mpEmptyClass, mpSectionCardClass } from "@/components/payments-card";
import { PlayerAvatar, PlayerNameStack } from "@/components/player-avatar";
import { Button } from "@/components/ui/button";
import { AppModal } from "@/components/ui/app-modal";
import { modalListClass } from "@/components/ui/modal-shared";
import { MARKETPLACE_PITCH_PHOTOS } from "@/lib/marketplace-photos";
import { cn } from "@/lib/utils";

const PlayerStatsBarChart = dynamic(
  () => import("@/components/player-stats-bar-chart").then((m) => m.PlayerStatsBarChart),
  {
    ssr: false,
    loading: () => (
      <div className="mt-4 h-56 w-full animate-pulse rounded-xl border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900" />
    ),
  }
);

export type PlayerListItem = {
  id: number;
  first_name: string;
  last_name: string;
  zawodnik: string;
  profile_photo_path: string | null;
};

type StatsPayload = {
  first_name: string;
  last_name: string;
  zawodnik: string;
  profile_photo_path: string | null;
  matches: number;
  goals: number;
  assists: number;
  distance: number;
  saves: number;
  games: {
    date: string;
    time: string;
    location: string;
    goals: number;
    assists: number;
    distance: number;
    saves: number;
  }[];
};

export function PilkarzeClient({ players }: { players: PlayerListItem[] }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<StatsPayload | null>(null);

  async function showStats(id: number) {
    setLoading(true);
    setOpen(true);
    setData(null);
    try {
      const res = await fetch(`/api/player-stats/${id}`, { credentials: "include" });
      if (res.status === 401) {
        toast.error("Zaloguj się, aby zobaczyć statystyki zawodnika.");
        setOpen(false);
        return;
      }
      if (!res.ok) {
        toast.error("Nie udało się wczytać statystyk.");
        setOpen(false);
        return;
      }
      const j = (await res.json()) as StatsPayload;
      setData(j);
    } finally {
      setLoading(false);
    }
  }

  const chartData =
    data &&
    [
      { name: "Gole", v: data.goals },
      { name: "Asysty", v: data.assists },
      { name: "Dystans", v: data.distance },
      { name: "Obrony", v: data.saves },
    ];

  const emptyState = (
    <div className={mpEmptyClass}>
      <Users className="mx-auto mb-2 h-8 w-8 text-zinc-400" aria-hidden />
      Brak zarejestrowanych zawodników.
    </div>
  );

  const grid =
    players.length === 0 ? (
      emptyState
    ) : (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {players.map((p) => (
          <div key={p.id} className={cn(mpSectionCardClass, "p-4 sm:p-5")}>
            <div className="flex items-center gap-3">
              <PlayerAvatar
                photoPath={p.profile_photo_path}
                firstName={p.first_name}
                lastName={p.last_name}
                size="md"
                ringClassName="ring-2 ring-[var(--mp-teal)]/30"
              />
              <div className="min-w-0 flex-1">
                <PlayerNameStack
                  firstName={p.first_name}
                  lastName={p.last_name}
                  nick={p.zawodnik}
                  primaryClassName="font-bold tracking-tight text-zinc-950 dark:text-white"
                  secondaryClassName="text-zinc-500 dark:text-zinc-400"
                />
              </div>
            </div>
            <Button className="mt-4 h-10 w-full rounded-full font-bold" onClick={() => showStats(p.id)}>
              Statystyki
            </Button>
          </div>
        ))}
      </div>
    );

  const statsModal = (
    <AppModal
      open={open}
      onOpenChange={setOpen}
      size="lg"
      scrollable
      title={loading ? "Ładowanie…" : data ? `${data.first_name} ${data.last_name}` : "Statystyki piłkarza"}
      description={
        data ? (
          <div className="flex items-center gap-3 pt-1">
            <PlayerAvatar
              photoPath={data.profile_photo_path}
              firstName={data.first_name}
              lastName={data.last_name}
              size="lg"
              ringClassName="ring-2 ring-[var(--mp-teal)]/25"
            />
            <PlayerNameStack firstName={data.first_name} lastName={data.last_name} nick={data.zawodnik} />
          </div>
        ) : undefined
      }
    >
      {loading && <InlinePreloader label="Wczytywanie statystyk zawodnika…" />}
      {data && !loading && (
        <>
          <div className="flex flex-wrap justify-center gap-2">
            <MiniStat label="Mecze" value={data.matches} />
            <MiniStat label="Gole" value={data.goals} accent />
            <MiniStat label="Asysty" value={data.assists} />
            <MiniStat label="Dystans" value={data.distance.toFixed(1)} />
            <MiniStat label="Obrony" value={data.saves} />
          </div>
          <PlayerStatsBarChart data={chartData ?? []} />
          <h4 className="font-bold tracking-tight text-zinc-950 dark:text-white">Historia meczów</h4>
          <div className="mb-2 mt-2 h-px w-20 bg-zinc-200 dark:bg-zinc-700" />
          <ul className={cn(modalListClass, "mt-1 text-sm text-zinc-800 dark:text-zinc-100")}>
            {data.games.map((g, i) => (
              <li
                key={i}
                className={cn(
                  "border-b px-3 py-2.5 last:border-b-0",
                  i % 2 === 0
                    ? "border-zinc-100 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/60"
                    : "border-zinc-100 dark:border-zinc-800"
                )}
              >
                <span className="font-medium tabular-nums text-zinc-900 dark:text-zinc-100">
                  {g.date} · {g.time}
                </span>
                <span className="mt-0.5 block text-zinc-600 dark:text-zinc-400">{g.location}</span>
                <span className="mt-1 block text-xs tabular-nums text-zinc-500">
                  G: {g.goals} · A: {g.assists} · D: {g.distance} · O: {g.saves ?? 0}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </AppModal>
  );

  return (
    <div className="relative flex flex-1 flex-col text-zinc-900 dark:text-zinc-50">
      <section className="mp-hero mp-hero--photo relative z-10 flex flex-col justify-end overflow-hidden pb-10 pt-12 sm:pb-16 sm:pt-20">
        <MarketplacePitchPhoto src={MARKETPLACE_PITCH_PHOTOS[6]} priority className="z-0" />
        <div className="absolute inset-0 z-[1] bg-gradient-to-t from-black/75 via-black/40 to-black/20" />
        <div className="relative z-10 mx-auto w-full max-w-6xl px-3 xs:px-4">
          <p className="text-[0.65rem] font-black uppercase tracking-[0.22em] text-white/80 sm:text-xs">Akademia</p>
          <h1 className="mt-2 text-[1.85rem] font-black leading-tight tracking-tight text-white xs:text-4xl sm:text-5xl">
            Piłkarze
          </h1>
          <p className="mt-3 max-w-xl text-sm text-white/85 sm:text-base">
            Wszyscy zarejestrowani zawodnicy akademii
            {players.length > 0 ? ` · ${players.length}` : ""}
          </p>
        </div>
      </section>
      <div className="relative z-10 mx-auto w-full min-w-0 max-w-6xl px-3 py-8 text-left xs:px-4 sm:py-10">
        {grid}
      </div>
      {statsModal}
    </div>
  );
}

function MiniStat({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string | number;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "min-w-[5.5rem] flex-1 rounded-xl border px-2.5 py-2 text-center",
        accent
          ? "border-teal-200 bg-teal-50 dark:border-teal-900 dark:bg-teal-950/40"
          : "border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/60"
      )}
    >
      <div
        className={cn(
          "text-[0.65rem] font-bold uppercase tracking-wide",
          accent ? "text-[var(--mp-teal-dark)] dark:text-teal-200" : "text-zinc-500"
        )}
      >
        {label}
      </div>
      <div
        className={cn(
          "text-base font-bold tabular-nums",
          accent ? "text-[var(--mp-teal-dark)] dark:text-teal-100" : "text-zinc-950 dark:text-white"
        )}
      >
        {value}
      </div>
    </div>
  );
}
