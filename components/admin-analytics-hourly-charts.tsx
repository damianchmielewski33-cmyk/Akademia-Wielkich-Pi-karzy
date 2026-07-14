"use client";

import { Fragment, useMemo } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AdminCard, adminEmptyStateClass } from "@/components/admin-ui";
import { cn } from "@/lib/utils";

export type AnalyticsHourlyPayload = {
  timezone: string;
  range: { from: string; to: string };
  utc_range: { from: string; to: string };
  total_views: number;
  by_hour: { hour: number; label: string; views: number }[];
  timeline_hourly: {
    ymd: string;
    hour: number;
    views: number;
    slotLabel: string;
    dayLabel: string;
    xKey: string;
  }[];
  by_day: { ymd: string; label: string; hours: number[]; total: number }[];
  peak: { hour: number; label: string; views: number };
};

const chartInnerClass =
  "rounded-xl border border-white/25 bg-white/95 p-3 text-zinc-900 shadow-inner sm:p-4 dark:bg-zinc-950/90 dark:text-zinc-100";

function heatColor(views: number, max: number): string {
  if (views <= 0) return "rgba(228, 228, 231, 0.85)";
  const t = Math.min(1, views / max);
  const r = Math.round(236 - t * 120);
  const g = Math.round(253 - t * 80);
  const b = Math.round(245 - t * 100);
  return `rgb(${r},${g},${b})`;
}

