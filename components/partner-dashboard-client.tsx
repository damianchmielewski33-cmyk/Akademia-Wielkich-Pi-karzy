"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "@/lib/app-toast";
import type { AdminPitchRow, BookingRow, VenueCard } from "@/lib/booking";
import { Button } from "@/components/ui/button";
import { FormInput, FormTextarea } from "@/components/ui/form-field";
import { Badge } from "@/components/ui/badge";
import { PartnerWeekCalendar } from "@/components/partner-week-calendar";
import { PartnerSettlementsCard } from "@/components/partner-settlements-card";

type VenueForm = {
  name: string;
  city: string;
  address: string;
  description: string;
  phone: string;
  photo_1: string;
  photo_2: string;
  photo_3: string;
};

type PitchForm = {
  venue_id: string;
  name: string;
  surface: string;
  players: string;
  base_price_pln: string;
  weekend_price_pln: string;
  peak_price_pln: string;
  peak_start: string;
  peak_end: string;
  slot_minutes: string;
  opens_at: string;
  closes_at: string;
};

const initialVenue: VenueForm = {
  name: "",
  city: "",
  address: "",
  description: "",
  phone: "",
  photo_1: "",
  photo_2: "",
  photo_3: "",
};
const initialPitch: PitchForm = {
  venue_id: "",
  name: "",
  surface: "sztuczna trawa",
  players: "10",
  base_price_pln: "180",
  weekend_price_pln: "",
  peak_price_pln: "",
  peak_start: "17:00",
  peak_end: "21:00",
  slot_minutes: "60",
  opens_at: "08:00",
  closes_at: "22:00",
};

const statusLabel: Record<string, string> = {
  pending: "Oczekuje na płatność",
  confirmed: "Potwierdzona",
  cancelled: "Anulowana",
  expired: "Wygasła",
};

