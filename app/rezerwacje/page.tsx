import type { Metadata } from "next";
import { Suspense } from "react";
import { getServerSession } from "@/lib/auth";
import { redirectIfBookingMarketplaceDisabled } from "@/lib/booking-marketplace";
import { MyBookingsClient } from "@/components/my-bookings-client";

export const metadata: Metadata = {
  title: "Moje rezerwacje",
  description: "Status rezerwacji orlika i hali — bez PIN-u akademii.",
};

export default async function RezerwacjePage() {
  await redirectIfBookingMarketplaceDisabled();
  const session = await getServerSession();

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:py-12">
      <section className="mb-6">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--mp-teal-dark)]">
          Rezerwacja boiska
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-zinc-950 sm:text-5xl dark:text-white">
          Moje rezerwacje
        </h1>
        <p className="mt-3 max-w-2xl text-zinc-500">
          {session
            ? "Sprawdzaj status płatności i historię wynajmu."
            : "Potwierdzenie jest na e-mailu. Ta przeglądarka pamięta ostatnią rezerwację — bez logowania PIN-em akademii."}
        </p>
      </section>
      <Suspense fallback={<p className="text-sm text-zinc-500">Ładowanie...</p>}>
        <MyBookingsClient />
      </Suspense>
    </main>
  );
}
