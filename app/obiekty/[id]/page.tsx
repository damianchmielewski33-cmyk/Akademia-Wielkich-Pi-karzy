import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getServerSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { WEEKDAY_LABELS_PL, getVenueWithPitches, type PitchPublic } from "@/lib/booking";
import { redirectIfBookingMarketplaceDisabled } from "@/lib/booking-marketplace";
import { BookingFlowClient } from "@/components/booking-flow-client";
import { VenueGallery } from "@/components/venue-gallery";
import { VenueMapEmbed } from "@/components/venue-map-embed";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  try {
    const db = await getDb();
    const data = await getVenueWithPitches(db, id);
    if (!data) {
      return {
        title: "Rezerwacja boiska",
        description: "Wybierz boisko, godzinę i opłać rezerwację online.",
      };
    }
    const minPrice = data.pitches.reduce(
      (min, pitch) => Math.min(min, Number(pitch.base_price_pln)),
      Number.POSITIVE_INFINITY
    );
    const priceBit = Number.isFinite(minPrice) ? ` cena od ${minPrice.toFixed(0)} zł` : "";
    return {
      title: `${data.venue.name} — rezerwacja boiska ${data.venue.city}`,
      description: `Rezerwacja orlika / hali w mieście ${data.venue.city}.${priceBit}. Godziny, oświetlenie, płatność online.`,
    };
  } catch {
    return {
      title: "Rezerwacja boiska",
      description: "Wybierz boisko, godzinę i opłać rezerwację online.",
    };
  }
}

function hoursSummary(hours: PitchPublic["opening_hours"]) {
  if (hours.length === 0) return "Godziny wkrótce";
  const first = hours[0]!;
  const same = hours.every((h) => h.opens_at === first.opens_at && h.closes_at === first.closes_at);
  if (same) return `Codziennie ${first.opens_at}–${first.closes_at}`;
  return hours
    .map((h) => `${WEEKDAY_LABELS_PL[h.weekday] ?? h.weekday}: ${h.opens_at}–${h.closes_at}`)
    .join(" · ");
}

function priceSummary(pitch: PitchPublic) {
  const lines = [`Od ${Number(pitch.base_price_pln).toFixed(0)} zł / slot`];
  for (const rule of pitch.price_rules) {
    const when = [
      rule.weekday != null ? WEEKDAY_LABELS_PL[rule.weekday] : null,
      rule.start_time && rule.end_time ? `${rule.start_time}–${rule.end_time}` : null,
    ]
      .filter(Boolean)
      .join(" ");
    lines.push(`${rule.label ?? "Cena specjalna"}${when ? ` (${when})` : ""}: ${Number(rule.price_pln).toFixed(0)} zł`);
  }
  return lines;
}

export default async function VenueDetailsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ date?: string; time?: string }>;
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  await redirectIfBookingMarketplaceDisabled();
  const [session, db] = await Promise.all([getServerSession(), getDb()]);
  const data = await getVenueWithPitches(db, id);
  if (!data) notFound();

  const userName = session
    ? [session.firstName, session.lastName].filter(Boolean).join(" ").trim() || session.zawodnik
    : "";
  const photos = data.venue.photo_urls?.length
    ? data.venue.photo_urls
    : data.venue.photo_url
      ? [data.venue.photo_url]
      : [];

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-3 py-5 xs:px-4 sm:py-10">
      <section className="mb-5 overflow-hidden rounded-2xl bg-white shadow-sm xs:rounded-3xl sm:mb-6 dark:bg-zinc-950">
        <VenueGallery photos={photos} name={data.venue.name} />
        <div className="p-4 xs:p-6 sm:p-8">
          <p className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-[var(--mp-teal-dark)] sm:text-xs">
            {data.venue.city}
          </p>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-zinc-950 xs:text-3xl sm:text-5xl dark:text-white">
            {data.venue.name}
          </h1>
          {data.venue.description ? (
            <p className="mt-3 max-w-3xl text-sm text-zinc-600 sm:text-base dark:text-zinc-300">{data.venue.description}</p>
          ) : null}
          <p className="mt-3 text-sm text-zinc-500 sm:mt-4">
            {data.venue.address}
            {data.venue.phone ? ` · tel. ${data.venue.phone}` : ""}
          </p>
          <div className="mt-4 flex flex-wrap gap-2 sm:mt-5">
            {data.pitches.some((p) => p.indoor) ? (
              <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-zinc-600">Kryte</span>
            ) : null}
            {data.pitches.some((p) => !p.indoor) ? (
              <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-zinc-600">Otwarte</span>
            ) : null}
            {data.pitches.some((p) => p.lighting) ? (
              <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-zinc-600">Oświetlenie</span>
            ) : null}
          </div>
        </div>
      </section>

      {data.pitches.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-zinc-300 bg-white p-8 text-center text-zinc-600 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300">
          Ten obiekt nie ma jeszcze aktywnych boisk do rezerwacji.
        </div>
      ) : (
        <BookingFlowClient
          venue={data.venue}
          pitches={data.pitches}
          isLoggedIn={Boolean(session)}
          userName={userName}
          initialDate={sp.date}
          initialTime={sp.time}
        />
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="text-lg font-black text-zinc-950 dark:text-white">Godziny i cennik</h2>
          <div className="mt-4 space-y-4">
            {data.pitches.length === 0 ? (
              <p className="text-sm text-zinc-500">Brak aktywnych boisk.</p>
            ) : (
              data.pitches.map((pitch) => (
                <article key={pitch.id} className="rounded-2xl border border-zinc-100 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
                  <p className="font-semibold text-zinc-950 dark:text-white">{pitch.name}</p>
                  <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">{hoursSummary(pitch.opening_hours)}</p>
                  <ul className="mt-2 space-y-1 text-sm text-zinc-600 dark:text-zinc-300">
                    {priceSummary(pitch).map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </article>
              ))
            )}
          </div>
          {data.upcoming_blocks.length > 0 ? (
            <div className="mt-5">
              <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-zinc-500">Nadchodzące blokady</h3>
              <ul className="mt-2 space-y-1 text-sm text-zinc-600 dark:text-zinc-300">
                {data.upcoming_blocks.map((block) => (
                  <li key={`${block.pitch_id}-${block.block_date}-${block.start_time}`}>
                    {block.block_date} {block.start_time}–{block.end_time} · {block.pitch_name}
                    {block.reason ? ` (${block.reason})` : ""}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
        <VenueMapEmbed address={data.venue.address} city={data.venue.city} />
      </div>
    </main>
  );
}
