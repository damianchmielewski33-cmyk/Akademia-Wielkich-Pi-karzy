"use client";

import { useEffect, useState } from "react";
import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudOff,
  CloudRain,
  CloudSnow,
  CloudSun,
  Loader2,
  Sun,
} from "lucide-react";
import { cn } from "@/lib/utils";

type DayEntry = {
  date: string;
  description: string;
  iconBaseUri: string;
  weatherCode?: number | null;
  maxC: number | null;
  minC: number | null;
  precipChance: number | null;
};

const FORECAST_DAYS = 10;

type ApiOk = {
  days: DayEntry[];
  maxDays: number;
  source: string;
};

type CacheEntry = { at: number; data: ApiOk | "error"; status: number };

const CACHE_MS = 45 * 60 * 1000;
const cache = new Map<string, CacheEntry>();

function iconUrls(iconBaseUri: string): { light: string; dark: string } {
  const base = iconBaseUri.replace(/\.(svg|png)$/i, "").replace(/_dark$/i, "");
  return { light: `${base}.svg`, dark: `${base}_dark.svg` };
}

function WmoWeatherIcon({ code, compact }: { code: number; compact?: boolean }) {
  const cls = cn(
    "mx-auto my-0.5 shrink-0 text-sky-600 dark:text-sky-300",
    compact ? "h-7 w-7" : "h-8 w-8"
  );
  if (code === 0) return <Sun className={cls} aria-hidden />;
  if (code >= 1 && code <= 3) return <CloudSun className={cls} aria-hidden />;
  if (code === 45 || code === 48) return <CloudFog className={cls} aria-hidden />;
  if (code >= 51 && code <= 57) return <CloudDrizzle className={cls} aria-hidden />;
  if (code >= 61 && code <= 67) return <CloudRain className={cls} aria-hidden />;
  if (code >= 71 && code <= 77) return <CloudSnow className={cls} aria-hidden />;
  if (code >= 80 && code <= 86) return <CloudRain className={cls} aria-hidden />;
  if (code >= 95 && code <= 99) return <CloudLightning className={cls} aria-hidden />;
  return <Cloud className={cls} aria-hidden />;
}

function weekdayShortPl(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  if (!y || !m || !d) return "";
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString("pl-PL", { weekday: "short" });
}

function forecastTitle(source: string): string {
  if (source === "google_weather") return `Pogoda Google — ${FORECAST_DAYS} dni`;
  return `Prognoza ${FORECAST_DAYS} dni`;
}

