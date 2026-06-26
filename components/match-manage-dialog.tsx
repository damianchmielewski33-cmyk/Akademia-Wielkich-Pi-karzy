"use client";

import { useState } from "react";
import { Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import type { MatchRow } from "@/lib/db";
import { MATCH_CANCEL_REASONS } from "@/lib/match-cancel-reasons";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Props = {
  match: MatchRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
};

async function fetchJson<T>(
  url: string,
  init?: RequestInit
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  try {
    const res = await fetch(url, init);
    const json = (await res.json().catch(() => null)) as unknown;
    if (!res.ok) {
      const msg = (json as { error?: unknown } | null)?.error;
      return { ok: false, error: typeof msg === "string" ? msg : "Nie udało się wykonać operacji" };
    }
    return { ok: true, data: json as T };
  } catch {
    return { ok: false, error: "Błąd sieci" };
  }
}

export function MatchManageDialog({ match, open, onOpenChange, onDone }: Props) {
  const [tab, setTab] = useState("edit");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");
  const [maxSlots, setMaxSlots] = useState("");
  const [cancelReason, setCancelReason] = useState("weather");
  const [guestFirst, setGuestFirst] = useState("");
  const [guestLast, setGuestLast] = useState("");
  const [guestAlias, setGuestAlias] = useState("");
  const [busy, setBusy] = useState(false);

  const resetForm = (m: MatchRow) => {
    setDate(m.match_date);
    setTime(m.match_time);
    setLocation(m.location);
    setMaxSlots(String(m.max_slots));
    setTab("edit");
    setCancelReason("weather");
    setGuestFirst("");
    setGuestLast("");
    setGuestAlias("");
  };

  const handleOpenChange = (next: boolean) => {
    if (next && match) resetForm(match);
    onOpenChange(next);
  };

  if (!match) return null;

  const isCancelled = match.cancelled === 1;

  async function saveEdit() {
    if (!match) return;
    const slots = Number(maxSlots);
    if (!date || !time || !location.trim()) {
      toast.error("Uzupełnij datę, godzinę i miejsce");
      return;
    }
    if (!Number.isFinite(slots) || slots < 1) {
      toast.error("Liczba miejsc musi być większa niż 0");
      return;
    }
    setBusy(true);
    try {
      const r = await fetchJson<{ status: string }>(`/api/admin/match/${match.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          time,
          location: location.trim(),
          max_slots: slots,
        }),
      });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("Mecz zaktualizowany");
      onOpenChange(false);
      onDone();
    } finally {
      setBusy(false);
    }
  }

  async function cancelMatch() {
    if (!match) return;
    setBusy(true);
    try {
      const r = await fetchJson<{ ok: true }>(`/api/admin/match/${match.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: cancelReason }),
      });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("Mecz anulowany");
      onOpenChange(false);
      onDone();
    } finally {
      setBusy(false);
    }
  }

  async function addGuest() {
    if (!match) return;
    if (!guestFirst.trim() || !guestLast.trim() || !guestAlias.trim()) {
      toast.error("Uzupełnij dane gościa");
      return;
    }
    setBusy(true);
    try {
      const r = await fetchJson<{ ok: true }>(`/api/admin/match/${match.id}/add-guest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: guestFirst.trim(),
          last_name: guestLast.trim(),
          player_alias: guestAlias.trim(),
        }),
      });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("Gość zapisany na mecz");
      setGuestFirst("");
      setGuestLast("");
      setGuestAlias("");
      onDone();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Zarządzaj meczem</DialogTitle>
          <DialogDescription>
            {match.match_date} · {match.match_time} · {match.location}
          </DialogDescription>
        </DialogHeader>

        {isCancelled ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-800 dark:bg-red-950/40 dark:text-red-100">
            Ten mecz został anulowany
            {match.cancellation_reason ? `: ${match.cancellation_reason}` : ""}.
          </div>
        ) : (
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="edit">Edycja</TabsTrigger>
              <TabsTrigger value="guest">Gość</TabsTrigger>
              <TabsTrigger value="cancel">Anuluj</TabsTrigger>
            </TabsList>

            <TabsContent value="edit" className="mt-4 space-y-3">
              <div>
                <Label htmlFor="mm-date">Data</Label>
                <Input id="mm-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label htmlFor="mm-time">Godzina</Label>
                <Input id="mm-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label htmlFor="mm-location">Miejsce</Label>
                <Input
                  id="mm-location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="mm-slots">Liczba graczy (miejsc)</Label>
                <Input
                  id="mm-slots"
                  type="number"
                  min={1}
                  value={maxSlots}
                  onChange={(e) => setMaxSlots(e.target.value)}
                  className="mt-1"
                />
                <p className="mt-1 text-xs text-zinc-500">Obecnie zapisanych: {match.signed_up}</p>
              </div>
              <DialogFooter className="gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Zamknij
                </Button>
                <Button type="button" disabled={busy} onClick={() => void saveEdit()}>
                  {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
                  Zapisz zmiany
                </Button>
              </DialogFooter>
            </TabsContent>

            <TabsContent value="guest" className="mt-4 space-y-3">
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Zapisz osobę grającą jednorazowo. Po potwierdzeniu płatności za mecz gość zostanie automatycznie usunięty
                z bazy.
              </p>
              <div>
                <Label htmlFor="mm-gfirst">Imię</Label>
                <Input id="mm-gfirst" value={guestFirst} onChange={(e) => setGuestFirst(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label htmlFor="mm-glast">Nazwisko</Label>
                <Input id="mm-glast" value={guestLast} onChange={(e) => setGuestLast(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label htmlFor="mm-galias">Pseudonim (unikalny)</Label>
                <Input id="mm-galias" value={guestAlias} onChange={(e) => setGuestAlias(e.target.value)} className="mt-1" />
              </div>
              <DialogFooter className="gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Zamknij
                </Button>
                <Button type="button" disabled={busy} onClick={() => void addGuest()}>
                  {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
                  <UserPlus className="mr-2 h-4 w-4" aria-hidden />
                  Dodaj gościa
                </Button>
              </DialogFooter>
            </TabsContent>

            <TabsContent value="cancel" className="mt-4 space-y-3">
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Anulowanie meczu oznacza termin jako odwołany. Zapisani zawodnicy zostaną poinformowani o powodzie.
              </p>
              <div>
                <Label htmlFor="mm-reason">Powód anulacji</Label>
                <Select value={cancelReason} onValueChange={setCancelReason}>
                  <SelectTrigger id="mm-reason" className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MATCH_CANCEL_REASONS.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter className="gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Zamknij
                </Button>
                <Button type="button" variant="destructive" disabled={busy} onClick={() => void cancelMatch()}>
                  {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
                  Anuluj mecz
                </Button>
              </DialogFooter>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
