"use client";

import { useEffect, useMemo, useState } from "react";
import type { AdminPitchRow, AvailabilitySlot } from "@/lib/booking";
import { cn } from "@/lib/utils";

const WEEKDAY_SHORT = ["nd", "pn", "wt", "śr", "cz", "pt", "sb"] as const;

function localYmd(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function weekDays() {
  const start = new Date();
  start.setHours(12, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return { iso: localYmd(d), label: WEEKDAY_SHORT[d.getDay()] ?? "", day: d.getDate() };
  });
}

type Props = {
  pitches: AdminPitchRow[];
};

export function PartnerWeekCalendar({ pitches }: Props) {
  const days = useMemo(() => weekDays(), []);
  const [pitchId, setPitchId] = useState(0);
  const [byDate, setByDate] = useState<Record<string, AvailabilitySlot[]>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!pitchId && pitches[0]) setPitchId(pitches[0].id);
  }, [pitches, pitchId]);

  useEffect(() => {
    if (!pitchId) return;
    setLoading(true);
    Promise.all(
      days.map((day) =>
        fetch(`/api/partner/pitches/${pitchId}/availability?date=${day.iso}`)
          .then((r) => (r.ok ? r.json() : { slots: [] }))
          .then((data: { slots?: AvailabilitySlot[] }) => [day.iso, data.slots ?? []] as const)
      )
    )
      .then((rows) => setByDate(Object.fromEntries(rows)))
      .catch(() => setByDate({}))
      .finally(() => setLoading(false));
  }, [pitchId, days]);

  if (pitches.length === 0) return null;

  return (
    <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-black">Obłożenie w tym tygodniu</h2>
          <p className="mt-1 text-sm text-zinc-500">Zielone = wolne, szare = zajęte. Tak wygląda grafik w systemach hal.</p>
        </div>
        <select
          value={pitchId}
          onChange={(e) => setPitchId(Number(e.target.value))}
          className="h-10 rounded-xl border border-zinc-300 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        >
          {pitches.map((pitch) => (
            <option key={pitch.id} value={pitch.id}>
              {pitch.venue_name} / {pitch.name}
            </option>
          ))}
        </select>
      </div>
      {loading ? (
        <p className="mt-4 text-sm text-zinc-500">Ładowanie grafiku...</p>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {days.map((day) => {
            const daySlots = byDate[day.iso] ?? [];
            const free = daySlots.filter((s) => s.available).length;
            return (
            <div key={day.iso} className="rounded-2xl border border-zinc-100 p-2 dark:border-zinc-800">
              <p className="text-center text-[0.65rem] font-bold uppercase tracking-wider text-zinc-500">
                {day.label} {day.day}
              </p>
              {daySlots.length > 0 ? (
                <p className="mt-1 text-center text-[0.65rem] font-semibold text-zinc-400">
                  {free}/{daySlots.length} wolne
                </p>
              ) : null}
              <div className="mt-2 space-y-1">
                {daySlots.slice(0, 12).map((slot) => (
                  <div
                    key={`${day.iso}-${slot.start_time}`}
                    className={cn(
                      "rounded-md px-1.5 py-1 text-[0.65rem] font-semibold",
                      slot.available ? "bg-emerald-100 text-emerald-900" : "bg-zinc-100 text-zinc-400 line-through"
                    )}
                  >
                    {slot.start_time}
                  </div>
                ))}
              </div>
            </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