export function PartnerDashboardClient() {
  const [venues, setVenues] = useState<VenueCard[]>([]);
  const [pitches, setPitches] = useState<AdminPitchRow[]>([]);
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [venueForm, setVenueForm] = useState<VenueForm>(initialVenue);
  const [pitchForm, setPitchForm] = useState<PitchForm>(initialPitch);
  const [blockForm, setBlockForm] = useState({
    pitch_id: "",
    date: "",
    start_time: "18:00",
    end_time: "19:00",
    reason: "",
  });
  const [hoursDrafts, setHoursDrafts] = useState<Record<number, { opens_at: string; closes_at: string; base_price_pln: string }>>(
    {}
  );
  const [photoDrafts, setPhotoDrafts] = useState<Record<number, [string, string, string]>>({});
  const [busy, setBusy] = useState(false);

  async function load() {
    const [venuesRes, bookingsRes, pitchesRes] = await Promise.all([
      fetch("/api/partner/venues"),
      fetch("/api/partner/bookings"),
      fetch("/api/partner/pitches"),
    ]);
    if (!venuesRes.ok || !bookingsRes.ok || !pitchesRes.ok) throw new Error();
    const venuesJson = (await venuesRes.json()) as { venues: VenueCard[] };
    const bookingsJson = (await bookingsRes.json()) as { bookings: BookingRow[] };
    const pitchesJson = (await pitchesRes.json()) as { pitches: AdminPitchRow[] };
    setVenues(venuesJson.venues);
    setBookings(bookingsJson.bookings);
    setPitches(pitchesJson.pitches);
    setPhotoDrafts((prev) => {
      const next = { ...prev };
      for (const venue of venuesJson.venues) {
        const urls = venue.photo_urls ?? (venue.photo_url ? [venue.photo_url] : []);
        next[venue.id] = [urls[0] ?? "", urls[1] ?? "", urls[2] ?? ""];
      }
      return next;
    });
    setHoursDrafts((prev) => {
      const next = { ...prev };
      for (const pitch of pitchesJson.pitches) {
        next[pitch.id] = {
          opens_at: pitch.opens_at ?? "08:00",
          closes_at: pitch.closes_at ?? "22:00",
          base_price_pln: String(pitch.base_price_pln),
        };
      }
      return next;
    });
    setPitchForm((prev) => ({ ...prev, venue_id: prev.venue_id || String(venuesJson.venues[0]?.id ?? "") }));
    setBlockForm((prev) => ({ ...prev, pitch_id: prev.pitch_id || String(pitchesJson.pitches[0]?.id ?? "") }));
  }

  useEffect(() => {
    load().catch(() => toast.error("Nie udało się wczytać panelu partnera"));
  }, []);

  async function createVenue() {
    setBusy(true);
    try {
      const res = await fetch("/api/partner/venues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...venueForm,
          photo_urls: [venueForm.photo_1, venueForm.photo_2, venueForm.photo_3].map((u) => u.trim()).filter(Boolean),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast.error(data.error ?? "Nie udało się dodać obiektu");
        return;
      }
      toast.success("Obiekt dodany — uzupełnij boisko i godziny");
      setVenueForm(initialVenue);
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function createPitch() {
    setBusy(true);
    try {
      const res = await fetch("/api/partner/pitches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...pitchForm,
          weekend_price_pln: pitchForm.weekend_price_pln || undefined,
          peak_price_pln: pitchForm.peak_price_pln || undefined,
          peak_start: pitchForm.peak_price_pln ? pitchForm.peak_start : undefined,
          peak_end: pitchForm.peak_price_pln ? pitchForm.peak_end : undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast.error(data.error ?? "Nie udało się dodać boiska");
        return;
      }
      toast.success("Boisko i wolne terminy zapisane");
      setPitchForm((prev) => ({ ...initialPitch, venue_id: prev.venue_id }));
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function saveHours(pitchId: number) {
    const draft = hoursDrafts[pitchId];
    if (!draft) return;
    const res = await fetch(`/api/partner/pitches/${pitchId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        opens_at: draft.opens_at,
        closes_at: draft.closes_at,
        base_price_pln: Number(draft.base_price_pln),
      }),
    });
    if (!res.ok) {
      toast.error("Nie udało się zapisać godzin");
      return;
    }
    toast.success("Zapisano godziny i cenę — sloty pojawią się w grafiku");
    await load();
  }

  async function saveVenuePhotos(venueId: number) {
    const urls = photoDrafts[venueId] ?? ["", "", ""];
    const res = await fetch(`/api/partner/venues/${venueId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ photo_urls: urls.map((u) => u.trim()).filter(Boolean) }),
    });
    if (!res.ok) {
      toast.error("Nie udało się zapisać zdjęć");
      return;
    }
    toast.success("Zapisano zdjęcia");
    await load();
  }

  async function addBlock() {
    if (!blockForm.pitch_id) return;
    const res = await fetch(`/api/partner/pitches/${blockForm.pitch_id}/blocks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(blockForm),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      toast.error(data.error ?? "Nie udało się dodać blokady");
      return;
    }
    toast.success("Slot zablokowany");
    await load();
  }

  async function updateBookingStatus(id: number, status: BookingRow["status"]) {
    const res = await fetch(`/api/partner/bookings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      toast.error("Nie udało się zmienić statusu");
      return;
    }
    toast.success("Status zaktualizowany");
    await load();
  }

  return (
    <div className="space-y-6">
      <PartnerWeekCalendar pitches={pitches} />
      <PartnerSettlementsCard />
      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="text-lg font-black">Nowy obiekt</h2>
          <p className="mt-1 text-sm text-zinc-500">Adres, telefon i 2–3 zdjęcia. Mapa weźmie się z adresu.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <FormInput label="Nazwa" value={venueForm.name} onChange={(e) => setVenueForm({ ...venueForm, name: e.target.value })} />
            <FormInput label="Miasto" value={venueForm.city} onChange={(e) => setVenueForm({ ...venueForm, city: e.target.value })} />
            <FormInput label="Adres" className="sm:col-span-2" value={venueForm.address} onChange={(e) => setVenueForm({ ...venueForm, address: e.target.value })} />
            <FormInput label="Telefon" value={venueForm.phone} onChange={(e) => setVenueForm({ ...venueForm, phone: e.target.value })} />
            <FormTextarea label="Opis" className="sm:col-span-2" value={venueForm.description} onChange={(e) => setVenueForm({ ...venueForm, description: e.target.value })} />
            <FormInput label="Zdjęcie 1 (URL)" className="sm:col-span-2" value={venueForm.photo_1} onChange={(e) => setVenueForm({ ...venueForm, photo_1: e.target.value })} />
            <FormInput label="Zdjęcie 2 (URL)" className="sm:col-span-2" value={venueForm.photo_2} onChange={(e) => setVenueForm({ ...venueForm, photo_2: e.target.value })} />
            <FormInput label="Zdjęcie 3 (URL)" className="sm:col-span-2" value={venueForm.photo_3} onChange={(e) => setVenueForm({ ...venueForm, photo_3: e.target.value })} />
          </div>
          <Button className="mt-4" onClick={() => void createVenue()} disabled={busy}>
            Dodaj obiekt
          </Button>
        </section>

        <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="text-lg font-black">Boisko i wolne terminy</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Godziny otwarcia stają się slotami w wyszukiwarce. Cena weekendowa i szczytowa są opcjonalne.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <label className="text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-zinc-500">Obiekt</label>
              <select
                value={pitchForm.venue_id}
                onChange={(e) => setPitchForm({ ...pitchForm, venue_id: e.target.value })}
                className="h-10 w-full rounded-xl border border-zinc-300 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              >
                <option value="">Wybierz obiekt</option>
                {venues.map((venue) => (
                  <option key={venue.id} value={venue.id}>
                    {venue.name} — {venue.city}
                  </option>
                ))}
              </select>
            </div>
            <FormInput label="Nazwa boiska" value={pitchForm.name} onChange={(e) => setPitchForm({ ...pitchForm, name: e.target.value })} />
            <FormInput label="Nawierzchnia" value={pitchForm.surface} onChange={(e) => setPitchForm({ ...pitchForm, surface: e.target.value })} />
            <FormInput label="Cena za slot" type="number" value={pitchForm.base_price_pln} onChange={(e) => setPitchForm({ ...pitchForm, base_price_pln: e.target.value })} />
            <FormInput label="Cena weekendowa" type="number" value={pitchForm.weekend_price_pln} onChange={(e) => setPitchForm({ ...pitchForm, weekend_price_pln: e.target.value })} />
            <FormInput label="Cena szczytu" type="number" value={pitchForm.peak_price_pln} onChange={(e) => setPitchForm({ ...pitchForm, peak_price_pln: e.target.value })} />
            <FormInput label="Szczyt od" type="time" value={pitchForm.peak_start} onChange={(e) => setPitchForm({ ...pitchForm, peak_start: e.target.value })} />
            <FormInput label="Szczyt do" type="time" value={pitchForm.peak_end} onChange={(e) => setPitchForm({ ...pitchForm, peak_end: e.target.value })} />
            <FormInput label="Otwarte od" type="time" value={pitchForm.opens_at} onChange={(e) => setPitchForm({ ...pitchForm, opens_at: e.target.value })} />
            <FormInput label="Otwarte do" type="time" value={pitchForm.closes_at} onChange={(e) => setPitchForm({ ...pitchForm, closes_at: e.target.value })} />
          </div>
          <Button className="mt-4" onClick={() => void createPitch()} disabled={busy || !pitchForm.venue_id}>
            Dodaj boisko i terminy
          </Button>
        </section>
      </div>

      <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="text-lg font-black">Godziny i cena istniejących boisk</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {pitches.length === 0 ? (
            <p className="text-sm text-zinc-500">Najpierw dodaj boisko.</p>
          ) : (
            pitches.map((pitch) => {
              const draft = hoursDrafts[pitch.id] ?? {
                opens_at: pitch.opens_at ?? "08:00",
                closes_at: pitch.closes_at ?? "22:00",
                base_price_pln: String(pitch.base_price_pln),
              };
              return (
                <article key={pitch.id} className="rounded-2xl border border-zinc-100 p-4 dark:border-zinc-800">
                  <p className="font-semibold">
                    {pitch.venue_name} / {pitch.name}
                  </p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    <FormInput
                      label="Od"
                      type="time"
                      value={draft.opens_at}
                      onChange={(e) =>
                        setHoursDrafts((prev) => ({ ...prev, [pitch.id]: { ...draft, opens_at: e.target.value } }))
                      }
                    />
                    <FormInput
                      label="Do"
                      type="time"
                      value={draft.closes_at}
                      onChange={(e) =>
                        setHoursDrafts((prev) => ({ ...prev, [pitch.id]: { ...draft, closes_at: e.target.value } }))
                      }
                    />
                    <FormInput
                      label="Cena zł"
                      type="number"
                      value={draft.base_price_pln}
                      onChange={(e) =>
                        setHoursDrafts((prev) => ({
                          ...prev,
                          [pitch.id]: { ...draft, base_price_pln: e.target.value },
                        }))
                      }
                    />
                  </div>
                  <Button size="sm" variant="outline" className="mt-3" onClick={() => void saveHours(pitch.id)}>
                    Zapisz terminy
                  </Button>
                </article>
              );
            })
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="text-lg font-black">Blokada terminu</h2>
        <p className="mt-1 text-sm text-zinc-500">Zamknij konkretną godzinę, np. na konserwację albo mecz akademii.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="space-y-2">
            <label className="text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-zinc-500">Boisko</label>
            <select
              value={blockForm.pitch_id}
              onChange={(e) => setBlockForm({ ...blockForm, pitch_id: e.target.value })}
              className="h-10 w-full rounded-xl border border-zinc-300 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            >
              <option value="">Wybierz</option>
              {pitches.map((pitch) => (
                <option key={pitch.id} value={pitch.id}>
                  {pitch.venue_name} / {pitch.name}
                </option>
              ))}
            </select>
          </div>
          <FormInput label="Data" type="date" value={blockForm.date} onChange={(e) => setBlockForm({ ...blockForm, date: e.target.value })} />
          <FormInput label="Od" type="time" value={blockForm.start_time} onChange={(e) => setBlockForm({ ...blockForm, start_time: e.target.value })} />
          <FormInput label="Do" type="time" value={blockForm.end_time} onChange={(e) => setBlockForm({ ...blockForm, end_time: e.target.value })} />
          <FormInput label="Powód" value={blockForm.reason} onChange={(e) => setBlockForm({ ...blockForm, reason: e.target.value })} />
        </div>
        <Button className="mt-4" variant="outline" onClick={() => void addBlock()} disabled={!blockForm.pitch_id || !blockForm.date}>
          Zablokuj slot
        </Button>
      </section>

      <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="text-lg font-black">Twoje obiekty</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {venues.length === 0 ? (
            <p className="text-sm text-zinc-500">Nie masz jeszcze obiektu — dodaj pierwszy powyżej.</p>
          ) : (
            venues.map((venue) => {
              const drafts = photoDrafts[venue.id] ?? ["", "", ""];
              return (
                <div key={venue.id} className="space-y-3 rounded-2xl border border-zinc-100 p-4 dark:border-zinc-800">
                  <Link href={`/obiekty/${venue.slug}`} className="font-semibold hover:text-[var(--mp-teal-dark)]">
                    {venue.name}
                  </Link>
                  <p className="text-sm text-zinc-500">
                    {venue.city}, {venue.address}
                  </p>
                  {(["Zdjęcie 1", "Zdjęcie 2", "Zdjęcie 3"] as const).map((label, index) => (
                    <FormInput
                      key={label}
                      label={label}
                      value={drafts[index] ?? ""}
                      onChange={(e) =>
                        setPhotoDrafts((prev) => {
                          const current = prev[venue.id] ?? ["", "", ""];
                          const next: [string, string, string] = [current[0] ?? "", current[1] ?? "", current[2] ?? ""];
                          next[index] = e.target.value;
                          return { ...prev, [venue.id]: next };
                        })
                      }
                    />
                  ))}
                  <Button size="sm" variant="outline" onClick={() => void saveVenuePhotos(venue.id)}>
                    Zapisz zdjęcia
                  </Button>
                </div>
              );
            })
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="text-lg font-black">Rezerwacje na Twoich boiskach</h2>
        <div className="mt-4 space-y-3">
          {bookings.length === 0 ? (
            <p className="text-sm text-zinc-500">Brak rezerwacji.</p>
          ) : (
            bookings.map((booking) => (
              <article key={booking.id} className="flex flex-col gap-3 rounded-2xl border border-zinc-100 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{booking.venue_name}</p>
                    <Badge>{statusLabel[booking.status] ?? booking.status}</Badge>
                  </div>
                  <p className="text-sm text-zinc-500">
                    {booking.pitch_name} · {booking.booking_date} {booking.start_time}–{booking.end_time}
                  </p>
                  <p className="text-sm text-zinc-500">
                    {booking.user_name ?? booking.contact_name} · {Number(booking.amount_pln).toFixed(2)} zł
                    {booking.owner_payout_pln != null ? ` · dla Ciebie ${Number(booking.owner_payout_pln).toFixed(2)} zł` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => void updateBookingStatus(booking.id, "confirmed")}>
                    Potwierdź
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => void updateBookingStatus(booking.id, "cancelled")}>
                    Anuluj
                  </Button>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
