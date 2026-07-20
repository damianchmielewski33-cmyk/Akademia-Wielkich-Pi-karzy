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
  "rounded-xl border border-zinc-200 bg-zinc-50 p-3 sm:p-4 dark:border-zinc-700 dark:bg-zinc-900/80";

const axisTick = { fontSize: 11, fill: "#52525b" };
const gridStroke = "rgba(113, 113, 122, 0.25)";

function heatColor(views: number, max: number): string {
  if (views <= 0) return "rgb(244, 244, 245)";
  const t = Math.min(1, views / max);
  const r = Math.round(236 - t * 130);
  const g = Math.round(253 - t * 100);
  const b = Math.round(245 - t * 120);
  return `rgb(${r},${g},${b})`;
}

function heatTextColor(views: number, max: number): string {
  if (views <= 0) return "rgb(113, 113, 122)";
  return views / max > 0.55 ? "rgb(255, 255, 255)" : "rgb(24, 24, 27)";
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
      <div className={cn(adminEmptyStateClass, "flex items-center justify-center gap-2 py-16")}>
        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
        Wczytywanie wykresów godzinowych (ostatnie 7 dni)…
      </div>
    );
  }

  if (!data) {
    return (
      <AdminCard tone="data">
        <p className="text-sm admin-data-muted">Brak danych do wykresów godzinowych albo nie udało się ich pobrać.</p>
      </AdminCard>
    );
  }

  const rangePl = `${new Date(`${data.range.from}T12:00:00`).toLocaleDateString("pl-PL")} – ${new Date(`${data.range.to}T12:00:00`).toLocaleDateString("pl-PL")}`;

  return (
    <div className="space-y-6">
      <AdminCard tone="data" title="Godziny wejść — ostatnie 7 dni">
        <p className="text-sm admin-data-muted">
          Zakres w strefie <strong className="text-zinc-900 dark:text-zinc-50">{data.timezone}</strong>: {rangePl}{" "}
          <span className="font-mono text-xs text-zinc-500 dark:text-zinc-400">
            ({data.range.from} — {data.range.to})
          </span>
          . Łącznie{" "}
          <strong className="admin-analytics-kpi text-2xl">{data.total_views}</strong> odsłon (bez panelu admina).
        </p>
        {data.total_views > 0 && data.peak.views > 0 ? (
          <p className="mt-3 text-sm admin-data-muted">
            Szczyt: <strong className="text-zinc-900 dark:text-zinc-50">{data.peak.label}</strong>–
            <strong className="text-zinc-900 dark:text-zinc-50">
              {String((data.peak.hour + 1) % 24).padStart(2, "0")}:00
            </strong>{" "}
            (<strong className="tabular-nums text-zinc-900 dark:text-zinc-50">{data.peak.views}</strong> odsłon).
            {topHours.length > 0 ? (
              <>
                {" "}
                Top godzin:{" "}
                {topHours.map((h, i) => (
                  <span key={h.hour} className="whitespace-nowrap tabular-nums">
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
          <p className="mt-3 text-sm admin-data-muted">W tych 7 dniach nie zapisano jeszcze żadnych wejść.</p>
        ) : null}
      </AdminCard>

      <div className="grid gap-6 xl:grid-cols-2">
        <AdminCard
          tone="data"
          title="Suma wejść wg godziny"
          description="Każdy słupek = jedna godzina 00:00–23:59 (PL), zsumowana z całych 7 dni."
        >
          <div className={chartInnerClass}>
            <div className="h-80 w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.by_hour} margin={{ top: 12, right: 12, left: 4, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                  <XAxis
                    dataKey="label"
                    tick={axisTick}
                    interval={1}
                    angle={-45}
                    textAnchor="end"
                    height={64}
                  />
                  <YAxis tick={axisTick} allowDecimals={false} width={44} />
                  <Tooltip
                    formatter={(v) => [Number(v), "Odsłony"]}
                    labelFormatter={(l) => `Godzina ${l}`}
                    contentStyle={{
                      borderRadius: "0.5rem",
                      border: "1px solid rgb(212, 212, 216)",
                      background: "rgb(255, 255, 255)",
                      color: "rgb(24, 24, 27)",
                    }}
                  />
                  <Bar dataKey="views" fill="#047857" radius={[4, 4, 0, 0]} maxBarSize={22} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </AdminCard>

        <AdminCard
          tone="data"
          title="Oś czasu: każda godzina"
          description={`${timelineWithIdx.length} punktów (7 × 24 h). Najedź kursorem, aby zobaczyć szczegóły.`}
        >
          <div className={chartInnerClass}>
            <div className="h-80 w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timelineWithIdx} margin={{ top: 12, right: 12, left: 4, bottom: 8 }}>
                  <defs>
                    <linearGradient id="awpHourlyFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#059669" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#059669" stopOpacity={0.04} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                  <XAxis
                    dataKey="idx"
                    type="number"
                    domain={[0, timelineWithIdx.length - 1]}
                    ticks={[0, 24, 48, 72, 96, 120, 144, 167].filter((t) => t < timelineWithIdx.length)}
                    tickFormatter={(idx) => {
                      const row = timelineWithIdx[idx];
                      return row ? `${row.dayLabel.split(",")[0]?.trim() ?? ""}` : "";
                    }}
                    tick={axisTick}
                  />
                  <YAxis tick={axisTick} allowDecimals={false} width={40} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const p = payload[0].payload as (typeof timelineWithIdx)[0];
                      return (
                        <div className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm shadow-md dark:border-zinc-600 dark:bg-zinc-900">
                          <p className="font-medium text-zinc-900 dark:text-zinc-50">{p.slotLabel}</p>
                          <p className="mt-0.5 tabular-nums text-zinc-600 dark:text-zinc-300">
                            Odsłony: <strong className="text-zinc-900 dark:text-zinc-50">{p.views}</strong>
                          </p>
                        </div>
                      );
                    }}
                  />
                  <Area
                    type="stepAfter"
                    dataKey="views"
                    stroke="#047857"
                    strokeWidth={1.5}
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
        tone="data"
        title="Mapa ciepła: dzień × godzina"
        description={`Wiersz = dzień (PL), kolumna = godzina. Intensywność = liczba odsłon (max w komórce: ${heatMax}).`}
      >
        <div className={chartInnerClass}>
          <div className="overflow-x-auto">
            <div className="inline-block min-w-[760px]">
              <div
                className="grid gap-px rounded-lg border border-zinc-200 bg-zinc-200 p-px dark:border-zinc-700 dark:bg-zinc-700"
                style={{ gridTemplateColumns: `96px repeat(24, minmax(0,1fr))` }}
              >
                <div className="bg-zinc-100 p-2 text-[11px] font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                  Dzień / godz.
                </div>
                {Array.from({ length: 24 }, (_, h) => (
                  <div
                    key={h}
                    className="bg-zinc-100 p-1 text-center text-[11px] font-semibold tabular-nums text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                  >
                    {String(h).padStart(2, "0")}
                  </div>
                ))}
                {data.by_day.map((d) => (
                  <Fragment key={d.ymd}>
                    <div className="flex flex-col justify-center bg-white px-2 py-2 text-xs font-medium leading-tight text-zinc-800 dark:bg-zinc-950 dark:text-zinc-100">
                      <span>{d.label}</span>
                      <span className="text-[10px] font-normal tabular-nums text-zinc-500 dark:text-zinc-400">
                        Σ {d.total}
                      </span>
                    </div>
                    {d.hours.map((v, h) => (
                      <div
                        key={`${d.ymd}-${h}`}
                        className="flex min-h-[28px] min-w-0 items-center justify-center text-[11px] font-semibold tabular-nums"
                        style={{
                          backgroundColor: heatColor(v, heatMax),
                          color: heatTextColor(v, heatMax),
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
