import type { Metadata } from "next";
import Link from "next/link";
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
          {sp.city ? `Boiska w mieście ${sp.city}` : "Znajdź wolne boisko"}
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-zinc-500 sm:text-base">
          Jak na rynku: miasto, dzień, godzina, potem karta obiektu i slot wolny/zajęty.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {[
            { href: "/obiekty", label: "Wszystkie", active: !sp.city && sp.indoor !== "1" && sp.indoor !== "0" },
            { href: "/obiekty?city=Warszawa", label: "Warszawa", active: sp.city === "Warszawa" },
            { href: "/obiekty?city=Kraków", label: "Kraków", active: sp.city === "Kraków" },
            { href: "/obiekty?city=Wrocław", label: "Wrocław", active: sp.city === "Wrocław" },
            { href: "/obiekty?indoor=1", label: "Hale", active: sp.indoor === "1" },
            { href: "/obiekty?indoor=0", label: "Otwarte", active: sp.indoor === "0" },
          ].map((chip) => (
            <Link
              key={chip.href}
              href={chip.href}
              className={
                chip.active
                  ? "rounded-full border border-[var(--mp-teal)] bg-[var(--mp-teal)] px-3 py-1.5 text-sm font-semibold text-white"
                  : "rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-sm font-semibold text-zinc-700 hover:border-[var(--mp-teal)] hover:text-[var(--mp-teal-dark)]"
              }
            >
              {chip.label}
            </Link>
          ))}
        </div>
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

      <p className="mt-6 text-sm font-semibold text-zinc-500">
        {venues.length === 1 ? "1 obiekt" : `${venues.length} obiektów`}
      </p>
      <section className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {venues.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-zinc-300 bg-white p-8 text-center text-zinc-600 sm:col-span-2 lg:col-span-3 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300">
            Brak obiektów dla wybranych filtrów. Zmień miasto albo godzinę.
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
