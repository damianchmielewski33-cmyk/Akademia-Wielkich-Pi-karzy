"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, RefreshCw } from "lucide-react";
import { AppModal } from "@/components/ui/app-modal";
import { Button } from "@/components/ui/button";
import {
  androidUpdateLaterStorageKey,
  isInstalledAndroidAppClient,
  readInstalledAndroidAppIdentity,
  shouldShowAndroidUpdatePrompt,
  type AndroidAppIdentity,
  type AndroidLatestVersion,
} from "@/lib/app-webview";

type LatestInfo = AndroidLatestVersion & { notes?: string | null };

function readPostponedVersionCode(versionCode: number | undefined): number | null {
  if (versionCode == null || typeof sessionStorage === "undefined") return null;
  try {
    return sessionStorage.getItem(androidUpdateLaterStorageKey(versionCode)) === "1"
      ? versionCode
      : null;
  } catch {
    return null;
  }
}

function requestNativeUpdate() {
  try {
    if (window.AwpAndroid?.checkUpdate) {
      window.AwpAndroid.checkUpdate();
      return true;
    }
  } catch {
    /* most niedostępny */
  }
  window.location.href = "/api/android/download?source=in-app-update";
  return false;
}

/**
 * Blokujący popup w WebView zainstalowanego APK, gdy na serwerze jest nowsza wersja.
 * Zwykła przeglądarka i PWA go nie widzą.
 */
export function AndroidAppUpdatePrompt() {
  const [installed, setInstalled] = useState<AndroidAppIdentity | null>(null);
  const [inApp, setInApp] = useState(false);
  const [latest, setLatest] = useState<LatestInfo | null>(null);
  const [postponedVersionCode, setPostponedVersionCode] = useState<number | null>(null);
  const [starting, setStarting] = useState(false);

  const load = useCallback(async () => {
    const runningInApp = isInstalledAndroidAppClient();
    setInApp(runningInApp);
    const current = runningInApp ? readInstalledAndroidAppIdentity() : null;
    setInstalled(current);
    if (!runningInApp || !current) {
      setLatest(null);
      return;
    }
    try {
      const res = await fetch("/api/android/version", { cache: "no-store" });
      const body = (await res.json().catch(() => ({}))) as LatestInfo & { error?: string };
      if (!res.ok || typeof body.versionCode !== "number" || typeof body.versionName !== "string") {
        setLatest(null);
        return;
      }
      const next = { versionCode: body.versionCode, versionName: body.versionName, notes: body.notes };
      setLatest(next);
      setPostponedVersionCode(readPostponedVersionCode(next.versionCode));
    } catch {
      setLatest(null);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const open = shouldShowAndroidUpdatePrompt({
    inInstalledApp: inApp,
    current: installed,
    latest,
    postponedVersionCode,
  });

  function postpone() {
    if (!latest) return;
    try {
      sessionStorage.setItem(androidUpdateLaterStorageKey(latest.versionCode), "1");
    } catch {
      /* private mode */
    }
    setPostponedVersionCode(latest.versionCode);
  }

  function startUpdate() {
    setStarting(true);
    requestNativeUpdate();
  }

  return (
    <AppModal
      open={open}
      onOpenChange={() => {}}
      preventDismiss
      hideCloseButton
      size="md"
      title="Wymagana aktualizacja"
      headerKicker="Aplikacja"
      description={`Nowa wersja ${latest?.versionName ?? ""} jest już dostępna.`}
      icon={<Download className="h-5 w-5 text-[var(--mp-teal)]" aria-hidden />}
      footer={
        <>
          <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={postpone} disabled={starting}>
            Później
          </Button>
          <Button type="button" variant="default" className="w-full rounded-full font-bold sm:w-auto" onClick={startUpdate} disabled={starting}>
            {starting ? <RefreshCw className="h-4 w-4 animate-spin" aria-hidden /> : <Download className="h-4 w-4" aria-hidden />}
            {starting ? "Uruchamianie…" : `Aktualizuj do ${latest?.versionName ?? ""}`}
          </Button>
        </>
      }
      footerClassName="flex-col sm:flex-row"
    >
      <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
        Masz zainstalowaną wersję {installed?.versionName ?? "nieznaną"}. Żeby korzystać z rezerwacji,
        terminarza i portfela bez błędów, zainstaluj aktualizację.
      </p>
      {latest?.notes ? (
        <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{latest.notes}</p>
      ) : null}
      {starting ? (
        <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
          Pobieranie w tle — zaraz otworzy się instalator. Jeśli nic się nie dzieje, zezwól na instalację z tej
          aplikacji w ustawieniach telefonu.
        </p>
      ) : null}
    </AppModal>
  );
}
