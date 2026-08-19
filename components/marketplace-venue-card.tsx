import Link from "next/link";
import { MapPin } from "lucide-react";
import type { VenueCard } from "@/lib/booking";
import { cn } from "@/lib/utils";

type Props = {
  venue: VenueCard;
  href?: string;
  className?: string;
};

function surfaceLabel(surfaces: string | null) {
  if (!surfaces) return "Piłka nożna";
  const first = surfaces.split(",")[0]?.trim();
  if (first === "sztuczna") return "Sztuczna trawa";
  if (first === "parkiet") return "Parkiet";
  if (first === "tartan") return "Tartan";
  return first || "Piłka nożna";
}

export function MarketplaceVenueCard({ venue, href, className }: Props) {
  const to = href ?? `/obiekty/${venue.slug}`;
  return (
    <Link href={to} className={cn("mp-venue-card group block min-w-[16.5rem] text-left", className)}>
      <div className="relative h-44 overflow-hidden bg-zinc-200">
        {venue.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={venue.photo_url} alt="" className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-zinc-800 via-zinc-700 to-[var(--mp-teal-dark)] text-white">
            <MapPin className="h-10 w-10 opacity-80" aria-hidden />
          </div>
        )}
      </div>
      <div className="space-y-2 p-4">
        <p className="truncate text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
          {venue.city}
          {venue.address ? ` · ${venue.address}` : ""}
        </p>
        <h3 className="line-clamp-2 text-lg font-black tracking-tight text-zinc-950 dark:text-white">
          {venue.name}
        </h3>
        <p className="text-sm text-zinc-500">
          {venue.pitch_count} {venue.pitch_count === 1 ? "boisko" : "boisk"}
        </p>
        <p className="mp-price text-2xl">
          {venue.min_price_pln != null ? `${venue.min_price_pln.toFixed(0)} zł` : "Cennik wkrótce"}
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-[0.7rem] font-bold uppercase tracking-wide text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
            {surfaceLabel(venue.surfaces)}
          </span>
          <span className="rounded-full bg-[var(--mp-teal)]/12 px-2.5 py-1 text-[0.7rem] font-bold uppercase tracking-wide text-[var(--mp-teal-dark)]">
            Rezerwacja online
          </span>
        </div>
      </div>
    </Link>
  );
}
