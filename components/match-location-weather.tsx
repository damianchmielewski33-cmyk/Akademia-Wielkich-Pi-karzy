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
    "mx-auto my-0.5 shrink-0 text-[var(--mundial-gold,#f5c518)] drop-shadow-sm",
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
      <div className={cn(rootPad, "flex items-center gap-2 text-[11px] text-emerald-100/80", className)}>
        <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-[var(--mundial-gold,#f5c518)]" aria-hidden />
        <span>Prognoza na {FORECAST_DAYS} dni…</span>
      </div>
    );
  }

  if ("err" in state) {
    return (
      <div
        className={cn(
          rootPad,
          "flex items-center gap-1.5 text-[11px] text-amber-100/95",
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
          ? "w-full min-w-0 max-w-full border-t border-white/15 pt-2"
          : "mt-2 border-t border-white/15 pt-2",
        className
      )}
    >
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--mundial-gold,#f5c518)]">
        {forecastTitle(ok.source)}
      </p>
      <div
        className={cn(
          "-mx-0.5 flex gap-2 overflow-x-auto pb-1 [scrollbar-color:rgba(255,255,255,0.25)_transparent] [scrollbar-width:thin]",
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
                "flex shrink-0 flex-col items-center rounded-xl border border-white/25 bg-black/10 px-1.5 py-2 text-center shadow-sm shadow-emerald-950/15 backdrop-blur-sm transition-colors hover:bg-white/5",
                compact ? "min-w-[3.35rem]" : "min-w-[4.25rem] px-2 py-2.5"
              )}
              title={day.description || undefined}
            >
              <span className="text-[9px] font-semibold uppercase leading-tight tracking-wide text-emerald-100/80">
                {wd}
              </span>
              <span className="text-[9px] tabular-nums text-white/55">{day.date.slice(5).replace("-", ".")}</span>
              {icons ? (
                <span
                  className={cn(
                    "relative mx-auto my-0.5 block rounded-lg bg-white/10 p-0.5 ring-1 ring-white/15",
                    compact ? "h-7 w-7" : "h-8 w-8"
                  )}
                >
                  {/* Ikony z API Google — dynamiczne URL-e; next/image wymagałby listy domen. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={icons.light}
                    alt=""
                    className={cn("dark:hidden", compact ? "h-6 w-6" : "h-7 w-7")}
                    loading="lazy"
                    decoding="async"
                  />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={icons.dark}
                    alt=""
                    className={cn("hidden dark:block", compact ? "h-6 w-6" : "h-7 w-7")}
                    loading="lazy"
                    decoding="async"
                  />
                </span>
              ) : wmo != null ? (
                <WmoWeatherIcon code={wmo} compact={compact} />
              ) : (
                <span className={cn("my-0.5 block", compact ? "h-7 w-7" : "h-8 w-8")} aria-hidden />
              )}
              <span className="text-[10px] font-bold tabular-nums text-white">
                {day.maxC != null ? `${Math.round(day.maxC)}°` : "—"}
                <span className="font-normal text-white/50">
                  {day.minC != null ? ` / ${Math.round(day.minC)}°` : ""}
                </span>
              </span>
              {day.precipChance != null && day.precipChance > 0 ? (
                <span className="text-[9px] text-sky-100/85">{day.precipChance}% opady</span>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
