"use client";

import { useEffect } from "react";
import { markAndroidColdStartPreloadersDone } from "@/components/startup-splash";
import { isInstalledAndroidAppClient } from "@/lib/app-webview";

/**
 * Po cold starcie w WebView Androida odblokuj zwykłe preloadery tras
 * (natywny splash już je zastąpił przy otwarciu).
 */
export function AndroidColdStartPreloaderUnlock() {
  useEffect(() => {
    if (!isInstalledAndroidAppClient()) return;
    const id = window.setTimeout(() => {
      markAndroidColdStartPreloadersDone();
    }, 2800);
    return () => window.clearTimeout(id);
  }, []);

  return null;
}
