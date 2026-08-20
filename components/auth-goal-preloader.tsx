"use client";

import { AwPreloader } from "@/components/preloaders/aw-preloader";

/** Krótki komunikat sukcesu auth — bez sztucznego przedłużania. */
export const AUTH_SUCCESS_PRELOADER_DELAY_MS = 700;

export function AuthGoalPreloader({ label }: { label?: string }) {
  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-[var(--background)]/95 px-4 backdrop-blur-sm"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="awp-preloader-shell w-full max-w-sm">
        <p className="awp-preloader-shell__kicker">Konto</p>
        <h2 className="awp-preloader-shell__title text-xl sm:text-2xl">
          {label ?? "Gotowe — przekierowujemy…"}
        </h2>
        <div className="awp-preloader-shell__body pt-2">
          <AwPreloader />
        </div>
        <div className="awp-preloader-shell__rule" aria-hidden />
      </div>
    </div>
  );
}
