"use client";

import { useEffect, useState } from "react";
import { Loader2, Pencil, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import type { MatchRow } from "@/lib/db";
import { MATCH_CANCEL_REASONS } from "@/lib/match-cancel-reasons";
import { AppModal } from "@/components/ui/app-modal";
import { Button } from "@/components/ui/button";
import { FormInput, FormSelectField } from "@/components/ui/form-field";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formSchemas, useValidatedForm } from "@/lib/form-validation";

type ManageTab = "edit" | "guest" | "cancel";

type Props = {
  match: MatchRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
  initialTab?: ManageTab;
};

const editSchema = z.object({
  date: formSchemas.matchDate,
  time: formSchemas.matchTime,
  location: formSchemas.matchLocation,
  maxSlots: formSchemas.maxSlots,
});

const guestSchema = z.object({
  guestFirst: formSchemas.requiredName("Imię"),
  guestLast: formSchemas.requiredName("Nazwisko"),
  guestAlias: formSchemas.playerAlias,
});

const readOnlyInputClass =
  "cursor-default border-emerald-100/90 bg-zinc-50/80 text-emerald-950 dark:border-zinc-700 dark:bg-zinc-800/80 dark:text-emerald-100";

function matchToFormValues(m: MatchRow) {
  return {
    date: m.match_date,
    time: m.match_time.length >= 5 ? m.match_time.slice(0, 5) : m.match_time,
    location: m.location,
    maxSlots: m.max_slots,
  };
}

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

