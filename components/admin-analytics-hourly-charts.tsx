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
      <div className="mb-8 flex items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white py-16 text-sm text-zinc-500 shadow-sm">
        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
        Wczytywanie wykresów godzinowych (ostatnie 7 dni)…
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mb-8 rounded-xl border border-dashed border-zinc-200 bg-zinc-50/80 px-4 py-8 text-center text-sm text-zinc-600">
        Brak danych do wykresów godzinowych albo nie udało się ich pobrać.
      </div>
    );
  }

  const rangePl = `${new Date(`${data.range.from}T12:00:00`).toLocaleDateString("pl-PL")} – ${new Date(`${data.range.to}T12:00:00`).toLocaleDateString("pl-PL")}`;

  return (
    <div className="mb-8 space-y-6">
      <div className="rounded-xl border border-emerald-900/15 bg-gradient-to-br from-emerald-50/90 via-white to-zinc-50/80 p-4 shadow-sm sm:p-5">
        <h2 className="text-lg font-semibold text-emerald-950 dark:text-emerald-100">Godziny wejść — ostatnie 7 dni</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Zakres kalendarzowy w strefie <strong>{data.timezone}</strong>: {rangePl}{" "}
          <span className="text-zinc-500">
            ({data.range.from} — {data.range.to})
          </span>
          . Łącznie <strong className="tabular-nums text-zinc-800">{data.total_views}</strong> odsłon w
          tym oknie (bez panelu admina — jak przy zapisie `page_views`).
        </p>
        {data.total_views > 0 && data.peak.views > 0 ? (
          <p className="mt-2 text-sm text-emerald-900/90 dark:text-emerald-200/90">
            Najwięcej sumarycznych wejść między <strong>{data.peak.label}</strong> a{" "}
            <strong>{String((data.peak.hour + 1) % 24).padStart(2, "0")}:00</strong>:{" "}
            <strong className="tabular-nums">{data.peak.views}</strong> odsłon (wszystkie dni razem).
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
          <p className="mt-2 text-sm text-zinc-600">W tych 7 dniach nie zapisano jeszcze żadnych wejść.</p>
        ) : null}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-xl border border-zinc-200/80 bg-white p-3 shadow-sm sm:p-4">
          <h3 className="px-1 text-base font-semibold text-zinc-900">Suma wejść wg godziny zegarowej</h3>
          <p className="mb-2 px-1 text-xs text-zinc-500">
            Każdy słupek = jedna godzina 00:00–23:59 (PL), zsumowana z całych 7 dni.
          </p>
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

        <div className="rounded-xl border border-zinc-200/80 bg-white p-3 shadow-sm sm:p-4">
          <h3 className="px-1 text-base font-semibold text-zinc-900">Oś czasu: każda godzina osobno</h3>
          <p className="mb-2 px-1 text-xs text-zinc-500">
            {timelineWithIdx.length} punktów (7 × 24 h). Najedź, aby zobaczyć dokładną etykietę.
          </p>
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
      </div>

      <div className="rounded-xl border border-zinc-200/80 bg-white p-3 shadow-sm sm:p-4">
        <h3 className="px-1 text-base font-semibold text-zinc-900">Mapa ciepła: dzień × godzina</h3>
        <p className="mb-3 px-1 text-xs text-zinc-500">
          Wiersz = jeden dzień kalendarzowy (PL), kolumna = godzina. Intensywność = liczba odsłon (max w
          komórce: <span className="tabular-nums">{heatMax}</span>).
        </p>
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
    </div>
  );
}
