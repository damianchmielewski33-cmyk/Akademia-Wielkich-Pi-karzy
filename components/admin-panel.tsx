"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowDownAZ,
  ArrowUpAZ,
  BarChart3,
  Calendar,
  Download,
  LayoutDashboard,
  LayoutGrid,
  Loader2,
  Search,
  Settings2,
  Shield,
  Table2,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { PlayerAliasPicker } from "@/components/player-alias-picker";
import { FormInput } from "@/components/ui/form-field";
import { formSchemas, useValidatedForm } from "@/lib/form-validation";
import { z } from "zod";
import { PlayerAvatar, PlayerNameStack } from "@/components/player-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AdminCard,
  AdminMetricTile,
  AdminShell,
  AdminTableShell,
  AdminToolbar,
  adminAlertDangerClass,
  adminEmptyStateClass,
  adminOutlineBtnClass,
  adminSearchInputClass,
} from "@/components/admin-ui";
import { LogoutConfirmModal } from "@/components/logout-confirm-modal";
import { AppModal } from "@/components/ui/app-modal";
import {
  ModalAlert,
  ModalLoadingRow,
  ModalMatchSummary,
  modalEmptyStateClass,
  modalListClass,
  modalPanelClass,
} from "@/components/ui/modal-shared";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AdminAnalyticsHourlyCharts,
  type AnalyticsHourlyPayload,
} from "@/components/admin-analytics-hourly-charts";
import { AdminWalletsSaldoSection } from "@/components/admin-wallets-saldo-section";
import { AdminSettingsTab } from "@/components/admin-settings-tab";
import { MatchLineupAdmin } from "@/components/match-lineup-admin";
import {
  cn,
  formatDateLocalYmd,
} from "@/lib/utils";

