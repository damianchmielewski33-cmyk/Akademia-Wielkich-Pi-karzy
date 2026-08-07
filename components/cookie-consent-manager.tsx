"use client";

import Link from "next/link";
import { useCookieConsent } from "@/components/adsense-provider";
import { Button } from "@/components/ui/button";

export function CookieConsentManager() {
  const { consent, resetConsent, acceptAll, rejectOptional } = useCookieConsent();

  if (consent === null) {
    return (
      <p className="mt-3 text-sm text-emerald-100/80">
        Baner zgody jest aktywny na dole strony — wybierz „Akceptuję” lub „Tylko niezbędne”.
      </p>
    );
  }

  return (
    <div className="mt-3 space-y-3 rounded-xl border border-emerald-700/40 bg-emerald-950/40 p-4">
      <p className="text-sm text-emerald-100/90">
        Aktualny wybór:{" "}
        <strong className="text-white">
          {consent.marketing ? "marketing (AdSense) włączony" : "tylko niezbędne (bez AdSense)"}
        </strong>
        .
      </p>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="pitch" size="sm" onClick={acceptAll}>
          Włącz marketing
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={rejectOptional}>
          Tylko niezbędne
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={resetConsent}>
          Pokaż baner ponownie
        </Button>
      </div>
      <p className="text-xs text-emerald-100/70">
        Szczegóły:{" "}
        <Link href="/cookies" className="underline underline-offset-2 hover:text-white">
          polityka cookies
        </Link>
        .
      </p>
    </div>
  );
}
