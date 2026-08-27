import type { Metadata } from "next";
import Link from "next/link";
import { listVenueCards } from "@/lib/booking";
import { redirectIfBookingMarketplaceDisabled } from "@/lib/booking-marketplace";
import { getDb } from "@/lib/db";
import { MarketplaceSearchForm } from "@/components/marketplace-search-form";
import { MarketplaceVenueCard } from "@/components/marketplace-venue-card";

export const metadata: Metadata = {
  title: "Rezerwacja orlika i hali",
  description: "Znajdź orlik albo halę: miasto, godzina, cena od, oświetlenie. Rezerwacja i płatność online.",
};

export default async function VenuesPage({
  searchParams,
}: {
  searchParams: Promise<{ city?: string; q?: string; date?: string; time?: string; surface?: string; indoor?: string; max_price?: string }>;
}) {
  const sp = await searchParams;
  await redirectIfBookingMarketplaceDisabled();
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
    <main className="mx-auto w-full max-w-6xl flex-1 px-3 py-6 xs:px-4 sm:py-12">
      <section>
        <p className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-[var(--mp-teal-dark)] sm:text-xs">
          Rezerwacja boisk
        </p>
        <h1 className="mt-2 text-2xl font-black tracking-tight text-zinc-950 xs:text-3xl sm:text-5xl dark:text-white">
          {sp.city ? `Boiska w mieście ${sp.city}` : "Znajdź wolne boisko"}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-500 sm:mt-3 sm:text-base">
          Jak na rynku: miasto, dzień, godzina, potem karta obiektu i slot wolny/zajęty.
        </p>
        <div className="mp-h-scroll -mx-3 mt-4 gap-2 px-3 xs:-mx-4 xs:px-4 md:flex-wrap md:overflow-visible">
          {[
            { href: "/obiekty", label: "Wszystkie", active: !sp.city && sp.indoor !== "1" && sp.indoor !== "0" },
            { href: "/obiekty?city=Warszawa", label: "Warszawa", active: sp.city === "Warszawa" },
            { href: "/obiekty?city=Kraków", label: "Kraków", active: sp.city === "Kraków" },
            { href: "/obiekty?city=Wrocław", label: "Wrocław", active: sp.city === "Wrocław" },
            { href: "/obiekty?city=Poznań", label: "Poznań", active: sp.city === "Poznań" },
            { href: "/obiekty?city=Gdańsk", label: "Gdańsk", active: sp.city === "Gdańsk" },
            { href: "/obiekty?indoor=1", label: "Hale", active: sp.indoor === "1" },
            { href: "/obiekty?indoor=0", label: "Otwarte", active: sp.indoor === "0" },
          ].map((chip) => (
            <Link
              key={chip.href}
              href={chip.href}
              className={
                chip.active
                  ? "shrink-0 rounded-full border border-[var(--mp-teal)] bg-[var(--mp-teal)] px-3.5 py-2 text-sm font-semibold text-white"
                  : "shrink-0 rounded-full border border-zinc-200 bg-white px-3.5 py-2 text-sm font-semibold text-zinc-700 hover:border-[var(--mp-teal)] hover:text-[var(--mp-teal-dark)]"
              }
            >
              {chip.label}
            </Link>
          ))}
        </div>
        <details className="mt-5 rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm md:hidden dark:border-zinc-800 dark:bg-zinc-950">
          <summary className="cursor-pointer list-none text-sm font-bold text-zinc-950 dark:text-white [&::-webkit-details-marker]:hidden">
            Szukaj i filtruj
          </summary>
          <div className="mt-3">
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
        </details>
        <div className="mt-6 hidden md:block">
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

      <p className="mt-5 text-sm font-semibold text-zinc-500 sm:mt-6">
        {venues.length === 1 ? "1 obiekt" : `${venues.length} obiektów`}
      </p>
      <section className="mt-3 grid gap-4 sm:mt-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
        {venues.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-zinc-300 bg-white p-6 text-center text-zinc-600 sm:col-span-2 sm:p-8 lg:col-span-3 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300">
            Brak obiektów dla wybranych filtrów. Priorytet katalogu: 5–15 hal w Warszawie ze zdjęciami i cennikiem.{" "}
            <Link href="/dla-obiektow" className="font-semibold text-[var(--mp-teal-dark)] underline">
              Zgłoś halę
            </Link>
            .
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
