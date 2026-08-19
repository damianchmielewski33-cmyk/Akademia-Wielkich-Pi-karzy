"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { toast } from "@/lib/app-toast";
import { useHotpayPaymentReturn } from "@/hooks/use-hotpay-payment-return";
import type { BookingRow } from "@/lib/booking";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const statusLabel: Record<string, string> = {
  pending: "Oczekuje na płatność",
  confirmed: "Potwierdzona",
  cancelled: "Anulowana",
  expired: "Wygasła",
};

export function MyBookingsClient() {
  const searchParams = useSearchParams();
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const highlighted = Number(searchParams.get("booking") ?? 0);

  function load() {
    setLoading(true);
    fetch("/api/rezerwacje")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: { bookings: BookingRow[] }) => setBookings(data.bookings))
      .catch(() => toast.error("Nie udało się wczytać rezerwacji"))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  useHotpayPaymentReturn({
    enabled: true,
    onSettled: () => load(),
  });

  async function pay(id: number) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/rezerwacje/${id}/pay`, { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        toast.error(data.error ?? "Nie udało się rozpocząć płatności");
        return;
      }
      window.location.href = data.url;
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      {loading ? (
        <p className="text-sm text-zinc-500">Ładowanie rezerwacji...</p>
      ) : bookings.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-zinc-300 bg-white p-8 text-center text-zinc-600 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300">
          Nie masz jeszcze rezerwacji.
          <div className="mt-4">
            <Button asChild>
              <Link href="/obiekty">Znajdź boisko</Link>
            </Button>
          </div>
        </div>
      ) : (
        bookings.map((booking) => (
          <article
            key={booking.id}
            className={[
              "rounded-3xl border bg-white p-5 text-zinc-900 shadow-sm dark:bg-zinc-950 dark:text-zinc-50",
              highlighted === booking.id ? "border-[var(--mp-teal)]" : "border-zinc-200 dark:border-zinc-800",
            ].join(" ")}
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-bold">{booking.venue_name}</h2>
                  <Badge>{statusLabel[booking.status] ?? booking.status}</Badge>
                </div>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                  {booking.pitch_name} · {booking.venue_address}, {booking.venue_city}
                </p>
                <p className="mt-3 font-semibold">
                  {booking.booking_date}, {booking.start_time} - {booking.end_time}
                </p>
                <p className="text-sm text-zinc-600 dark:text-zinc-300">
                  Kwota: {Number(booking.amount_pln).toFixed(2)} zł
                </p>
              </div>
              {booking.status === "pending" ? (
                <Button onClick={() => void pay(booking.id)} disabled={busyId === booking.id}>
                  {busyId === booking.id ? "Przekierowanie..." : "Opłać"}
                </Button>
              ) : null}
            </div>
          </article>
        ))
      )}
    </div>
  );
}
