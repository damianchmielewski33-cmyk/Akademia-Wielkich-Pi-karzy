"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { InlinePreloader } from "@/components/preloaders";
import { PlayerAvatar, PlayerNameStack } from "@/components/player-avatar";
import { AppModal } from "@/components/ui/app-modal";
import { modalEmptyStateClass, modalListClass } from "@/components/ui/modal-shared";
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

type Props = {
  userId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function LineupPlayerStatsDialog({ userId, open, onOpenChange }: Props) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<StatsPayload | null>(null);
  const [loadError, setLoadError] = useState<false | "unauthorized" | "other">(false);

  useEffect(() => {
    if (!open || userId == null) {
      return;
    }
    let cancelled = false;
    setLoading(true);
    setData(null);
    setLoadError(false);
    void fetch(`/api/player-stats/${userId}`, { credentials: "include" })
      .then((res) => {
        if (res.status === 401) throw new Error("unauthorized");
        if (!res.ok) throw new Error("fetch failed");
        return res.json() as Promise<StatsPayload>;
      })
      .then((j) => {
        if (!cancelled) setData(j);
      })
      .catch((e) => {
        if (!cancelled) {
          setLoadError(e instanceof Error && e.message === "unauthorized" ? "unauthorized" : "other");
          setData(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, userId]);

  const chartData = useMemo(
    () =>
      data &&
      [
        { name: "Gole", v: data.goals },
        { name: "Asysty", v: data.assists },
        { name: "Dystans", v: data.distance },
        { name: "Obrony", v: data.saves },
      ],
    [data]
  );

  const title = loading
    ? "Ładowanie…"
    : loadError
      ? "Statystyki"
      : data
        ? `${data.first_name} ${data.last_name}`
        : "Statystyki zawodnika";

  return (
    <AppModal
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      scrollable
      title={title}
      description={
        loadError && !loading ? (
          <p className="pt-1 text-sm text-red-700 dark:text-red-400">
            {loadError === "unauthorized"
              ? "Zaloguj się, aby zobaczyć statystyki zawodnika."
              : "Nie udało się wczytać statystyk. Spróbuj ponownie później."}
          </p>
        ) : data && !loading ? (
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
      {loading && !loadError && <InlinePreloader label="Wczytywanie statystyk…" />}
      {data && !loading && !loadError && (
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
          {data.games.length === 0 ? (
            <p className={modalEmptyStateClass}>Brak zapisanych statystyk z rozegranych meczów.</p>
          ) : (
            <ul className={cn(modalListClass, "mt-1 text-sm text-zinc-800 dark:text-zinc-100")}>
              {data.games.map((g, i) => (
                <li
                  key={`${g.date}-${g.time}-${i}`}
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
          )}
        </>
      )}
    </AppModal>
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
