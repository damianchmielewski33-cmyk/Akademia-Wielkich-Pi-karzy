"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type PlayerStatsChartDatum = { name: string; v: number };

export function PlayerStatsBarChart({ data }: { data: PlayerStatsChartDatum[] }) {
  return (
    <div className="mt-4 h-56 w-full rounded-xl border border-emerald-900/10 bg-emerald-50/30 p-2">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
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
  );
}
