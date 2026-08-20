"use client";

import { useRouter } from "next/navigation";
import { useSiteMode } from "@/components/site-mode";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type SeasonOption = {
  id: number;
  name: string;
  is_active: boolean;
};

type Props = {
  seasons: SeasonOption[];
  selectedSeasonId: number;
  basePath?: string;
  /** Nadpisanie stylu (np. PZU Cup). Domyślnie z trybu V1/V2. */
  light?: boolean;
};

export function RankingiSeasonPicker({
  seasons,
  selectedSeasonId,
  basePath = "/rankingi",
  light: lightProp,
}: Props) {
  const router = useRouter();
  const { marketplaceEnabled } = useSiteMode();
  const light = lightProp ?? marketplaceEnabled;

  return (
    <div className={cn("mx-auto max-w-md text-left", light ? "mt-0" : "mt-6")}>
      <Label
        htmlFor="ranking-season"
        className={cn(
          "text-sm font-semibold",
          light ? "text-zinc-700 dark:text-zinc-200" : "text-emerald-100/90"
        )}
      >
        Sezon rankingu
      </Label>
      <Select
        value={String(selectedSeasonId)}
        onValueChange={(value) => {
          router.push(`${basePath}?season=${encodeURIComponent(value)}`);
        }}
      >
        <SelectTrigger
          id="ranking-season"
          className={cn(
            "mt-2",
            light
              ? "rounded-xl border-zinc-200 bg-white text-zinc-950 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
              : "border-white/25 bg-black/15 text-white"
          )}
        >
          <SelectValue placeholder="Wybierz sezon" />
        </SelectTrigger>
        <SelectContent>
          {seasons.map((s) => (
            <SelectItem key={s.id} value={String(s.id)}>
              {s.name}
              {s.is_active ? " (aktywny)" : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