export function MatchLocationWeather({
  location,
  className,
  layout = "default",
}: {
  location: string;
  className?: string;
  /** W drugim wierszu tabeli: szeroki pas pogody przewija się poziomo, nie rozpycha kolumny „Opcje”. */
  layout?: "default" | "table-subrow";
}) {
  const [state, setState] = useState<"idle" | "loading" | { ok: ApiOk } | { err: string }>("idle");

  useEffect(() => {
    let cancelled = false;
    const q = location.trim();
    if (!q) {
      setState({ err: "Brak adresu" });
      return;
    }

    const run = async () => {
      const now = Date.now();
      const hit = cache.get(q);
      if (hit && now - hit.at < CACHE_MS) {
        if (hit.data === "error") {
          if (!cancelled) setState({ err: "Błąd wcześniejszego żądania" });
          return;
        }
        if (hit.status === 200) {
          if (!cancelled) setState({ ok: hit.data });
          return;
        }
      }

      if (!cancelled) setState("loading");
      try {
        const res = await fetch(`/api/weather/forecast?q=${encodeURIComponent(q)}`);
        const json = await res.json().catch(() => ({}));

        if (!res.ok) {
          cache.set(q, { at: now, data: "error", status: res.status });
          if (!cancelled) setState({ err: json?.message || "Nie udało się pobrać pogody." });
          return;
        }

        const data = json as ApiOk;
        cache.set(q, { at: now, data, status: 200 });
        if (!cancelled) setState({ ok: data });
      } catch {
        cache.set(q, { at: now, data: "error", status: 0 });
        if (!cancelled) setState({ err: "Błąd sieci." });
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [location]);

  const rootPad = layout === "table-subrow" ? "mt-0" : "mt-2";

  if (state === "idle" || state === "loading") {
    return (
      <div className={cn(rootPad, "flex items-center gap-2 text-[11px] text-zinc-500 dark:text-zinc-400", className)}>
        <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden />
        <span>Prognoza na {FORECAST_DAYS} dni…</span>
      </div>
    );
  }

  if ("err" in state) {
    return (
      <div
        className={cn(
          rootPad,
          "flex items-center gap-1.5 text-[11px] text-amber-800/90 dark:text-amber-200/90",
          className
        )}
      >
        <CloudOff className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <span>{state.err}</span>
      </div>
    );
  }

  const { ok } = state;
  const days = ok.days.slice(0, FORECAST_DAYS);
  if (!days.length) {
    return null;
  }

  return (
    <div
      className={cn(
        layout === "table-subrow"
          ? "w-full min-w-0 max-w-full border-t border-zinc-200/70 pt-2 dark:border-zinc-600/50"
          : "mt-2 border-t border-zinc-200/80 pt-2 dark:border-zinc-600/60",
        className
      )}
    >
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {forecastTitle(ok.source)}
      </p>
      <div
        className={cn(
          "-mx-0.5 flex gap-1.5 overflow-x-auto pb-0.5",
          layout === "table-subrow" && "w-full min-w-0 max-w-full"
        )}
      >
        {days.map((day) => {
          const icons = day.iconBaseUri ? iconUrls(day.iconBaseUri) : null;
          const wd = weekdayShortPl(day.date);
          const wmo = typeof day.weatherCode === "number" ? day.weatherCode : null;
          const compact = layout === "table-subrow";
          return (
            <div
              key={day.date}
              className={cn(
                "flex shrink-0 flex-col items-center rounded-lg border border-zinc-200/90 bg-white/90 px-1 py-1.5 text-center dark:border-zinc-600/80 dark:bg-zinc-800/80",
                compact ? "min-w-[3.35rem]" : "min-w-[4.25rem] px-1.5"
              )}
              title={day.description || undefined}
            >
              <span className="text-[9px] font-medium capitalize leading-tight text-zinc-500 dark:text-zinc-400">
                {wd}
              </span>
              <span className="text-[9px] tabular-nums text-zinc-600 dark:text-zinc-300">{day.date.slice(5)}</span>
              {icons ? (
                <span className={cn("relative mx-auto my-0.5 block", compact ? "h-7 w-7" : "h-8 w-8")}>
                  {/* Ikony z API Google — dynamiczne URL-e; next/image wymagałby listy domen. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={icons.light}
                    alt=""
                    className={cn("dark:hidden", compact ? "h-7 w-7" : "h-8 w-8")}
                    loading="lazy"
                    decoding="async"
                  />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={icons.dark}
                    alt=""
                    className={cn("hidden dark:block", compact ? "h-7 w-7" : "h-8 w-8")}
                    loading="lazy"
                    decoding="async"
                  />
                </span>
              ) : wmo != null ? (
                <WmoWeatherIcon code={wmo} compact={compact} />
              ) : (
                <span className={cn("my-0.5 block", compact ? "h-7 w-7" : "h-8 w-8")} aria-hidden />
              )}
              <span className="text-[10px] font-semibold tabular-nums text-emerald-900 dark:text-emerald-100">
                {day.maxC != null ? `${Math.round(day.maxC)}°` : "—"}
                <span className="font-normal text-zinc-500 dark:text-zinc-400">
                  {day.minC != null ? ` / ${Math.round(day.minC)}°` : ""}
                </span>
              </span>
              {day.precipChance != null && day.precipChance > 0 ? (
                <span className="text-[9px] text-sky-700 dark:text-sky-300">{day.precipChance}% opady</span>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
