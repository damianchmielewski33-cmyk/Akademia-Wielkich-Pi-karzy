"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AWP_SITE_NAME,
  GYMBRAT_SITE_NAME,
  getGymBratCrossLink,
} from "@/lib/sister-sites";
import { isRunningInAppWebView } from "@/lib/app-webview";

/**
 * GymBrat w shellu AWP.
 * W APK WebView ładujemy GymBrat top-level (iframe + X-Frame-Options bywa problematyczne).
 * W zwykłej przeglądarce — pełnoekranowy iframe (wymaga frame-ancestors po stronie GymBrat).
 */
export function GymBratEmbedView() {
  const searchParams = useSearchParams();
  const path = searchParams.get("path")?.trim() || "/";
  const sisterPath = path.startsWith("/") ? path : `/${path}`;
  const src = getGymBratCrossLink(sisterPath);
  const [inAppWebView, setInAppWebView] = useState(false);

  useEffect(() => {
    const appWv = isRunningInAppWebView();
    setInAppWebView(appWv);
    if (appWv) {
      window.location.replace(src);
    }
  }, [src]);

  if (inAppWebView) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-zinc-950 px-6 text-center">
        <p className="text-sm text-zinc-300">Otwieranie {GYMBRAT_SITE_NAME}…</p>
        <Button asChild className="rounded-full font-bold">
          <a href={src}>Kontynuuj</a>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col bg-zinc-950">
      <header className="flex shrink-0 items-center gap-3 border-b border-white/10 bg-zinc-950/95 px-3 py-2.5 backdrop-blur-sm sm:px-4">
        <Link
          href="/"
          className="awp-focus-ring inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-semibold text-white/85 hover:bg-white/10 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
          {AWP_SITE_NAME}
        </Link>
        <span className="text-white/30" aria-hidden>
          /
        </span>
        <span className="truncate text-sm font-bold text-white">{GYMBRAT_SITE_NAME}</span>
        <Button
          asChild
          size="sm"
          variant="outline"
          className="ml-auto rounded-full border-white/20 bg-transparent text-xs text-white hover:bg-white/10"
        >
          <a href={src} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="mr-1.5 h-3.5 w-3.5" aria-hidden />
            Otwórz w nowej karcie
          </a>
        </Button>
      </header>
      <iframe
        title={GYMBRAT_SITE_NAME}
        src={src}
        className="min-h-0 w-full flex-1 border-0 bg-zinc-950"
        allow="clipboard-write"
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </div>
  );
}
