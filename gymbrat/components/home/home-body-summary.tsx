"use client";

import Image from "next/image";
import { ArrowDownRight, ArrowRight, ArrowUpRight, Minus } from "lucide-react";
import type { HomeBodyDashboard } from "@/lib/home-body-dashboard";
import { cn } from "@/lib/utils";

function TrendIcon({ trend }: { trend: HomeBodyDashboard["weightTrend"] }) {
  if (trend === "up") return <ArrowUpRight className="h-5 w-5 text-amber-600" aria-hidden />;
  if (trend === "down") return <ArrowDownRight className="h-5 w-5 text-emerald-600" aria-hidden />;
  return <Minus className="h-5 w-5 text-zinc-400" aria-hidden />;
}

function trendLabel(trend: HomeBodyDashboard["weightTrend"]) {
  if (trend === "up") return "Rośnie";
  if (trend === "down") return "Maleje";
  if (trend === "flat") return "Stabilna";
  return "Brak trendu";
}

export function HomeWeightSummaryCards({ data }: { data: HomeBodyDashboard }) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <article className="pitch-card p-4 sm:p-5">
        <div className="flex items-start justify-between gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
            Aktualna waga
          </p>
          <TrendIcon trend={data.weightTrend} />
        </div>
        <p className="mt-2 text-3xl font-black tabular-nums tracking-tight text-zinc-950 dark:text-white">
          {data.currentWeightKg != null ? data.currentWeightKg.toFixed(1) : "—"}
          <span className="ml-1 text-base font-semibold text-zinc-400">kg</span>
        </p>
        <p
          className={cn(
            "mt-2 text-sm font-semibold",
            data.weightTrend === "up" && "text-amber-700 dark:text-amber-300",
            data.weightTrend === "down" && "text-emerald-700 dark:text-emerald-300",
            (data.weightTrend === "flat" || data.weightTrend == null) && "text-zinc-500",
          )}
        >
          {trendLabel(data.weightTrend)}
          {data.weightDeltaFromStartKg != null ? (
            <span className="ml-1 font-normal text-zinc-400">
              ({data.weightDeltaFromStartKg > 0 ? "+" : ""}
              {data.weightDeltaFromStartKg.toFixed(1)} kg od startu)
            </span>
          ) : null}
        </p>
      </article>

      <article className="pitch-card p-4 sm:p-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
          Waga od startu
        </p>
        <p className="mt-2 text-3xl font-black tabular-nums tracking-tight text-zinc-950 dark:text-white">
          {data.startWeightKg != null ? data.startWeightKg.toFixed(1) : "—"}
          <span className="ml-1 text-base font-semibold text-zinc-400">kg</span>
        </p>
        <p className="mt-2 flex items-center gap-1 text-sm text-zinc-500">
          Pierwszy pomiar
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          teraz
        </p>
      </article>

      <article className="pitch-card p-4 sm:p-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
          Tempo kg / tydz.
        </p>
        <p className="mt-2 text-3xl font-black tabular-nums tracking-tight text-zinc-950 dark:text-white">
          {data.weeklyTempoKg != null
            ? `${data.weeklyTempoKg > 0 ? "+" : ""}${data.weeklyTempoKg.toFixed(1)}`
            : "—"}
          <span className="ml-1 text-base font-semibold text-zinc-400">kg</span>
        </p>
        <p className="mt-2 text-sm text-zinc-500">Średnia od pierwszego do ostatniego ważenia</p>
      </article>
    </div>
  );
}

export function HomeTransformationCarousel({
  photos,
}: {
  photos: HomeBodyDashboard["transformationPhotos"];
}) {
  if (photos.length === 0) {
    return (
      <div className="pitch-card p-5 text-sm text-zinc-500">
        Brak zdjęć przemiany. Dodaj zdjęcia w raporcie ciała — pojawią się tu pierwsze i aktualne.
      </div>
    );
  }

  return (
    <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1 [scrollbar-width:thin] snap-x snap-mandatory">
      {photos.map((p) => (
        <figure
          key={p.id}
          className="relative w-[min(78vw,280px)] shrink-0 snap-start overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-100 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
        >
          <div className="relative aspect-[3/4] w-full">
            <Image
              src={p.dataUrl}
              alt={`${p.label} — ${p.date}`}
              fill
              className="object-cover"
              sizes="280px"
              unoptimized
            />
          </div>
          <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-3 pb-3 pt-10 text-white">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/80">
              {p.label}
            </p>
            <p className="text-sm font-semibold">
              {new Date(`${p.date}T12:00:00`).toLocaleDateString("pl-PL")}
            </p>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}
