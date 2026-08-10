"use client";

import Link from "next/link";
import { FlaskConical } from "lucide-react";

/** Widoczny tylko dla admina w trybie testowym — sandbox bez wpływu na graczy. */
export function TestModeBanner() {
  return (
    <div
      role="status"
      className="sticky top-0 z-[60] border-b border-amber-500/50 bg-amber-500 text-amber-950 shadow-md"
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-3 gap-y-1 px-3 py-2 text-center text-sm font-bold tracking-wide sm:justify-between sm:text-left">
        <span className="inline-flex items-center gap-2">
          <FlaskConical className="h-4 w-4 shrink-0" aria-hidden />
          TRYB TESTOWY — mecze i płatności nie dotyczą graczy
        </span>
        <Link
          href="/panel-admina"
          className="underline underline-offset-2 hover:text-amber-900"
        >
          Wyłącz
        </Link>
      </div>
    </div>
  );
}
