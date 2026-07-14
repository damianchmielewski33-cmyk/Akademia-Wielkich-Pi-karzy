"use client";

import { useRouter } from "next/navigation";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type SeasonOption = {
  id: number;
  name: string;
  is_active: boolean;
};

type Props = {
  seasons: SeasonOption[];
  selectedSeasonId: number;
};

export function RankingiSeasonPicker({ seasons, selectedSeasonId }: Props) {
  const router = useRouter();

  return (
    <div className="mx-auto mt-6 max-w-md text-left">
      <Label htmlFor="ranking-season" className="text-sm font-semibold text-emerald-100/90">
        Sezon rankingu
      </Label>
      <Select
        value={String(selectedSeasonId)}
        onValueChange={(value) => {
          router.push(`/rankingi?season=${encodeURIComponent(value)}`);
        }}
      >
        <SelectTrigger id="ranking-season" className="mt-2 border-white/25 bg-black/15 text-white">
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
