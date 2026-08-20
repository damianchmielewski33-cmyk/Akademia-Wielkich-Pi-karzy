"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { toast } from "@/lib/app-toast";
import { useHotpayPaymentReturn } from "@/hooks/use-hotpay-payment-return";
import type { BookingRow } from "@/lib/booking-shared";
import { BOOKING_FREE_CANCEL_HOURS, formatPlDateTime } from "@/lib/booking-shared";
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
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const highlighted = Number(searchParams.get("booking") ?? 0);
  const token = searchParams.get("token")?.trim() ?? "";

  function load() {
    setLoading(true);
    fetch(`/api/rezerwacje${token ? `?token=${encodeURIComponent(token)}` : ""}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: { bookings: BookingRow[] }) => setBookings(data.bookings))
      .catch(() => toast.error("Nie udało się wczytać rezerwacji"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    if (!token) return;
    const next = new URL(window.location.href);
    next.searchParams.delete("token");
    window.history.replaceState({}, "", `${next.pathname}${next.search}${next.hash}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- token z maila ma wejść tylko raz
  }, [token]);

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

  async function cancel(id: number) {
    setCancellingId(id);
    try {
      const res = await fetch(`/api/rezerwacje/${id}/cancel`, { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast.error(data.error ?? "Nie udało się anulować rezerwacji");
        return;
      }
      toast.success("Rezerwacja anulowana. Slot wrócił do grafiku.");
      load();
    } finally {
      setCancellingId(null);
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
                {booking.status === "pending" || booking.status === "confirmed" ? (
                  <p className="mt-2 text-sm text-zinc-500">
                    {booking.can_cancel
                      ? `Możesz anulować do ${booking.cancel_until ? formatPlDateTime(booking.cancel_until) : `${BOOKING_FREE_CANCEL_HOURS} godz. przed startem`}.`
                      : `Termin wycofania minął (${BOOKING_FREE_CANCEL_HOURS} godz. przed startem). W sprawie zmian skontaktuj się z organizatorem.`}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-col gap-2">
                {booking.status === "pending" ? (
                  <Button onClick={() => void pay(booking.id)} disabled={busyId === booking.id}>
                    {busyId === booking.id ? "Przekierowanie..." : "Opłać"}
                  </Button>
                ) : null}
                {booking.can_cancel ? (
                  <Button
                    variant="outline"
                    onClick={() => void cancel(booking.id)}
                    disabled={cancellingId === booking.id}
                  >
                    {cancellingId === booking.id ? "Anulowanie..." : "Anuluj rezerwację"}
                  </Button>
                ) : null}
              </div>
            </div>
          </article>
        ))
      )}
    </div>
  );
}
