"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Pencil, UserMinus, UserPlus, Users, XCircle } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import type { MatchRow } from "@/lib/db";
import { MATCH_CANCEL_REASONS } from "@/lib/match-cancel-reasons";
import { PlayerAvatar, PlayerNameStack } from "@/components/player-avatar";
import { AppModal } from "@/components/ui/app-modal";
import {
  ModalAlert,
  ModalLoadingRow,
  ModalMatchSummary,
  modalEmptyStateClass,
  modalListClass,
  modalPanelClass,
  modalTabListClass,
  modalTabTriggerClass,
} from "@/components/ui/modal-shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormInput, FormSelectField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

type ManageTab = "edit" | "guest" | "signups" | "cancel";

type AdminUserRow = {
  id: number;
  first_name: string;
  last_name: string;
  zawodnik: string;
  profile_photo_path: string | null;
};

type MatchSignupRow = {
  user_id: number;
  paid: number;
  commitment: number;
  first_name: string;
  last_name: string;
  zawodnik: string;
  profile_photo_path: string | null;
  is_temporary: number;
};

type Props = {
  match: MatchRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
  initialTab?: ManageTab;
  cancelReasons?: ReadonlyArray<{ value: string; label: string }>;
};

const editSchema = z.object({
  date: formSchemas.matchDate,
  time: formSchemas.matchTime,
  location: formSchemas.matchLocation,
  maxSlots: formSchemas.maxSlots,
  gatePin: formSchemas.gatePin,
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
    gatePin: m.gate_pin?.trim() ?? "",
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

export function MatchManageDialog({
  match,
  open,
  onOpenChange,
  onDone,
  initialTab = "edit",
  cancelReasons = MATCH_CANCEL_REASONS,
}: Props) {
  const [tab, setTab] = useState<ManageTab>("edit");
  const [cancelReason, setCancelReason] = useState("weather");
  const [busy, setBusy] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const [guestRows, setGuestRows] = useState<MatchSignupRow[]>([]);
  const [guestsLoading, setGuestsLoading] = useState(false);
  const [removingGuestId, setRemovingGuestId] = useState<number | null>(null);

  const [adminUsers, setAdminUsers] = useState<AdminUserRow[]>([]);
  const [adminUsersLoaded, setAdminUsersLoaded] = useState(false);
  const [signupsQuery, setSignupsQuery] = useState("");
  const [confirmedSignups, setConfirmedSignups] = useState<MatchSignupRow[]>([]);
  const [signupsLoading, setSignupsLoading] = useState(false);

  const editForm = useValidatedForm({
    initialValues: { date: "", time: "", location: "", maxSlots: 10, gatePin: "" },
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
    setSignupsQuery("");
    setGuestRows([]);
    setConfirmedSignups([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- form reset only when dialog opens or match/tab changes
  }, [open, match?.id, initialTab]);

  useEffect(() => {
    if (!open || !match) return;
    if (tab === "guest") void loadGuests();
    if (tab === "signups") void loadSignupsTab();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load when tab or match changes
  }, [open, match?.id, tab]);

  const handleOpenChange = (next: boolean) => {
    if (!next) setIsEditing(false);
    onOpenChange(next);
  };

  function cancelEdit() {
    if (match) editForm.reset(matchToFormValues(match));
    setIsEditing(false);
  }

  async function loadGuests() {
    if (!match) return;
    setGuestsLoading(true);
    try {
      const r = await fetchJson<{ signups: MatchSignupRow[] }>(`/api/admin/match/${match.id}/signups`);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      setGuestRows((r.data.signups ?? []).filter((s) => Number(s.is_temporary) === 1));
    } finally {
      setGuestsLoading(false);
    }
  }

  async function ensureAdminUsersLoaded() {
    if (adminUsersLoaded) return;
    const r = await fetchJson<AdminUserRow[]>("/api/admin/users");
    if (!r.ok) {
      toast.error(r.error);
      return;
    }
    setAdminUsers(
      (r.data ?? []).map((u) => ({
        id: u.id,
        first_name: u.first_name,
        last_name: u.last_name,
        zawodnik: u.zawodnik,
        profile_photo_path: u.profile_photo_path ?? null,
      }))
    );
    setAdminUsersLoaded(true);
  }

  async function loadSignupsTab() {
    if (!match) return;
    await ensureAdminUsersLoaded();
    setSignupsLoading(true);
    try {
      const r = await fetchJson<{ signups: MatchSignupRow[] }>(`/api/admin/match/${match.id}/signups`);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      const confirmed = (r.data.signups ?? []).filter((s) => Number(s.commitment ?? 1) === 1);
      setConfirmedSignups(confirmed);
    } finally {
      setSignupsLoading(false);
    }
  }

  const signupUserIds = useMemo(() => new Set(confirmedSignups.map((s) => s.user_id)), [confirmedSignups]);

  const filteredAdminUsers = useMemo(() => {
    const q = signupsQuery.trim().toLowerCase();
    if (!q) return adminUsers.slice(0, 30);
    const rows = adminUsers.filter((u) => {
      const key = `${u.first_name} ${u.last_name} ${u.zawodnik}`.toLowerCase();
      return key.includes(q);
    });
    return rows.slice(0, 50);
  }, [adminUsers, signupsQuery]);

  if (!match) return null;

  const isCancelled = match.cancelled === 1;

  async function saveEdit() {
    if (!match || !editForm.validate()) return;
    const { date, time, location, maxSlots, gatePin } = editForm.values;
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
          gate_pin: gatePin.trim(),
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
      await loadGuests();
    } finally {
      setBusy(false);
    }
  }

  async function removeGuest(userId: number) {
    if (!match) return;
    const ok = window.confirm("Czy na pewno chcesz usunąć tego gościnnego piłkarza?");
    if (!ok) return;

    setRemovingGuestId(userId);
    try {
      const r = await fetchJson<{ ok: true }>(`/api/admin/match/${match.id}/remove-guest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId }),
      });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("Gość usunięty");
      onDone();
      await loadGuests();
    } finally {
      setRemovingGuestId(null);
    }
  }

  async function adminAddToMatch(userId: number) {
    if (!match) return;
    setSignupsLoading(true);
    try {
      const r = await fetchJson<{ ok: true }>(`/api/admin/match/${match.id}/signups`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId }),
      });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("Zapisano zawodnika");
      onDone();
      await loadSignupsTab();
    } finally {
      setSignupsLoading(false);
    }
  }

  async function adminRemoveFromMatch(userId: number) {
    if (!match) return;
    setSignupsLoading(true);
    try {
      const r = await fetchJson<{ ok: true }>(`/api/admin/match/${match.id}/signups`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId }),
      });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("Wypisano zawodnika");
      onDone();
      await loadSignupsTab();
    } finally {
      setSignupsLoading(false);
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

    if (tab === "signups") {
      return (
        <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
          Zamknij
        </Button>
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
      description="Edytuj termin, dopisz gościa, zarządzaj zapisami lub odwołaj mecz — zmiany widzą zapisani zawodnicy."
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
          <TabsList className={cn(modalTabListClass, "grid-cols-2 sm:grid-cols-4")}>
            <TabsTrigger value="edit" className={tabTriggerClass}>
              <Pencil className="mr-1.5 h-3.5 w-3.5" aria-hidden />
              Edycja
            </TabsTrigger>
            <TabsTrigger value="guest" className={tabTriggerClass}>
              <UserPlus className="mr-1.5 h-3.5 w-3.5" aria-hidden />
              Gość
            </TabsTrigger>
            <TabsTrigger value="signups" className={tabTriggerClass}>
              <Users className="mr-1.5 h-3.5 w-3.5" aria-hidden />
              Zapisami
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
              <FormInput
                id="mm-gate-pin"
                label="PIN do bramy"
                required
                type="text"
                inputMode="numeric"
                autoComplete="off"
                placeholder="4–6 cyfr"
                readOnly={!isEditing}
                disabled={!isEditing || busy}
                value={editForm.values.gatePin}
                onChange={(e) =>
                  editForm.setValue("gatePin", e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                onBlur={() => editForm.setFieldTouched("gatePin")}
                error={editForm.errors.gatePin}
                hint="Kod na bramę boiska — widoczny na stronie głównej przy najbliższym meczu."
                inputClassName={cn(!isEditing && readOnlyInputClass)}
              />
            </div>
          </TabsContent>

          <TabsContent value="guest" className="mt-4 space-y-3">
            <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              Zapisz osobę grającą jednorazowo. Gość zostanie automatycznie usunięty dopiero, gdy saldo jego portfela wyniesie 0.
            </p>

            {guestsLoading ? (
              <ModalLoadingRow label="Wczytywanie gości…" />
            ) : guestRows.length > 0 ? (
              <div className={modalListClass}>
                {guestRows.map((g) => (
                  <div
                    key={g.user_id}
                    className="flex items-center justify-between gap-3 border-b border-emerald-900/8 px-4 py-3 last:border-b-0 dark:border-emerald-800/40"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <PlayerAvatar
                        photoPath={g.profile_photo_path}
                        firstName={g.first_name}
                        lastName={g.last_name}
                        size="sm"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <PlayerNameStack firstName={g.first_name} lastName={g.last_name} nick={g.zawodnik} />
                          <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-100">
                            Gościnny
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      disabled={removingGuestId === g.user_id || busy}
                      onClick={() => void removeGuest(g.user_id)}
                    >
                      {removingGuestId === g.user_id ? (
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      ) : (
                        "Usuń"
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className={modalEmptyStateClass}>Brak gości zapisanych na ten mecz.</p>
            )}

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

          <TabsContent value="signups" className="mt-4 space-y-3">
            <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              Wyszukaj piłkarza i dopisz albo wypisz z listy. Ta operacja dotyczy tylko potwierdzonych miejsc w składzie.
            </p>

            {signupsLoading ? <ModalLoadingRow label="Przetwarzanie…" /> : null}

            <div className={cn(panelClass, "space-y-3")}>
              <Label htmlFor="mm-signups-q">Szukaj piłkarza</Label>
              <div className="mt-1 flex gap-2">
                <Input
                  id="mm-signups-q"
                  type="text"
                  placeholder="np. Jan Kowalski, KOWAL"
                  value={signupsQuery}
                  onChange={(e) => setSignupsQuery(e.target.value)}
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setAdminUsersLoaded(false);
                    void ensureAdminUsersLoaded();
                  }}
                >
                  Odśwież bazę
                </Button>
              </div>
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                Zapisani (potwierdzeni): <strong className="tabular-nums">{confirmedSignups.length}</strong>
              </p>
            </div>

            {filteredAdminUsers.length === 0 ? (
              <p className={modalEmptyStateClass}>Brak wyników.</p>
            ) : (
              <div className={cn(modalListClass, "max-h-[55vh] space-y-2 p-1")}>
                {filteredAdminUsers.map((u) => {
                  const isSigned = signupUserIds.has(u.id);
                  return (
                    <div
                      key={u.id}
                      className="flex items-center gap-3 rounded-xl border border-emerald-900/10 bg-white px-3 py-2 dark:bg-zinc-900"
                    >
                      <PlayerAvatar
                        photoPath={u.profile_photo_path}
                        firstName={u.first_name}
                        lastName={u.last_name}
                        size="sm"
                        ringClassName={isSigned ? "ring-2 ring-emerald-200/90" : "ring-2 ring-zinc-200/80"}
                      />
                      <div className="min-w-0 flex-1">
                        <PlayerNameStack firstName={u.first_name} lastName={u.last_name} nick={u.zawodnik} />
                        <p className="mt-0.5 text-xs text-zinc-500">ID: {u.id}</p>
                      </div>
                      {isSigned ? (
                        <Button
                          type="button"
                          variant="secondary"
                          disabled={signupsLoading}
                          onClick={() => void adminRemoveFromMatch(u.id)}
                          title="Wypisz z meczu"
                        >
                          <UserMinus className="mr-2 h-4 w-4" aria-hidden />
                          Wypisz
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          variant="pitch"
                          disabled={signupsLoading}
                          onClick={() => void adminAddToMatch(u.id)}
                          title="Dopisz do meczu"
                        >
                          <UserPlus className="mr-2 h-4 w-4" aria-hidden />
                          Zapisz
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
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
                    {cancelReasons.map((r) => (
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
