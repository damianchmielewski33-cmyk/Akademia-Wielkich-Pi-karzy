"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowLeft,
  BarChart3,
  Calendar,
  LayoutDashboard,
  LayoutGrid,
  Loader2,
  LogOut,
  RefreshCw,
  Search,
  Shield,
  Table2,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { PlayerAvatar, PlayerNameStack } from "@/components/player-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { MatchLineupAdmin } from "@/components/match-lineup-admin";
import { ALL_PLAYERS } from "@/lib/constants";
import { cn, isValidMatchFee, matchFeeToInputString, parseMatchFeeInput } from "@/lib/utils";

const API = {
  summary: "/api/admin/summary",
  activity: "/api/admin/activity",
  users: "/api/admin/users",
  user: (id: number) => `/api/admin/user/${id}`,
  matches: "/api/admin/matches",
  match: (id: number) => `/api/admin/match/${id}`,
  matchSignups: (id: number) => `/api/admin/match/${id}/signups`,
  stats: "/api/admin/stats",
  stat: (id: number) => `/api/admin/stat/${id}`,
  analytics: (from: string, to: string) =>
    `/api/admin/analytics?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
};

type UserRow = {
  id: number;
  first_name: string;
  last_name: string;
  zawodnik: string;
  profile_photo_path: string | null;
  role: string;
};

type MatchRow = {
  id: number;
  date: string;
  time: string;
  location: string;
  players_count: number;
  played: number;
  fee_pln?: number | null;
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
};

function defaultAnalyticsDateRange(): { from: string; to: string } {
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - 30);
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

type Summary = {
  players: number;
  admins: number;
  matches: number;
  stats: number;
  upcoming_matches: number;
};

const tabs = [
  { id: "dashboard", label: "Przegląd", icon: LayoutDashboard },
  { id: "analytics", label: "Analityka", icon: BarChart3 },
  { id: "users", label: "Użytkownicy", icon: Users },
  { id: "matches", label: "Mecze", icon: Calendar },
  { id: "lineups", label: "Składy na mecz", icon: LayoutGrid },
  { id: "stats", label: "Statystyki", icon: Table2 },
] as const;

type TabId = (typeof tabs)[number]["id"];

export function AdminPanel() {
  const [tab, setTab] = useState<TabId>("dashboard");
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [activity, setActivity] = useState<{ text: string; time: string; actorName: string | null }[]>(
    []
  );
  const [users, setUsers] = useState<UserRow[]>([]);
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [stats, setStats] = useState<StatRow[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsPayload | null>(null);
  const [analyticsFrom, setAnalyticsFrom] = useState(() => defaultAnalyticsDateRange().from);
  const [analyticsTo, setAnalyticsTo] = useState(() => defaultAnalyticsDateRange().to);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const [s, a] = await Promise.all([fetch(API.summary), fetch(API.activity)]);
      if (!s.ok || !a.ok) throw new Error();
      setSummary(await s.json());
      setActivity(await a.json());
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

  const loadAnalytics = useCallback(async (from: string, to: string) => {
    setLoading(true);
    try {
      const res = await fetch(API.analytics(from, to));
      if (!res.ok) throw new Error();
      setAnalytics(await res.json());
    } catch {
      toast.error("Nie udało się wczytać analityki");
      setAnalytics(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === "dashboard") void loadDashboard();
    if (tab === "users") void loadUsers();
    if (tab === "matches") void loadMatches();
    if (tab === "stats") void loadStats();
    if (tab === "lineups") setLoading(false);
  }, [tab, loadDashboard, loadUsers, loadMatches, loadStats]);

  useEffect(() => {
    if (tab !== "analytics") return;
    void loadAnalytics(analyticsFrom, analyticsTo);
  }, [tab, analyticsFrom, analyticsTo, loadAnalytics]);

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <div className="flex min-h-screen flex-col lg:flex-row">
        <aside
          className={cn(
            "border-zinc-200/80 bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 text-white",
            "lg:w-60 lg:shrink-0 lg:border-r"
          )}
        >
          <div className="flex flex-col gap-6 p-4 lg:sticky lg:top-0 lg:max-h-screen lg:overflow-y-auto">
            <div className="flex items-center gap-3 border-b border-white/10 pb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-lg shadow-inner">
                ⚽
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-emerald-300/90">
                  Akademia
                </p>
                <p className="font-semibold leading-tight">Panel administratora</p>
              </div>
            </div>

            <nav className="flex flex-wrap gap-2 lg:flex-col lg:gap-1">
              {tabs.map((t) => {
                const Icon = t.icon;
                const active = tab === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTab(t.id)}
                    className={cn(
                      "flex items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors",
                      active
                        ? "bg-white/15 text-white shadow-sm"
                        : "text-emerald-100/80 hover:bg-white/10 hover:text-white"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
                    {t.label}
                  </button>
                );
              })}
            </nav>

            <div className="mt-auto flex flex-col gap-2 border-t border-white/10 pt-4">
              <Link
                href="/terminarz"
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-emerald-100/90 transition-colors hover:bg-white/10 hover:text-white"
              >
                <Calendar className="h-4 w-4" aria-hidden />
                Terminarz (edycja)
              </Link>
              <Link
                href="/"
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-emerald-100/90 transition-colors hover:bg-white/10 hover:text-white"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden />
                Strona główna
              </Link>
              <a
                href="/api/auth/logout"
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-emerald-100/90 transition-colors hover:bg-white/10 hover:text-white"
              >
                <LogOut className="h-4 w-4" aria-hidden />
                Wyloguj
              </a>
            </div>
          </div>
        </aside>

        <main className="relative flex-1 overflow-x-hidden p-4 sm:p-6 lg:p-8">
          {loading && (
            <div
              className="pointer-events-none absolute right-6 top-6 flex items-center gap-2 text-sm text-zinc-500"
              aria-live="polite"
            >
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Wczytywanie…
            </div>
          )}

          <div className="mx-auto max-w-6xl">
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
            {tab === "matches" && <MatchesView matches={matches} loading={loading} onReload={loadMatches} />}
            {tab === "lineups" && <MatchLineupAdmin />}
            {tab === "analytics" && (
              <AnalyticsView
                data={analytics}
                loading={loading}
                dateFrom={analyticsFrom}
                dateTo={analyticsTo}
                onDateFromChange={setAnalyticsFrom}
                onDateToChange={setAnalyticsTo}
                onReload={() => void loadAnalytics(analyticsFrom, analyticsTo)}
              />
            )}
            {tab === "stats" && <StatsView stats={stats} loading={loading} onReload={loadStats} />}
          </div>
        </main>
      </div>
    </div>
  );
}

function Toolbar({
  title,
  description,
  onReload,
  loading,
  children,
}: {
  title: string;
  description?: string;
  onReload: () => void;
  loading: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">{title}</h1>
        {description ? <p className="mt-1 text-sm text-zinc-600">{description}</p> : null}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {children}
        <Button type="button" variant="outline" size="sm" onClick={onReload} disabled={loading}>
          <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} aria-hidden />
          Odśwież
        </Button>
      </div>
    </div>
  );
}

function AnalyticsView({
  data,
  loading,
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  onReload,
}: {
  data: AnalyticsPayload | null;
  loading: boolean;
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (v: string) => void;
  onDateToChange: (v: string) => void;
  onReload: () => void;
}) {
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

  return (
    <div>
      <Toolbar
        title="Analityka wejść"
        description="Dane zbierane przy otwarciu stron przez użytkowników (bez panelu admina). Zmiana dat wczytuje raport ponownie."
        onReload={onReload}
        loading={loading}
      >
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <Label htmlFor="adm-an-from" className="text-xs text-zinc-600">
              Od
            </Label>
            <Input
              id="adm-an-from"
              type="date"
              className="mt-1 w-[11rem] border-zinc-200 bg-white"
              value={dateFrom}
              onChange={(e) => onDateFromChange(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="adm-an-to" className="text-xs text-zinc-600">
              Do
            </Label>
            <Input
              id="adm-an-to"
              type="date"
              className="mt-1 w-[11rem] border-zinc-200 bg-white"
              value={dateTo}
              onChange={(e) => onDateToChange(e.target.value)}
            />
          </div>
        </div>
      </Toolbar>

      <Card className="mb-6 border-amber-200/80 bg-amber-50/50 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-amber-950">Jak czytać te liczby</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-amber-950/90">
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
        </CardContent>
      </Card>

      {!data && !loading ? (
        <p className="text-sm text-zinc-600">Brak danych do wyświetlenia.</p>
      ) : null}

      {data ? (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Card className="border-zinc-200/80 bg-white shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-zinc-800">Wszystkie odsłony</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold tabular-nums text-emerald-950">
                  {data.totals.total_views}
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  Unikalni odbiorcy (gość lub id gracza): {data.totals.unique_visitors}
                </p>
              </CardContent>
            </Card>
            <Card className="border-zinc-200/80 bg-white shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-zinc-800">
                  Odsłony: anonim / zalogowany
                </CardTitle>
              </CardHeader>
              <CardContent>
                {viewSplit ? (
                  <>
                    <p className="text-sm text-zinc-700">
                      Anonimowe: <strong>{data.totals.anonymous_views}</strong> (
                      {viewSplit.anonPct}%)
                    </p>
                    <p className="text-sm text-zinc-700">
                      Zalogowane: <strong>{data.totals.authenticated_views}</strong> (
                      {viewSplit.authPct}%)
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-zinc-500">Brak odsłon w okresie.</p>
                )}
              </CardContent>
            </Card>
            <Card className="border-zinc-200/80 bg-white shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-zinc-800">Gracze w bazie</CardTitle>
                <CardDescription className="text-xs">Konta nie-admin</CardDescription>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <p>
                  Z aktywnością w okresie:{" "}
                  <strong className="tabular-nums">{data.players.visited_in_range}</strong>
                  {data.players.pct_visited != null ? (
                    <span className="text-zinc-600"> ({data.players.pct_visited}%)</span>
                  ) : null}
                </p>
                <p>
                  Bez wejść zalogowanych w okresie:{" "}
                  <strong className="tabular-nums">{data.players.not_visited_in_range}</strong>
                  {data.players.pct_not_visited != null ? (
                    <span className="text-zinc-600"> ({data.players.pct_not_visited}%)</span>
                  ) : null}
                </p>
                <p className="text-xs text-zinc-500">
                  Nowe konta (rejestracja): {data.players.self_service_registrations_in_range}
                </p>
              </CardContent>
            </Card>
            <Card className="border-zinc-200/80 bg-white shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-zinc-800">Terminarz → mecz</CardTitle>
                <CardDescription className="text-xs">Gracze (nie-admin)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <p>
                  Oglądali terminarz:{" "}
                  <strong className="tabular-nums">
                    {data.terminarz_funnel.distinct_players_viewed}
                  </strong>
                </p>
                <p>
                  Zapis na mecz w okresie:{" "}
                  <strong className="tabular-nums">
                    {data.terminarz_funnel.distinct_players_viewed_and_signed_match_in_range}
                  </strong>
                  {data.terminarz_funnel.pct_signed_after_view != null ? (
                    <span className="text-zinc-600">
                      {" "}
                      ({data.terminarz_funnel.pct_signed_after_view}%)
                    </span>
                  ) : data.terminarz_funnel.distinct_players_viewed === 0 ? (
                    <span className="text-zinc-500"> (–)</span>
                  ) : null}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card className="border-zinc-200/80 bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Wejścia wg ekranu</CardTitle>
              <CardDescription>
                Liczba odsłon i szacunek unikalnych odbiorców (gość lub zalogowany gracz) w wybranym
                zakresie.
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-zinc-200 hover:bg-transparent">
                    <TableHead className="text-zinc-700">Ekran</TableHead>
                    <TableHead className="text-right text-zinc-700">Odsłony</TableHead>
                    <TableHead className="text-right text-zinc-700">Unikalni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.screens.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-sm text-zinc-500">
                        Brak zapisanych wejść w tym okresie (dane pojawią się po pierwszych wizytach).
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.screens.map((row) => (
                      <TableRow key={row.screen_key} className="border-zinc-100">
                        <TableCell>
                          <span className="font-medium text-zinc-900">{row.label}</span>
                          <span className="ml-2 font-mono text-xs text-zinc-400">{row.screen_key}</span>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{row.total_views}</TableCell>
                        <TableCell className="text-right tabular-nums">{row.unique_visitors}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
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
  activity: { text: string; time: string; actorName: string | null }[];
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
      <Toolbar
        title="Przegląd"
        description="Skrót organizacji — kliknij kafelek, aby przejść do szczegółów."
        onReload={onReload}
        loading={loading}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {metrics.map((m) => {
          const Icon = m.icon;
          return (
            <button
              key={m.key}
              type="button"
              onClick={() => onGoToTab(m.tab)}
              className="group text-left transition-transform hover:scale-[1.01] focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
            >
              <Card className="h-full border-zinc-200/80 bg-white shadow-sm transition-shadow group-hover:shadow-md">
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                  <div>
                    <CardTitle className="text-base font-semibold text-zinc-800">{m.label}</CardTitle>
                    <CardDescription className="text-xs">{m.hint}</CardDescription>
                  </div>
                  <div className="rounded-lg bg-emerald-50 p-2 text-emerald-700">
                    <Icon className="h-5 w-5" aria-hidden />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold tabular-nums tracking-tight text-emerald-950">
                    {m.value ?? "–"}
                  </p>
                </CardContent>
              </Card>
            </button>
          );
        })}
      </div>

      <Card className="mt-8 border-zinc-200/80 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Ostatnia aktywność</CardTitle>
          <CardDescription>
            Do 25 ostatnich wpisów: imię i nazwisko wykonawcy oraz opis czynności i czas zdarzenia
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activity.length === 0 ? (
            <p className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50/80 px-4 py-8 text-center text-sm text-zinc-600">
              Brak zapisów w dzienniku — pojawią się po logowaniu, zapisach na mecze, statystykach i
              innych operacjach w aplikacji.
            </p>
          ) : (
            <ul className="space-y-3">
              {activity.map((item, i) => (
                <li
                  key={`${item.time}-${i}`}
                  className="flex flex-col gap-1 border-l-2 border-emerald-200 pl-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4"
                >
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <p className="text-sm font-medium text-zinc-900">
                      {item.actorName ?? "—"}
                    </p>
                    <p className="text-sm text-zinc-600">{item.text}</p>
                  </div>
                  <time
                    className="shrink-0 text-xs tabular-nums text-zinc-500 sm:pt-0.5"
                    dateTime={item.time}
                  >
                    {item.time}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
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
      <Toolbar
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
            className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
            aria-hidden
          />
          <Input
            className="border-zinc-200 bg-white pl-9"
            placeholder="Szukaj…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Filtruj użytkowników"
          />
        </div>
      </Toolbar>

      <div className="overflow-hidden rounded-xl border border-zinc-200/80 bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="border-zinc-200 hover:bg-transparent">
              <TableHead className="w-12 text-zinc-700" />
              <TableHead className="text-zinc-700">Zawodnik</TableHead>
              <TableHead className="text-zinc-700">Rola</TableHead>
              <TableHead className="text-right text-zinc-700">Akcje</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-sm text-zinc-500">
                  {users.length === 0
                    ? "Brak użytkowników w bazie."
                    : "Brak wyników dla podanego filtra."}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((u) => (
                <TableRow key={u.id} className="border-zinc-100">
                  <TableCell className="align-middle">
                    <PlayerAvatar
                      photoPath={u.profile_photo_path}
                      firstName={u.first_name}
                      lastName={u.last_name}
                      size="sm"
                      ringClassName="ring-2 ring-zinc-200"
                    />
                  </TableCell>
                  <TableCell className="align-middle">
                    <PlayerNameStack
                      firstName={u.first_name}
                      lastName={u.last_name}
                      nick={u.zawodnik}
                    />
                  </TableCell>
                  <TableCell>
                    {u.role === "admin" ? (
                      <Badge>Administrator</Badge>
                    ) : (
                      <Badge variant="secondary">Gracz</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
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
      </div>

      <Dialog open={Boolean(edit)} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="sm:max-w-md">
          {edit && (
            <UserEditForm
              user={edit}
              onClose={() => setEdit(null)}
              onSaved={() => {
                setEdit(null);
                onReload();
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <UserCreateForm
            takenAliases={users.map((u) => u.zawodnik)}
            onClose={() => setCreateOpen(false)}
            onCreated={() => {
              setCreateOpen(false);
              onReload();
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={delUser != null} onOpenChange={(o) => !o && setDelUser(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Usunąć użytkownika?</DialogTitle>
          </DialogHeader>
          {delUser && (
            <p className="text-sm text-zinc-600">
              Konto{" "}
              <strong>
                {delUser.first_name} {delUser.last_name}
              </strong>{" "}
              ({delUser.zawodnik}, id {delUser.id}) zostanie trwale usunięte.
            </p>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDelUser(null)}>
              Anuluj
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (delUser == null) return;
                const res = await fetch(API.user(delUser.id), { method: "DELETE" });
                if (!res.ok) {
                  toast.error("Nie udało się usunąć użytkownika");
                  return;
                }
                toast.success("Użytkownik został usunięty");
                setDelUser(null);
                onReload();
              }}
            >
              Usuń
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function UserCreateForm({
  takenAliases,
  onClose,
  onCreated,
}: {
  takenAliases: string[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const taken = useMemo(() => new Set(takenAliases), [takenAliases]);
  const freeAvatars = useMemo(
    () => ALL_PLAYERS.filter((p) => !taken.has(p)),
    [taken]
  );

  const [first_name, setFn] = useState("");
  const [last_name, setLn] = useState("");
  const [zawodnik, setZ] = useState("");
  const [role, setRole] = useState<"admin" | "player">("player");
  const [saving, setSaving] = useState(false);

  return (
    <>
      <DialogHeader>
        <DialogTitle>Nowy użytkownik</DialogTitle>
      </DialogHeader>
      <p className="text-sm text-zinc-600">
        Konto loguje się tak jak przy rejestracji: imię, nazwisko i wybrany pseudonim piłkarza muszą
        się zgadzać z danymi wpisanymi przy logowaniu.
      </p>
      <div className="space-y-3 py-2">
        <div>
          <Label htmlFor="adm-new-fn">Imię</Label>
          <Input
            id="adm-new-fn"
            className="mt-1 border-zinc-200"
            value={first_name}
            onChange={(e) => setFn(e.target.value)}
            autoComplete="off"
          />
        </div>
        <div>
          <Label htmlFor="adm-new-ln">Nazwisko</Label>
          <Input
            id="adm-new-ln"
            className="mt-1 border-zinc-200"
            value={last_name}
            onChange={(e) => setLn(e.target.value)}
            autoComplete="off"
          />
        </div>
        <div>
          <Label>Pseudonim zawodnika (awatar)</Label>
          {freeAvatars.length === 0 ? (
            <p className="mt-1 text-sm text-amber-700">
              Wszystkie awatary są już przypisane — usuń konto lub zmień pseudonim istniejącego
              użytkownika.
            </p>
          ) : (
            <Select value={zawodnik || undefined} onValueChange={setZ}>
              <SelectTrigger className="mt-1 border-zinc-200">
                <SelectValue placeholder="Wybierz piłkarza" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {freeAvatars.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        <div>
          <Label>Rola</Label>
          <Select value={role} onValueChange={(v) => setRole(v as "admin" | "player")}>
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
      <DialogFooter className="gap-2 sm:gap-0">
        <Button variant="outline" onClick={onClose} disabled={saving}>
          Anuluj
        </Button>
        <Button
          disabled={saving || freeAvatars.length === 0 || !zawodnik}
          onClick={async () => {
            if (!first_name.trim() || !last_name.trim() || !zawodnik) {
              toast.error("Uzupełnij imię, nazwisko i pseudonim");
              return;
            }
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
      </DialogFooter>
    </>
  );
}

function UserEditForm({
  user,
  onClose,
  onSaved,
}: {
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
    <>
      <DialogHeader>
        <DialogTitle>Edytuj użytkownika</DialogTitle>
      </DialogHeader>
      <div className="space-y-3 py-2">
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
      <DialogFooter className="gap-2 sm:gap-0">
        <Button variant="outline" onClick={onClose} disabled={saving}>
          Anuluj
        </Button>
        <Button
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
      </DialogFooter>
    </>
  );
}

type MatchSignupPaidRow = {
  user_id: number;
  paid: number;
  first_name: string;
  last_name: string;
  zawodnik: string;
  profile_photo_path: string | null;
};

function MatchSignupsDialog({
  match,
  open,
  onClose,
}: {
  match: MatchRow | null;
  open: boolean;
  onClose: () => void;
}) {
  const [rows, setRows] = useState<MatchSignupPaidRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

  useEffect(() => {
    if (!open || !match) {
      setRows([]);
      return;
    }
    setLoading(true);
    void fetch(API.matchSignups(match.id))
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json() as Promise<{ signups: MatchSignupPaidRow[] }>;
      })
      .then((d) => setRows(d.signups ?? []))
      .catch(() => {
        toast.error("Nie udało się wczytać zapisów");
        setRows([]);
      })
      .finally(() => setLoading(false));
  }, [open, match]);

  async function togglePaid(userId: number, nextPaid: boolean) {
    if (!match) return;
    setBusyId(userId);
    try {
      const res = await fetch(API.matchSignups(match.id), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, paid: nextPaid }),
      });
      if (!res.ok) {
        toast.error("Nie udało się zapisać statusu opłaty");
        return;
      }
      setRows((prev) =>
        prev.map((r) => (r.user_id === userId ? { ...r, paid: nextPaid ? 1 : 0 } : r))
      );
      toast.success(nextPaid ? "Oznaczono jako opłacone" : "Cofnięto oznaczenie opłaty");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Zapisy i opłaty</DialogTitle>
          {match ? (
            <p className="text-sm font-medium text-zinc-600">
              {match.date} · {match.time}
            </p>
          ) : null}
          {match ? <p className="text-sm text-zinc-500">{match.location}</p> : null}
        </DialogHeader>
        {loading ? (
          <p className="flex items-center justify-center gap-2 py-10 text-sm text-zinc-500">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Wczytywanie…
          </p>
        ) : rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-zinc-500">Brak zapisanych zawodników.</p>
        ) : (
          <ul className="max-h-[min(24rem,60vh)] space-y-0 overflow-y-auto rounded-xl border border-zinc-200 bg-zinc-50/50">
            {rows.map((p, i) => (
              <li
                key={p.user_id}
                className={`flex flex-wrap items-center gap-2 border-b border-zinc-100 px-3 py-2.5 text-sm last:border-b-0 ${
                  i % 2 === 0 ? "bg-white" : "bg-zinc-50/80"
                }`}
              >
                <PlayerAvatar
                  photoPath={p.profile_photo_path}
                  firstName={p.first_name}
                  lastName={p.last_name}
                  size="sm"
                  ringClassName="ring-2 ring-zinc-200"
                />
                <div className="min-w-0 flex-1">
                  <PlayerNameStack
                    firstName={p.first_name}
                    lastName={p.last_name}
                    nick={p.zawodnik}
                  />
                </div>
                {p.paid ? (
                  <Badge className="border-emerald-200 bg-emerald-100 text-emerald-900">Opłacone</Badge>
                ) : (
                  <Badge variant="secondary">Do zapłaty</Badge>
                )}
                <Button
                  size="sm"
                  variant={p.paid ? "outline" : "default"}
                  className="shrink-0"
                  disabled={busyId === p.user_id}
                  onClick={() => void togglePaid(p.user_id, !p.paid)}
                >
                  {busyId === p.user_id ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  ) : p.paid ? (
                    "Cofnij"
                  ) : (
                    "Opłacone"
                  )}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}

function MatchesView({
  matches,
  loading,
  onReload,
}: {
  matches: MatchRow[];
  loading: boolean;
  onReload: () => void;
}) {
  const [editId, setEditId] = useState<number | null>(null);
  const [editRow, setEditRow] = useState<MatchRow | null>(null);
  const [delMatch, setDelMatch] = useState<MatchRow | null>(null);
  const [signupsMatch, setSignupsMatch] = useState<MatchRow | null>(null);
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return matches;
    return matches.filter(
      (m) =>
        m.location.toLowerCase().includes(s) ||
        m.date.includes(s) ||
        m.time.includes(s) ||
        String(m.id).includes(s)
    );
  }, [matches, q]);

  async function openEdit(id: number) {
    const res = await fetch(API.match(id));
    if (!res.ok) {
      toast.error("Nie udało się wczytać meczu");
      return;
    }
    const m = await res.json();
    setEditRow({
      id,
      date: m.date,
      time: m.time,
      location: m.location,
      players_count: 0,
      played: m.played ?? 0,
      fee_pln: m.fee_pln ?? null,
    });
    setEditId(id);
  }

  return (
    <div>
      <Toolbar
        title="Mecze"
        description="Lista terminów — edycja daty, miejsca, kwoty wpisowego oraz oznaczanie opłat za zapisy."
        onReload={onReload}
        loading={loading}
      >
        <div className="relative w-full min-w-[200px] sm:w-64">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
            aria-hidden
          />
          <Input
            className="border-zinc-200 bg-white pl-9"
            placeholder="Data, miejsce, id…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Filtruj mecze"
          />
        </div>
      </Toolbar>

      <div className="overflow-hidden rounded-xl border border-zinc-200/80 bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="border-zinc-200 hover:bg-transparent">
              <TableHead className="w-14 text-zinc-600">ID</TableHead>
              <TableHead className="text-zinc-700">Data</TableHead>
              <TableHead className="text-zinc-700">Godzina</TableHead>
              <TableHead className="text-zinc-700">Miejsce</TableHead>
              <TableHead className="text-zinc-700">Zapisani</TableHead>
              <TableHead className="text-right tabular-nums text-zinc-700">Kwota</TableHead>
              <TableHead className="text-zinc-700">Status</TableHead>
              <TableHead className="text-right text-zinc-700">Akcje</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-sm text-zinc-500">
                  {matches.length === 0 ? "Brak meczów w bazie." : "Brak wyników dla podanego filtra."}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((m) => (
                <TableRow key={m.id} className="border-zinc-100">
                  <TableCell className="font-mono text-xs text-zinc-500">{m.id}</TableCell>
                  <TableCell className="tabular-nums">{m.date}</TableCell>
                  <TableCell className="tabular-nums">{m.time}</TableCell>
                  <TableCell>{m.location}</TableCell>
                  <TableCell>{m.players_count}</TableCell>
                  <TableCell className="text-right tabular-nums text-zinc-700">
                    {isValidMatchFee(m.fee_pln) ? (
                      <span title="Wpłata BLIK — kwota na mecz">{m.fee_pln} zł</span>
                    ) : (
                      <span className="text-zinc-400">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {m.played ? (
                      <Badge variant="outline" className="border-zinc-300 font-normal text-zinc-700">
                        Rozegrany
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Zaplanowany</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-wrap justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-emerald-800/25 bg-white"
                        onClick={() => setSignupsMatch(m)}
                        title="Zapisy i status opłaty"
                      >
                        <Wallet className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                        Opłaty
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => openEdit(m.id)}>
                        Edytuj
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => setDelMatch(m)}>
                        Usuń
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog
        open={editId != null}
        onOpenChange={(o) => {
          if (!o) {
            setEditId(null);
            setEditRow(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          {editRow && (
            <MatchEditForm
              key={editRow.id}
              m={editRow}
              onClose={() => {
                setEditId(null);
                setEditRow(null);
              }}
              onSaved={() => {
                setEditId(null);
                setEditRow(null);
                onReload();
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={delMatch != null} onOpenChange={(o) => !o && setDelMatch(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Usunąć mecz?</DialogTitle>
          </DialogHeader>
          {delMatch && (
            <p className="text-sm text-zinc-600">
              Mecz <strong>{delMatch.date}</strong> o <strong>{delMatch.time}</strong>,{" "}
              <strong>{delMatch.location}</strong> (id {delMatch.id}).
            </p>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDelMatch(null)}>
              Anuluj
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (delMatch == null) return;
                const res = await fetch(API.match(delMatch.id), { method: "DELETE" });
                if (!res.ok) {
                  toast.error("Nie udało się usunąć meczu");
                  return;
                }
                toast.success("Mecz został usunięty");
                setDelMatch(null);
                onReload();
              }}
            >
              Usuń
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <MatchSignupsDialog
        match={signupsMatch}
        open={signupsMatch != null}
        onClose={() => setSignupsMatch(null)}
      />
    </div>
  );
}

function MatchEditForm({
  m,
  onClose,
  onSaved,
}: {
  m: MatchRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [date, setDate] = useState(m.date);
  const [time, setTime] = useState(m.time);
  const [location, setLoc] = useState(m.location);
  const [feePln, setFeePln] = useState(() => matchFeeToInputString(m.fee_pln));
  const [saving, setSaving] = useState(false);

  return (
    <>
      <DialogHeader>
        <DialogTitle>Edytuj mecz</DialogTitle>
      </DialogHeader>
      <div className="space-y-3">
        <div>
          <Label htmlFor="adm-md">Data</Label>
          <Input
            id="adm-md"
            type="date"
            className="mt-1 border-zinc-200"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="adm-mt">Godzina</Label>
          <Input
            id="adm-mt"
            type="time"
            className="mt-1 border-zinc-200"
            value={time}
            onChange={(e) => setTime(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="adm-ml">Lokalizacja</Label>
          <Input
            id="adm-ml"
            className="mt-1 border-zinc-200"
            value={location}
            onChange={(e) => setLoc(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="adm-mfee">Kwota wpisowego (PLN)</Label>
          <Input
            id="adm-mfee"
            type="text"
            inputMode="decimal"
            placeholder="np. 25 lub puste"
            className="mt-1 border-zinc-200"
            value={feePln}
            onChange={(e) => setFeePln(e.target.value)}
          />
          <p className="mt-1 text-xs text-zinc-500">Puste pole — kwota nie jest wyświetlana na stronie płatności.</p>
        </div>
      </div>
      <DialogFooter className="gap-2 sm:gap-0">
        <Button variant="outline" onClick={onClose} disabled={saving}>
          Anuluj
        </Button>
        <Button
          disabled={saving}
          onClick={async () => {
            const parsed = parseMatchFeeInput(feePln);
            if (!parsed.ok) {
              toast.error("Podaj prawidłową kwotę lub zostaw pole puste");
              return;
            }
            const fee_pln = parsed.fee;
            setSaving(true);
            try {
              const res = await fetch(API.match(m.id), {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ date, time, location, fee_pln }),
              });
              if (!res.ok) {
                toast.error("Nie udało się zapisać meczu");
                return;
              }
              toast.success("Zapisano mecz");
              onSaved();
            } finally {
              setSaving(false);
            }
          }}
        >
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
          Zapisz
        </Button>
      </DialogFooter>
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
  const [editId, setEditId] = useState<number | null>(null);
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return stats;
    return stats.filter((st) => {
      const full = `${st.first_name} ${st.last_name}`.toLowerCase();
      return (
        full.includes(s) ||
        st.zawodnik.toLowerCase().includes(s) ||
        String(st.match_id).includes(s) ||
        String(st.id).includes(s)
      );
    });
  }, [stats, q]);

  return (
    <div>
      <Toolbar
        title="Statystyki"
        description="Pojedyncze wpisy powiązane z meczem i zawodnikiem — edycja liczb."
        onReload={onReload}
        loading={loading}
      >
        <div className="relative w-full min-w-[200px] sm:w-64">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
            aria-hidden
          />
          <Input
            className="border-zinc-200 bg-white pl-9"
            placeholder="Zawodnik, mecz, id…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Filtruj statystyki"
          />
        </div>
      </Toolbar>

      <div className="overflow-x-auto overflow-y-hidden rounded-xl border border-zinc-200/80 bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="border-zinc-200 hover:bg-transparent">
              <TableHead className="w-14 text-zinc-600">ID</TableHead>
              <TableHead className="w-12 text-zinc-600" />
              <TableHead className="text-zinc-700">Zawodnik</TableHead>
              <TableHead className="text-zinc-700">Mecz</TableHead>
              <TableHead className="text-zinc-700">Gole</TableHead>
              <TableHead className="text-zinc-700">Asysty</TableHead>
              <TableHead className="text-zinc-700">Dystans</TableHead>
              <TableHead className="text-zinc-700">Obrony</TableHead>
              <TableHead className="text-right text-zinc-700">Akcje</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center text-sm text-zinc-500">
                  {stats.length === 0 ? "Brak wpisów statystyk." : "Brak wyników dla podanego filtra."}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((s) => (
                <TableRow key={s.id} className="border-zinc-100">
                  <TableCell className="font-mono text-xs text-zinc-500">{s.id}</TableCell>
                  <TableCell className="align-middle">
                    <PlayerAvatar
                      photoPath={s.profile_photo_path}
                      firstName={s.first_name}
                      lastName={s.last_name}
                      size="sm"
                      ringClassName="ring-2 ring-zinc-200"
                    />
                  </TableCell>
                  <TableCell className="align-middle">
                    <PlayerNameStack
                      firstName={s.first_name}
                      lastName={s.last_name}
                      nick={s.zawodnik}
                    />
                  </TableCell>
                  <TableCell className="tabular-nums">{s.match_id}</TableCell>
                  <TableCell>{s.goals}</TableCell>
                  <TableCell>{s.assists}</TableCell>
                  <TableCell>{s.distance}</TableCell>
                  <TableCell>{s.saves ?? 0}</TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="secondary" onClick={() => setEditId(s.id)}>
                      Edytuj
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <StatEditDialog id={editId} onClose={() => setEditId(null)} onSaved={onReload} />
    </div>
  );
}

function StatEditDialog({
  id,
  onClose,
  onSaved,
}: {
  id: number | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [goals, setG] = useState("0");
  const [assists, setA] = useState("0");
  const [distance, setD] = useState("0");
  const [saves, setS] = useState("0");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (id == null) return;
    void (async () => {
      const res = await fetch(API.stat(id));
      if (!res.ok) {
        toast.error("Nie udało się wczytać statystyk");
        return;
      }
      const s = await res.json();
      setG(String(s.goals));
      setA(String(s.assists));
      setD(String(s.distance));
      setS(String(s.saves ?? 0));
    })();
  }, [id]);

  return (
    <Dialog open={id != null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edytuj statystyki</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div>
            <Label htmlFor="adm-sg">Gole</Label>
            <Input
              id="adm-sg"
              type="number"
              className="mt-1 border-zinc-200"
              value={goals}
              onChange={(e) => setG(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="adm-sa">Asysty</Label>
            <Input
              id="adm-sa"
              type="number"
              className="mt-1 border-zinc-200"
              value={assists}
              onChange={(e) => setA(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="adm-sd">Dystans</Label>
            <Input
              id="adm-sd"
              type="number"
              step={0.1}
              className="mt-1 border-zinc-200"
              value={distance}
              onChange={(e) => setD(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="adm-ss">Obrony</Label>
            <Input
              id="adm-ss"
              type="number"
              className="mt-1 border-zinc-200"
              value={saves}
              onChange={(e) => setS(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Anuluj
          </Button>
          <Button
            disabled={saving}
            onClick={async () => {
              if (id == null) return;
              setSaving(true);
              try {
                const res = await fetch(API.stat(id), {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    goals: Number(goals),
                    assists: Number(assists),
                    distance: Number(distance),
                    saves: Number(saves),
                  }),
                });
                if (!res.ok) {
                  toast.error("Nie udało się zapisać statystyk");
                  return;
                }
                toast.success("Zapisano statystyki");
                onClose();
                onSaved();
              } finally {
                setSaving(false);
              }
            }}
          >
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
            Zapisz
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
