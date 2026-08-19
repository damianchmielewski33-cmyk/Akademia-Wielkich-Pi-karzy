"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "@/lib/app-toast";
import type { AdminPitchRow, BookingRow, VenueCard } from "@/lib/booking";
import { Button } from "@/components/ui/button";
import { FormInput, FormTextarea } from "@/components/ui/form-field";
import { Badge } from "@/components/ui/badge";
import { AdminCard, AdminTableShell } from "@/components/admin-ui";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type VenueForm = {
  name: string;
  city: string;
  address: string;
  description: string;
  phone: string;
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

const initialVenue: VenueForm = { name: "", city: "", address: "", description: "", phone: "" };
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

export function AdminBookingsTab() {
  const [venues, setVenues] = useState<VenueCard[]>([]);
  const [pitches, setPitches] = useState<AdminPitchRow[]>([]);
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [venueForm, setVenueForm] = useState<VenueForm>(initialVenue);
  const [pitchForm, setPitchForm] = useState<PitchForm>(initialPitch);
  const [blockForm, setBlockForm] = useState({ pitch_id: "", date: "", start_time: "18:00", end_time: "19:00", reason: "" });
  const [busy, setBusy] = useState(false);

  async function load() {
    const [venuesRes, bookingsRes, pitchesRes] = await Promise.all([
      fetch("/api/admin/venues"),
      fetch("/api/admin/bookings"),
      fetch("/api/admin/pitches"),
    ]);
    if (!venuesRes.ok || !bookingsRes.ok || !pitchesRes.ok) throw new Error();
    const venuesJson = (await venuesRes.json()) as { venues: VenueCard[] };
    const bookingsJson = (await bookingsRes.json()) as { bookings: BookingRow[] };
    const pitchesJson = (await pitchesRes.json()) as { pitches: AdminPitchRow[] };
    setVenues(venuesJson.venues);
    setBookings(bookingsJson.bookings);
    setPitches(pitchesJson.pitches);
    setPitchForm((prev) => ({ ...prev, venue_id: prev.venue_id || String(venuesJson.venues[0]?.id ?? "") }));
    setBlockForm((prev) => ({ ...prev, pitch_id: prev.pitch_id || String(pitchesJson.pitches[0]?.id ?? "") }));
  }

  useEffect(() => {
    load().catch(() => toast.error("Nie udało się wczytać rezerwacji"));
  }, []);

  async function createVenue() {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/venues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(venueForm),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast.error(data.error ?? "Nie udało się dodać obiektu");
        return;
      }
      toast.success("Dodano obiekt");
      setVenueForm(initialVenue);
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function createPitch() {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/pitches", {
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
      toast.success("Dodano boisko");
      setPitchForm((prev) => ({ ...initialPitch, venue_id: prev.venue_id }));
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function updateBookingStatus(id: number, status: BookingRow["status"]) {
    const res = await fetch(`/api/admin/bookings/${id}`, {
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

  async function addBlock() {
    if (!blockForm.pitch_id) return;
    const res = await fetch(`/api/admin/pitches/${blockForm.pitch_id}/blocks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(blockForm),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      toast.error(data.error ?? "Nie udało się dodać blokady");
      return;
    }
    toast.success("Dodano blokadę techniczną");
    await load();
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-2">
        <AdminCard title="Nowy obiekt" description="Dodaj halę, orlik lub kompleks boisk do katalogu rezerwacji.">
          <div className="grid gap-3 sm:grid-cols-2">
            <FormInput label="Nazwa" value={venueForm.name} onChange={(e) => setVenueForm({ ...venueForm, name: e.target.value })} />
            <FormInput label="Miasto" value={venueForm.city} onChange={(e) => setVenueForm({ ...venueForm, city: e.target.value })} />
            <FormInput label="Adres" className="sm:col-span-2" value={venueForm.address} onChange={(e) => setVenueForm({ ...venueForm, address: e.target.value })} />
            <FormInput label="Telefon" value={venueForm.phone} onChange={(e) => setVenueForm({ ...venueForm, phone: e.target.value })} />
            <FormTextarea label="Opis" className="sm:col-span-2" value={venueForm.description} onChange={(e) => setVenueForm({ ...venueForm, description: e.target.value })} />
          </div>
          <Button className="mt-4" variant="gold" onClick={createVenue} disabled={busy}>
            Dodaj obiekt
          </Button>
        </AdminCard>

        <AdminCard title="Nowe boisko" description="Boisko dostaje prosty grafik tygodniowy i cenę bazową za slot.">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <label className="text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-400">
                Obiekt
              </label>
              <select
                value={pitchForm.venue_id}
                onChange={(e) => setPitchForm({ ...pitchForm, venue_id: e.target.value })}
                className="h-10 w-full rounded-xl border border-zinc-300 bg-white px-3 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
              >
                <option value="">Wybierz obiekt</option>
                {venues.map((venue) => (
                  <option key={venue.id} value={venue.id}>
                    {venue.name} - {venue.city}
                  </option>
                ))}
              </select>
            </div>
            <FormInput label="Nazwa boiska" value={pitchForm.name} onChange={(e) => setPitchForm({ ...pitchForm, name: e.target.value })} />
            <FormInput label="Nawierzchnia" value={pitchForm.surface} onChange={(e) => setPitchForm({ ...pitchForm, surface: e.target.value })} />
            <FormInput label="Liczba graczy" type="number" value={pitchForm.players} onChange={(e) => setPitchForm({ ...pitchForm, players: e.target.value })} />
            <FormInput label="Cena za slot" type="number" value={pitchForm.base_price_pln} onChange={(e) => setPitchForm({ ...pitchForm, base_price_pln: e.target.value })} />
            <FormInput label="Cena weekendowa" type="number" value={pitchForm.weekend_price_pln} onChange={(e) => setPitchForm({ ...pitchForm, weekend_price_pln: e.target.value })} />
            <FormInput label="Cena szczytu" type="number" value={pitchForm.peak_price_pln} onChange={(e) => setPitchForm({ ...pitchForm, peak_price_pln: e.target.value })} />
            <FormInput label="Szczyt od" type="time" value={pitchForm.peak_start} onChange={(e) => setPitchForm({ ...pitchForm, peak_start: e.target.value })} />
            <FormInput label="Szczyt do" type="time" value={pitchForm.peak_end} onChange={(e) => setPitchForm({ ...pitchForm, peak_end: e.target.value })} />
            <FormInput label="Długość slotu (min)" type="number" value={pitchForm.slot_minutes} onChange={(e) => setPitchForm({ ...pitchForm, slot_minutes: e.target.value })} />
            <FormInput label="Otwarte od" type="time" value={pitchForm.opens_at} onChange={(e) => setPitchForm({ ...pitchForm, opens_at: e.target.value })} />
            <FormInput label="Otwarte do" type="time" value={pitchForm.closes_at} onChange={(e) => setPitchForm({ ...pitchForm, closes_at: e.target.value })} />
          </div>
          <Button className="mt-4" variant="gold" onClick={createPitch} disabled={busy || !pitchForm.venue_id}>
            Dodaj boisko
          </Button>
        </AdminCard>
      </div>

      <AdminCard title="Blokada techniczna" description="Zamknij konkretny slot, np. konserwacja lub turniej akademii.">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="space-y-2">
            <label className="text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-400">
              Boisko
            </label>
            <select
              value={blockForm.pitch_id}
              onChange={(e) => setBlockForm({ ...blockForm, pitch_id: e.target.value })}
              className="h-10 w-full rounded-xl border border-zinc-300 bg-white px-3 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
            >
              <option value="">Wybierz boisko</option>
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
          Dodaj blokadę
        </Button>
      </AdminCard>

      <AdminCard title="Obiekty" description="Szybki podgląd katalogu publikowanego dla użytkowników.">
        <div className="grid gap-3 md:grid-cols-2">
          {venues.length === 0 ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Brak obiektów.</p>
          ) : (
            venues.map((venue) => (
              <Link
                key={venue.id}
                href={`/obiekty/${venue.slug}`}
                className="rounded-2xl border border-zinc-200 bg-white p-4 text-zinc-900 hover:border-emerald-400 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">{venue.name}</p>
                    <p className="text-sm text-zinc-500">{venue.city}, {venue.address}</p>
                  </div>
                  <Badge>{venue.pitch_count} boisk</Badge>
                </div>
              </Link>
            ))
          )}
        </div>
      </AdminCard>

      <AdminCard title="Rezerwacje" description="Lista rezerwacji z możliwością ręcznej zmiany statusu.">
        <AdminTableShell>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Termin</TableHead>
                <TableHead>Obiekt</TableHead>
                <TableHead>Klient</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Kwota</TableHead>
                <TableHead>Akcje</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-zinc-500">
                    Brak rezerwacji.
                  </TableCell>
                </TableRow>
              ) : (
                bookings.map((booking) => (
                  <TableRow key={booking.id}>
                    <TableCell>
                      <p className="font-semibold">{booking.booking_date}</p>
                      <p className="text-sm text-zinc-500">{booking.start_time} - {booking.end_time}</p>
                    </TableCell>
                    <TableCell>
                      <p>{booking.venue_name}</p>
                      <p className="text-sm text-zinc-500">{booking.pitch_name}</p>
                    </TableCell>
                    <TableCell>{booking.user_name ?? booking.contact_name}</TableCell>
                    <TableCell><Badge>{booking.status}</Badge></TableCell>
                    <TableCell className="text-right">{Number(booking.amount_pln).toFixed(2)} zł</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={() => void updateBookingStatus(booking.id, "confirmed")}>
                          Potwierdź
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => void updateBookingStatus(booking.id, "cancelled")}>
                          Anuluj
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </AdminTableShell>
      </AdminCard>
    </div>
  );
}
