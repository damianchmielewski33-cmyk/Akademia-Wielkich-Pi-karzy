"use client";

import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type PlayerListItem = {
  id: number;
  first_name: string;
  last_name: string;
  zawodnik: string;
};

type StatsPayload = {
  first_name: string;
  last_name: string;
  zawodnik: string;
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
      const res = await fetch(`/api/player-stats/${id}`);
      if (!res.ok) {
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

  if (players.length === 0) {
    return (
      <div className="relative mx-auto max-w-2xl overflow-hidden rounded-2xl border-2 border-white/30 text-center shadow-lg shadow-emerald-950/15 ring-1 ring-emerald-950/15">
        <div className="home-pitch-tile absolute inset-0" aria-hidden />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-white/40" aria-hidden />
        <p className="relative px-6 py-10 text-base font-medium text-emerald-50">Brak zarejestrowanych zawodników.</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {players.map((p) => (
          <div
            key={p.id}
            className="relative overflow-hidden rounded-2xl border-2 border-white/30 shadow-md shadow-emerald-950/12 ring-1 ring-emerald-950/10 transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-lg hover:shadow-emerald-950/18"
          >
            <div className="home-pitch-tile absolute inset-0" aria-hidden />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-0.5 bg-white/45" aria-hidden />
            <div
              className="pointer-events-none absolute left-0 top-0 h-7 w-7 rounded-br-md border-b-2 border-r-2 border-white/40"
              aria-hidden
            />
            <div className="relative p-4 sm:p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/15 text-base font-bold text-white ring-2 ring-white/35 backdrop-blur-[2px]">
                  {p.first_name[0]}
                  {p.last_name[0]}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-bold tracking-tight text-white drop-shadow-sm">
                    {p.first_name} {p.last_name}
                  </div>
                  <div className="truncate text-sm text-emerald-50/90">Zawodnik: {p.zawodnik}</div>
                </div>
              </div>
              <Button
                className="mt-4 w-full border-0 bg-white font-semibold text-emerald-900 shadow-md hover:bg-emerald-50"
                onClick={() => showStats(p.id)}
              >
                Statystyki
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto border-emerald-900/15 sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-emerald-950">
              {loading ? "Ładowanie…" : data ? `${data.first_name} ${data.last_name}` : ""}
            </DialogTitle>
            <DialogDescription asChild>
              <div>
                {data && (
                  <div className="flex items-center gap-3 pt-2">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-800 to-emerald-600 text-xl font-bold text-white ring-2 ring-emerald-900/20">
                      {data.first_name[0]}
                      {data.last_name[0]}
                    </div>
                    <span className="text-emerald-900">{data.zawodnik}</span>
                  </div>
                )}
              </div>
            </DialogDescription>
          </DialogHeader>
          {data && !loading && (
            <>
              <div className="pitch-rule mb-3 w-full max-w-xs opacity-70" />
              <div className="flex flex-wrap justify-center gap-2">
                <PitchMiniStat label="Mecze" value={data.matches} />
                <PitchMiniStat label="Gole" value={data.goals} variant="gold" />
                <PitchMiniStat label="Asysty" value={data.assists} />
                <PitchMiniStat label="Dystans" value={data.distance.toFixed(1)} />
                <PitchMiniStat label="Obrony" value={data.saves} />
              </div>
              <div className="mt-4 h-56 w-full rounded-xl border border-emerald-900/10 bg-emerald-50/30 p-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData ?? []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(6, 78, 59, 0.12)" />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#064e3b" }} />
                    <YAxis tick={{ fontSize: 11, fill: "#064e3b" }} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: "0.5rem",
                        border: "1px solid rgba(6, 95, 70, 0.2)",
                        background: "rgba(255,255,255,0.96)",
                      }}
                    />
                    <Bar dataKey="v" fill="#047857" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <h4 className="mt-5 font-bold tracking-tight text-emerald-950">Historia meczów</h4>
              <div className="pitch-rule mb-2 mt-2 w-20 opacity-60" />
              <ul className="mt-1 max-h-48 space-y-0 overflow-y-auto rounded-xl border border-emerald-900/10 bg-white text-sm text-emerald-950">
                {data.games.map((g, i) => (
                  <li
                    key={i}
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
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
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
