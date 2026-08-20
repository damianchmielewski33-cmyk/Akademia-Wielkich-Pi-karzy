import Link from "next/link";
import Image from "next/image";
import { MapPin } from "lucide-react";
import type { VenueCard } from "@/lib/booking-shared";
import { canOptimizeMarketplacePhoto } from "@/lib/marketplace-photos";
import { siteAssetNeedsUnoptimized } from "@/lib/site-assets";
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
  const photo = venue.photo_url;
  return (
    <Link href={to} className={cn("mp-venue-card group block min-w-[16.5rem] text-left", className)}>
      <div className="relative h-48 overflow-hidden bg-zinc-200">
        {photo && canOptimizeMarketplacePhoto(photo) ? (
          <Image
            src={photo}
            alt=""
            fill
            sizes="(max-width: 640px) 85vw, (max-width: 1024px) 45vw, 280px"
            className="object-cover transition duration-300 group-hover:scale-[1.03]"
            unoptimized={siteAssetNeedsUnoptimized(photo)}
          />
        ) : photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt="" className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-zinc-800 via-zinc-700 to-[var(--mp-teal-dark)] text-white">
            <MapPin className="h-10 w-10 opacity-80" aria-hidden />
          </div>
        )}
        <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-[0.7rem] font-black uppercase tracking-wide text-zinc-800 shadow-sm">
          {venue.city}
        </span>
        <span className="absolute inset-x-3 bottom-3 translate-y-2 rounded-full bg-[var(--mp-teal)] px-3 py-2 text-center text-xs font-black uppercase tracking-wide text-white opacity-0 shadow-lg transition group-hover:translate-y-0 group-hover:opacity-100">
          Rezerwuj
        </span>
      </div>
      <div className="space-y-2 p-4">
        <p className="truncate text-xs font-semibold text-zinc-500">
          <MapPin className="mr-1 inline h-3.5 w-3.5" aria-hidden />
          {venue.address}
        </p>
        <h3 className="line-clamp-2 text-lg font-black tracking-tight text-zinc-950 dark:text-white">
          {venue.name}
        </h3>
        <p className="mp-price text-xl">
          {venue.min_price_pln != null ? (
            <>
              od {venue.min_price_pln.toFixed(0)} zł
              <span className="text-sm font-semibold text-zinc-400"> / godz.</span>
            </>
          ) : (
            "Cennik wkrótce"
          )}
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-[0.7rem] font-bold uppercase tracking-wide text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
            {surfaceLabel(venue.surfaces)}
          </span>
          {venue.has_indoor ? (
            <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-[0.7rem] font-bold uppercase tracking-wide text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
              Kryte
            </span>
          ) : null}
          {venue.has_outdoor ? (
            <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-[0.7rem] font-bold uppercase tracking-wide text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
              Otwarte
            </span>
          ) : null}
          {venue.has_lighting ? (
            <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-[0.7rem] font-bold uppercase tracking-wide text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
              Światło
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