const API = {
  summary: "/api/admin/summary",
  activity: "/api/admin/activity",
  appSettings: "/api/admin/app-settings",
  users: "/api/admin/users",
  user: (id: number) => `/api/admin/user/${id}`,
  resetPin: (id: number) => `/api/admin/user/${id}/reset-pin`,
  approvePinChange: (id: number) => `/api/admin/user/${id}/approve-pin-change`,
  rejectPinChange: (id: number) => `/api/admin/user/${id}/reject-pin-change`,
  matches: "/api/admin/matches",
  match: (id: number) => `/api/admin/match/${id}`,
  matchSignups: (id: number) => `/api/admin/match/${id}/signups`,
  matchAddGuest: (id: number) => `/api/admin/match/${id}/add-guest`,
  matchRemoveGuest: (id: number) => `/api/admin/match/${id}/remove-guest`,
  matchCancel: (id: number) => `/api/admin/match/${id}/cancel`,
  stats: "/api/admin/stats",
  stat: (id: number) => `/api/admin/stat/${id}`,
  analytics: (from: string, to: string) =>
    `/api/admin/analytics?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
  analyticsHourly: "/api/admin/analytics/hourly",
};

type UserRow = {
  id: number;
  first_name: string;
  last_name: string;
  zawodnik: string;
  profile_photo_path: string | null;
  role: string;
  pin_reset_requested?: number;
  pin_set?: number;
  pin_change_pending?: number;
};

type MatchRow = {
  id: number;
  date: string;
  time: string;
  location: string;
  players_count: number;
  played: number;
  fee_pln?: number | null;
  cancelled?: number;
  max_slots?: number;
};

type StatRow = {
  id: number;
  first_name: string;
  last_name: string;
  zawodnik: string;
  profile_photo_path: string | null;
  match_id: number;
  goals: number;
  assists: number;
  distance: number;
  saves: number;
};

type AnalyticsPayload = {
  range: { from: string; to: string };
  totals: {
    total_views: number;
    unique_visitors: number;
    anonymous_views: number;
    authenticated_views: number;
  };
  players: {
    total_non_admin: number;
    visited_in_range: number;
    not_visited_in_range: number;
    pct_visited: number | null;
    pct_not_visited: number | null;
    self_service_registrations_in_range: number;
  };
  terminarz_funnel: {
    distinct_players_viewed: number;
    distinct_players_viewed_and_signed_match_in_range: number;
    pct_signed_after_view: number | null;
  };
  screens: { screen_key: string; label: string; total_views: number; unique_visitors: number }[];
  /** Zdarzenia z serwera (logowanie, zapisy, statystyki itd.) w wybranym zakresie dat. */
  activity_events: {
    id: number;
    action: string;
    timestamp: string;
    actor_label: string;
    time_display: string;
  }[];
};

/** Domyślnie wczoraj–dziś (lokalnie), np. 06.04–07.04 gdy dziś jest 07.04. */
function defaultAnalyticsDateRange(): { from: string; to: string } {
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - 1);
  return { from: formatDateLocalYmd(from), to: formatDateLocalYmd(to) };
}

function analyticsPresetLastNDaysInclusive(n: number): { from: string; to: string } {
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - (n - 1));
  return { from: formatDateLocalYmd(from), to: formatDateLocalYmd(to) };
}

function analyticsPresetMonthToDate(): { from: string; to: string } {
  const to = new Date();
  const from = new Date(to.getFullYear(), to.getMonth(), 1);
  return { from: formatDateLocalYmd(from), to: formatDateLocalYmd(to) };
}

function todayYmd(): string {
  return formatDateLocalYmd(new Date());
}

type Summary = {
  players: number;
  admins: number;
  matches: number;
  stats: number;
  upcoming_matches: number;
  pin_reset_requests?: number;
};

type AppSettings = {
  default_match_max_slots?: number;
};

const tabs = [
  { id: "dashboard", label: "Przegląd", icon: LayoutDashboard },
  { id: "analytics", label: "Analityka", icon: BarChart3 },
  { id: "users", label: "Użytkownicy", icon: Users },
  { id: "wallets", label: "Portfele", icon: Wallet },
  { id: "matches", label: "Mecze", icon: Calendar },
  { id: "lineups", label: "Składy na mecz", icon: LayoutGrid },
  { id: "stats", label: "Statystyki", icon: Table2 },
  { id: "settings", label: "Ustawienia", icon: Settings2 },
] as const;

type TabId = (typeof tabs)[number]["id"];

type MatchSignupPaidRow = {
  user_id: number;
  paid: number;
  commitment: number;
  first_name: string;
  last_name: string;
  zawodnik: string;
  profile_photo_path: string | null;
  is_temporary?: number;
};

function MatchesView({
  matches,
  loading,
  onReload,
  defaultMaxSlots,
}: {
  matches: MatchRow[];
  loading: boolean;
  onReload: () => void;
  defaultMaxSlots: number;
}) {
  const [cancelOpen, setCancelOpen] = useState(false);
  const [signupsOpen, setSignupsOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<MatchRow | null>(null);

  const handleCancelClick = (m: MatchRow) => {
    setSelectedMatch(m);
    setCancelOpen(true);
  };

  const handleSignupsClick = (m: MatchRow) => {
    setSelectedMatch(m);
    setSignupsOpen(true);
  };

  const handleEditClick = (m: MatchRow) => {
    setSelectedMatch(m);
    setEditOpen(true);
  };

  return (
    <div>
      <AdminToolbar
        title="Mecze"
        description="Zarządzanie terminami, opłatami, miejscami i anulacjami meczów."
        onReload={onReload}
        loading={loading}
      />

      <AdminTableShell>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Godzina</TableHead>
              <TableHead>Lokalizacja</TableHead>
              <TableHead className="text-right">Miejsca</TableHead>
              <TableHead className="text-right">Rozegrane</TableHead>
              <TableHead className="text-right">Opłata</TableHead>
              <TableHead className="text-right">Akcje</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {matches.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-sm text-emerald-100/70">
                  Brak meczów w bazie.
                </TableCell>
              </TableRow>
            ) : (
              matches.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="align-middle">{m.date}</TableCell>
                  <TableCell className="align-middle">{m.time}</TableCell>
                  <TableCell className="align-middle">{m.location}</TableCell>
                  <TableCell className="text-right align-middle tabular-nums">
                    {m.players_count}/{m.max_slots || "?"}
                  </TableCell>
                  <TableCell className="text-right align-middle tabular-nums">{m.played}</TableCell>
                  <TableCell className="text-right align-middle tabular-nums">
                    {m.fee_pln !== null ? `${m.fee_pln} zł` : "–"}
                  </TableCell>
                  <TableCell className="text-right align-middle">
                    <div className="flex flex-wrap justify-end gap-2">
                      {m.cancelled ? (
                        <Badge className="bg-red-600 text-white">Anulowany</Badge>
                      ) : (
                        <>
                          <Button size="sm" variant="stadium" onClick={() => handleEditClick(m)}>
                            Edytuj
                          </Button>
                          <Button size="sm" variant="stadium" onClick={() => handleSignupsClick(m)}>
                            Zapisy
                          </Button>
                          <Button size="sm" variant="stadium" onClick={() => handleCancelClick(m)}>
                            Anuluj
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </AdminTableShell>

      {selectedMatch ? (
        <MatchEditDialogContent
          open={editOpen}
          onOpenChange={setEditOpen}
          match={selectedMatch}
          defaultMaxSlots={defaultMaxSlots}
          onEdited={() => {
            setEditOpen(false);
            onReload();
          }}
        />
      ) : null}

      {selectedMatch ? (
        <MatchCancelDialogContent
          open={cancelOpen}
          onOpenChange={setCancelOpen}
          match={selectedMatch}
          onCancelled={() => {
            setCancelOpen(false);
            onReload();
          }}
        />
      ) : null}

      {selectedMatch ? (
        <MatchSignupsDialogContent
          open={signupsOpen}
          onOpenChange={setSignupsOpen}
          match={selectedMatch}
          onClose={() => setSignupsOpen(false)}
          onReload={onReload}
        />
      ) : null}
    </div>
  );
}

function matchRowToSummary(match: MatchRow) {
  return {
    match_date: match.date,
    match_time: match.time,
    location: match.location,
    signed_up: match.players_count,
    max_slots: match.max_slots,
  };
}

function MatchCancelDialogContent({
  open,
  onOpenChange,
  match,
  onCancelled,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  match: MatchRow;
  onCancelled: () => void;
}) {
  const [reason, setReason] = useState("weather");
  const [saving, setSaving] = useState(false);

  const reasons = [
    { value: "no-lineup", label: "Brak składu" },
    { value: "weather", label: "Pogoda" },
    { value: "field-unavailable", label: "Boisko niedostępne" },
    { value: "insufficient-players", label: "Niewystarczająca liczba zawodników" },
    { value: "admin-decision", label: "Decyzja administratora" },
  ];

  const handleCancel = async () => {
    setSaving(true);
    try {
      const res = await fetch(API.matchCancel(match.id), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });

      const data = (await res.json().catch(() => ({}))) as { error?: string };

      if (!res.ok) {
        toast.error(data.error ?? "Nie udało się anulować meczu");
        return;
      }

      toast.success("Mecz został anulowany");
      onCancelled();
    } catch {
      toast.error("Błąd podczas anulacji meczu");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppModal
      open={open}
      onOpenChange={onOpenChange}
      size="sm"
      title="Anulować mecz?"
      description="Zapisani gracze otrzymają powiadomienie o anulacji."
      footer={
        <>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Zamknij
          </Button>
          <Button type="button" variant="destructive" onClick={() => void handleCancel()} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
            Anuluj mecz
          </Button>
        </>
      }
    >
      <ModalMatchSummary match={matchRowToSummary(match)} />
      <div className={modalPanelClass}>
        <Label htmlFor="cancel-reason">Wybierz powód anulacji</Label>
        <Select value={reason} onValueChange={setReason}>
          <SelectTrigger id="cancel-reason" className="mt-1.5">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {reasons.map((r) => (
              <SelectItem key={r.value} value={r.value}>
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <ModalAlert tone="warning">
        Ta operacja oznacza mecz jako odwołany (id {match.id}). Wszyscy zapisani gracze zostaną poinformowani.
      </ModalAlert>
    </AppModal>
  );
}

function MatchSignupsDialogContent({
  open,
  onOpenChange,
  match,
  onClose,
  onReload,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  match: MatchRow;
  onClose: () => void;
  onReload: () => void;
}) {
  const [signups, setSignups] = useState<MatchSignupPaidRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<number | null>(null);
  const [addGuestOpen, setAddGuestOpen] = useState(false);
  const [addingGuest, setAddingGuest] = useState(false);

  const guestForm = useValidatedForm({
    initialValues: { guestFirstName: "", guestLastName: "", guestAlias: "" },
    schema: z.object({
      guestFirstName: formSchemas.requiredName("Imię"),
      guestLastName: formSchemas.requiredName("Nazwisko"),
      guestAlias: formSchemas.playerAlias,
    }),
  });

  useEffect(() => {
    setLoading(true);
    void (async () => {
      try {
        const res = await fetch(API.matchSignups(match.id));
        if (!res.ok) throw new Error();
        const data = await res.json();
        setSignups(data.signups);
      } catch {
        toast.error("Nie udało się wczytać zapisów");
      } finally {
        setLoading(false);
      }
    })();
  }, [match]);

  const togglePaid = async (userId: number, currentPaid: number) => {
    setSaving(userId);
    try {
      const res = await fetch(API.matchSignups(match.id), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, paid: !currentPaid }),
      });
      if (!res.ok) throw new Error();
      setSignups((prev) =>
        prev.map((s) => (s.user_id === userId ? { ...s, paid: currentPaid ? 0 : 1 } : s))
      );
      toast.success("Zapisano");
    } catch {
      toast.error("Nie udało się zapisać");
    } finally {
      setSaving(null);
    }
  };

  const handleAddGuest = async () => {
    if (!guestForm.validate()) return;
    const { guestFirstName, guestLastName, guestAlias } = guestForm.values;

    setAddingGuest(true);
    try {
      const res = await fetch(API.matchAddGuest(match.id), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: guestFirstName,
          last_name: guestLastName,
          player_alias: guestAlias,
        }),
      });

      const data = (await res.json().catch(() => ({}))) as { error?: string };

      if (!res.ok) {
        toast.error(data.error ?? "Nie udało się dodać gościa");
        return;
      }

      toast.success("Gościnny piłkarz został dodany");
      guestForm.reset();
      setAddGuestOpen(false);
      onReload();
    } finally {
      setAddingGuest(false);
    }
  };

  const handleRemoveGuest = async (userId: number) => {
    const ok = window.confirm("Czy na pewno chcesz usunąć tego gościnnego piłkarza?");
    if (!ok) return;

    setSaving(userId);
    try {
      const res = await fetch(API.matchRemoveGuest(match.id), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId }),
      });

      const data = (await res.json().catch(() => ({}))) as { error?: string };

      if (!res.ok) {
        toast.error(data.error ?? "Nie udało się usunąć piłkarza");
        return;
      }

      toast.success("Piłkarz został usunięty");
      onReload();
    } finally {
      setSaving(null);
    }
  };

  return (
    <>
      <AppModal
        open={open}
        onOpenChange={onOpenChange}
        size="xl"
        scrollable
        title={`Zapisy i opłaty — ${match.date} ${match.time}`}
        description={match.location}
        footer={
          <>
            <Button type="button" variant="outline" size="sm" onClick={() => setAddGuestOpen(true)}>
              Dodaj gościa
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              Zamknij
            </Button>
          </>
        }
      >
        <ModalMatchSummary match={matchRowToSummary(match)} />
        {loading ? (
          <ModalLoadingRow label="Wczytywanie zapisów…" />
        ) : signups.length === 0 ? (
          <p className={modalEmptyStateClass}>Brak zapisów na ten mecz.</p>
        ) : (
          <div className={modalListClass}>
            {signups.map((s) => (
              <div
                key={s.user_id}
                className="flex items-center justify-between gap-3 border-b border-emerald-900/8 px-4 py-3 last:border-b-0 dark:border-emerald-800/40"
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <PlayerAvatar
                    photoPath={s.profile_photo_path}
                    firstName={s.first_name}
                    lastName={s.last_name}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">
                        {s.first_name} {s.last_name}
                      </p>
                      {s.is_temporary ? (
                        <Badge className="bg-amber-100 text-amber-800">Gościnny</Badge>
                      ) : null}
                    </div>
                    <p className="text-sm pitch-muted">{s.zawodnik}</p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {!s.is_temporary && (
                    <Badge variant={s.commitment === 1 ? "default" : "secondary"}>
                      {s.commitment === 1 ? "Potwierdzony" : "Niepewny"}
                    </Badge>
                  )}
                  {!s.is_temporary && (
                    <Button
                      size="sm"
                      variant={s.paid ? "default" : "outline"}
                      onClick={() => togglePaid(s.user_id, s.paid)}
                      disabled={saving === s.user_id}
                    >
                      {saving === s.user_id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : s.paid ? (
                        "Opłacony"
                      ) : (
                        "Nieopłacony"
                      )}
                    </Button>
                  )}
                  {s.is_temporary && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleRemoveGuest(s.user_id)}
                      disabled={saving === s.user_id}
                    >
                      {saving === s.user_id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Usuń"}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </AppModal>

      <AppModal
        open={addGuestOpen}
        onOpenChange={(o) => {
          if (!o) guestForm.reset();
          setAddGuestOpen(o);
        }}
        size="sm"
        title="Dodaj gościnnego piłkarza"
        description="Piłkarz będzie dostępny tylko na ten mecz"
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setAddGuestOpen(false)} disabled={addingGuest}>
              Anuluj
            </Button>
            <Button type="button" variant="pitch" onClick={() => void handleAddGuest()} disabled={addingGuest}>
              {addingGuest ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Dodaj
            </Button>
          </>
        }
      >
        <FormInput
          id="guest-fn"
          label="Imię"
          required
          value={guestForm.values.guestFirstName}
          onChange={(e) => guestForm.setValue("guestFirstName", e.target.value)}
          onBlur={() => guestForm.setFieldTouched("guestFirstName")}
          error={guestForm.errors.guestFirstName}
          disabled={addingGuest}
        />
        <FormInput
          id="guest-ln"
          label="Nazwisko"
          required
          value={guestForm.values.guestLastName}
          onChange={(e) => guestForm.setValue("guestLastName", e.target.value)}
          onBlur={() => guestForm.setFieldTouched("guestLastName")}
          error={guestForm.errors.guestLastName}
          disabled={addingGuest}
        />
        <FormInput
          id="guest-alias"
          label="Pseudonim"
          required
          value={guestForm.values.guestAlias}
          onChange={(e) => guestForm.setValue("guestAlias", e.target.value)}
          onBlur={() => guestForm.setFieldTouched("guestAlias")}
          error={guestForm.errors.guestAlias}
          disabled={addingGuest}
        />
      </AppModal>
    </>
  );
}

function StatsView({
  stats,
  loading,
  onReload,
}: {
  stats: StatRow[];
  loading: boolean;
  onReload: () => void;
}) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return stats;
    return stats.filter(
      (row) =>
        row.first_name.toLowerCase().includes(s) ||
        row.last_name.toLowerCase().includes(s) ||
        row.zawodnik.toLowerCase().includes(s)
    );
  }, [stats, q]);

  return (
    <div>
      <AdminToolbar
        title="Statystyki"
        description="Wpisy statystyk mecze — gole, asysty, dystans, interwencje."
        onReload={onReload}
        loading={loading}
      >
        <div className="relative w-full min-w-[200px] sm:w-64">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-100/50"
            aria-hidden
          />
          <Input
            className={adminSearchInputClass}
            placeholder="Szukaj…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Filtruj statystyki"
          />
        </div>
      </AdminToolbar>

      <AdminTableShell>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12" />
              <TableHead>Zawodnik</TableHead>
              <TableHead className="text-right">Gole</TableHead>
              <TableHead className="text-right">Asysty</TableHead>
              <TableHead className="text-right">Dystans (m)</TableHead>
              <TableHead className="text-right">Interwencje</TableHead>
              <TableHead className="text-right">Mecz ID</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-sm text-emerald-100/70">
                  {stats.length === 0 ? "Brak statystyk w bazie." : "Brak wyników dla podanego filtra."}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="align-middle">
                    <PlayerAvatar
                      photoPath={s.profile_photo_path}
                      firstName={s.first_name}
                      lastName={s.last_name}
                      size="sm"
                      ringClassName="ring-2 ring-white/35"
                    />
                  </TableCell>
                  <TableCell className="align-middle">
                    <PlayerNameStack
                      firstName={s.first_name}
                      lastName={s.last_name}
                      nick={s.zawodnik}
                    />
                  </TableCell>
                  <TableCell className="text-right align-middle tabular-nums">{s.goals}</TableCell>
                  <TableCell className="text-right align-middle tabular-nums">{s.assists}</TableCell>
                  <TableCell className="text-right align-middle tabular-nums">{s.distance}</TableCell>
                  <TableCell className="text-right align-middle tabular-nums">{s.saves}</TableCell>
                  <TableCell className="text-right align-middle tabular-nums">
                    <Link href={`/panel-admina?match=${s.match_id}`} className="text-[var(--mundial-gold)] hover:underline">
                      {s.match_id}
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </AdminTableShell>
    </div>
  );
}

export function AdminPanel() {
  const [tab, setTab] = useState<TabId>("dashboard");
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [matchDefaults, setMatchDefaults] = useState<AppSettings | null>(null);
  const [activity, setActivity] = useState<
    {
      text: string;
      time: string;
      actorName: string | null;
      actorLabel?: string;
      timeDisplay?: string;
    }[]
  >([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [stats, setStats] = useState<StatRow[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsPayload | null>(null);
  const [analyticsRange, setAnalyticsRange] = useState(() => defaultAnalyticsDateRange());
  /** Osobno od `loading`, żeby uniknąć wyścigów przy szybkiej zmianie zakładki podczas fetcha analityki. */
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsFetchNonce, setAnalyticsFetchNonce] = useState(0);
  const [analyticsHourly, setAnalyticsHourly] = useState<AnalyticsHourlyPayload | null>(null);
  const [logoutOpen, setLogoutOpen] = useState(false);

  const onAnalyticsFromChange = useCallback((v: string) => {
    setAnalyticsRange((prev) => {
      const from = v;
      const to = from > prev.to ? from : prev.to;
      return { from, to };
    });
  }, []);

  const onAnalyticsToChange = useCallback((v: string) => {
    setAnalyticsRange((prev) => {
      const to = v;
      const from = prev.from > to ? to : prev.from;
      return { from, to };
    });
  }, []);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const [s, a, st] = await Promise.all([fetch(API.summary), fetch(API.activity), fetch(API.appSettings)]);
      if (!s.ok || !a.ok || !st.ok) throw new Error();
      setSummary(await s.json());
      setActivity(await a.json());
      const settings = await st.json();
      setMatchDefaults({ default_match_max_slots: settings.default_match_max_slots });
    } catch {
      toast.error("Nie udało się wczytać przeglądu");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(API.users);
      if (!res.ok) throw new Error();
      setUsers(await res.json());
    } catch {
      toast.error("Nie udało się wczytać użytkowników");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMatches = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(API.matches);
      if (!res.ok) throw new Error();
      const rows = await res.json();
      setMatches(
        rows.map((m: MatchRow & { played?: number; fee_pln?: number | null }) => ({
          ...m,
          played: m.played ?? 0,
          fee_pln: m.fee_pln ?? null,
        }))
      );
    } catch {
      toast.error("Nie udało się wczytać meczów");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadStats = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(API.stats);
      if (!res.ok) throw new Error();
      setStats(await res.json());
    } catch {
      toast.error("Nie udało się wczytać statystyk");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === "dashboard") void loadDashboard();
    if (tab === "users") void loadUsers();
    if (tab === "matches") void loadMatches();
    if (tab === "stats") void loadStats();
    if (tab === "lineups" || tab === "wallets") setLoading(false);
  }, [tab, loadDashboard, loadUsers, loadMatches, loadStats]);

  useEffect(() => {
    if (tab !== "analytics") {
      setAnalyticsLoading(false);
      setAnalyticsHourly(null);
      return;
    }
    let cancelled = false;
    const { from, to } = analyticsRange;
    setAnalyticsLoading(true);
    void (async () => {
      try {
        const [resA, resH] = await Promise.all([
          fetch(API.analytics(from, to)),
          fetch(API.analyticsHourly),
        ]);
        if (cancelled) return;
        if (!resA.ok) throw new Error();
        setAnalytics(await resA.json());
        if (!resH.ok) {
          toast.error("Nie udało się wczytać wykresów godzinowych (ostatnie 7 dni)");
        } else {
          setAnalyticsHourly((await resH.json()) as AnalyticsHourlyPayload);
        }
      } catch {
        if (!cancelled) {
          toast.error("Nie udało się wczytać analityki");
          setAnalytics(null);
          setAnalyticsHourly(null);
        }
      } finally {
        if (!cancelled) setAnalyticsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tab, analyticsRange, analyticsFetchNonce]);

  const shellLoading =
    tab === "lineups" || tab === "wallets" || tab === "settings"
      ? false
      : tab === "analytics"
        ? analyticsLoading
        : loading;

  const pinBadge =
    (summary?.pin_reset_requests ?? 0) > 0 ||
    users.some((u) => (u.pin_reset_requested ?? 0) === 1);

  return (
    <>
      <AdminShell
        tabs={tabs.map((t) => ({
          ...t,
          badge: t.id === "users" && pinBadge,
        }))}
        activeTab={tab}
        onTabChange={(id) => setTab(id as TabId)}
        onLogout={() => setLogoutOpen(true)}
        loading={shellLoading}
      >
        {tab === "dashboard" && (
          <DashboardView
            summary={summary}
            activity={activity}
            loading={loading}
            onReload={loadDashboard}
            onGoToTab={setTab}
          />
        )}
        {tab === "users" && <UsersView users={users} loading={loading} onReload={loadUsers} />}
        {tab === "wallets" && <AdminWalletsSaldoSection />}
        {tab === "matches" && (
          <MatchesView
            matches={matches}
            loading={loading}
            onReload={loadMatches}
            defaultMaxSlots={matchDefaults?.default_match_max_slots ?? 14}
          />
        )}
        {tab === "lineups" && <MatchLineupAdmin />}
        {tab === "analytics" && (
          <AnalyticsView
            data={analytics}
            hourlyData={analyticsHourly}
            loading={analyticsLoading}
            dateFrom={analyticsRange.from}
            dateTo={analyticsRange.to}
            onDateFromChange={onAnalyticsFromChange}
            onDateToChange={onAnalyticsToChange}
            onReload={() => setAnalyticsFetchNonce((n) => n + 1)}
            onPresetRange={(from, to) => setAnalyticsRange({ from, to })}
          />
        )}
        {tab === "stats" && <StatsView stats={stats} loading={loading} onReload={loadStats} />}
        {tab === "settings" && <AdminSettingsTab loading={loading} onReload={loadDashboard} />}
      </AdminShell>

      <LogoutConfirmModal open={logoutOpen} onOpenChange={setLogoutOpen} />
    </>
  );
}

type AnalyticsScreenSortKey = "label" | "views" | "unique";

function downloadAnalyticsScreensCsv(
  rows: AnalyticsPayload["screens"],
  range: { from: string; to: string }
) {
  const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
  const header = ["Ekran", "Klucz ekranu", "Odsłony", "Unikalni odbiorcy"];
  const body = rows.map((r) =>
    [esc(r.label), r.screen_key, String(r.total_views), String(r.unique_visitors)].join(";")
  );
  const csv = "\uFEFF" + [header.join(";"), ...body].join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `analityka-ekrany-${range.from}_${range.to}.csv`;
  a.rel = "noopener";
  a.click();
  URL.revokeObjectURL(url);
}

function AnalyticsView({
  data,
  hourlyData,
  loading,
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  onReload,
  onPresetRange,
}: {
  data: AnalyticsPayload | null;
  hourlyData: AnalyticsHourlyPayload | null;
  loading: boolean;
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (v: string) => void;
  onDateToChange: (v: string) => void;
  onReload: () => void;
  onPresetRange: (from: string, to: string) => void;
}) {
  const [screenQuery, setScreenQuery] = useState("");
  const [activityQuery, setActivityQuery] = useState("");
  const [sortKey, setSortKey] = useState<AnalyticsScreenSortKey>("views");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const maxDate = todayYmd();

  const toggleSort = useCallback((key: AnalyticsScreenSortKey) => {
    setSortKey((prev) => {
      if (prev === key) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        return prev;
      }
      setSortDir(key === "label" ? "asc" : "desc");
      return key;
    });
  }, []);

  const viewSplit =
    data != null && data.totals.anonymous_views + data.totals.authenticated_views > 0
      ? {
          anonPct:
            Math.round(
              (data.totals.anonymous_views /
                (data.totals.anonymous_views + data.totals.authenticated_views)) *
                1000
            ) / 10,
          authPct:
            Math.round(
              (data.totals.authenticated_views /
                (data.totals.anonymous_views + data.totals.authenticated_views)) *
                1000
            ) / 10,
        }
      : null;

  const screensPrepared = useMemo(() => {
    if (!data) return [];
    const q = screenQuery.trim().toLowerCase();
    const filtered = !q
      ? data.screens
      : data.screens.filter(
          (r) =>
            r.label.toLowerCase().includes(q) ||
            r.screen_key.toLowerCase().includes(q)
        );
    const mult = sortDir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      if (sortKey === "label") return mult * a.label.localeCompare(b.label, "pl");
      if (sortKey === "unique") return mult * (a.unique_visitors - b.unique_visitors);
      return mult * (a.total_views - b.total_views);
    });
  }, [data, screenQuery, sortKey, sortDir]);

  const eventsPrepared = useMemo(() => {
    const ev = data?.activity_events ?? [];
    const q = activityQuery.trim().toLowerCase();
    if (!q) return ev;
    return ev.filter(
      (e) =>
        e.actor_label.toLowerCase().includes(q) ||
        e.action.toLowerCase().includes(q) ||
        e.time_display.toLowerCase().includes(q)
    );
  }, [data, activityQuery]);

  const rangeSummary =
    data != null
      ? `${new Date(`${data.range.from}T12:00:00`).toLocaleDateString("pl-PL")} – ${new Date(`${data.range.to}T12:00:00`).toLocaleDateString("pl-PL")}`
      : null;

  return (
    <div aria-busy={loading}>
      <AdminToolbar
        title="Analityka wejść"
        description="Dane zbierane przy otwarciu stron przez użytkowników (bez panelu admina). Zakres dat to dni kalendarzowe w strefie Polski (Europe/Warsaw). Zmiana dat wczytuje raport ponownie."
        onReload={onReload}
        loading={loading}
      >
        <div className="flex w-full flex-col gap-3 xl:w-auto">
          <div className="flex flex-wrap items-end gap-2">
            <Button
              type="button"
              variant="stadium"
              size="sm"
              className={adminOutlineBtnClass}
              disabled={loading}
              onClick={() => {
                const r = analyticsPresetLastNDaysInclusive(7);
                onPresetRange(r.from, r.to);
              }}
            >
              7 dni
            </Button>
            <Button
              type="button"
              variant="stadium"
              size="sm"
              className={adminOutlineBtnClass}
              disabled={loading}
              onClick={() => {
                const r = analyticsPresetLastNDaysInclusive(30);
                onPresetRange(r.from, r.to);
              }}
            >
              30 dni
            </Button>
            <Button
              type="button"
              variant="stadium"
              size="sm"
              className={adminOutlineBtnClass}
              disabled={loading}
              onClick={() => {
                const r = analyticsPresetMonthToDate();
                onPresetRange(r.from, r.to);
              }}
            >
              Ten miesiąc
            </Button>
            <Button
              type="button"
              variant="stadium"
              size="sm"
              className={adminOutlineBtnClass}
              disabled={loading}
              onClick={() => {
                const r = defaultAnalyticsDateRange();
                onPresetRange(r.from, r.to);
              }}
            >
              Wczoraj–dziś
            </Button>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <Label htmlFor="adm-an-from" className="text-xs pitch-muted">
                Od
              </Label>
              <Input
                id="adm-an-from"
                type="date"
                max={maxDate}
                className="mt-1 w-[11rem] border-white/25 bg-black/15 text-white"
                value={dateFrom}
                onChange={(e) => onDateFromChange(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="adm-an-to" className="text-xs pitch-muted">
                Do
              </Label>
              <Input
                id="adm-an-to"
                type="date"
                max={maxDate}
                className="mt-1 w-[11rem] border-white/25 bg-black/15 text-white"
                value={dateTo}
                onChange={(e) => onDateToChange(e.target.value)}
              />
            </div>
          </div>
        </div>
      </AdminToolbar>

      <AdminAnalyticsHourlyCharts data={hourlyData} loading={loading && hourlyData === null} />

      {rangeSummary && data ? (
        <p className="mb-4 text-sm pitch-muted">
          <span className="font-medium text-white">Zakres raportu (dni kalendarzowe, PL):</span>{" "}
          {rangeSummary}{" "}
          <span className="text-emerald-100/70">
            ({data.range.from} — {data.range.to})
          </span>
        </p>
      ) : null}

      <AdminCard className="mb-6 home-pitch-tile-gold" title="Jak czytać te liczby">
        <div className="space-y-2 text-sm text-amber-50/95">
          <p>
            <strong>Gracze zalogowani vs bez aktywności</strong> — spośród kont z rolą gracza (bez
            administratorów), ilu miało co najmniej jedno odsłonięcie strony zalogowane w wybranym
            okresie. Reszta to konta bez takich wejść w tym zakresie dat (nie znaczy to, że nigdy nie
            wchodzili).
          </p>
          <p>
            <strong>Rejestracje (samodzielne)</strong> — wpisy z dziennika aktywności przy
            rejestracji z formularza (nie obejmuje kont utworzonych przez administratora).
          </p>
          <p>
            <strong>Terminarz → zapis na mecz</strong> — gracze, którzy w okresie oglądali ekran
            terminarza zalogowani, a w tym samym okresie zapisali się na dowolny mecz (wg daty
            zapisu).
          </p>
          <p>
            <strong>Wejścia anonimowe vs zalogowane</strong> — udział surowych odsłon stron bez
            sesji vs z aktywną sesją (jedna osoba może generować wiele odsłon).
          </p>
          <p>
            <strong>Dziennik akcji</strong> — konkretne czynności zapisane po stronie serwera (nie
            mylić z samym otwarciem stron). Dla każdego wpisu widać kto (imię, nazwisko, pseudonim),
            opis akcji oraz znacznik czasu w Europe/Warsaw.
          </p>
        </div>
      </AdminCard>

      {!data && !loading ? (
        <p className="text-sm pitch-muted">Brak danych do wyświetlenia.</p>
      ) : null}

      {data ? (
        <>
          <AdminCard
            className="mb-6"
            title="Dziennik akcji użytkowników"
            description="Zdarzenia z serwera w wybranym zakresie dat (np. logowanie, zapisy na mecze, edycje profilu). Najnowsze na górze. Do 400 wpisów na jedno wczytanie."
          >
            <div className="relative mb-4 w-full min-w-[200px] sm:max-w-md">
              <Search
                className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-100/50"
                aria-hidden
              />
              <Input
                className={adminSearchInputClass}
                placeholder="Szukaj po osobie, treści akcji lub czasie…"
                value={activityQuery}
                onChange={(e) => setActivityQuery(e.target.value)}
                aria-label="Filtruj dziennik akcji"
              />
            </div>
            <div className="max-h-[min(28rem,70vh)] overflow-y-auto overflow-x-auto">
              <AdminTableShell>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="whitespace-nowrap">Czas (PL)</TableHead>
                      <TableHead className="min-w-[10rem]">Kto</TableHead>
                      <TableHead>Czynność</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(data.activity_events?.length ?? 0) === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-sm text-emerald-100/70">
                          Brak wpisów dziennika dla tego zakresu dat.
                        </TableCell>
                      </TableRow>
                    ) : eventsPrepared.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-sm text-emerald-100/70">
                          Brak wyników dla podanego filtra.
                        </TableCell>
                      </TableRow>
                    ) : (
                      eventsPrepared.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell className="whitespace-nowrap align-top text-xs tabular-nums text-emerald-100/80">
                            <time dateTime={row.timestamp} title={row.timestamp}>
                              {row.time_display}
                            </time>
                          </TableCell>
                          <TableCell className="align-top text-sm font-medium text-white">
                            {row.actor_label}
                          </TableCell>
                          <TableCell className="align-top text-sm pitch-muted">{row.action}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </AdminTableShell>
            </div>
          </AdminCard>

          <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <AdminCard title="Wszystkie odsłony">
              <p className="text-2xl font-bold tabular-nums text-[var(--mundial-gold,#f5c518)]">
                {data.totals.total_views}
              </p>
              <p className="mt-1 text-xs pitch-muted">
                Unikalni odbiorcy (gość lub id gracza): {data.totals.unique_visitors}
              </p>
            </AdminCard>
            <AdminCard title="Odsłony: anonim / zalogowany">
              {viewSplit ? (
                <div className="space-y-1 text-sm pitch-muted">
                  <p>
                    Anonimowe: <strong className="text-white">{data.totals.anonymous_views}</strong> (
                    {viewSplit.anonPct}%)
                  </p>
                  <p>
                    Zalogowane: <strong className="text-white">{data.totals.authenticated_views}</strong> (
                    {viewSplit.authPct}%)
                  </p>
                </div>
              ) : (
                <p className="text-sm pitch-muted">Brak odsłon w okresie.</p>
              )}
            </AdminCard>
            <AdminCard title="Gracze w bazie" description="Konta nie-admin">
              <div className="space-y-1 text-sm pitch-muted">
                <p>
                  Z aktywnością w okresie:{" "}
                  <strong className="text-white tabular-nums">{data.players.visited_in_range}</strong>
                  {data.players.pct_visited != null ? (
                    <span> ({data.players.pct_visited}%)</span>
                  ) : null}
                </p>
                <p>
                  Bez wejść zalogowanych w okresie:{" "}
                  <strong className="text-white tabular-nums">{data.players.not_visited_in_range}</strong>
                  {data.players.pct_not_visited != null ? (
                    <span> ({data.players.pct_not_visited}%)</span>
                  ) : null}
                </p>
                <p className="text-xs text-emerald-100/70">
                  Nowe konta (rejestracja): {data.players.self_service_registrations_in_range}
                </p>
              </div>
            </AdminCard>
            <AdminCard title="Terminarz → mecz" description="Gracze (nie-admin)">
              <div className="space-y-1 text-sm pitch-muted">
                <p>
                  Oglądali terminarz:{" "}
                  <strong className="text-white tabular-nums">
                    {data.terminarz_funnel.distinct_players_viewed}
                  </strong>
                </p>
                <p>
                  Zapis na mecz w okresie:{" "}
                  <strong className="text-white tabular-nums">
                    {data.terminarz_funnel.distinct_players_viewed_and_signed_match_in_range}
                  </strong>
                  {data.terminarz_funnel.pct_signed_after_view != null ? (
                    <span> ({data.terminarz_funnel.pct_signed_after_view}%)</span>
                  ) : data.terminarz_funnel.distinct_players_viewed === 0 ? (
                    <span className="text-emerald-100/70"> (–)</span>
                  ) : null}
                </p>
              </div>
            </AdminCard>
          </div>

          <AdminCard
            title="Wejścia wg ekranu"
            description="Liczba odsłon i szacunek unikalnych odbiorców (gość lub zalogowany gracz) w wybranym zakresie. Kliknij nagłówek kolumny, aby sortować."
            headerExtra={
              <Button
                type="button"
                variant="stadium"
                size="sm"
                className={adminOutlineBtnClass}
                disabled={loading || screensPrepared.length === 0}
                onClick={() => downloadAnalyticsScreensCsv(screensPrepared, data.range)}
              >
                <Download className="mr-2 h-4 w-4" aria-hidden />
                CSV (widok)
              </Button>
            }
          >
            <div className="relative mb-4 w-full min-w-[200px] sm:max-w-xs">
              <Search
                className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-100/50"
                aria-hidden
              />
              <Input
                className={adminSearchInputClass}
                placeholder="Filtruj ekran lub klucz…"
                value={screenQuery}
                onChange={(e) => setScreenQuery(e.target.value)}
                aria-label="Filtruj listę ekranów"
              />
            </div>
            <AdminTableShell>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <button
                        type="button"
                        className="admin-table-sort-btn"
                        onClick={() => toggleSort("label")}
                      >
                        Ekran
                        {sortKey === "label" ? (
                          sortDir === "asc" ? (
                            <ArrowUpAZ className="h-3.5 w-3.5 opacity-70" aria-hidden />
                          ) : (
                            <ArrowDownAZ className="h-3.5 w-3.5 opacity-70" aria-hidden />
                          )
                        ) : null}
                      </button>
                    </TableHead>
                    <TableHead className="text-right">
                      <button
                        type="button"
                        className="admin-table-sort-btn w-full justify-end"
                        onClick={() => toggleSort("views")}
                      >
                        Odsłony
                        {sortKey === "views" ? (
                          sortDir === "asc" ? (
                            <ArrowUpAZ className="h-3.5 w-3.5 opacity-70" aria-hidden />
                          ) : (
                            <ArrowDownAZ className="h-3.5 w-3.5 opacity-70" aria-hidden />
                          )
                        ) : null}
                      </button>
                    </TableHead>
                    <TableHead className="text-right">
                      <button
                        type="button"
                        className="admin-table-sort-btn w-full justify-end"
                        onClick={() => toggleSort("unique")}
                      >
                        Unikalni
                        {sortKey === "unique" ? (
                          sortDir === "asc" ? (
                            <ArrowUpAZ className="h-3.5 w-3.5 opacity-70" aria-hidden />
                          ) : (
                            <ArrowDownAZ className="h-3.5 w-3.5 opacity-70" aria-hidden />
                          )
                        ) : null}
                      </button>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.screens.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-sm text-emerald-100/70">
                        Brak zapisanych wejść w tym okresie (dane pojawią się po pierwszych wizytach).
                      </TableCell>
                    </TableRow>
                  ) : screensPrepared.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-sm text-emerald-100/70">
                        Brak wyników dla podanego filtra.
                      </TableCell>
                    </TableRow>
                  ) : (
                    screensPrepared.map((row) => (
                      <TableRow key={row.screen_key}>
                        <TableCell>
                          <span className="font-medium text-white">{row.label}</span>
                          <span className="admin-table-muted ml-2">{row.screen_key}</span>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{row.total_views}</TableCell>
                        <TableCell className="text-right tabular-nums">{row.unique_visitors}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </AdminTableShell>
          </AdminCard>
        </>
      ) : null}
    </div>
  );
}

function DashboardView({
  summary,
  activity,
  loading,
  onReload,
  onGoToTab,
}: {
  summary: Summary | null;
  activity: {
    text: string;
    time: string;
    actorName: string | null;
    actorLabel?: string;
    timeDisplay?: string;
  }[];
  loading: boolean;
  onReload: () => void;
  onGoToTab: (t: TabId) => void;
}) {

  const metrics = [
    {
      key: "players",
      label: "Zarejestrowani",
      value: summary?.players,
      hint: "wszyscy użytkownicy",
      tab: "users" as const,
      icon: Users,
    },
    {
      key: "admins",
      label: "Administratorzy",
      value: summary?.admins,
      hint: "konta z uprawnieniami",
      tab: "users" as const,
      icon: Shield,
    },
    {
      key: "matches",
      label: "Mecze w bazie",
      value: summary?.matches,
      hint: "łącznie terminów",
      tab: "matches" as const,
      icon: Calendar,
    },
    {
      key: "upcoming",
      label: "Nadchodzące",
      value: summary?.upcoming_matches,
      hint: "nie rozegrane, od dziś",
      tab: "matches" as const,
      icon: Activity,
    },
    {
      key: "stats",
      label: "Wpisy statystyk",
      value: summary?.stats,
      hint: "wiersze w tabeli",
      tab: "stats" as const,
      icon: Table2,
    },
  ];

  return (
    <div>
      <AdminToolbar
        title="Przegląd"
        description="Skrót organizacji — kliknij kafelek, aby przejść do szczegółów."
        onReload={onReload}
        loading={loading}
      />

      {(summary?.pin_reset_requests ?? 0) > 0 ? (
        <div className={cn("mb-6", adminAlertDangerClass)}>
          <p className="font-semibold">Zgłoszenia zmiany PIN-u</p>
          <p className="mt-1 text-red-100/90">
            Oczekujące sprawy (nowy PIN lub prośba o reset):{" "}
            <strong className="tabular-nums">{summary?.pin_reset_requests}</strong>. W zakładce{" "}
            <strong>Użytkownicy</strong> możesz <strong>zatwierdzić</strong> nowy PIN,{" "}
            <strong>odrzucić</strong> propozycję (pozostaje stary PIN) albo wykonać pełny{" "}
            <strong>restart PIN</strong> konta.
          </p>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {metrics.map((m) => (
          <AdminMetricTile
            key={m.key}
            label={m.label}
            hint={m.hint}
            value={m.value}
            icon={m.icon}
            onClick={() => onGoToTab(m.tab)}
          />
        ))}
      </div>

      <AdminCard
        className="mt-8"
        title="Konfiguracja aplikacji"
        description="Branding, kontakt, rejestracja, rankingi, domyślne mecze i więcej — w dedykowanej zakładce."
      >
        <Button type="button" variant="stadium" onClick={() => onGoToTab("settings")}>
          <Settings2 className="mr-2 h-4 w-4" aria-hidden />
          Otwórz ustawienia
        </Button>
      </AdminCard>

      <AdminCard
        className="mt-8"
        title="Ostatnia aktywność"
        description="Do 25 ostatnich wpisów z serwera: kto (imię, nazwisko i pseudonim), co zrobił, kiedy — strefa Europe/Warsaw"
      >
        {activity.length === 0 ? (
          <p className={adminEmptyStateClass}>
            Brak zapisów w dzienniku — pojawią się po logowaniu, zapisach na mecze, statystykach i
            innych operacjach w aplikacji.
          </p>
        ) : (
          <ul className="space-y-3">
            {activity.map((item, i) => (
              <li
                key={`${item.time}-${i}`}
                className="flex flex-col gap-1 border-l-2 border-[var(--mundial-gold)]/50 pl-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4"
              >
                <div className="min-w-0 flex-1 space-y-0.5">
                  <p className="text-sm font-medium text-white">
                    {item.actorLabel ?? item.actorName ?? "—"}
                  </p>
                  <p className="text-sm pitch-muted">{item.text}</p>
                </div>
                <time
                  className="shrink-0 text-xs tabular-nums text-emerald-100/70 sm:pt-0.5"
                  dateTime={item.time}
                  title={item.time}
                >
                  {item.timeDisplay ?? item.time}
                </time>
              </li>
            ))}
          </ul>
        )}
      </AdminCard>
    </div>
  );
}

function UsersView({
  users,
  loading,
  onReload,
}: {
  users: UserRow[];
  loading: boolean;
  onReload: () => void;
}) {
  const [edit, setEdit] = useState<UserRow | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [delUser, setDelUser] = useState<UserRow | null>(null);
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return users;
    return users.filter(
      (u) =>
        u.first_name.toLowerCase().includes(s) ||
        u.last_name.toLowerCase().includes(s) ||
        u.zawodnik.toLowerCase().includes(s) ||
        String(u.id).includes(s)
    );
  }, [users, q]);

  return (
    <div>
      <AdminToolbar
        title="Użytkownicy"
        description="Dodawanie kont, edycja danych, rola administratora oraz usuwanie."
        onReload={onReload}
        loading={loading}
      >
        <Button type="button" size="sm" onClick={() => setCreateOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" aria-hidden />
          Dodaj użytkownika
        </Button>
        <div className="relative w-full min-w-[200px] sm:w-64">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-100/50"
            aria-hidden
          />
          <Input
            className={adminSearchInputClass}
            placeholder="Szukaj…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Filtruj użytkowników"
          />
        </div>
      </AdminToolbar>

      <AdminTableShell>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12" />
              <TableHead>Zawodnik</TableHead>
              <TableHead>PIN</TableHead>
              <TableHead>Rola</TableHead>
              <TableHead className="text-right">Akcje</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-sm text-emerald-100/70">
                  {users.length === 0
                    ? "Brak użytkowników w bazie."
                    : "Brak wyników dla podanego filtra."}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="align-middle">
                    <PlayerAvatar
                      photoPath={u.profile_photo_path}
                      firstName={u.first_name}
                      lastName={u.last_name}
                      size="sm"
                      ringClassName="ring-2 ring-white/35"
                    />
                  </TableCell>
                  <TableCell className="align-middle">
                    <PlayerNameStack
                      firstName={u.first_name}
                      lastName={u.last_name}
                      nick={u.zawodnik}
                    />
                  </TableCell>
                  <TableCell className="align-middle">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {(u.pin_set ?? 0) === 1 ? (
                        <Badge variant="secondary" className="font-normal">
                          Ustawiony
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-950">
                          Brak PIN
                        </Badge>
                      )}
                      {(u.pin_reset_requested ?? 0) === 1 ? (
                        <Badge className="bg-red-600 font-normal text-white hover:bg-red-600">
                          {(u.pin_change_pending ?? 0) === 1
                            ? "Nowy PIN — czeka"
                            : "Prośba o reset"}
                        </Badge>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell>
                    {u.role === "admin" ? (
                      <Badge>Administrator</Badge>
                    ) : (
                      <Badge variant="secondary">Gracz</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-wrap justify-end gap-2">
                      {(u.pin_change_pending ?? 0) === 1 ? (
                        <>
                          <Button
                            size="sm"
                            className="bg-emerald-600 text-white hover:bg-emerald-700"
                            onClick={async () => {
                              const ok = window.confirm(
                                `Zatwierdzić nowy PIN dla ${u.first_name} ${u.last_name}? Od tej chwili będzie obowiązywał tylko nowy PIN (stary przestanie działać).`
                              );
                              if (!ok) return;
                              const res = await fetch(API.approvePinChange(u.id), {
                                method: "POST",
                              });
                              if (!res.ok) {
                                const j = (await res.json().catch(() => ({}))) as { error?: string };
                                toast.error(
                                  typeof j.error === "string" ? j.error : "Nie udało się zatwierdzić"
                                );
                                return;
                              }
                              toast.success("Nowy PIN został zatwierdzony");
                              onReload();
                            }}
                          >
                            Akceptuj PIN
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-amber-300 text-amber-950 hover:bg-amber-50"
                            onClick={async () => {
                              const ok = window.confirm(
                                `Odrzucić proponowany PIN dla ${u.first_name} ${u.last_name}? Pozostanie dotychczasowy PIN.`
                              );
                              if (!ok) return;
                              const res = await fetch(API.rejectPinChange(u.id), { method: "POST" });
                              if (!res.ok) {
                                const j = (await res.json().catch(() => ({}))) as { error?: string };
                                toast.error(
                                  typeof j.error === "string" ? j.error : "Nie udało się odrzucić"
                                );
                                return;
                              }
                              toast.success("Odrzucono — aktywny PIN bez zmian");
                              onReload();
                            }}
                          >
                            Odrzuć PIN
                          </Button>
                        </>
                      ) : null}
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-red-200 text-red-800 hover:bg-red-50"
                        onClick={async () => {
                          const ok = window.confirm(
                            `Zresetować PIN dla ${u.first_name} ${u.last_name}? Użytkownik będzie musiał ustawić nowy PIN przy logowaniu.`
                          );
                          if (!ok) return;
                          const res = await fetch(API.resetPin(u.id), { method: "POST" });
                          if (!res.ok) {
                            toast.error("Nie udało się zresetować PIN-u");
                            return;
                          }
                          toast.success("PIN został zresetowany");
                          onReload();
                        }}
                      >
                        Resetuj PIN
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => setEdit(u)}>
                        Edytuj
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => setDelUser(u)}>
                        Usuń
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </AdminTableShell>

      {edit ? (
        <UserEditForm
          open
          onOpenChange={(o) => !o && setEdit(null)}
          user={edit}
          onClose={() => setEdit(null)}
          onSaved={() => {
            setEdit(null);
            onReload();
          }}
        />
      ) : null}

      <UserCreateForm
        open={createOpen}
        onOpenChange={setCreateOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => {
          setCreateOpen(false);
          onReload();
        }}
      />

      <DeleteUserModal
        user={delUser}
        onOpenChange={(o) => !o && setDelUser(null)}
        onDeleted={() => {
          setDelUser(null);
          onReload();
        }}
      />
    </div>
  );
}

function DeleteUserModal({
  user,
  onOpenChange,
  onDeleted,
}: {
  user: UserRow | null;
  onOpenChange: (open: boolean) => void;
  onDeleted: () => void;
}) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (user == null) return;
    setDeleting(true);
    try {
      const res = await fetch(API.user(user.id), { method: "DELETE" });
      if (!res.ok) {
        toast.error("Nie udało się usunąć użytkownika");
        return;
      }
      toast.success("Użytkownik został usunięty");
      onDeleted();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AppModal
      open={user != null}
      onOpenChange={onOpenChange}
      size="sm"
      title="Usunąć użytkownika?"
      footer={
        <>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={deleting}>
            Anuluj
          </Button>
          <Button type="button" variant="destructive" onClick={() => void handleDelete()} disabled={deleting}>
            {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
            Usuń
          </Button>
        </>
      }
    >
      {user ? (
        <>
          <div className={modalPanelClass}>
            <p className="text-sm text-zinc-700 dark:text-zinc-300">
              <strong>
                {user.first_name} {user.last_name}
              </strong>
            </p>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              {user.zawodnik} · id {user.id}
            </p>
          </div>
          <ModalAlert tone="danger">Konto zostanie trwale usunięte wraz z powiązanymi danymi.</ModalAlert>
        </>
      ) : null}
    </AppModal>
  );
}

function UserCreateForm({
  open,
  onOpenChange,
  onClose,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [role, setRole] = useState<"admin" | "player">("player");
  const [saving, setSaving] = useState(false);
  const form = useValidatedForm({
    initialValues: { first_name: "", last_name: "", zawodnik: "" },
    schema: z.object({
      first_name: formSchemas.requiredName("Imię"),
      last_name: formSchemas.requiredName("Nazwisko"),
      zawodnik: formSchemas.requiredText("Pseudonim"),
    }),
  });

  return (
    <AppModal
      open={open}
      onOpenChange={onOpenChange}
      size="sm"
      scrollable
      title="Nowy użytkownik"
      description="Logowanie odbywa się imieniem, nazwiskiem i PIN-em. Piłkarz (awatar) jest przypisywany tutaj — użytkownik ustawi PIN przy pierwszym logowaniu (jak przy rejestracji samodzielnej)."
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Anuluj
          </Button>
          <Button
            type="button"
            variant="pitch"
            disabled={saving}
            onClick={async () => {
              if (!form.validate()) return;
              const { first_name, last_name, zawodnik } = form.values;
              setSaving(true);
              try {
                const res = await fetch(API.users, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    first_name: first_name.trim(),
                    last_name: last_name.trim(),
                    zawodnik,
                    role,
                  }),
                });
                const data = (await res.json().catch(() => ({}))) as { error?: string };
                if (!res.ok) {
                  toast.error(data.error ?? "Nie udało się utworzyć konta");
                  return;
                }
                toast.success("Utworzono konto użytkownika");
                onCreated();
              } finally {
                setSaving(false);
              }
            }}
          >
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
            Utwórz konto
          </Button>
        </>
      }
    >
      <div className={`${modalPanelClass} space-y-3`}>
        <FormInput
          id="adm-new-fn"
          label="Imię"
          required
          value={form.values.first_name}
          onChange={(e) => form.setValue("first_name", e.target.value)}
          onBlur={() => form.setFieldTouched("first_name")}
          error={form.errors.first_name}
          autoComplete="off"
        />
        <FormInput
          id="adm-new-ln"
          label="Nazwisko"
          required
          value={form.values.last_name}
          onChange={(e) => form.setValue("last_name", e.target.value)}
          onBlur={() => form.setFieldTouched("last_name")}
          error={form.errors.last_name}
          autoComplete="off"
        />
        <PlayerAliasPicker
          label="Pseudonim zawodnika (awatar)"
          required
          value={form.values.zawodnik}
          onChange={(v) => form.setValue("zawodnik", v)}
          onBlur={() => form.setFieldTouched("zawodnik")}
          error={form.errors.zawodnik}
          helperText="Wyszukaj piłkarza w internecie lub wpisz własny pseudonim — musi być unikalny w akademii."
        />
        <div>
          <Label>Rola</Label>
          <Select value={role} onValueChange={(v) => setRole(v as "admin" | "player")}>
            <SelectTrigger className="mt-1.5">
              <SelectValue placeholder="Wybierz rolę" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="admin">Administrator</SelectItem>
              <SelectItem value="player">Gracz</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </AppModal>
  );
}

function UserEditForm({
  open,
  onOpenChange,
  user,
  onClose,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [first_name, setFn] = useState(user.first_name);
  const [last_name, setLn] = useState(user.last_name);
  const [zawodnik, setZ] = useState(user.zawodnik);
  const [role, setRole] = useState(user.role);
  const [saving, setSaving] = useState(false);

  return (
    <AppModal
      open={open}
      onOpenChange={onOpenChange}
      size="sm"
      title="Edytuj użytkownika"
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Anuluj
          </Button>
          <Button
            type="button"
            variant="pitch"
            disabled={saving}
            onClick={async () => {
              setSaving(true);
              try {
                const res = await fetch(API.user(user.id), {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ first_name, last_name, zawodnik, role }),
                });
                if (!res.ok) {
                  toast.error("Nie udało się zapisać zmian");
                  return;
                }
                toast.success("Zapisano dane użytkownika");
                onSaved();
              } finally {
                setSaving(false);
              }
            }}
          >
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
            Zapisz
          </Button>
        </>
      }
    >
      <div className={`${modalPanelClass} space-y-3`}>
        <div>
          <Label htmlFor="adm-fn">Imię</Label>
          <Input
            id="adm-fn"
            className="mt-1 border-zinc-200"
            value={first_name}
            onChange={(e) => setFn(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="adm-ln">Nazwisko</Label>
          <Input
            id="adm-ln"
            className="mt-1 border-zinc-200"
            value={last_name}
            onChange={(e) => setLn(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="adm-alias">Pseudonim zawodnika</Label>
          <Input
            id="adm-alias"
            className="mt-1 border-zinc-200"
            value={zawodnik}
            onChange={(e) => setZ(e.target.value)}
          />
        </div>
        <div>
          <Label>Rola</Label>
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger className="mt-1 border-zinc-200">
              <SelectValue placeholder="Wybierz rolę" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="admin">Administrator</SelectItem>
              <SelectItem value="player">Gracz</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </AppModal>
  );
}

function MatchEditDialogContent({
  open,
  onOpenChange,
  match,
  defaultMaxSlots,
  onEdited,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  match: MatchRow;
  defaultMaxSlots: number;
  onEdited: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const form = useValidatedForm({
    initialValues: { maxSlots: match.max_slots || defaultMaxSlots },
    schema: z.object({ maxSlots: formSchemas.maxSlots }),
  });

  const handleSave = async () => {
    if (!form.validate()) return;
    const slots = form.values.maxSlots;

    setSaving(true);
    try {
      const res = await fetch(API.match(match.id), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: match.date,
          time: match.time,
          location: match.location,
          max_slots: slots,
        }),
      });

      const data = (await res.json().catch(() => ({}))) as { error?: string };

      if (!res.ok) {
        toast.error(data.error ?? "Nie udało się zapisać");
        return;
      }

      toast.success("Mecz został zaktualizowany");
      onEdited();
    } catch {
      toast.error("Błąd podczas zapisu");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppModal
      open={open}
      onOpenChange={onOpenChange}
      size="sm"
      title="Edytuj mecz"
      footer={
        <>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Zamknij
          </Button>
          <Button type="button" variant="pitch" onClick={() => void handleSave()} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
            Zapisz zmiany
          </Button>
        </>
      }
    >
      <ModalMatchSummary match={matchRowToSummary(match)} />
      <div className={modalPanelClass}>
        <FormInput
          id="max-slots"
          label="Maksymalna liczba miejsc"
          required
          type="number"
          min={1}
          value={String(form.values.maxSlots)}
          onChange={(e) => form.setValue("maxSlots", Number(e.target.value) || 0)}
          onBlur={() => form.setFieldTouched("maxSlots")}
          error={form.errors.maxSlots}
          disabled={saving}
          hint={
            <>
              Obecnie zapisanych: <strong>{match.players_count}</strong>
            </>
          }
        />
      </div>
    </AppModal>
  );
}



