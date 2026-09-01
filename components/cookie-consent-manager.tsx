"use client";

import Link from "next/link";
import { useCookieConsent } from "@/components/adsense-provider";
import { mpInnerPanelClass } from "@/components/marketplace-section";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function CookieConsentManager() {
  const { consent, resetConsent, acceptAll, rejectOptional } = useCookieConsent();

  if (consent === null) {
    return (
      <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
        Baner zgody jest aktywny na dole strony — wybierz „Akceptuję” lub „Tylko niezbędne”.
      </p>
    );
  }

  return (
    <div className={cn(mpInnerPanelClass, "mt-3 space-y-3")}>
      <p className="text-sm text-zinc-700 dark:text-zinc-300">
        Aktualny wybór:{" "}
        <strong className="text-zinc-950 dark:text-white">
          {consent.marketing ? "marketing (AdSense) włączony" : "tylko niezbędne (bez AdSense)"}
        </strong>
        .
      </p>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="default" size="sm" className="rounded-full font-bold" onClick={acceptAll}>
          Włącz marketing
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={rejectOptional}>
          Tylko niezbędne
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={resetConsent}>
          Pokaż baner ponownie
        </Button>
      </div>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Szczegóły:{" "}
        <Link href="/cookies" className="font-medium text-[var(--mp-teal-dark)] underline underline-offset-2 hover:text-[var(--mp-teal)] dark:text-teal-300">
          polityka cookies
        </Link>
        .
      </p>
    </div>
  );
}
