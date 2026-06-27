"use client";

import { useEffect, useState } from "react";
import { Loader2, Pencil, UserPlus, XCircle } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import type { MatchRow } from "@/lib/db";
import { MATCH_CANCEL_REASONS } from "@/lib/match-cancel-reasons";
import { AppModal } from "@/components/ui/app-modal";
import {
  ModalAlert,
  ModalMatchSummary,
  modalPanelClass,
  modalTabListClass,
  modalTabTriggerClass,
} from "@/components/ui/modal-shared";
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

const tabTriggerClass = modalTabTriggerClass;

const panelClass = modalPanelClass;

const readOnlyInputClass =
  "cursor-default border-emerald-100/90 bg-white/70 text-emerald-950 dark:border-emerald-800/50 dark:bg-zinc-900/50 dark:text-emerald-100";

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

  function renderFooter() {
    if (isCancelled) {
      return (
        <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
          Zamknij
        </Button>
      );
    }

    if (tab === "edit") {
      if (isEditing) {
        return (
          <>
            <Button type="button" variant="outline" disabled={busy} onClick={cancelEdit}>
              Anuluj edycję
            </Button>
            <Button type="button" variant="pitch" disabled={busy} onClick={() => void saveEdit()}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
              Zapisz zmiany
            </Button>
          </>
        );
      }
      return (
        <>
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
            Zamknij
          </Button>
          <Button type="button" variant="pitch" onClick={() => setIsEditing(true)}>
            <Pencil className="h-4 w-4" aria-hidden />
            Edytuj termin
          </Button>
        </>
      );
    }

    if (tab === "guest") {
      return (
        <>
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={busy}>
            Zamknij
          </Button>
          <Button type="button" variant="pitch" disabled={busy} onClick={() => void addGuest()}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
            <UserPlus className="h-4 w-4" aria-hidden />
            Dodaj gościa
          </Button>
        </>
      );
    }

    return (
      <>
        <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={busy}>
          Zamknij
        </Button>
        <Button type="button" variant="destructive" disabled={busy} onClick={() => void cancelMatch()}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
          Anuluj mecz
        </Button>
      </>
    );
  }

  return (
    <AppModal
      open={open}
      onOpenChange={handleOpenChange}
      size="lg"
      scrollable
      title="Zarządzaj meczem"
      description="Edytuj termin, dopisz gościa lub odwołaj mecz — zmiany widzą zapisani zawodnicy."
      footer={renderFooter()}
      contentClassName="space-y-4"
    >
      <ModalMatchSummary match={match} />

      {isCancelled ? (
        <ModalAlert tone="danger" title="Ten mecz został anulowany">
          {match.cancellation_reason ? <>Powód: {match.cancellation_reason}</> : null}
        </ModalAlert>
      ) : (
        <Tabs
          value={tab}
          onValueChange={(value) => {
            setTab(value as ManageTab);
            setIsEditing(false);
            editForm.reset(matchToFormValues(match));
          }}
        >
          <TabsList className={cn(modalTabListClass, "grid-cols-3")}>
            <TabsTrigger value="edit" className={tabTriggerClass}>
              <Pencil className="mr-1.5 h-3.5 w-3.5" aria-hidden />
              Edycja
            </TabsTrigger>
            <TabsTrigger value="guest" className={tabTriggerClass}>
              <UserPlus className="mr-1.5 h-3.5 w-3.5" aria-hidden />
              Gość
            </TabsTrigger>
            <TabsTrigger
              value="cancel"
              className={cn(tabTriggerClass, "data-[state=active]:text-red-800 dark:data-[state=active]:text-red-200")}
            >
              <XCircle className="mr-1.5 h-3.5 w-3.5" aria-hidden />
              Anuluj
            </TabsTrigger>
          </TabsList>

          <TabsContent value="edit" className="mt-4 space-y-3">
            <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              {isEditing
                ? "Zmień datę, godzinę, miejsce lub liczbę miejsc w składzie. Zapisani zawodnicy zobaczą zaktualizowany termin."
                : "Podgląd aktualnych ustawień meczu. Kliknij „Edytuj termin”, aby wprowadzić zmiany."}
            </p>
            <div className={cn(panelClass, "space-y-3")}>
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
            </div>
          </TabsContent>

          <TabsContent value="guest" className="mt-4 space-y-3">
            <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              Zapisz osobę grającą jednorazowo. Po potwierdzeniu płatności za mecz gość zostanie automatycznie usunięty z bazy.
            </p>
            <div className={cn(panelClass, "space-y-3")}>
              <FormInput
                id="mm-gfirst"
                label="Imię"
                required
                value={guestForm.values.guestFirst}
                onChange={(e) => guestForm.setValue("guestFirst", e.target.value)}
                onBlur={() => guestForm.setFieldTouched("guestFirst")}
                error={guestForm.errors.guestFirst}
                disabled={busy}
              />
              <FormInput
                id="mm-glast"
                label="Nazwisko"
                required
                value={guestForm.values.guestLast}
                onChange={(e) => guestForm.setValue("guestLast", e.target.value)}
                onBlur={() => guestForm.setFieldTouched("guestLast")}
                error={guestForm.errors.guestLast}
                disabled={busy}
              />
              <FormInput
                id="mm-galias"
                label="Pseudonim (unikalny)"
                required
                value={guestForm.values.guestAlias}
                onChange={(e) => guestForm.setValue("guestAlias", e.target.value)}
                onBlur={() => guestForm.setFieldTouched("guestAlias")}
                error={guestForm.errors.guestAlias}
                disabled={busy}
              />
            </div>
          </TabsContent>

          <TabsContent value="cancel" className="mt-4 space-y-3">
            <ModalAlert tone="danger">
              Anulowanie oznacza termin jako odwołany. Zapisani zawodnicy zostaną poinformowani o powodzie — tej operacji nie cofniesz z tego okna.
            </ModalAlert>
            <div className={panelClass}>
              <FormSelectField id="mm-reason" label="Powód anulacji" required>
                <Select value={cancelReason} onValueChange={setCancelReason} disabled={busy}>
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
            </div>
          </TabsContent>
        </Tabs>
      )}
    </AppModal>
  );
}
