"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, RefreshCw, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSiteMode } from "@/components/site-mode";
import {
  compareAndroidAppVersion,
  readInstalledAndroidAppIdentity,
  type AndroidAppIdentity,
} from "@/lib/app-webview";
import { cn } from "@/lib/utils";

type LatestInfo = {
  versionCode: number;
  versionName: string;
  notes?: string | null;
};

export function AndroidAppVersionCard() {
  const { marketplaceEnabled } = useSiteMode();
  const light = marketplaceEnabled;
  const [installed, setInstalled] = useState<AndroidAppIdentity | null>(null);
  const [latest, setLatest] = useState<LatestInfo | null>(null);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const current = readInstalledAndroidAppIdentity();
    setInstalled(current);
    if (!current) {
      setChecking(false);
      return;
    }
    setChecking(true);
    setError(null);
    try {
      const res = await fetch("/api/android/version", { cache: "no-store" });
      const body = (await res.json().catch(() => ({}))) as LatestInfo & { error?: string };
      if (!res.ok || typeof body.versionCode !== "number" || typeof body.versionName !== "string") {
        throw new Error(body.error ?? "Nie udało się pobrać informacji o wersji");
      }
      setLatest({ versionCode: body.versionCode, versionName: body.versionName, notes: body.notes });
    } catch (e) {
      setLatest(null);
      setError(e instanceof Error ? e.message : "Nie udało się sprawdzić aktualizacji");
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (!installed) return null;

  const updateAvailable = latest ? compareAndroidAppVersion(installed, latest) > 0 : false;

  function requestNativeUpdate() {
    try {
      window.AwpAndroid?.checkUpdate?.();
    } catch {
      window.location.href = "/api/android/download?source=profile";
    }
  }

  return (
    <div
      className={cn(
        light
          ? "overflow-hidden rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 sm:p-6"
          : "awp-card-surface"
      )}
    >
      <div>
        <h2
          className={cn(
            "flex items-center gap-2 text-lg font-bold",
            light ? "font-black tracking-tight text-zinc-950 dark:text-white" : "text-white"
          )}
        >
          {light ? (
            <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[var(--mp-teal)] text-white shadow-sm">
              <Smartphone className="h-4 w-4" aria-hidden />
            </span>
          ) : (
            <Smartphone className="h-5 w-5 text-[var(--mundial-gold,#f5c518)]" />
          )}
          Aplikacja Android
        </h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Wersja zainstalowana na tym telefonie i informacja, czy jest nowsza aktualizacja.
        </p>
        <dl className="mt-5 grid gap-3 sm:grid-cols-2">
          <div
            className={cn(
              "rounded-2xl border p-4",
              light
                ? "border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/80"
                : "border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900/80"
            )}
          >
            <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Zainstalowana</dt>
            <dd className="mt-1 text-xl font-black tabular-nums text-zinc-950 dark:text-white">
              {installed.versionName}
            </dd>
            {installed.versionCode != null ? (
              <dd className="mt-0.5 text-xs text-zinc-500">Kompilacja {installed.versionCode}</dd>
            ) : null}
          </div>
          <div
            className={cn(
              "rounded-2xl border p-4",
              light
                ? "border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/80"
                : "border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900/80"
            )}
          >
            <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Aktualizacja</dt>
            <dd className="mt-1 text-sm font-semibold text-zinc-950 dark:text-white">
              {checking
                ? "Sprawdzanie…"
                : error
                  ? error
                  : updateAvailable
                    ? `Dostępna nowa wersja ${latest?.versionName}`
                    : "Masz najnowszą wersję. Aktualizacji nie ma."}
            </dd>
            {updateAvailable && latest?.notes ? (
              <dd className="mt-1 text-xs text-zinc-500">{latest.notes}</dd>
            ) : null}
          </div>
        </dl>
        <div className="mt-4 flex flex-wrap gap-2">
          {updateAvailable ? (
            <Button type="button" className={light ? "rounded-full" : undefined} onClick={requestNativeUpdate}>
              <Download className="h-4 w-4" />
              Zainstaluj {latest?.versionName}
            </Button>
          ) : null}
          <Button
            type="button"
            variant="outline"
            disabled={checking}
            className={light ? "rounded-full" : undefined}
            onClick={() => void load()}
          >
            <RefreshCw className="h-4 w-4" />
            {checking ? "Sprawdzanie…" : "Sprawdź ponownie"}
          </Button>
        </div>
      </div>
    </div>
  );
}
