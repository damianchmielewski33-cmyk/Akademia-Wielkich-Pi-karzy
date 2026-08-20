"use client";

import { useEffect, useState } from "react";
import { toast } from "@/lib/app-toast";
import type { SettlementLine, VenuePayoutRow } from "@/lib/venue-settlements";
import { Badge } from "@/components/ui/badge";

function zl(n: number) {
  return `${Number(n).toFixed(2)} zł`;
}

type Payload = {
  pending: {
    booking_count: number;
    gross_pln: number;
    platform_fee_pln: number;
    owner_payout_pln: number;
    lines: SettlementLine[];
  };
  payouts: VenuePayoutRow[];
};

export function PartnerSettlementsCard() {
  const [data, setData] = useState<Payload | null>(null);

  useEffect(() => {
    fetch("/api/partner/settlements")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setData)
      .catch(() => toast.error("Nie udało się wczytać rozliczeń"));
  }, []);

  if (!data) return null;

  return (
    <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <h2 className="text-lg font-black">Rozliczenie z akademią</h2>
      <p className="mt-1 text-sm text-zinc-500">
        Gracz płaci akademii. Twoja część schodzi po rozegraniu terminu — akademia robi przelew i oznacza go tutaj.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl bg-zinc-50 p-4 dark:bg-zinc-900">
          <p className="text-xs font-bold uppercase tracking-wide text-zinc-500">Do wypłaty</p>
          <p className="mt-1 text-2xl font-black">{zl(data.pending.owner_payout_pln)}</p>
          <p className="text-sm text-zinc-500">{data.pending.booking_count} terminów</p>
        </div>
        <div className="rounded-2xl bg-zinc-50 p-4 dark:bg-zinc-900">
          <p className="text-xs font-bold uppercase tracking-wide text-zinc-500">Prowizja akademii</p>
          <p className="mt-1 text-2xl font-black">{zl(data.pending.platform_fee_pln)}</p>
        </div>
        <div className="rounded-2xl bg-zinc-50 p-4 dark:bg-zinc-900">
          <p className="text-xs font-bold uppercase tracking-wide text-zinc-500">Obrót (cena slotu)</p>
          <p className="mt-1 text-2xl font-black">{zl(data.pending.gross_pln)}</p>
        </div>
      </div>
      {data.pending.lines.length > 0 ? (
        <ul className="mt-4 space-y-2 text-sm">
          {data.pending.lines.map((line) => (
            <li key={line.booking_id} className="flex flex-wrap justify-between gap-2 rounded-xl border border-zinc-100 px-3 py-2 dark:border-zinc-800">
              <span>
                {line.booking_date} {line.start_time} · {line.venue_name} / {line.pitch_name}
              </span>
              <span className="font-semibold">
                {zl(line.owner_payout_pln)}
                <span className="ml-2 text-zinc-400">z {zl(line.amount_pln)}</span>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-zinc-500">Brak zakończonych rezerwacji czekających na przelew.</p>
      )}

      <h3 className="mt-6 text-sm font-bold uppercase tracking-wide text-zinc-500">Historia wypłat</h3>
      <div className="mt-2 space-y-2">
        {data.payouts.length === 0 ? (
          <p className="text-sm text-zinc-500">Jeszcze nie było przelewu.</p>
        ) : (
          data.payouts.map((payout) => (
            <article key={payout.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zinc-100 px-3 py-3 dark:border-zinc-800">
              <div>
                <p className="font-semibold">{payout.venue_name}</p>
                <p className="text-sm text-zinc-500">
                  {payout.booking_count} rezerwacji · {payout.created_at.slice(0, 10)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge>{payout.status === "paid" ? "Przelane" : "Czeka na przelew"}</Badge>
                <span className="font-black">{zl(payout.owner_payout_pln)}</span>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
