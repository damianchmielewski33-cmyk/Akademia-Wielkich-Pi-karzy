import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getServerSession } from "@/lib/auth";
import { MyBookingsClient } from "@/components/my-bookings-client";

export const metadata: Metadata = {
  title: "Moje rezerwacje",
  description: "Historia i status rezerwacji boisk.",
};

export default async function RezerwacjePage() {
  const session = await getServerSession();
  if (!session) redirect("/login?next=/rezerwacje");

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:py-12">
      <section className="mb-6">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--mp-teal-dark)]">
          Konto gracza
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-zinc-950 sm:text-5xl dark:text-white">
          Moje rezerwacje
        </h1>
        <p className="mt-3 max-w-2xl text-zinc-500">
          Sprawdzaj status płatności, wracaj do nieopłaconych terminów i miej historię wynajmu w jednym miejscu.
        </p>
      </section>
      <Suspense fallback={<p className="text-sm text-zinc-500">Ładowanie...</p>}>
        <MyBookingsClient />
      </Suspense>
    </main>
  );
}