export function AdminAnalyticsHourlyCharts({
  data,
  loading,
}: {
  data: AnalyticsHourlyPayload | null;
  loading: boolean;
}) {
  const timelineWithIdx = useMemo(() => {
    if (!data) return [];
    return data.timeline_hourly.map((row, idx) => ({ ...row, idx }));
  }, [data]);

  const heatMax = useMemo(() => {
    if (!data) return 1;
    let m = 1;
    for (const d of data.by_day) {
      for (const v of d.hours) if (v > m) m = v;
    }
    return m;
  }, [data]);

  const topHours = useMemo(() => {
    if (!data) return [];
    return [...data.by_hour]
      .sort((a, b) => b.views - a.views)
      .slice(0, 5)
      .filter((h) => h.views > 0);
  }, [data]);

  if (loading && !data) {
    return (
      <div className={cn(adminEmptyStateClass, "mb-8 flex items-center justify-center gap-2 py-16")}>
        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
        Wczytywanie wykresów godzinowych (ostatnie 7 dni)…
      </div>
    );
  }

  if (!data) {
    return (
      <div className={cn(adminEmptyStateClass, "mb-8")}>
        Brak danych do wykresów godzinowych albo nie udało się ich pobrać.
      </div>
    );
  }

  const rangePl = `${new Date(`${data.range.from}T12:00:00`).toLocaleDateString("pl-PL")} – ${new Date(`${data.range.to}T12:00:00`).toLocaleDateString("pl-PL")}`;

  return (
    <div className="mb-8 space-y-6">
      <AdminCard title="Godziny wejść — ostatnie 7 dni">
        <p className="text-sm pitch-muted">
          Zakres kalendarzowy w strefie <strong className="text-white">{data.timezone}</strong>: {rangePl}{" "}
          <span className="text-emerald-100/70">
            ({data.range.from} — {data.range.to})
          </span>
          . Łącznie{" "}
          <strong className="tabular-nums text-[var(--mundial-gold,#f5c518)]">{data.total_views}</strong> odsłon w
          tym oknie (bez panelu admina — jak przy zapisie `page_views`).
        </p>
        {data.total_views > 0 && data.peak.views > 0 ? (
          <p className="mt-2 text-sm pitch-muted">
            Najwięcej sumarycznych wejść między <strong className="text-white">{data.peak.label}</strong> a{" "}
            <strong className="text-white">{String((data.peak.hour + 1) % 24).padStart(2, "0")}:00</strong>:{" "}
            <strong className="tabular-nums text-[var(--mundial-gold,#f5c518)]">{data.peak.views}</strong> odsłon
            (wszystkie dni razem).
            {topHours.length > 0 ? (
              <>
                {" "}
                Top godzin:{" "}
                {topHours.map((h, i) => (
                  <span key={h.hour} className="whitespace-nowrap">
                    {i > 0 ? ", " : ""}
                    {h.label} ({h.views})
                  </span>
                ))}
                .
              </>
            ) : null}
          </p>
        ) : null}
        {data.total_views === 0 ? (
          <p className="mt-2 text-sm pitch-muted">W tych 7 dniach nie zapisano jeszcze żadnych wejść.</p>
        ) : null}
      </AdminCard>

      <div className="grid gap-6 xl:grid-cols-2">
        <AdminCard title="Suma wejść wg godziny zegarowej" description="Każdy słupek = jedna godzina 00:00–23:59 (PL), zsumowana z całych 7 dni.">
          <div className={chartInnerClass}>
            <div className="h-72 w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.by_hour} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(24, 24, 27, 0.08)" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 9, fill: "#52525b" }}
                    interval={2}
                    angle={-35}
                    textAnchor="end"
                    height={52}
                  />
                  <YAxis tick={{ fontSize: 11, fill: "#52525b" }} allowDecimals={false} width={40} />
                  <Tooltip
                    formatter={(v) => [Number(v), "Odsłony"]}
                    labelFormatter={(l) => `Godzina ${l}`}
                    contentStyle={{
                      borderRadius: "0.5rem",
                      border: "1px solid rgba(6, 95, 70, 0.2)",
                      background: "rgba(255,255,255,0.98)",
                    }}
                  />
                  <Bar dataKey="views" fill="#047857" radius={[3, 3, 0, 0]} maxBarSize={18} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </AdminCard>

        <AdminCard
          title="Oś czasu: każda godzina osobno"
          description={`${timelineWithIdx.length} punktów (7 × 24 h). Najedź, aby zobaczyć dokładną etykietę.`}
        >
          <div className={chartInnerClass}>
            <div className="h-72 w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timelineWithIdx} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="awpHourlyFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#059669" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#059669" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(24, 24, 27, 0.08)" />
                  <XAxis
                    dataKey="idx"
                    type="number"
                    domain={[0, timelineWithIdx.length - 1]}
                    ticks={[0, 24, 48, 72, 96, 120, 144, 167].filter((t) => t < timelineWithIdx.length)}
                    tickFormatter={(idx) => {
                      const row = timelineWithIdx[idx];
                      return row ? `${row.dayLabel.split(",")[0]?.trim() ?? ""}` : "";
                    }}
                    tick={{ fontSize: 10, fill: "#52525b" }}
                  />
                  <YAxis tick={{ fontSize: 11, fill: "#52525b" }} allowDecimals={false} width={36} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const p = payload[0].payload as (typeof timelineWithIdx)[0];
                      return (
                        <div className="rounded-lg border border-emerald-900/15 bg-white/98 px-3 py-2 text-sm shadow-md">
                          <p className="font-medium text-zinc-900">{p.slotLabel}</p>
                          <p className="mt-0.5 tabular-nums text-zinc-700">
                            Odsłony: <strong>{p.views}</strong>
                          </p>
                        </div>
                      );
                    }}
                  />
                  <Area
                    type="stepAfter"
                    dataKey="views"
                    stroke="#047857"
                    strokeWidth={1.25}
                    fill="url(#awpHourlyFill)"
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </AdminCard>
      </div>

      <AdminCard
        title="Mapa ciepła: dzień × godzina"
        description={`Wiersz = jeden dzień kalendarzowy (PL), kolumna = godzina. Intensywność = liczba odsłon (max w komórce: ${heatMax}).`}
      >
        <div className={chartInnerClass}>
          <div className="overflow-x-auto">
            <div className="inline-block min-w-[720px]">
              <div
                className="grid gap-px bg-zinc-200 p-px"
                style={{ gridTemplateColumns: `88px repeat(24, minmax(0,1fr))` }}
              >
                <div className="bg-zinc-100 p-1 text-[10px] font-medium text-zinc-600">Dzień / godz.</div>
                {Array.from({ length: 24 }, (_, h) => (
                  <div
                    key={h}
                    className="bg-zinc-100 p-1 text-center text-[10px] font-medium tabular-nums text-zinc-600"
                  >
                    {h}
                  </div>
                ))}
                {data.by_day.map((d) => (
                  <Fragment key={d.ymd}>
                    <div className="flex flex-col justify-center bg-white px-2 py-1 text-xs font-medium leading-tight text-zinc-800">
                      <span>{d.label}</span>
                      <span className="text-[10px] font-normal tabular-nums text-zinc-500">
                        Σ {d.total}
                      </span>
                    </div>
                    {d.hours.map((v, h) => (
                      <div
                        key={`${d.ymd}-${h}`}
                        className="flex min-h-[26px] min-w-0 items-center justify-center text-[10px] font-medium tabular-nums text-zinc-800"
                        style={{
                          backgroundColor: heatColor(v, heatMax),
                          outline: "1px solid rgba(228,228,231,0.6)",
                        }}
                        title={`${d.label}, ${String(h).padStart(2, "0")}:00 — ${v} odsłon`}
                      >
                        {v > 0 ? v : ""}
                      </div>
                    ))}
                  </Fragment>
                ))}
              </div>
            </div>
          </div>
        </div>
      </AdminCard>
    </div>
  );
}
