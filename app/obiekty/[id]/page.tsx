import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getServerSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { getVenueWithPitches } from "@/lib/booking";
import { BookingFlowClient } from "@/components/booking-flow-client";

export const metadata: Metadata = {
  title: "Rezerwacja boiska",
  description: "Wybierz boisko, godzinę i opłać rezerwację online.",
};

export default async function VenueDetailsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ date?: string; time?: string }>;
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const [session, db] = await Promise.all([getServerSession(), getDb()]);
  const data = await getVenueWithPitches(db, id);
  if (!data) notFound();

  const userName = session
    ? [session.firstName, session.lastName].filter(Boolean).join(" ").trim() || session.zawodnik
    : "";
  const mapsQuery = encodeURIComponent(`${data.venue.address}, ${data.venue.city}`);

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:py-12">
      <section className="mb-8 overflow-hidden rounded-3xl bg-white shadow-sm dark:bg-zinc-950">
        {data.venue.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={data.venue.photo_url} alt="" className="h-56 w-full object-cover sm:h-72" />
        ) : null}
        <div className="p-6 sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--mp-teal-dark)]">
            {data.venue.city}
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-zinc-950 sm:text-5xl dark:text-white">
            {data.venue.name}
          </h1>
          {data.venue.description ? (
            <p className="mt-3 max-w-3xl text-zinc-600 dark:text-zinc-300">{data.venue.description}</p>
          ) : null}
          <p className="mt-4 text-sm text-zinc-500">
            {data.venue.address}
            {data.venue.phone ? ` · tel. ${data.venue.phone}` : ""}
          </p>
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${mapsQuery}`}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-block text-sm font-semibold text-[var(--mp-teal-dark)] underline underline-offset-2"
          >
            Otwórz w Mapach Google
          </a>
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
    </main>
  );
}
