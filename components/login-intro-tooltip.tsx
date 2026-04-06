"use client";

import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function LoginIntroTooltip() {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="inline-flex shrink-0 cursor-help rounded-full text-emerald-600 outline-offset-2 hover:text-emerald-700 focus-visible:ring-2 focus-visible:ring-emerald-500/50"
            aria-label="Informacja o zmianach w logowaniu"
          >
            <Info className="size-5" strokeWidth={2} />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[min(22rem,calc(100vw-2rem))] text-left leading-snug">
          <p>
            <span className="font-semibold text-zinc-100">Zmiana logowania:</span> od teraz logujesz się
            imieniem, nazwiskiem i PIN-em (4–6 cyfr). Wybór piłkarza jest potrzebny tylko przy pierwszym
            ustawieniu PIN-u lub po resecie — przyciski pod formularzem albo strona „Ustaw PIN” (/ustaw-pin).
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
