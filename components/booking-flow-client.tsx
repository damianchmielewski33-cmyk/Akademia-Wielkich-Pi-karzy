"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "@/lib/app-toast";
import type { AvailabilitySlot, PitchRow, VenueRow } from "@/lib/booking";
import { Button } from "@/components/ui/button";
import { FormInput, FormTextarea } from "@/components/ui/form-field";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Props = {
  venue: VenueRow;
  pitches: PitchRow[];
  isLoggedIn: boolean;
  userName: string;
  initialDate?: string;
  initialTime?: string;
};

const today = () => new Date().toISOString().slice(0, 10);

export function BookingFlowClient({ venue, pitches, isLoggedIn, userName, initialDate, initialTime }: Props) {
  const router = useRouter();
  const [pitchId, setPitchId] = useState(() => pitches[0]?.id ?? 0);
  const [date, setDate] = useState(initialDate && /^\d{4}-\d{2}-\d{2}$/.test(initialDate) ? initialDate : today());
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [selected, setSelected] = useState<AvailabilitySlot | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [busy, setBusy] = useState(false);
  const [contactName, setContactName] = useState(userName);
  const [contactPhone, setContactPhone] = useState("");
  const [note, setNote] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const pitch = useMemo(() => pitches.find((p) => p.id === pitchId) ?? pitches[0] ?? null, [pitches, pitchId]);

  useEffect(() => {
    if (!pitchId || !date) return;
    setLoadingSlots(true);
    setSelected(null);
    fetch(`/api/pitches/${pitchId}/availability?date=${encodeURIComponent(date)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: { slots: AvailabilitySlot[] }) => {
        setSlots(data.slots);
        if (!initialTime) return;
        const wanted = initialTime.slice(0, 5);
        const match = data.slots.find(
          (s) => s.available && (s.start_time === wanted || s.start_time.startsWith(`${wanted.slice(0, 2)}:`))
        );
        if (match) setSelected(match);
      })
      .catch(() => {
        setSlots([]);
        toast.error("Nie udało się wczytać dostępności");
      })
      .finally(() => setLoadingSlots(false));
  }, [pitchId, date]);

  async function bookAndPay() {
    if (!pitch || !selected) return;
    if (!isLoggedIn) {
      router.push(`/login?next=/obiekty/${venue.slug}`);
      return;
    }
    if (!contactName.trim() || !contactPhone.trim()) {
      toast.error("Podaj imię i telefon kontaktowy");
      return;
    }
    if (!acceptedTerms) {
      toast.error("Zaakceptuj regulamin, aby zarezerwować boisko");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/rezerwacje", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pitch_id: pitch.id,
          date: selected.date,
          start_time: selected.start_time,
          contact_name: contactName,
          contact_phone: contactPhone,
          note,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { booking?: { id: number }; error?: string };
      if (!res.ok || !data.booking) {
        toast.error(data.error ?? "Nie udało się utworzyć rezerwacji");
        return;
      }

      const pay = await fetch(`/api/rezerwacje/${data.booking.id}/pay`, { method: "POST" });
      const payData = (await pay.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!pay.ok || !payData.url) {
        toast.success("Termin zablokowany na 15 minut. Opłać go z listy rezerwacji.");
        router.push(`/rezerwacje?booking=${data.booking.id}`);
        return;
      }
      window.location.href = payData.url;
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <section className="rounded-3xl border border-zinc-200 bg-white p-5 text-zinc-900 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <FormInput
            label="Data"
            type="date"
            value={date}
            min={today()}
            onChange={(e) => setDate(e.target.value)}
            className="sm:max-w-48"
          />
          <div className="space-y-2 sm:min-w-64">
            <label className="text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-400">
              Boisko
            </label>
            <select
              value={pitchId}
              onChange={(e) => setPitchId(Number(e.target.value))}
              className="h-10 w-full rounded-xl border border-zinc-300 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            >
              {pitches.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} - od {p.base_price_pln} zł
                </option>
              ))}
            </select>
          </div>
        </div>

        {pitch ? (
          <div className="mt-5 flex flex-wrap gap-2">
            <Badge>{pitch.surface}</Badge>
            <Badge>{pitch.players} osób</Badge>
            {pitch.indoor ? <Badge>Kryte</Badge> : <Badge>Otwarte</Badge>}
            {pitch.lighting ? <Badge>Oświetlenie</Badge> : null}
          </div>
        ) : null}

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {loadingSlots ? (
            <p className="col-span-full text-sm text-zinc-500">Ładowanie godzin...</p>
          ) : slots.length === 0 ? (
            <p className="col-span-full text-sm text-zinc-500">Brak grafiku dla wybranego dnia.</p>
          ) : (
            slots.map((slot) => (
              <button
                key={`${slot.start_time}-${slot.end_time}`}
                type="button"
                disabled={!slot.available}
                onClick={() => setSelected(slot)}
                className={cn(
                  "rounded-2xl border px-3 py-3 text-left transition disabled:cursor-not-allowed disabled:opacity-45",
                  selected?.start_time === slot.start_time
                    ? "border-[var(--mp-teal)] bg-[var(--mp-teal)] text-white shadow-lg"
                    : "border-zinc-200 bg-zinc-50 hover:border-[var(--mp-teal)] dark:border-zinc-800 dark:bg-zinc-900"
                )}
              >
                <span className="block font-semibold">
                  {slot.start_time} - {slot.end_time}
                </span>
                <span className="text-sm opacity-80">{slot.amount_pln.toFixed(2)} zł</span>
              </button>
            ))
          )}
        </div>
      </section>

      <aside className="rounded-3xl border border-zinc-200 bg-white p-5 text-zinc-950 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--mp-teal-dark)]">Rezerwacja</p>
        <h2 className="mt-2 text-2xl font-black">{venue.name}</h2>
        <p className="mt-1 text-sm text-zinc-500">
          {venue.address}, {venue.city}
        </p>
        <div className="mt-5 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
          {selected ? (
            <>
              <p className="font-semibold">{selected.date}</p>
              <p className="mp-price mt-1 text-2xl">
                {selected.start_time} - {selected.end_time}
              </p>
              <p className="text-sm text-zinc-500">{selected.amount_pln.toFixed(2)} zł</p>
            </>
          ) : (
            <p className="text-sm text-zinc-500">Wybierz dostępny termin z grafiku.</p>
          )}
        </div>
        <div className="mt-5 space-y-3">
          <FormInput label="Imię i nazwisko" value={contactName} onChange={(e) => setContactName(e.target.value)} />
          <FormInput label="Telefon" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
          <FormTextarea label="Uwagi" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <label className="mt-4 flex items-start gap-2 text-sm text-zinc-600 dark:text-zinc-300">
          <input
            type="checkbox"
            checked={acceptedTerms}
            onChange={(e) => setAcceptedTerms(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-zinc-300 text-[var(--mp-teal)]"
          />
          <span>
            Akceptuję{" "}
            <Link href="/regulamin" target="_blank" className="font-semibold text-[var(--mp-teal-dark)] underline underline-offset-2">
              regulamin
            </Link>{" "}
            rezerwacji boiska.
          </span>
        </label>
        <Button className="mt-5 w-full font-black uppercase tracking-[0.12em]" disabled={!selected || busy || !acceptedTerms} onClick={bookAndPay}>
          {busy ? "Tworzenie rezerwacji..." : isLoggedIn ? "Zarezerwuj i opłać" : "Zaloguj się, aby zarezerwować"}
        </Button>
      </aside>
    </div>
  );
}
