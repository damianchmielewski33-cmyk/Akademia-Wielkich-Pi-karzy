"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MetricPoint } from "@/lib/home-body-dashboard";
import { cn } from "@/lib/utils";

export const BODY_METRIC_COLORS = {
  weight: "#00c9b1",
  waist: "#e85d04",
  chest: "#1a2d5a",
  thigh: "#f5c518",
  biceps: "#7c3aed",
} as const;

function formatShortDate(iso: string) {
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString("pl-PL", { month: "short", day: "numeric" });
}

const tooltipStyle = {
  backgroundColor: "#fff",
  border: "1px solid #e4e4e7",
  borderRadius: "12px",
  fontSize: "12px",
  color: "#18181b",
  boxShadow: "0 8px 24px rgba(15,23,42,0.12)",
};

export function HomeBodyMetricsChart({
  series,
}: {
  series: {
    weight: MetricPoint[];
    waist: MetricPoint[];
    chest: MetricPoint[];
    thigh: MetricPoint[];
    biceps: MetricPoint[];
  };
}) {
  const dates = new Set<string>();
  for (const key of Object.keys(series) as (keyof typeof series)[]) {
    for (const p of series[key]) dates.add(p.date);
  }
  const sortedDates = Array.from(dates).sort();
  if (sortedDates.length === 0) {
    return (
      <div className="pitch-card flex h-[280px] items-center justify-center p-6 text-sm text-zinc-500">
        Brak pomiarów do wykresu — dodaj raport ciała lub ważenie.
      </div>
    );
  }

  const lookup = (arr: MetricPoint[]) => {
    const m = new Map(arr.map((p) => [p.date, p.value]));
    return m;
  };
  const w = lookup(series.weight);
  const waist = lookup(series.waist);
  const chest = lookup(series.chest);
  const thigh = lookup(series.thigh);
  const biceps = lookup(series.biceps);

  const data = sortedDates.map((date) => ({
    date,
    weight: w.get(date) ?? null,
    waist: waist.get(date) ?? null,
    chest: chest.get(date) ?? null,
    thigh: thigh.get(date) ?? null,
    biceps: biceps.get(date) ?? null,
  }));

  const legend = [
    { key: "weight", label: "Waga", color: BODY_METRIC_COLORS.weight },
    { key: "waist", label: "Brzuch / pas", color: BODY_METRIC_COLORS.waist },
    { key: "chest", label: "Klatka", color: BODY_METRIC_COLORS.chest },
    { key: "thigh", label: "Udo", color: BODY_METRIC_COLORS.thigh },
    { key: "biceps", label: "Biceps", color: BODY_METRIC_COLORS.biceps },
  ] as const;

  return (
    <div className="pitch-card p-4 sm:p-5">
      <p className="pitch-label">Pomiary</p>
      <h2 className="mt-1 font-heading text-lg font-semibold text-zinc-950 dark:text-white">
        Waga i wymiary
      </h2>
      <div className="mt-3 flex flex-wrap gap-2">
        {legend.map((l) => (
          <span
            key={l.key}
            className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[11px] font-semibold text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
          >
            <span className="h-2 w-2 rounded-full" style={{ background: l.color }} aria-hidden />
            {l.label}
          </span>
        ))}
      </div>
      <div className="mt-4 h-[260px] w-full sm:h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(113,113,122,0.25)" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={formatShortDate}
              tick={{ fill: "#71717a", fontSize: 11 }}
              axisLine={{ stroke: "#e4e4e7" }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "#71717a", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={40}
              domain={["auto", "auto"]}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              labelFormatter={(label) => formatShortDate(String(label))}
            />
            <Line
              type="monotone"
              dataKey="weight"
              name="Waga"
              stroke={BODY_METRIC_COLORS.weight}
              strokeWidth={2.5}
              dot={false}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="waist"
              name="Pas"
              stroke={BODY_METRIC_COLORS.waist}
              strokeWidth={2}
              dot={false}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="chest"
              name="Klatka"
              stroke={BODY_METRIC_COLORS.chest}
              strokeWidth={2}
              dot={false}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="thigh"
              name="Udo"
              stroke={BODY_METRIC_COLORS.thigh}
              strokeWidth={2}
              dot={false}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="biceps"
              name="Biceps"
              stroke={BODY_METRIC_COLORS.biceps}
              strokeWidth={2}
              dot={false}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function MiniMetricSpark({
  title,
  unit,
  data,
  color,
  latest,
}: {
  title: string;
  unit: string;
  data: MetricPoint[];
  color: string;
  latest: number | null;
}) {
  return (
    <div className="pitch-card flex flex-col gap-2 p-3.5 sm:p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
            {title}
          </p>
          <p className="mt-0.5 text-xl font-bold tabular-nums text-zinc-950 dark:text-white">
            {latest != null ? latest.toFixed(1) : "—"}
            <span className="ml-1 text-xs font-semibold text-zinc-400">{unit}</span>
          </p>
        </div>
        <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: color }} />
      </div>
      <div className="h-[64px] w-full">
        {data.length > 1 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 4, right: 2, left: 2, bottom: 0 }}>
              <Line
                type="monotone"
                dataKey="value"
                stroke={color}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div
            className={cn(
              "flex h-full items-center justify-center rounded-lg text-[11px] text-zinc-400",
              "bg-zinc-50 dark:bg-zinc-900",
            )}
          >
            Za mało danych
          </div>
        )}
      </div>
    </div>
  );
}