export function MatchManageDialog({ match, open, onOpenChange, onDone, initialTab = "edit" }: Props) {
  const [tab, setTab] = useState<ManageTab>("edit");
  const [cancelReason, setCancelReason] = useState("weather");
  const [busy, setBusy] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const editForm = useValidatedForm({
    initialValues: { date: "", time: "", location: "", maxSlots: 10 },
    schema: editSchema,
  });

  const guestForm = useValidatedForm({
    initialValues: { guestFirst: "", guestLast: "", guestAlias: "" },
    schema: guestSchema,
  });

  useEffect(() => {
    if (!open || !match) return;
    editForm.reset(matchToFormValues(match));
    guestForm.reset({ guestFirst: "", guestLast: "", guestAlias: "" });
    setTab(initialTab);
    setCancelReason("weather");
    setIsEditing(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- form reset only when dialog opens or match/tab changes
  }, [open, match?.id, initialTab]);

  const handleOpenChange = (next: boolean) => {
    if (!next) setIsEditing(false);
    onOpenChange(next);
  };

  function cancelEdit() {
    if (match) editForm.reset(matchToFormValues(match));
    setIsEditing(false);
  }

  if (!match) return null;

  const isCancelled = match.cancelled === 1;

  async function saveEdit() {
    if (!match || !editForm.validate()) return;
    const { date, time, location, maxSlots } = editForm.values;
    setBusy(true);
    try {
      const r = await fetchJson<{ status: string }>(`/api/admin/match/${match.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          time,
          location: location.trim(),
          max_slots: maxSlots,
        }),
      });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("Mecz zaktualizowany");
      setIsEditing(false);
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
      handleOpenChange(false);
      onDone();
    } finally {
      setBusy(false);
    }
  }

  async function addGuest() {
    if (!match || !guestForm.validate()) return;
    const { guestFirst, guestLast, guestAlias } = guestForm.values;
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
      guestForm.reset({ guestFirst: "", guestLast: "", guestAlias: "" });
      onDone();
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppModal
      open={open}
      onOpenChange={handleOpenChange}
      size="md"
      scrollable
      title="Zarządzaj meczem"
      description={`${match.match_date} · ${match.match_time} · ${match.location}`}
    >
      {isCancelled ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-800 dark:bg-red-950/40 dark:text-red-100">
          Ten mecz został anulowany
          {match.cancellation_reason ? `: ${match.cancellation_reason}` : ""}.
        </div>
      ) : (
        <Tabs value={tab} onValueChange={(value) => setTab(value as ManageTab)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="edit">Edycja</TabsTrigger>
            <TabsTrigger value="guest">Gość</TabsTrigger>
            <TabsTrigger value="cancel">Anuluj</TabsTrigger>
          </TabsList>

          <TabsContent value="edit" className="mt-4 space-y-3">
            <FormInput
              id="mm-date"
              label="Data"
              required
              type="date"
              readOnly={!isEditing}
              disabled={!isEditing || busy}
              value={editForm.values.date}
              onChange={(e) => editForm.setValue("date", e.target.value)}
              onBlur={() => editForm.setFieldTouched("date")}
              error={editForm.errors.date}
              inputClassName={cn(!isEditing && readOnlyInputClass)}
            />
            <FormInput
              id="mm-time"
              label="Godzina"
              required
              type="time"
              readOnly={!isEditing}
              disabled={!isEditing || busy}
              value={editForm.values.time}
              onChange={(e) => editForm.setValue("time", e.target.value)}
              onBlur={() => editForm.setFieldTouched("time")}
              error={editForm.errors.time}
              inputClassName={cn(!isEditing && readOnlyInputClass)}
            />
            <FormInput
              id="mm-location"
              label="Miejsce"
              required
              readOnly={!isEditing}
              disabled={!isEditing || busy}
              value={editForm.values.location}
              onChange={(e) => editForm.setValue("location", e.target.value)}
              onBlur={() => editForm.setFieldTouched("location")}
              error={editForm.errors.location}
              inputClassName={cn(!isEditing && readOnlyInputClass)}
            />
            <FormInput
              id="mm-slots"
              label="Liczba graczy (miejsc)"
              required
              type="number"
              min={1}
              readOnly={!isEditing}
              disabled={!isEditing || busy}
              value={String(editForm.values.maxSlots)}
              onChange={(e) => editForm.setValue("maxSlots", Number(e.target.value) || 0)}
              onBlur={() => editForm.setFieldTouched("maxSlots")}
              error={editForm.errors.maxSlots}
              hint={`Obecnie zapisanych: ${match.signed_up}`}
              inputClassName={cn(!isEditing && readOnlyInputClass)}
            />
            <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                Zamknij
              </Button>
              {isEditing ? (
                <>
                  <Button type="button" variant="outline" disabled={busy} onClick={cancelEdit}>
                    Anuluj
                  </Button>
                  <Button type="button" disabled={busy} onClick={() => void saveEdit()}>
                    {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
                    Zapisz zmiany
                  </Button>
                </>
              ) : (
                <Button type="button" onClick={() => setIsEditing(true)}>
                  <Pencil className="mr-2 h-4 w-4" aria-hidden />
                  Edytuj
                </Button>
              )}
            </div>
          </TabsContent>

          <TabsContent value="guest" className="mt-4 space-y-3">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Zapisz osobę grającą jednorazowo. Po potwierdzeniu płatności za mecz gość zostanie automatycznie usunięty z bazy.
            </p>
            <FormInput
              id="mm-gfirst"
              label="Imię"
              required
              value={guestForm.values.guestFirst}
              onChange={(e) => guestForm.setValue("guestFirst", e.target.value)}
              onBlur={() => guestForm.setFieldTouched("guestFirst")}
              error={guestForm.errors.guestFirst}
            />
            <FormInput
              id="mm-glast"
              label="Nazwisko"
              required
              value={guestForm.values.guestLast}
              onChange={(e) => guestForm.setValue("guestLast", e.target.value)}
              onBlur={() => guestForm.setFieldTouched("guestLast")}
              error={guestForm.errors.guestLast}
            />
            <FormInput
              id="mm-galias"
              label="Pseudonim (unikalny)"
              required
              value={guestForm.values.guestAlias}
              onChange={(e) => guestForm.setValue("guestAlias", e.target.value)}
              onBlur={() => guestForm.setFieldTouched("guestAlias")}
              error={guestForm.errors.guestAlias}
            />
            <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                Zamknij
              </Button>
              <Button type="button" disabled={busy} onClick={() => void addGuest()}>
                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
                <UserPlus className="mr-2 h-4 w-4" aria-hidden />
                Dodaj gościa
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="cancel" className="mt-4 space-y-3">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Anulowanie meczu oznacza termin jako odwołany. Zapisani zawodnicy zostaną poinformowani o powodzie.
            </p>
            <FormSelectField id="mm-reason" label="Powód anulacji" required>
              <Select value={cancelReason} onValueChange={setCancelReason}>
                <SelectTrigger>
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
            </FormSelectField>
            <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                Zamknij
              </Button>
              <Button type="button" variant="destructive" disabled={busy} onClick={() => void cancelMatch()}>
                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
                Anuluj mecz
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      )}
    </AppModal>
  );
}
