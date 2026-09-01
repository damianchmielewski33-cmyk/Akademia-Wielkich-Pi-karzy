"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import {
  AWP_SITE_NAME,
  GYMBRAT_SITE_NAME,
  getGymBratCrossLink,
} from "@/lib/sister-sites";

/** Pełnoekranowy iframe GymBrat w shellu AWP (APK + RWD). */
export function GymBratEmbedView() {
  const searchParams = useSearchParams();
  const path = searchParams.get("path")?.trim() || "/";
  const src = getGymBratCrossLink(path.startsWith("/") ? path : `/${path}`);

  return (
    <div className="flex min-h-[calc(100dvh-3.5rem)] flex-col bg-zinc-950 md:min-h-[calc(100dvh-4rem)]">
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
