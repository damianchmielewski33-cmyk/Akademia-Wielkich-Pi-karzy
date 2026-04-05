"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { StatsCrunchPreloader } from "@/components/preloaders";
import { PlayerAvatar, PlayerNameStack } from "@/components/player-avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const PlayerStatsBarChart = dynamic(
  () => import("@/components/player-stats-bar-chart").then((m) => m.PlayerStatsBarChart),
  {
    ssr: false,
    loading: () => (
      <div className="mt-4 h-56 w-full animate-pulse rounded-xl border border-emerald-900/10 bg-emerald-100/40" />
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto border-emerald-900/15 sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-emerald-950">
            {loading
              ? "Ładowanie…"
              : loadError
                ? "Statystyki"
                : data
                  ? `${data.first_name} ${data.last_name}`
                  : ""}
          </DialogTitle>
          <DialogDescription asChild>
            <div>
              {loadError && !loading && (
                <p className="pt-2 text-sm text-red-700">
                  {loadError === "unauthorized"
                    ? "Zaloguj się, aby zobaczyć statystyki zawodnika."
                    : "Nie udało się wczytać statystyk. Spróbuj ponownie później."}
                </p>
              )}
              {data && !loading && (
                <div className="flex items-center gap-3 pt-2">
                  <PlayerAvatar
                    photoPath={data.profile_photo_path}
                    firstName={data.first_name}
                    lastName={data.last_name}
                    size="lg"
                    ringClassName="ring-2 ring-emerald-900/20"
                  />
                  <PlayerNameStack firstName={data.first_name} lastName={data.last_name} nick={data.zawodnik} />
                </div>
              )}
            </div>
          </DialogDescription>
        </DialogHeader>
        {loading && !loadError && <StatsCrunchPreloader />}
        {data && !loading && !loadError && (
          <>
            <div className="pitch-rule mb-3 w-full max-w-xs opacity-70" />
            <div className="flex flex-wrap justify-center gap-2">
              <PitchMiniStat label="Mecze" value={data.matches} />
              <PitchMiniStat label="Gole" value={data.goals} variant="gold" />
              <PitchMiniStat label="Asysty" value={data.assists} />
              <PitchMiniStat label="Dystans" value={data.distance.toFixed(1)} />
              <PitchMiniStat label="Obrony" value={data.saves} />
            </div>
            <PlayerStatsBarChart data={chartData ?? []} />
            <h4 className="mt-5 font-bold tracking-tight text-emerald-950">Historia meczów</h4>
            <div className="pitch-rule mb-2 mt-2 w-20 opacity-60" />
            {data.games.length === 0 ? (
              <p className="rounded-xl border border-emerald-900/10 bg-emerald-50/40 px-3 py-4 text-center text-sm text-emerald-800">
                Brak zapisanych statystyk z rozegranych meczów.
              </p>
            ) : (
              <ul className="mt-1 max-h-48 space-y-0 overflow-y-auto rounded-xl border border-emerald-900/10 bg-white text-sm text-emerald-950">
                {data.games.map((g, i) => (
                  <li
                    key={`${g.date}-${g.time}-${i}`}
                    className={
                      i % 2 === 0
                        ? "border-b border-emerald-100/90 bg-emerald-50/40 px-3 py-2.5 last:border-b-0"
                        : "border-b border-emerald-100/90 px-3 py-2.5 last:border-b-0"
                    }
                  >
                    <span className="font-medium tabular-nums text-emerald-900">
                      {g.date} · {g.time}
                    </span>
                    <span className="mt-0.5 block text-emerald-800/90">{g.location}</span>
                    <span className="mt-1 block text-xs tabular-nums text-emerald-700">
                      G: {g.goals} · A: {g.assists} · D: {g.distance} · O: {g.saves ?? 0}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function PitchMiniStat({
  label,
  value,
  variant = "pitch",
}: {
  label: string;
  value: string | number;
  variant?: "pitch" | "gold";
}) {
  const bgClass = variant === "gold" ? "home-pitch-tile-gold" : "home-pitch-tile";
  return (
    <div className="relative min-w-[5.5rem] flex-1 overflow-hidden rounded-xl border-2 border-white/30 shadow-sm ring-1 ring-emerald-950/10">
      <div className={`absolute inset-0 ${bgClass}`} aria-hidden />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-white/40" aria-hidden />
      <div className="relative px-2.5 py-2 text-center">
        <div className="text-[0.65rem] font-bold uppercase tracking-wide text-white/90">{label}</div>
        <div className="text-base font-bold tabular-nums text-white">{value}</div>
      </div>
    </div>
  );
}
