import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth";
import { redirectIfBookingMarketplaceDisabled } from "@/lib/booking-marketplace";
import { getDb } from "@/lib/db";
import { isVenuePartner } from "@/lib/venue-partners";
import { PartnerDashboardClient } from "@/components/partner-dashboard-client";

export const metadata: Metadata = {
  title: "Panel partnera",
  description: "Zarządzaj obiektem, cennikiem i wolnymi terminami.",
};

export default async function PartnerDashboardPage() {
  await redirectIfBookingMarketplaceDisabled();
  const session = await getServerSession();
  if (!session) redirect("/login?next=/partner");
  const db = await getDb();
  if (!(await isVenuePartner(db, session.userId))) {
    redirect("/");
  }
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:py-12">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--mp-teal-dark)]">
        Partner obiektu
      </p>
      <h1 className="mt-2 text-3xl font-black tracking-tight text-zinc-950 sm:text-4xl dark:text-white">
        Twój obiekt, Twoje terminy, Twój cennik.
      </h1>
      <p className="mt-3 max-w-2xl text-zinc-600 dark:text-zinc-300">
        Dodaj boiska, ustaw godziny dostępności (to są wolne sloty dla graczy), ceny weekend/szczyt
        i blokady. Po rozegraniu terminu Twoja część wpada do rozliczenia — akademia robi przelew.
      </p>
      <div className="mt-8">
        <PartnerDashboardClient />
      </div>
    </main>
  );
}
