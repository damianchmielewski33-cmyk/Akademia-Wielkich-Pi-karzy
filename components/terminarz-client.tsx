"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { MatchRow } from "@/lib/db";
import type { PlayersDataEntry } from "@/lib/terminarz-shared";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

type Props = {
  upcoming: MatchRow[];
  afterDate: MatchRow[];
  playedConfirmed: MatchRow[];
  allMatches: MatchRow[];
  playersData: Record<number, PlayersDataEntry>;
  userSigned: Record<number, boolean>;
  isLoggedIn: boolean;
  isAdmin: boolean;
};

const todayISO = () => new Date().toISOString().slice(0, 10);

function rowClass(signed: number, max: number) {
  if (max <= 0) return "bg-slate-50";
  const p = (signed / max) * 100;
  if (p < 50) return "bg-emerald-50/90 border-l-4 border-l-emerald-500";
  if (p < 80) return "bg-amber-50/90 border-l-4 border-l-amber-500";
  return "bg-red-50/80 border-l-4 border-l-red-500";
}

export function TerminarzClient({
  upcoming,
  afterDate,
  playedConfirmed,
  allMatches,
  playersData,
  userSigned,
  isLoggedIn,
  isAdmin,
}: Props) {
  const router = useRouter();
  const [view, setView] = useState<"list" | "cal">("list");
  const [filter, setFilter] = useState("all");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [onlyMine, setOnlyMine] = useState(false);
  const [calYear, setCalYear] = useState(() => new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(() => new Date().getMonth());
  const [addOpen, setAddOpen] = useState(false);
  const [playersOpen, setPlayersOpen] = useState(false);
  const [selectedMatchId, setSelectedMatchId] = useState<number | null>(null);
  const [calPopup, setCalPopup] = useState<MatchRow | null>(null);

  const filteredUpcoming = useMemo(() => {
    const t = todayISO();
    let rows = [...upcoming];
    rows = rows.filter((m) => {
      const free = m.max_slots - m.signed_up;
      if (filter === "free" && free <= 0) return false;
      if (filter === "full" && free > 0) return false;
      if (filter === "future" && m.match_date < t) return false;
      if (filter === "past" && m.match_date >= t) return false;
      if (onlyMine && !userSigned[m.id]) return false;
      return true;
    });
    rows.sort((a, b) => {
      const da = `${a.match_date} ${a.match_time}`;
      const db = `${b.match_date} ${b.match_time}`;
      return sortDir === "asc" ? da.localeCompare(db) : db.localeCompare(da);
    });
    return rows;
  }, [upcoming, filter, sortDir, onlyMine, userSigned]);

  const stats = useMemo(() => {
    const t = todayISO();
    let total = 0,
      free = 0,
      full = 0,
      past = 0;
    for (const m of filteredUpcoming) {
      total++;
      const fs = m.max_slots - m.signed_up;
      if (fs > 0) free++;
      else full++;
      if (m.match_date < t) past++;
    }
    return { total, free, full, past };
  }, [filteredUpcoming]);

  async function signup(id: number) {
    const res = await fetch(`/api/terminarz/signup/${id}`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401) {
      window.location.href = "/login";
      return;
    }
    if (!res.ok) {
      toast.error(typeof data.error === "string" ? data.error : "Blad");
      return;
    }
    toast.success("Zapisano");
    router.refresh();
  }

  async function unsubscribe(id: number) {
    const res = await fetch(`/api/terminarz/unsubscribe/${id}`, { method: "POST" });
    if (res.status === 401) {
      window.location.href = "/login";
      return;
    }
    if (!res.ok) {
      toast.error("Nie udalo sie wypisac");
      return;
    }
    toast.success("Wypisano");
    router.refresh();
  }

  async function setPlayed(id: number, played: boolean) {
    const path = played ? "set-played" : "unset-played";
    const res = await fetch(`/api/admin/match/${id}/${path}`, { method: "POST" });
    if (!res.ok) {
      toast.error("Brak uprawnien lub blad");
      return;
    }
    toast.success("Zaktualizowano");
    router.refresh();
  }

  function openPlayers(mid: number) {
    setSelectedMatchId(mid);
    setPlayersOpen(true);
  }

  const selectedData = selectedMatchId != null ? playersData[selectedMatchId] : null;

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-emerald-950">Terminarz</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant={view === "list" ? "default" : "outline"}
            size="sm"
            onClick={() => setView("list")}
          >
            Lista
          </Button>
          <Button
            type="button"
            variant={view === "cal" ? "default" : "outline"}
            size="sm"
            onClick={() => setView("cal")}
          >
            Kalendarz
          </Button>
          {isAdmin && (
            <Button type="button" size="sm" variant="secondary" onClick={() => setAddOpen(true)}>
              Dodaj mecz
            </Button>
          )}
        </div>
      </div>

      <Card className="mt-4 border-emerald-100 bg-emerald-50/50 p-4 text-sm">
        <div className="flex flex-wrap gap-4">
          <span>
            Mecze: <strong>{stats.total}</strong>
          </span>
          <span>
            Wolne: <strong>{stats.free}</strong>
          </span>
          <span>
            Pelne: <strong>{stats.full}</strong>
          </span>
          <span>
            Po terminie (w filtrze): <strong>{stats.past}</strong>
          </span>
        </div>
      </Card>

      <div className="mt-4 flex flex-wrap gap-2 rounded-xl border border-emerald-100 bg-white/80 p-3">
        <select
          className="rounded-lg border border-emerald-200 px-3 py-2 text-sm"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="all">Wszystkie mecze</option>
          <option value="free">Wolne miejsca</option>
          <option value="full">Pelne</option>
          <option value="future">Przyszle</option>
          <option value="past">Po terminie</option>
        </select>
        <select
          className="rounded-lg border border-emerald-200 px-3 py-2 text-sm"
          value={sortDir}
          onChange={(e) => setSortDir(e.target.value as "asc" | "desc")}
        >
          <option value="asc">Najblizsze najpierw</option>
          <option value="desc">Najdalsze najpierw</option>
        </select>
        <Button
          type="button"
          variant={onlyMine ? "default" : "outline"}
          size="sm"
          onClick={() => setOnlyMine((v) => !v)}
        >
          Tylko moje
        </Button>
      </div>

      {view === "list" ? (
        <div className="mt-6 space-y-10">
          <section>
            <h2 className="mb-3 border-b border-emerald-200 pb-2 text-lg font-semibold text-emerald-900">
              Nadchodzace mecze
            </h2>
            <div className="overflow-x-auto rounded-xl border border-emerald-100 bg-white">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="bg-emerald-800 text-white">
                  <tr>
                    <th className="p-3 text-left">Data</th>
                    <th className="p-3 text-left">Godzina</th>
                    <th className="p-3 text-left">Lokalizacja</th>
                    <th className="p-3 text-left">Zapisani</th>
                    <th className="p-3 text-left">Akcje</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUpcoming.map((m) => {
                    const pct = m.max_slots > 0 ? (m.signed_up / m.max_slots) * 100 : 0;
                    return (
                      <tr key={m.id} className={rowClass(m.signed_up, m.max_slots)}>
                        <td className="p-3 font-semibold">{m.match_date}</td>
                        <td className="p-3">{m.match_time}</td>
                        <td className="p-3">
                          <Badge variant="secondary">{m.location}</Badge>
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(m.location)}`}
                            target="_blank"
                            rel="noreferrer"
                            className="ml-2 text-xs text-emerald-700 underline"
                          >
                            Maps
                          </a>
                        </td>
                        <td className="p-3">
                          <div className="font-bold">
                            {m.signed_up}/{m.max_slots}
                          </div>
                          <div className="mt-1 h-2 w-full max-w-[200px] overflow-hidden rounded-full bg-emerald-200">
                            <div
                              className="h-full bg-emerald-500 transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </td>
                        <td className="space-y-2 p-3">
                          {isLoggedIn ? (
                            userSigned[m.id] ? (
                              <Button size="sm" variant="destructive" onClick={() => unsubscribe(m.id)}>
                                Wypisz
                              </Button>
                            ) : m.signed_up < m.max_slots ? (
                              <Button size="sm" onClick={() => signup(m.id)}>
                                Zapisz sie
                              </Button>
                            ) : (
                              <span className="text-amber-700">Brak miejsc</span>
                            )
                          ) : (
                            <span className="text-emerald-800/50">Zaloguj sie</span>
                          )}
                          {isAdmin && (
                            <Button
                              size="sm"
                              variant="secondary"
                              className="ml-0 block sm:ml-2 sm:inline-block"
                              onClick={() => setPlayed(m.id, true)}
                            >
                              Potwierdz rozegranie
                            </Button>
                          )}
                          <Button size="sm" variant="outline" onClick={() => openPlayers(m.id)}>
                            Lista zawodnikow
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredUpcoming.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-emerald-800/60">
                        Brak meczow w tym widoku.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="mb-3 border-b border-emerald-200 pb-2 text-lg font-semibold text-emerald-900">
              Mecze po terminie (nierozegrane)
            </h2>
            <div className="overflow-x-auto rounded-xl border border-emerald-100 bg-white">
              <table className="w-full min-w-[600px] text-sm">
                <thead className="bg-emerald-800 text-white">
                  <tr>
                    <th className="p-3 text-left">Data</th>
                    <th className="p-3 text-left">Godzina</th>
                    <th className="p-3 text-left">Lokalizacja</th>
                    <th className="p-3 text-left">Zapisani</th>
                    <th className="p-3 text-left">Admin</th>
                  </tr>
                </thead>
                <tbody>
                  {afterDate.map((m) => {
                    const pd = playersData[m.id];
                    const n = pd?.players.length ?? 0;
                    return (
                      <tr key={m.id} className="border-b border-emerald-100 bg-amber-50/50">
                        <td className="p-3">{m.match_date}</td>
                        <td className="p-3">{m.match_time}</td>
                        <td className="p-3">{m.location}</td>
                        <td className="p-3">
                          {n}/{m.max_slots}
                        </td>
                        <td className="space-x-2 p-3">
                          {isAdmin && (
                            <Button size="sm" onClick={() => setPlayed(m.id, true)}>
                              Potwierdz rozegranie
                            </Button>
                          )}
                          <Button size="sm" variant="outline" onClick={() => openPlayers(m.id)}>
                            Lista
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                  {afterDate.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-4 text-center text-emerald-800/50">
                        Brak
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="mb-3 border-b border-emerald-200 pb-2 text-lg font-semibold text-emerald-900">
              Rozegrane
            </h2>
            <div className="overflow-x-auto rounded-xl border border-emerald-100 bg-white">
              <table className="w-full min-w-[560px] text-sm">
                <thead className="bg-emerald-800 text-white">
                  <tr>
                    <th className="p-3 text-left">Data</th>
                    <th className="p-3 text-left">Godzina</th>
                    <th className="p-3 text-left">Lokalizacja</th>
                    <th className="p-3 text-left">Zapisani</th>
                    <th className="p-3 text-left">Akcje</th>
                  </tr>
                </thead>
                <tbody>
                  {playedConfirmed.map((m) => (
                    <tr key={m.id} className="border-b border-emerald-100 bg-red-50/40">
                      <td className="p-3">{m.match_date}</td>
                      <td className="p-3">{m.match_time}</td>
                      <td className="p-3">{m.location}</td>
                      <td className="p-3">
                        {m.signed_up}/{m.max_slots}
                      </td>
                      <td className="p-3">
                        {isAdmin ? (
                          <Button size="sm" variant="secondary" onClick={() => setPlayed(m.id, false)}>
                            Cofnij rozegranie
                          </Button>
                        ) : (
                          <span className="text-emerald-800/50">Rozegrany</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {playedConfirmed.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-4 text-center">
                        Brak rozegranych meczow.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      ) : (
        <CalendarView
          year={calYear}
          month={calMonth}
          matches={allMatches}
          onPrev={() => {
            if (calMonth === 0) {
              setCalMonth(11);
              setCalYear((y) => y - 1);
            } else setCalMonth((m) => m - 1);
          }}
          onNext={() => {
            if (calMonth === 11) {
              setCalMonth(0);
              setCalYear((y) => y + 1);
            } else setCalMonth((m) => m + 1);
          }}
          onPick={setCalPopup}
        />
      )}

      <Dialog open={Boolean(calPopup)} onOpenChange={(o) => !o && setCalPopup(null)}>
        <DialogContent>
          {calPopup && (
            <>
              <DialogHeader>
                <DialogTitle>{calPopup.match_date}</DialogTitle>
              </DialogHeader>
              <p>Godzina: {calPopup.match_time}</p>
              <p>Lokalizacja: {calPopup.location}</p>
              <p>
                Zapisani: {calPopup.signed_up}/{calPopup.max_slots}
              </p>
              <p>Status: {calPopup.played ? "Rozegrany" : "Nierozegrany"}</p>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(calPopup.location)}`}
                target="_blank"
                rel="noreferrer"
                className="text-emerald-700 underline"
              >
                Google Maps
              </a>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={playersOpen} onOpenChange={setPlayersOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedData
                ? `Zawodnicy – ${selectedData.date} ${selectedData.time}`
                : "Zawodnicy"}
            </DialogTitle>
          </DialogHeader>
          {selectedData && (
            <>
              <p className="text-sm text-emerald-800/80">{selectedData.location}</p>
              <p className="text-sm">
                Zapisani: {selectedData.players.length}/{selectedData.max}
              </p>
              <ul className="mt-3 space-y-2">
                {selectedData.players.map((p, i) => (
                  <li key={i} className="flex items-center gap-2 border-b border-emerald-100 pb-2 text-sm">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">
                      {p.initials}
                    </span>
                    <span>
                      {p.name} ({p.zawodnik})
                    </span>
                    {p.paid ? (
                      <Badge>oplacone</Badge>
                    ) : (
                      <Badge variant="secondary">do zaplaty</Badge>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}
        </DialogContent>
      </Dialog>

      <AddMatchDialog open={addOpen} onOpenChange={setAddOpen} onDone={() => router.refresh()} />
    </>
  );
}

function CalendarView({
  year,
  month,
  matches,
  onPrev,
  onNext,
  onPick,
}: {
  year: number;
  month: number;
  matches: MatchRow[];
  onPrev: () => void;
  onNext: () => void;
  onPick: (m: MatchRow) => void;
}) {
  const names = [
    "Styczen",
    "Luty",
    "Marzec",
    "Kwiecien",
    "Maj",
    "Czerwiec",
    "Lipiec",
    "Sierpien",
    "Wrzesien",
    "Pazdziernik",
    "Listopad",
    "Grudzien",
  ];
  const dayNames = ["Pn", "Wt", "Sr", "Cz", "Pt", "So", "Nd"];
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const daysInMonth = last.getDate();
  let start = first.getDay();
  if (start === 0) start = 7;
  const today = new Date();
  const todayStr = todayISO();

  const byDate: Record<string, MatchRow[]> = {};
  for (const m of matches) {
    if (!byDate[m.match_date]) byDate[m.match_date] = [];
    byDate[m.match_date].push(m);
  }

  const cells: ReactNode[] = [];
  for (let i = 1; i < start; i++) {
    cells.push(<div key={`e-${i}`} className="min-h-[72px] rounded-lg border border-dashed border-emerald-200/60 bg-emerald-50/30" />);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const ds = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const list = byDate[ds] ?? [];
    const isToday =
      d === today.getDate() && month === today.getMonth() && year === today.getFullYear();
    cells.push(
      <div
        key={d}
        className={`min-h-[104px] rounded-xl border border-emerald-100 bg-white p-2 shadow-sm ${isToday ? "ring-2 ring-emerald-600" : ""}`}
      >
        <div className="text-sm font-bold text-emerald-950">{d}</div>
        <div className="mt-1 space-y-1">
          {list.map((m) => {
            const free = m.max_slots - m.signed_up;
            const past = ds < todayStr;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => onPick(m)}
                className={`block w-full rounded-md px-1 py-0.5 text-left text-[11px] leading-tight ${
                  free <= 0 ? "bg-red-100 text-red-900" : "bg-emerald-100 text-emerald-900"
                } ${past ? "opacity-70" : ""}`}
              >
                {m.match_time} {m.location.slice(0, 12)}
                {m.location.length > 12 ? "…" : ""}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4">
      <div className="mb-3 flex items-center justify-between">
        <Button type="button" size="sm" variant="outline" onClick={onPrev}>
          Poprzedni
        </Button>
        <span className="font-bold text-emerald-950">
          {names[month]} {year}
        </span>
        <Button type="button" size="sm" variant="outline" onClick={onNext}>
          Nastepny
        </Button>
      </div>
      <div className="mb-2 grid grid-cols-7 gap-2 text-center text-xs font-bold uppercase text-emerald-800/70">
        {dayNames.map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-2">{cells}</div>
    </div>
  );
}

function AddMatchDialog({
  open,
  onOpenChange,
  onDone,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onDone: () => void;
}) {
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload = {
      location: String(fd.get("location") || ""),
      date: String(fd.get("date") || ""),
      time: String(fd.get("time") || ""),
      max_slots: Number(fd.get("max_slots") || 1),
    };
    const res = await fetch("/api/terminarz/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      toast.error("Nie dodano meczu");
      return;
    }
    onOpenChange(false);
    onDone();
    toast.success("Mecz dodany");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Dodaj mecz</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <Label>Lokalizacja</Label>
            <Input name="location" required className="mt-1" />
          </div>
          <div>
            <Label>Data</Label>
            <Input name="date" type="date" required className="mt-1" />
          </div>
          <div>
            <Label>Godzina</Label>
            <Input name="time" type="time" required className="mt-1" />
          </div>
          <div>
            <Label>Ilosc miejsc</Label>
            <Input name="max_slots" type="number" min={1} required className="mt-1" defaultValue={10} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Anuluj
            </Button>
            <Button type="submit">Zapisz</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
