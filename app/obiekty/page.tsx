import type { Metadata } from "next";
import { listVenueCards } from "@/lib/booking";
import { getDb } from "@/lib/db";
import { MarketplaceSearchForm } from "@/components/marketplace-search-form";
import { MarketplaceVenueCard } from "@/components/marketplace-venue-card";

export const metadata: Metadata = {
  title: "Obiekty i boiska",
  description: "Znajdź obiekt sportowy i zarezerwuj boisko online.",
};

export default async function VenuesPage({
  searchParams,
}: {
  searchParams: Promise<{ city?: string; q?: string; date?: string; time?: string; surface?: string; indoor?: string; max_price?: string }>;
}) {
  const sp = await searchParams;
  const db = await getDb();
  const venues = await listVenueCards(db, {
    city: sp.city,
    query: sp.q,
    date: sp.date,
    time: sp.time,
    surface: sp.surface,
    indoor: sp.indoor === "1" ? true : sp.indoor === "0" ? false : null,
    maxPrice: sp.max_price ? Number(sp.max_price) : null,
  });
  const detailsQuery = new URLSearchParams();
  if (sp.date) detailsQuery.set("date", sp.date);
  if (sp.time) detailsQuery.set("time", sp.time);
  const suffix = detailsQuery.toString() ? `?${detailsQuery.toString()}` : "";

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:py-12">
      <section>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--mp-teal-dark)]">
          Rezerwacja boisk
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-zinc-950 sm:text-5xl dark:text-white">
          Wybierz obiekt i zarezerwuj wolny termin.
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-zinc-500 sm:text-base">
          Filtruj po mieście, dacie, godzinie i cenie, potem kliknij kartę obiektu i zarezerwuj slot.
        </p>
        <div className="mt-6">
          <MarketplaceSearchForm
            variant="page"
            defaults={{
              city: sp.city,
              q: sp.q,
              date: sp.date,
              time: sp.time,
              surface: sp.surface,
              indoor: sp.indoor,
              max_price: sp.max_price,
            }}
          />
        </div>
      </section>

      <section className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {venues.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-zinc-300 bg-white p-8 text-center text-zinc-600 sm:col-span-2 lg:col-span-3 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300">
            Brak obiektów dla wybranych filtrów. Dodaj obiekt w panelu admina albo zmień wyszukiwanie.
          </div>
        ) : (
          venues.map((venue) => (
            <MarketplaceVenueCard
              key={venue.id}
              venue={venue}
              href={`/obiekty/${venue.slug}${suffix}`}
              className="min-w-0"
            />
          ))
        )}
      </section>
    </main>
  );
}
