"use client";

import Link from "next/link";
import { useCookieConsent } from "@/components/adsense-provider";

export function CookieConsentBanner() {
  const { consent, acceptAll, rejectOptional } = useCookieConsent();

  if (consent !== null) return null;

  return (
    <div
      role="dialog"
      aria-labelledby="awp-cookie-title"
      aria-describedby="awp-cookie-desc"
      className="fixed inset-x-0 bottom-0 z-[80] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-4"
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-4 text-zinc-700 shadow-[0_20px_50px_-20px_rgba(15,23,42,0.35)] sm:flex-row sm:items-end sm:gap-4 sm:p-5">
        <div className="min-w-0 flex-1 space-y-1.5">
          <p id="awp-cookie-title" className="text-sm font-semibold text-zinc-950">
            Cookies
          </p>
          <p id="awp-cookie-desc" className="text-xs leading-relaxed text-zinc-600 sm:text-sm">
            Ta strona używa plików cookies. Szczegóły znajdziesz w{" "}
            <Link href="/cookies" className="font-medium text-[var(--mp-teal-dark)] underline underline-offset-2">
              polityce cookies
            </Link>
            .
          </p>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={rejectOptional}
            className="awp-focus-ring rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
          >
            Tylko niezbędne
          </button>
          <button
            type="button"
            onClick={acceptAll}
            className="awp-focus-ring rounded-xl bg-[var(--mp-teal)] px-4 py-2.5 text-sm font-black uppercase tracking-[0.08em] text-white transition hover:bg-[var(--mp-teal-dark)]"
          >
            Akceptuję
          </button>
        </div>
      </div>
    </div>
  );
}
