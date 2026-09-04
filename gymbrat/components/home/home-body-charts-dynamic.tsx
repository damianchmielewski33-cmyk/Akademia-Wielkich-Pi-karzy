"use client";

import dynamic from "next/dynamic";
import type { HomeBodyDashboard } from "@/lib/home-body-dashboard";
import { BODY_METRIC_COLORS } from "@/components/home/home-body-charts";

const HomeBodyMetricsChart = dynamic(
  () => import("@/components/home/home-body-charts").then((m) => m.HomeBodyMetricsChart),
  {
    ssr: false,
    loading: () => (
      <div className="h-[300px] w-full animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-900" />
    ),
  },
);

const MiniMetricSpark = dynamic(
  () => import("@/components/home/home-body-charts").then((m) => m.MiniMetricSpark),
  {
    ssr: false,
    loading: () => (
      <div className="h-[120px] w-full animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-900" />
    ),
  },
);

export function HomeBodyMainChart({ data }: { data: HomeBodyDashboard }) {
  return <HomeBodyMetricsChart series={data.series} />;
}

export function HomeBodyMiniSparks({ data }: { data: HomeBodyDashboard }) {
  const latest = (arr: { value: number }[]) =>
    arr.length > 0 ? arr[arr.length - 1]!.value : null;

  return (
    <section className="space-y-3">
      <div>
        <p className="pitch-label">Wymiary</p>
        <h2 className="mt-1 font-heading text-lg font-semibold text-zinc-950 dark:text-white">
          Pas, klatka, biceps, udo
        </h2>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MiniMetricSpark
          title="Pas / brzuch"
          unit="cm"
          data={data.spark.waist}
          color={BODY_METRIC_COLORS.waist}
          latest={latest(data.series.waist)}
        />
        <MiniMetricSpark
          title="Klatka"
          unit="cm"
          data={data.spark.chest}
          color={BODY_METRIC_COLORS.chest}
          latest={latest(data.series.chest)}
        />
        <MiniMetricSpark
          title="Biceps"
          unit="cm"
          data={data.spark.biceps}
          color={BODY_METRIC_COLORS.biceps}
          latest={latest(data.series.biceps)}
        />
        <MiniMetricSpark
          title="Udo"
          unit="cm"
          data={data.spark.thigh}
          color={BODY_METRIC_COLORS.thigh}
          latest={latest(data.series.thigh)}
        />
      </div>
    </section>
  );
}
