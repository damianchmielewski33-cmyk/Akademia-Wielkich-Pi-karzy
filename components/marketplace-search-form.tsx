import { Clock, MapPin, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Defaults = {
  city?: string;
  q?: string;
  date?: string;
  time?: string;
  surface?: string;
  indoor?: string;
  max_price?: string;
};

type Props = {
  defaults?: Defaults;
  variant?: "hero" | "page";
  className?: string;
};

const fieldInputClass =
  "h-11 w-full bg-transparent text-base font-semibold text-zinc-900 outline-none placeholder:text-zinc-400 md:h-8 md:text-sm";

export function MarketplaceSearchForm({ defaults = {}, variant = "hero", className }: Props) {
  if (variant === "hero") {
    return (
      <form action="/obiekty" className={cn("mp-search-pill p-2 md:p-1.5", className)}>
        <label className="mp-search-field relative min-w-0 px-3 py-2 xs:px-4">
          <span className="block text-[0.65rem] font-bold uppercase tracking-[0.14em] text-zinc-400">
            Lokalizacja
          </span>
          <span className="flex items-center gap-2">
            <MapPin className="h-4 w-4 shrink-0 text-zinc-400" aria-hidden />
            <input
              name="city"
              defaultValue={defaults.city ?? ""}
              placeholder="Miasto"
              className={fieldInputClass}
            />
          </span>
        </label>
        <label className="mp-search-field relative min-w-0 px-3 py-2 xs:px-4">
          <span className="block text-[0.65rem] font-bold uppercase tracking-[0.14em] text-zinc-400">
            Data
          </span>
          <input
            name="date"
            type="date"
            defaultValue={defaults.date ?? ""}
            className={fieldInputClass}
          />
        </label>
        <label className="relative min-w-0 px-3 py-2 xs:px-4">
          <span className="block text-[0.65rem] font-bold uppercase tracking-[0.14em] text-zinc-400">
            Godzina
          </span>
          <span className="flex items-center gap-2">
            <Clock className="h-4 w-4 shrink-0 text-zinc-400" aria-hidden />
            <input
              name="time"
              type="time"
              step={3600}
              defaultValue={defaults.time ?? ""}
              className={fieldInputClass}
            />
          </span>
        </label>
        <Button
          type="submit"
          className="h-12 w-full rounded-full px-8 text-sm font-black uppercase tracking-[0.12em] md:w-auto"
        >
          Szukaj
        </Button>
      </form>
    );
  }

  return (
    <form
      action="/obiekty"
      className={cn(
        "grid gap-3 rounded-3xl bg-white p-3 shadow-lg sm:grid-cols-2 lg:grid-cols-6",
        className
      )}
    >
      <label className="relative lg:col-span-2">
        <span className="sr-only">Miasto</span>
        <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        <input
          name="city"
          defaultValue={defaults.city ?? ""}
          placeholder="Miasto"
          className="h-12 w-full rounded-xl border border-zinc-200 bg-white pl-9 pr-3 text-base sm:h-11 sm:text-sm"
        />
      </label>
      <label className="relative lg:col-span-2">
        <span className="sr-only">Nazwa lub adres</span>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        <input
          name="q"
          defaultValue={defaults.q ?? ""}
          placeholder="Nazwa obiektu lub adres"
          className="h-12 w-full rounded-xl border border-zinc-200 bg-white pl-9 pr-3 text-base sm:h-11 sm:text-sm"
        />
      </label>
      <input
        name="date"
        type="date"
        defaultValue={defaults.date ?? ""}
        className="h-12 w-full rounded-xl border border-zinc-200 px-3 text-base sm:h-11 sm:text-sm"
      />
      <input
        name="time"
        type="time"
        step={3600}
        defaultValue={defaults.time ?? ""}
        className="h-12 w-full rounded-xl border border-zinc-200 px-3 text-base sm:h-11 sm:text-sm"
        aria-label="Godzina"
      />
      <select
        name="surface"
        defaultValue={defaults.surface ?? ""}
        className="h-12 w-full rounded-xl border border-zinc-200 px-3 text-base sm:h-11 sm:text-sm"
      >
        <option value="">Każda nawierzchnia</option>
        <option value="sztuczna">Sztuczna trawa</option>
        <option value="parkiet">Parkiet</option>
        <option value="tartan">Tartan</option>
      </select>
      <select
        name="indoor"
        defaultValue={defaults.indoor ?? ""}
        className="h-12 w-full rounded-xl border border-zinc-200 px-3 text-base sm:h-11 sm:text-sm"
      >
        <option value="">Kryte i otwarte</option>
        <option value="1">Tylko kryte</option>
        <option value="0">Tylko otwarte</option>
      </select>
      <input
        name="max_price"
        type="number"
        min={0}
        defaultValue={defaults.max_price ?? ""}
        placeholder="Max. cena zł"
        className="h-12 w-full rounded-xl border border-zinc-200 px-3 text-base sm:h-11 sm:text-sm"
      />
      <Button
        type="submit"
        className="h-12 w-full font-black uppercase tracking-[0.12em] sm:h-11 lg:col-span-2"
      >
        Szukaj
      </Button>
    </form>
  );
}
