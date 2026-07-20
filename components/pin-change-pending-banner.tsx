"use client";

import Link from "next/link";
import { KeyRound } from "lucide-react";

export function PinChangePendingBanner() {
  return (
    <div
      className="border-b border-amber-400/40 bg-amber-950/85 px-4 py-3 text-center text-sm text-amber-50"
      role="status"
    >
      <KeyRound className="mr-1.5 inline h-4 w-4 align-text-bottom text-amber-300" aria-hidden />
      <strong>Zmiana PIN-u oczekuje na zatwierdzenie przez administratora.</strong> Do tego czasu masz dostęp
      tylko do podstawowych stron (bez zapisów na mecz i edycji profilu).{" "}
      <Link href="/kontakt" className="font-semibold underline decoration-amber-300/50 underline-offset-2">
        Napisz do organizatora
      </Link>
      , jeśli to pilne.
    </div>
  );
}
