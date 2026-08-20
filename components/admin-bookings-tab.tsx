"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "@/lib/app-toast";
import type { AdminPitchRow, BookingRow, VenueCard } from "@/lib/booking";
import type { PartnerInvite } from "@/lib/venue-partners";
import { Button } from "@/components/ui/button";
import { FormInput, FormTextarea } from "@/components/ui/form-field";
import { Badge } from "@/components/ui/badge";
import { AdminCard, AdminTableShell } from "@/components/admin-ui";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AdminSettlementsCard } from "@/components/admin-settlements-card";

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

const initialVenue: VenueForm = { name: "", city: "", address: "", description: "", phone: "", photo_1: "", photo_2: "", photo_3: "" };

function partnerInviteStatus(invite: PartnerInvite) {
  if (invite.revoked_at) return "revoked";
  if (invite.expires_at && new Date(invite.expires_at).getTime() <= Date.now()) return "expired";
  if (invite.claimed_user_id) return "claimed";
  return "open";
}
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
  const [photoDrafts, setPhotoDrafts] = useState<Record<number, [string, string, string]>>({});
  const [invites, setInvites] = useState<PartnerInvite[]>([]);
  const [inviteLabel, setInviteLabel] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const [venuesRes, bookingsRes, pitchesRes, invitesRes] = await Promise.all([
      fetch("/api/admin/venues"),
      fetch("/api/admin/bookings"),
      fetch("/api/admin/pitches"),
      fetch("/api/admin/partner-invites"),
    ]);
    if (!venuesRes.ok || !bookingsRes.ok || !pitchesRes.ok || !invitesRes.ok) throw new Error();
    const venuesJson = (await venuesRes.json()) as { venues: VenueCard[] };
    const bookingsJson = (await bookingsRes.json()) as { bookings: BookingRow[] };
    const pitchesJson = (await pitchesRes.json()) as { pitches: AdminPitchRow[] };
    const invitesJson = (await invitesRes.json()) as { invites: PartnerInvite[] };
    setVenues(venuesJson.venues);
    setBookings(bookingsJson.bookings);
    setPitches(pitchesJson.pitches);
    setInvites(invitesJson.invites);
    setPhotoDrafts((prev) => {
      const next = { ...prev };
      for (const venue of venuesJson.venues) {
        const urls = venue.photo_urls ?? (venue.photo_url ? [venue.photo_url] : []);
        next[venue.id] = [urls[0] ?? "", urls[1] ?? "", urls[2] ?? ""];
      }
      return next;
    });
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

  async function createInvite() {
    const res = await fetch("/api/admin/partner-invites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: inviteLabel || undefined }),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string; path?: string };
    if (!res.ok) {
      toast.error(data.error ?? "Nie udało się utworzyć linku");
      return;
    }
    setInviteLabel("");
    const url = `${window.location.origin}${data.path ?? ""}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Skopiowano link dla partnera");
    } catch {
      toast.success(`Link: ${url}`);
    }
    await load();
  }

  async function revokeInvite(id: number) {
    const res = await fetch(`/api/admin/partner-invites/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Nie udało się unieważnić linku");
      return;
    }
    toast.success("Link unieważniony");
    await load();
  }

  async function saveVenuePhotos(venueId: number) {
    const urls = photoDrafts[venueId] ?? ["", "", ""];
    const res = await fetch(`/api/admin/venues/${venueId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ photo_urls: urls.map((u) => u.trim()).filter(Boolean) }),
    });
    if (!res.ok) {
      toast.error("Nie udało się zapisać zdjęć");
      return;
    }
    toast.success("Zapisano zdjęcia obiektu");
    await load();
  }

  return (
    <div className="space-y-6">
      <AdminSettlementsCard />
      <AdminCard
        title="Link dla partnera"
        description="Wyślij ten adres właścicielowi hali. Po rejestracji doda swoje boiska, cennik i wolne terminy — bez dostępu do panelu akademii."
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <FormInput
            label="Notatka (np. nazwa hali)"
            value={inviteLabel}
            onChange={(e) => setInviteLabel(e.target.value)}
            className="sm:flex-1"
          />
          <Button variant="gold" onClick={() => void createInvite()}>
            Wygeneruj i skopiuj link
          </Button>
        </div>
        <div className="mt-4 space-y-2">
          {invites.length === 0 ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Brak wygenerowanych linków.</p>
          ) : (
            invites.slice(0, 8).map((invite) => {
              const status = partnerInviteStatus(invite);
              const url = typeof window !== "undefined" ? `${window.location.origin}/partner/zaproszenie/${invite.token}` : `/partner/zaproszenie/${invite.token}`;
              return (
                <div
                  key={invite.id}
                  className="flex flex-col gap-2 rounded-2xl border border-zinc-200 p-3 text-sm sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800"
                >
                  <div>
                    <p className="font-semibold">{invite.label || "Partner obiektu"}</p>
                    <p className="break-all text-zinc-500">{url}</p>
                    <p className="mt-1 text-zinc-500">
                      {status === "open"
                        ? "Oczekuje na aktywację"
                        : status === "claimed"
                          ? `Aktywowany: ${invite.claimed_name ?? "partner"}`
                          : status === "expired"
                            ? "Wygasł"
                            : "Unieważniony"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        void navigator.clipboard.writeText(url).then(
                          () => toast.success("Skopiowano"),
                          () => toast.error("Nie udało się skopiować")
                        );
                      }}
                    >
                      Kopiuj
                    </Button>
                    {status === "open" || status === "claimed" ? (
                      <Button size="sm" variant="destructive" onClick={() => void revokeInvite(invite.id)}>
                        Unieważnij
                      </Button>
                    ) : null}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </AdminCard>

      <div className="grid gap-6 xl:grid-cols-2">
        <AdminCard title="Nowy obiekt" description="Dodaj halę, orlik lub kompleks boisk do katalogu rezerwacji.">
          <div className="grid gap-3 sm:grid-cols-2">
            <FormInput label="Nazwa" value={venueForm.name} onChange={(e) => setVenueForm({ ...venueForm, name: e.target.value })} />
            <FormInput label="Miasto" value={venueForm.city} onChange={(e) => setVenueForm({ ...venueForm, city: e.target.value })} />
            <FormInput label="Adres" className="sm:col-span-2" value={venueForm.address} onChange={(e) => setVenueForm({ ...venueForm, address: e.target.value })} />
            <FormInput label="Telefon" value={venueForm.phone} onChange={(e) => setVenueForm({ ...venueForm, phone: e.target.value })} />
            <FormTextarea label="Opis" className="sm:col-span-2" value={venueForm.description} onChange={(e) => setVenueForm({ ...venueForm, description: e.target.value })} />
            <FormInput label="Zdjęcie 1 (URL)" className="sm:col-span-2" value={venueForm.photo_1} onChange={(e) => setVenueForm({ ...venueForm, photo_1: e.target.value })} />
            <FormInput label="Zdjęcie 2 (URL)" className="sm:col-span-2" value={venueForm.photo_2} onChange={(e) => setVenueForm({ ...venueForm, photo_2: e.target.value })} />
            <FormInput label="Zdjęcie 3 (URL)" className="sm:col-span-2" value={venueForm.photo_3} onChange={(e) => setVenueForm({ ...venueForm, photo_3: e.target.value })} />
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

      <AdminCard title="Obiekty" description="Uzupełnij 2–3 zdjęcia. Godziny, cennik i blokady widać na stronie obiektu.">
        <div className="grid gap-3 md:grid-cols-2">
          {venues.length === 0 ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Brak obiektów.</p>
          ) : (
            venues.map((venue) => {
              const drafts = photoDrafts[venue.id] ?? ["", "", ""];
              return (
                <div
                  key={venue.id}
                  className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-4 text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
                >
                  <Link href={`/obiekty/${venue.slug}`} className="flex items-center justify-between gap-3 hover:text-emerald-700">
                    <div>
                      <p className="font-semibold">{venue.name}</p>
                      <p className="text-sm text-zinc-500">{venue.city}, {venue.address}</p>
                    </div>
                    <Badge>{venue.pitch_count} boisk</Badge>
                  </Link>
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
                    <TableCell className="text-right">
                      <p>{Number(booking.amount_pln).toFixed(2)} zł</p>
                      {booking.owner_payout_pln != null ? (
                        <p className="text-xs text-zinc-500">hala {Number(booking.owner_payout_pln).toFixed(2)}</p>
                      ) : null}
                    </TableCell>
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
