"use client";

import { AndroidContentReadySignal } from "@/components/android-content-ready-signal";

/** Sygnał gotowości ekranu logowania dla splash Androida / WebView. */
export function LoginContentReady() {
  return <AndroidContentReadySignal />;
}
