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
import { Card, CardContent } from "@/components/ui/card";

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

  return (
    <>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {players.map((p) => (
          <Card key={p.id} className="transition hover:shadow-md">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-emerald-600 to-emerald-400 text-lg font-bold text-white">
                  {p.first_name[0]}
                  {p.last_name[0]}
                </div>
                <div>
                  <div className="font-semibold text-emerald-950">
                    {p.first_name} {p.last_name}
                  </div>
                  <div className="text-sm text-emerald-800/70">Zawodnik: {p.zawodnik}</div>
                </div>
              </div>
              <Button className="mt-4 w-full" variant="secondary" onClick={() => showStats(p.id)}>
                Statystyki
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {loading ? "Ladowanie…" : data ? `${data.first_name} ${data.last_name}` : ""}
            </DialogTitle>
            <DialogDescription>
              {data && (
                <div className="flex items-center gap-3 pt-2">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-emerald-600 to-emerald-400 text-xl font-bold text-white">
                    {data.first_name[0]}
                    {data.last_name[0]}
                  </div>
                  <span className="text-emerald-800">{data.zawodnik}</span>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          {data && !loading && (
            <>
              <div className="flex flex-wrap justify-center gap-2">
                <MiniStat label="Mecze" value={data.matches} />
                <MiniStat label="Gole" value={data.goals} />
                <MiniStat label="Asysty" value={data.assists} />
                <MiniStat label="Dystans" value={data.distance.toFixed(1)} />
                <MiniStat label="Obrony" value={data.saves} />
              </div>
              <div className="mt-4 h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData ?? []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="v" fill="#16a34a" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <h4 className="mt-4 font-semibold text-emerald-950">Historia meczow</h4>
              <ul className="mt-2 max-h-48 space-y-2 overflow-y-auto text-sm text-emerald-900">
                {data.games.map((g, i) => (
                  <li key={i} className="border-b border-emerald-100 pb-2">
                    {g.date} {g.time} – {g.location} | G:{g.goals} A:{g.assists} D:{g.distance} O:
                    {g.saves ?? 0}
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

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="min-w-[88px] flex-1 rounded-lg border border-emerald-100 bg-emerald-50/80 px-3 py-2 text-center">
      <div className="text-xs text-emerald-800/70">{label}</div>
      <div className="text-lg font-bold text-emerald-900">{value}</div>
    </div>
  );
}
