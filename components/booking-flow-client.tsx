"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "@/lib/app-toast";
import type { AvailabilitySlot, PitchPublic, VenueRow } from "@/lib/booking-shared";
import { BOOKING_FREE_CANCEL_HOURS, bookingCancelDeadline, formatPlDateTime } from "@/lib/booking-shared";
import { Button } from "@/components/ui/button";
import { FormInput, FormTextarea } from "@/components/ui/form-field";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Props = {
  venue: VenueRow;
  pitches: PitchPublic[];
  isLoggedIn: boolean;
  userName: string;
  initialDate?: string;
  initialTime?: string;
};

const WEEKDAY_SHORT = ["nd", "pn", "wt", "śr", "cz", "pt", "sb"] as const;

function localYmd(d = new Date()) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function nextDays(count = 7) {
  const start = new Date();
  start.setHours(12, 0, 0, 0);
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return {
      iso: localYmd(d),
      day: d.getDate(),
      weekday: WEEKDAY_SHORT[d.getDay()] ?? "",
    };
  });
}

export function BookingFlowClient({ venue, pitches, isLoggedIn, userName, initialDate, initialTime }: Props) {
  const router = useRouter();
  const [pitchId, setPitchId] = useState(() => pitches[0]?.id ?? 0);
  const [date, setDate] = useState(initialDate && /^\d{4}-\d{2}-\d{2}$/.test(initialDate) ? initialDate : localYmd());
  const days = useMemo(() => nextDays(8), []);
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [selected, setSelected] = useState<AvailabilitySlot | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [busy, setBusy] = useState(false);
  const [contactName, setContactName] = useState(userName);
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
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
  }, [pitchId, date, initialTime]);

  async function bookAndPay() {
    if (!pitch || !selected) return;
    if (!contactName.trim() || !contactPhone.trim()) {
      toast.error("Podaj imię i telefon kontaktowy");
      return;
    }
    if (!isLoggedIn && !contactEmail.trim()) {
      toast.error("Podaj e-mail — potwierdzenie przyjdzie bez PIN-u akademii");
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
          contact_email: contactEmail || undefined,
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
        toast.success("Termin zablokowany na 15 minut. Opłać go z listy rezerwacji — link jest też na mailu.");
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
        <div className="flex flex-wrap gap-2">
          {pitches.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPitchId(p.id)}
              className={cn(
                "rounded-full border px-4 py-2 text-sm font-bold transition",
                pitchId === p.id
                  ? "border-[var(--mp-teal)] bg-[var(--mp-teal)] text-white"
                  : "border-zinc-200 bg-zinc-50 hover:border-[var(--mp-teal)] dark:border-zinc-700 dark:bg-zinc-900"
              )}
            >
              {p.name}
            </button>
          ))}
        </div>

        <div className="mt-5 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]">
          {days.map((day) => (
            <button
              key={day.iso}
              type="button"
              onClick={() => setDate(day.iso)}
              className={cn(
                "flex min-w-[4.25rem] flex-col items-center rounded-2xl border px-3 py-2 text-center",
                date === day.iso
                  ? "border-[var(--mp-teal)] bg-[var(--mp-teal)] text-white"
                  : "border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900"
              )}
            >
              <span className="text-[0.65rem] font-bold uppercase tracking-wider">{day.weekday}</span>
              <span className="text-lg font-black">{day.day}</span>
            </button>
          ))}
        </div>

        {pitch ? (
          <div className="mt-5 flex flex-wrap gap-2">
            <Badge>{pitch.surface}</Badge>
            <Badge>{pitch.players} osób</Badge>
            {pitch.indoor ? <Badge>Kryte</Badge> : <Badge>Otwarte</Badge>}
            {pitch.lighting ? <Badge>Oświetlenie</Badge> : null}
          </div>
        ) : null}

        <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
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
                  "rounded-2xl border px-3 py-3 text-left transition disabled:cursor-not-allowed",
                  !slot.available
                    ? "border-zinc-100 bg-zinc-100 text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900"
                    : selected?.start_time === slot.start_time
                      ? "border-[var(--mp-teal)] bg-[var(--mp-teal)] text-white shadow-lg"
                      : "border-zinc-200 bg-zinc-50 hover:border-[var(--mp-teal)] dark:border-zinc-800 dark:bg-zinc-900"
                )}
              >
                <span className="block font-semibold">
                  {slot.start_time}–{slot.end_time}
                </span>
                <span className="text-sm opacity-80">
                  {slot.available ? `${slot.amount_pln.toFixed(0)} zł` : "Zajęte"}
                </span>
              </button>
            ))
          )}
        </div>
      </section>

      <aside className="h-fit rounded-3xl border border-zinc-200 bg-white p-5 text-zinc-950 shadow-sm lg:sticky lg:top-24 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50">
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
        <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-300">
          {selected
            ? `Bezpłatne anulowanie do ${formatPlDateTime(bookingCancelDeadline(selected.date, selected.start_time))} (${BOOKING_FREE_CANCEL_HOURS} godz. przed startem). Po tym terminie nie wycofasz rezerwacji samodzielnie.`
            : `Bezpłatne anulowanie do ${BOOKING_FREE_CANCEL_HOURS} godzin przed początkiem slotu. Po opłaceniu termin możesz wycofać z listy rezerwacji.`}
        </p>
        <p className="mt-1 text-xs text-zinc-500">
          Anulowanie zwalnia slot. Zwrot płatności HotPay potwierdza organizator.
        </p>
        <div className="mt-5 space-y-3">
          <FormInput label="Imię i nazwisko" value={contactName} onChange={(e) => setContactName(e.target.value)} />
          <FormInput label="Telefon" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
          <FormInput
            label={isLoggedIn ? "E-mail (potwierdzenie)" : "E-mail — potwierdzenie bez PIN-u"}
            type="email"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
          />
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
          {busy ? "Tworzenie rezerwacji..." : "Zarezerwuj i opłać"}
        </Button>
        {!isLoggedIn ? (
          <p className="mt-3 text-center text-xs text-zinc-500">
            Bez konta akademii. Potwierdzenie przyjdzie na e-mail.
          </p>
        ) : null}
      </aside>
    </div>
  );
}
