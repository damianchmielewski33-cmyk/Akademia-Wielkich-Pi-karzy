"use client";

import { useEffect, useState } from "react";
import { toast } from "@/lib/app-toast";
import type { VenuePayoutRow } from "@/lib/venue-settlements";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormInput } from "@/components/ui/form-field";
import { AdminCard } from "@/components/admin-ui";

function zl(n: number) {
  return `${Number(n).toFixed(2)} zł`;
}

type VenueOverview = {
  venue_id: number;
  venue_name: string;
  commission_pct: number;
  owner_user_id: number | null;
  pending_count: number;
  pending_gross_pln: number;
  pending_fee_pln: number;
  pending_owner_pln: number;
};

type Payload = {
  venues: VenueOverview[];
  payouts: VenuePayoutRow[];
};

export function AdminSettlementsCard() {
  const [data, setData] = useState<Payload | null>(null);
  const [commissionDrafts, setCommissionDrafts] = useState<Record<number, string>>({});
  const [busyId, setBusyId] = useState<number | null>(null);

  async function load() {
    const res = await fetch("/api/admin/settlements");
    if (!res.ok) throw new Error();
    const json = (await res.json()) as Payload;
    setData(json);
    setCommissionDrafts(Object.fromEntries(json.venues.map((v) => [v.venue_id, String(v.commission_pct)])));
  }

  useEffect(() => {
    load().catch(() => toast.error("Nie udało się wczytać rozliczeń z obiektami"));
  }, []);

  async function saveCommission(venueId: number) {
    const pct = Number(commissionDrafts[venueId]);
    setBusyId(venueId);
    try {
      const res = await fetch(`/api/admin/venues/${venueId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commission_pct: pct }),
      });
      if (!res.ok) {
        toast.error("Nie zapisano prowizji");
        return;
      }
      toast.success("Zapisano prowizję");
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function closePayout(venueId: number) {
    setBusyId(venueId);
    try {
      const res = await fetch("/api/admin/settlements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ venue_id: venueId }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast.error(json.error ?? "Nie zamknięto wypłaty");
        return;
      }
      toast.success("Wypłata zamknięta — zrób przelew i oznacz jako przelaną");
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function markPaid(payoutId: number) {
    setBusyId(payoutId);
    try {
      const res = await fetch(`/api/admin/settlements/${payoutId}`, { method: "PATCH" });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast.error(json.error ?? "Nie oznaczono przelewu");
        return;
      }
      toast.success("Oznaczono jako przelane");
      await load();
    } finally {
      setBusyId(null);
    }
  }

  if (!data) return null;

  return (
    <AdminCard
      title="Rozliczenia z obiektami"
      description="Gracz płaci na HotPay akademii. Po rozegraniu terminu zamykasz wypłatę, robisz przelew i oznaczasz. Prowizja akademii jest od ceny slotu — opłata HotPay jest po stronie gracza."
    >
      <div className="space-y-4">
        {data.venues.map((venue) => (
          <article key={venue.venue_id} className="rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{venue.venue_name}</p>
                <p className="text-sm text-zinc-500">
                  Do wypłaty: {zl(venue.pending_owner_pln)} · {venue.pending_count} terminów · prowizja akademii{" "}
                  {zl(venue.pending_fee_pln)}
                </p>
              </div>
              <Button
                size="sm"
                disabled={venue.pending_count === 0 || busyId === venue.venue_id}
                onClick={() => void closePayout(venue.venue_id)}
              >
                Zamknij wypłatę
              </Button>
            </div>
            <div className="mt-3 flex max-w-xs items-end gap-2">
              <FormInput
                label="Prowizja akademii %"
                type="number"
                value={commissionDrafts[venue.venue_id] ?? ""}
                onChange={(e) => setCommissionDrafts((prev) => ({ ...prev, [venue.venue_id]: e.target.value }))}
              />
              <Button
                size="sm"
                variant="outline"
                disabled={busyId === venue.venue_id}
                onClick={() => void saveCommission(venue.venue_id)}
              >
                Zapisz
              </Button>
            </div>
          </article>
        ))}
      </div>

      <h3 className="mt-6 text-sm font-bold uppercase tracking-wide text-zinc-500">Wypłaty</h3>
      <div className="mt-2 space-y-2">
        {data.payouts.length === 0 ? (
          <p className="text-sm text-zinc-500">Brak zamkniętych wypłat.</p>
        ) : (
          data.payouts.map((payout) => (
            <article key={payout.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zinc-100 px-3 py-3 dark:border-zinc-800">
              <div>
                <p className="font-semibold">{payout.venue_name}</p>
                <p className="text-sm text-zinc-500">
                  {payout.booking_count} rezerwacji · {zl(payout.owner_payout_pln)} dla obiektu · {zl(payout.platform_fee_pln)} akademia
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge>{payout.status === "paid" ? "Przelane" : "Czeka na przelew"}</Badge>
                {payout.status !== "paid" ? (
                  <Button size="sm" variant="outline" disabled={busyId === payout.id} onClick={() => void markPaid(payout.id)}>
                    Oznacz przelew
                  </Button>
                ) : null}
              </div>
            </article>
          ))
        )}
      </div>
    </AdminCard>
  );
}
