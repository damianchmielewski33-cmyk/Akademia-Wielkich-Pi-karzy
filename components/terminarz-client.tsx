"use client";

import Image from "next/image";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Activity,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Link2,
  List,
  Loader2,
  LogIn,
  MapPin,
  HelpCircle,
  RotateCcw,
  Search,
  ShieldCheck,
  UserMinus,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import type { MatchRow } from "@/lib/db";
import { PlayerAvatar, PlayerNameStack } from "@/components/player-avatar";
import type { PlayersDataEntry } from "@/lib/terminarz-shared";
import { formatPonderingPlayersPolish, tentativeSignupCount } from "@/lib/terminarz-shared";
import { cn } from "@/lib/utils";
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
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoginForm } from "@/components/login-form";
import { MatchTransportSignupDialog } from "@/components/match-transport-signup-dialog";
import { MatchLocationWeather } from "@/components/match-location-weather";
import { appendShareSessionQuery, terminarzInviteRelativePath } from "@/lib/share-link";
import {
  getStandaloneSurveyMatchRow,
  PARTICIPATION_SURVEY_KEY,
} from "@/lib/match-participation-survey";

type Props = {
  upcoming: MatchRow[];
  playedConfirmed: MatchRow[];
  allMatches: MatchRow[];
  playersData: Record<number, PlayersDataEntry>;
  /** Rodzaj zapisu użytkownika na mecz (brak wpisu = nie zapisany). */
  userSignupKind: Record<number, "tentative" | "confirmed" | "declined">;
  /** Rozegrane mecze, na które użytkownik był zapisany i nie ma jeszcze wiersza w `match_stats`. */
  playedMissingStatsMatchIds: number[];
  isLoggedIn: boolean;
  isAdmin: boolean;
  /** Z URL (?mecz=) — wyróżnienie wiersza po wejściu z maila. */
  highlightMatchId?: number | null;
  /** Z URL (?zaproszenie=1) — link skopiowany z przycisku zaproszenia; uruchamia zapis po logowaniu. */
  inviteFromShare?: boolean;
  /** Z URL (?statystyki=1 wraz z ?mecz=) — otwiera dialog statystyk po wejściu (mecz z bazy). */
  openStatsFromUrl?: boolean;
  /** Z URL (?statystyki_ankiety=1) — mecz spoza bazy (ankieta 27.03). */
  openStandaloneSurveyStats?: boolean;
};

const todayISO = () => new Date().toISOString().slice(0, 10);

type AdminMatchSignupRow = {
  user_id: number;
  paid: number;
  commitment: number;
  first_name: string;
  last_name: string;
  zawodnik: string;
  profile_photo_path: string | null;
};

function formatPln(n: number) {
  const v = Math.round(n * 100) / 100;
  return new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN" }).format(v);
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

function MatchSignupCountsBlock({
  matchId,
  signedUp,
  maxSlots,
  playersData,
  variant = "card",
  tone = "emerald",
}: {
  matchId: number;
  signedUp: number;
  maxSlots: number;
  playersData: Record<number, PlayersDataEntry>;
  variant?: "card" | "table";
  tone?: "emerald" | "zinc";
}) {
  const tentative = tentativeSignupCount(playersData, matchId);
  const pondering = formatPonderingPlayersPolish(tentative);
  const mainCls =
    tone === "zinc"
      ? variant === "table"
        ? "font-bold text-zinc-800 dark:text-zinc-200"
        : "text-sm font-semibold text-zinc-800 dark:text-zinc-200"
      : variant === "table"
        ? "font-bold text-emerald-950 dark:text-emerald-100"
        : "text-sm font-semibold text-emerald-950 dark:text-emerald-100";
  const subCls =
    tone === "zinc"
      ? variant === "table"
        ? "mt-0.5 text-[11px] font-medium leading-snug text-zinc-600 dark:text-zinc-400"
        : "mt-0.5 text-xs font-medium text-zinc-600 dark:text-zinc-400"
      : variant === "table"
        ? "mt-0.5 text-[11px] font-medium leading-snug text-emerald-800 dark:text-emerald-300"
        : "mt-0.5 text-xs font-medium text-emerald-800/90 dark:text-emerald-300/90";
  return (
    <div>
      <p className={mainCls}>
        {signedUp}/{maxSlots} zapisanych
      </p>
      {pondering ? <p className={subCls}>{pondering}</p> : null}
    </div>
  );
}

function addDaysISO(isoDate: string, days: number): string {
  const d = new Date(isoDate + "T12:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function rowClass(signed: number, max: number) {
  if (max <= 0) return "bg-slate-50 dark:bg-zinc-800/70";
  const p = (signed / max) * 100;
  if (p < 50) {
    return "bg-emerald-50/90 border-l-4 border-l-emerald-500 dark:bg-emerald-950/35 dark:border-l-emerald-500";
  }
  if (p < 80) {
    return "bg-amber-50/90 border-l-4 border-l-amber-500 dark:bg-amber-950/30 dark:border-l-amber-500";
  }
  return "bg-red-50/80 border-l-4 border-l-red-500 dark:bg-red-950/35 dark:border-l-red-500";
}

function PitchTableFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative overflow-hidden rounded-2xl p-[3px] shadow-[0_20px_50px_-18px_rgba(5,55,45,0.55)] ring-1 ring-emerald-950/20 dark:shadow-[0_20px_50px_-18px_rgba(0,0,0,0.5)] dark:ring-emerald-900/40">
      <div className="terminarz-stadium-layers pointer-events-none absolute inset-0 rounded-2xl" aria-hidden />
      <div
        className="home-pitch-tile pointer-events-none absolute inset-0 rounded-2xl opacity-[0.22] mix-blend-soft-light dark:opacity-[0.14]"
        aria-hidden
      />
      <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-b from-white/[0.08] via-transparent to-emerald-950/[0.12] dark:from-white/[0.03] dark:to-emerald-950/[0.2]" aria-hidden />
      <div className="relative z-[1] min-w-0 overflow-x-auto overflow-y-visible rounded-[0.9rem] border border-white/50 bg-white/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] backdrop-blur-md supports-[backdrop-filter]:bg-white/70 dark:border-zinc-700/80 dark:bg-zinc-900/85 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] dark:supports-[backdrop-filter]:bg-zinc-900/80">
        {children}
      </div>
    </div>
  );
}

const actionBarClass =
  "awp-surface flex flex-col gap-2.5 rounded-2xl p-3";

const actionBtnPrimary =
  "h-auto min-h-9 justify-start gap-2 whitespace-normal rounded-lg bg-emerald-700 py-2 text-left font-semibold text-white shadow-sm hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-700";

const actionBtnDanger =
  "h-auto min-h-9 justify-start gap-2 whitespace-normal rounded-lg border border-red-200 bg-white py-2 text-left font-semibold text-red-800 shadow-sm hover:bg-red-50 dark:border-red-900/60 dark:bg-zinc-800 dark:text-red-300 dark:hover:bg-red-950/40";

const actionBtnSecondary =
  "h-auto min-h-9 justify-start gap-2 whitespace-normal rounded-lg border border-zinc-200 bg-white py-2 text-left font-medium text-zinc-800 shadow-sm hover:bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700";

const actionBtnAdmin =
  "h-auto min-h-9 justify-start gap-2 whitespace-normal rounded-lg border border-amber-300/80 bg-amber-50 py-2 text-left font-semibold text-amber-950 shadow-sm hover:bg-amber-100 dark:border-amber-700/70 dark:bg-amber-950/40 dark:text-amber-100 dark:hover:bg-amber-950/55";

function ActionNotice({
  tone,
  children,
}: {
  tone: "muted" | "warning" | "info";
  children: React.ReactNode;
}) {
  const toneClass =
    tone === "warning"
      ? "border-amber-200 bg-amber-50/95 text-amber-950 dark:border-amber-800/55 dark:bg-amber-950/35 dark:text-amber-100"
      : tone === "info"
        ? "border-emerald-200 bg-emerald-50/80 text-emerald-950 dark:border-emerald-800/50 dark:bg-emerald-950/40 dark:text-emerald-100"
        : "border-zinc-200 bg-white text-zinc-600 dark:border-zinc-600 dark:bg-zinc-800/90 dark:text-zinc-300";
  return <p className={cn("rounded-lg border px-3 py-2.5 text-xs leading-snug", toneClass)}>{children}</p>;
}

export function TerminarzClient({
  upcoming,
  playedConfirmed,
  allMatches,
  playersData,
  userSignupKind,
  playedMissingStatsMatchIds,
  isLoggedIn,
  isAdmin,
  highlightMatchId = null,
  inviteFromShare = false,
  openStatsFromUrl = false,
  openStandaloneSurveyStats = false,
}: Props) {
  const router = useRouter();
  const [view, setView] = useState<"list" | "cal">("list");
  const [listTab, setListTab] = useState<"active" | "archive">("active");
  const [filter, setFilter] = useState("all");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [onlyMine, setOnlyMine] = useState(false);
  const [period, setPeriod] = useState<"all" | "7d" | "month">("all");
  const [search, setSearch] = useState("");
  const [calYear, setCalYear] = useState(() => new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(() => new Date().getMonth());
  const [addOpen, setAddOpen] = useState(false);
  const [playersOpen, setPlayersOpen] = useState(false);
  const [selectedMatchId, setSelectedMatchId] = useState<number | null>(null);
  const [calPopup, setCalPopup] = useState<MatchRow | null>(null);
  const [statsMatch, setStatsMatch] = useState<MatchRow | null>(null);
  const [statsGoals, setStatsGoals] = useState("");
  const [statsAssists, setStatsAssists] = useState("");
  const [statsDistance, setStatsDistance] = useState("");
  const [statsSaves, setStatsSaves] = useState("");
  const [statsStandaloneSurveyKey, setStatsStandaloneSurveyKey] = useState<string | null>(null);
  const [transportSignupOpen, setTransportSignupOpen] = useState(false);
  const [transportSignupMatchId, setTransportSignupMatchId] = useState<number | null>(null);
  const [transportSignupIntent, setTransportSignupIntent] = useState<"signup" | "confirm">("signup");
  const [tentativeBusyId, setTentativeBusyId] = useState<number | null>(null);
  const [inviteGateOpen, setInviteGateOpen] = useState(false);
  const [inviteLoginInline, setInviteLoginInline] = useState(false);
  const [inviteParticipationOpen, setInviteParticipationOpen] = useState(false);
  const inviteGateOpenedRef = useRef(false);
  const inviteParticipationShownRef = useRef(false);
  const statsOpenedFromUrlRef = useRef(false);
  const standaloneStatsOpenedFromUrlRef = useRef(false);
  const [settleOpen, setSettleOpen] = useState(false);
  const [settleMatch, setSettleMatch] = useState<MatchRow | null>(null);
  const [settleLoading, setSettleLoading] = useState(false);
  const [settleRows, setSettleRows] = useState<AdminMatchSignupRow[]>([]);
  const [settleDefaultAmount, setSettleDefaultAmount] = useState("");
  const [settleAmounts, setSettleAmounts] = useState<Record<number, string>>({});
  const [settleSubmitting, setSettleSubmitting] = useState(false);

  const missingStatsSet = useMemo(() => new Set(playedMissingStatsMatchIds), [playedMissingStatsMatchIds]);

  const highlightMatch = useMemo(
    () => (highlightMatchId ? allMatches.find((m) => m.id === highlightMatchId) : undefined),
    [highlightMatchId, allMatches]
  );

  useEffect(() => {
    if (highlightMatchId) setView("list");
  }, [highlightMatchId]);

  useEffect(() => {
    if (!highlightMatchId) return;
    const inUpcoming = upcoming.some((m) => m.id === highlightMatchId);
    const inArchive = playedConfirmed.some((m) => m.id === highlightMatchId);
    if (!inUpcoming && inArchive) setListTab("archive");
  }, [highlightMatchId, upcoming, playedConfirmed]);

  const filteredActive = useMemo(() => {
    const t = todayISO();
    let rows = [...upcoming];
    const q = search.trim().toLowerCase();
    if (q) rows = rows.filter((m) => m.location.toLowerCase().includes(q));
    if (period === "7d") {
      const end = addDaysISO(t, 7);
      rows = rows.filter((m) => m.match_date >= t && m.match_date <= end);
    } else if (period === "month") {
      const now = new Date();
      const prefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      rows = rows.filter((m) => m.match_date.startsWith(prefix));
    }
    rows = rows.filter((m) => {
      const free = m.max_slots - m.signed_up;
      if (filter === "free" && free <= 0) return false;
      if (filter === "full" && free > 0) return false;
      if (filter === "future" && m.match_date < t) return false;
      if (filter === "past" && m.match_date >= t) return false;
      if (onlyMine && userSignupKind[m.id] == null) return false;
      return true;
    });
    rows.sort((a, b) => {
      const da = `${a.match_date} ${a.match_time}`;
      const db = `${b.match_date} ${b.match_time}`;
      return sortDir === "asc" ? da.localeCompare(db) : db.localeCompare(da);
    });
    return rows;
  }, [upcoming, filter, sortDir, onlyMine, userSignupKind, search, period]);

  const filteredArchive = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = [...playedConfirmed];
    if (q) rows = rows.filter((m) => m.location.toLowerCase().includes(q));
    rows.sort((a, b) => {
      const da = `${a.match_date} ${a.match_time}`;
      const db = `${b.match_date} ${b.match_time}`;
      return sortDir === "asc" ? da.localeCompare(db) : db.localeCompare(da);
    });
    return rows;
  }, [playedConfirmed, search, sortDir]);

  useEffect(() => {
    if (!highlightMatchId || view !== "list") return;
    const t = window.setTimeout(() => {
      document
        .querySelector(`[data-mecz-highlight="${highlightMatchId}"]`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 180);
    return () => window.clearTimeout(t);
  }, [highlightMatchId, view, listTab, filteredActive, filteredArchive]);

  useEffect(() => {
    if (!inviteFromShare || isLoggedIn) return;
    if (inviteGateOpenedRef.current) return;
    if (highlightMatchId == null) return;
    const m = allMatches.find((x) => x.id === highlightMatchId);
    if (!m || m.match_date < todayISO()) return;
    inviteGateOpenedRef.current = true;
    setInviteGateOpen(true);
  }, [inviteFromShare, isLoggedIn, highlightMatchId, allMatches]);

  const openTransportSignup = useCallback((id: number) => {
    setTransportSignupIntent("signup");
    setTransportSignupMatchId(id);
    setTransportSignupOpen(true);
  }, []);

  const openConfirmFromTentative = useCallback((id: number) => {
    setTransportSignupIntent("confirm");
    setTransportSignupMatchId(id);
    setTransportSignupOpen(true);
  }, []);

  useEffect(() => {
    if (!inviteFromShare || !isLoggedIn) return;
    if (inviteParticipationShownRef.current) return;
    if (highlightMatchId == null) return;
    const m = allMatches.find((x) => x.id === highlightMatchId);
    if (!m || m.match_date < todayISO()) return;
    inviteParticipationShownRef.current = true;
    const hk = userSignupKind[highlightMatchId];
    if (hk === "confirmed") {
      toast.info("Jesteś już zapisany na ten mecz.");
      return;
    }
    if (hk === "tentative") {
      toast.info("Masz już status «jeszcze nie wiem». Potwierdź udział przy tym meczu w terminarzu.");
      return;
    }
    if (hk === "declined") {
      toast.info("Masz już zaznaczone «nie biorę udziału». Zmień to w terminarzu, jeśli chcesz grać.");
      return;
    }
    setInviteParticipationOpen(true);
  }, [inviteFromShare, isLoggedIn, highlightMatchId, allMatches, userSignupKind]);

  const statsActive = useMemo(() => {
    let total = 0,
      free = 0,
      full = 0,
      mine = 0;
    for (const m of filteredActive) {
      total++;
      const fs = m.max_slots - m.signed_up;
      if (fs > 0) free++;
      else full++;
      if (userSignupKind[m.id] != null) mine++;
    }
    return { total, free, full, mine };
  }, [filteredActive, userSignupKind]);

  const tentativeByMatchId = useMemo(() => {
    const o: Record<number, number> = {};
    for (const idStr of Object.keys(playersData)) {
      const id = Number(idStr);
      if (Number.isFinite(id)) o[id] = playersData[id].tentativePlayers.length;
    }
    return o;
  }, [playersData]);

  async function signupTentative(matchId: number): Promise<boolean> {
    setTentativeBusyId(matchId);
    try {
      const res = await fetch(`/api/terminarz/signup/${matchId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commitment: "tentative" }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (res.status === 401) {
        window.location.href = "/login";
        return false;
      }
      if (!res.ok) {
        toast.error(typeof data.error === "string" ? data.error : "Nie udało się zapisać");
        return false;
      }
      toast.success("Zapisano: jeszcze nie wiem");
      router.refresh();
      return true;
    } finally {
      setTentativeBusyId(null);
    }
  }

  async function signupDeclined(matchId: number): Promise<boolean> {
    setTentativeBusyId(matchId);
    try {
      const res = await fetch(`/api/terminarz/signup/${matchId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commitment: "declined" }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (res.status === 401) {
        window.location.href = "/login";
        return false;
      }
      if (!res.ok) {
        toast.error(typeof data.error === "string" ? data.error : "Nie udało się zapisać");
        return false;
      }
      toast.success("Zapisano: nie biorę udziału");
      router.refresh();
      return true;
    } finally {
      setTentativeBusyId(null);
    }
  }

  function onInviteParticipationTak() {
    if (highlightMatchId == null) return;
    const m = allMatches.find((x) => x.id === highlightMatchId);
    const free = m ? m.max_slots - m.signed_up : 0;
    if (free <= 0) {
      toast.warning(
        "Skład jest pełny — nie możesz teraz zająć miejsca. Wybierz „Jeszcze nie wiem” (bez miejsca w składzie) albo „Nie, nie biorę udziału”."
      );
      return;
    }
    setInviteParticipationOpen(false);
    openTransportSignup(highlightMatchId);
  }

  async function onInviteParticipationTentativeFromDialog() {
    if (highlightMatchId == null) return;
    const ok = await signupTentative(highlightMatchId);
    if (ok) setInviteParticipationOpen(false);
  }

  async function onInviteParticipationNie() {
    if (highlightMatchId == null) return;
    const ok = await signupDeclined(highlightMatchId);
    if (ok) setInviteParticipationOpen(false);
  }

  async function unsubscribe(id: number) {
    const res = await fetch(`/api/terminarz/unsubscribe/${id}`, { method: "POST" });
    if (res.status === 401) {
      window.location.href = "/login";
      return;
    }
    if (!res.ok) {
      toast.error("Nie udało się wypisać");
      return;
    }
    toast.success("Wypisano");
    router.refresh();
  }

  async function setPlayed(id: number, played: boolean) {
    const path = played ? "set-played" : "unset-played";
    const res = await fetch(`/api/admin/match/${id}/${path}`, { method: "POST" });
    if (!res.ok) {
      toast.error("Brak uprawnień lub błąd");
      return;
    }
    toast.success("Zaktualizowano");
    router.refresh();
  }

  async function openSettleDialog(m: MatchRow) {
    if (!isAdmin) return;
    setSettleOpen(true);
    setSettleMatch(m);
    setSettleLoading(true);
    setSettleRows([]);
    setSettleAmounts({});
    const fee = typeof m.fee_pln === "number" && Number.isFinite(m.fee_pln) ? String(m.fee_pln) : "";
    setSettleDefaultAmount(fee);
    try {
      const r = await fetchJson<{ signups: AdminMatchSignupRow[] }>(`/api/admin/match/${m.id}/signups`);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      const confirmed = (r.data.signups ?? []).filter((s) => Number(s.commitment ?? 1) === 1);
      setSettleRows(confirmed);
      if (fee) {
        const next: Record<number, string> = {};
        for (const s of confirmed) next[s.user_id] = fee;
        setSettleAmounts(next);
      }
    } finally {
      setSettleLoading(false);
    }
  }

  function applyDefaultToAll() {
    const v = settleDefaultAmount.trim();
    const next: Record<number, string> = {};
    for (const s of settleRows) next[s.user_id] = v;
    setSettleAmounts(next);
  }

  async function submitSettlement() {
    if (!settleMatch) return;
    const charges = settleRows
      .map((s) => ({
        user_id: s.user_id,
        amount_pln: Number(String(settleAmounts[s.user_id] ?? "").replace(",", ".")),
      }))
      .filter((x) => Number.isFinite(x.amount_pln) && x.amount_pln > 0);

    if (charges.length === 0) {
      toast.error("Podaj kwotę dla przynajmniej jednego zawodnika");
      return;
    }
    setSettleSubmitting(true);
    try {
      const r = await fetchJson<{ ok: true; applied: unknown[]; skipped: unknown[] }>(
        `/api/admin/wallet/match/${settleMatch.id}/charges`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ charges }),
        }
      );
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("Rozliczono mecz — kwoty odjęte z portfeli");
      setSettleOpen(false);
      setSettleMatch(null);
      router.refresh();
    } finally {
      setSettleSubmitting(false);
    }
  }

  function openPlayers(mid: number) {
    setSelectedMatchId(mid);
    setPlayersOpen(true);
  }

  function goCalToday() {
    const n = new Date();
    setCalYear(n.getFullYear());
    setCalMonth(n.getMonth());
  }

  const openStatsForMatch = useCallback((m: MatchRow) => {
    setStatsStandaloneSurveyKey(null);
    setStatsMatch(m);
    setStatsGoals("");
    setStatsAssists("");
    setStatsDistance("");
    setStatsSaves("");
  }, []);

  useEffect(() => {
    if (!openStandaloneSurveyStats || !isLoggedIn) return;
    if (standaloneStatsOpenedFromUrlRef.current) return;
    standaloneStatsOpenedFromUrlRef.current = true;
    setView("list");
    setListTab("archive");
    setStatsStandaloneSurveyKey(PARTICIPATION_SURVEY_KEY);
    setStatsMatch(getStandaloneSurveyMatchRow());
    setStatsGoals("");
    setStatsAssists("");
    setStatsDistance("");
    setStatsSaves("");
    if (typeof window !== "undefined") {
      const u = new URL(window.location.href);
      u.searchParams.delete("statystyki_ankiety");
      router.replace(u.pathname + u.search, { scroll: false });
    }
  }, [openStandaloneSurveyStats, isLoggedIn, router]);

  useEffect(() => {
    if (!openStatsFromUrl || highlightMatchId == null || !isLoggedIn) return;
    if (statsOpenedFromUrlRef.current) return;
    const m = allMatches.find((x) => x.id === highlightMatchId);
    if (!m) return;
    statsOpenedFromUrlRef.current = true;
    setView("list");
    if (playedConfirmed.some((p) => p.id === m.id)) setListTab("archive");
    else setListTab("active");
    openStatsForMatch(m);
    if (typeof window !== "undefined") {
      const u = new URL(window.location.href);
      u.searchParams.delete("statystyki");
      router.replace(u.pathname + u.search, { scroll: false });
    }
  }, [openStatsFromUrl, highlightMatchId, isLoggedIn, allMatches, playedConfirmed, router, openStatsForMatch]);

  async function saveMatchStats() {
    if (!statsMatch) return;
    const fd = new FormData();
    if (statsStandaloneSurveyKey) {
      fd.set("survey_key", statsStandaloneSurveyKey);
    } else {
      fd.set("match_id", String(statsMatch.id));
    }
    const nz = (s: string) => (s.trim() === "" ? "0" : s);
    fd.set("goals", nz(statsGoals));
    fd.set("assists", nz(statsAssists));
    fd.set("distance", nz(statsDistance));
    fd.set("saves", nz(statsSaves));
    const res = await fetch("/api/stats/save", { method: "POST", body: fd });
    const text = await res.text();
    if (res.ok && text === "OK") {
      toast.success("Statystyki zapisane");
      setStatsMatch(null);
      setStatsStandaloneSurveyKey(null);
      router.refresh();
      return;
    }
    if (res.status === 401) {
      window.location.href = "/login";
      return;
    }
    try {
      const j = JSON.parse(text) as { error?: string };
      toast.error(typeof j.error === "string" ? j.error : "Nie udało się zapisać statystyk.");
    } catch {
      toast.error("Nie udało się zapisać statystyk.");
    }
  }

  const selectedData = selectedMatchId != null ? playersData[selectedMatchId] : null;

  async function copyInviteLink(matchId: number) {
    const rel = appendShareSessionQuery(terminarzInviteRelativePath(matchId));
    const url = `${window.location.origin}${rel}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Skopiowano link z zaproszeniem do meczu");
    } catch {
      toast.error("Nie udało się skopiować linku");
    }
  }

  function activeActions(m: MatchRow) {
    const past = m.match_date < todayISO();
    const free = m.max_slots - m.signed_up;
    const kind = userSignupKind[m.id];
    const ponderAside = formatPonderingPlayersPolish(tentativeSignupCount(playersData, m.id));
    const freeSubtitle =
      free === 1
        ? "Jeszcze jedno wolne miejsce w składzie"
        : free >= 2 && free <= 4
          ? `Zostały ${free} wolne miejsca w składzie`
          : `Zostało ${free} wolnych miejsc w składzie`;

    return (
      <div className={actionBarClass}>
        {isLoggedIn ? (
          kind === "confirmed" ? (
            past ? (
              <ActionNotice tone="muted">
                <strong className="font-semibold text-zinc-800 dark:text-zinc-100">Jesteś na liście zapisanych.</strong>{" "}
                Po upływie
                terminu meczu wypisu z poziomu aplikacji nie ma — w razie potrzeby napisz do administratora.
              </ActionNotice>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className={actionBtnDanger}
                title="Usuwa Cię z listy i zwalnia miejsce dla innego zawodnika"
                onClick={() => unsubscribe(m.id)}
              >
                <UserMinus className="shrink-0" aria-hidden />
                <span>
                  <span className="block leading-tight">Wypisz mnie z tego meczu</span>
                  <span className="mt-1 block text-[11px] font-normal leading-snug text-red-700/90 dark:text-red-300">
                    Zwolnisz miejsce w składzie na ten termin
                  </span>
                </span>
              </Button>
            )
          ) : kind === "tentative" ? (
            past ? (
              <ActionNotice tone="muted">
                <strong className="font-semibold text-zinc-800 dark:text-zinc-100">Byłeś wstępnie zainteresowany</strong>{" "}
                tym terminem —
                bez zajmowania miejsca w składzie.
              </ActionNotice>
            ) : (
              <>
                <ActionNotice tone="info">
                  <strong className="font-semibold text-emerald-900 dark:text-emerald-100">Jeszcze nie wiem</strong> — nie
                  zajmujesz miejsca w
                  składzie. Gdy potwierdzisz, wybierzesz też transport.
                </ActionNotice>
                {free > 0 ? (
                  <Button
                    size="sm"
                    variant="default"
                    className={actionBtnPrimary}
                    title="Potwierdza udział i zajmuje miejsce w składzie"
                    onClick={() => openConfirmFromTentative(m.id)}
                  >
                    <UserPlus className="shrink-0" aria-hidden />
                    <span>
                      <span className="block leading-tight">Potwierdzam — wpadam na mecz</span>
                      <span className="mt-1 block text-[11px] font-normal leading-snug text-emerald-100/95">
                        {freeSubtitle}
                      </span>
                    </span>
                  </Button>
                ) : (
                  <ActionNotice tone="warning">
                    <strong className="font-semibold text-amber-950 dark:text-amber-100">Komplet miejsc.</strong> Nie możesz
                    teraz potwierdzić udziału — skład jest pełny. Możesz się wypisać i spróbować później albo zostać przy
                    statusie «jeszcze nie wiem».
                  </ActionNotice>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className={actionBtnDanger}
                  title="Rezygnujesz z wstępnego zainteresowania tym terminem"
                  onClick={() => unsubscribe(m.id)}
                >
                  <UserMinus className="shrink-0" aria-hidden />
                  <span>
                    <span className="block leading-tight">Wypisz mnie</span>
                    <span className="mt-1 block text-[11px] font-normal leading-snug text-red-700/90 dark:text-red-300">
                      Usuń zapis (w tym wstępny)
                    </span>
                  </span>
                </Button>
              </>
            )
          ) : kind === "declined" ? (
            past ? (
              <ActionNotice tone="muted">
                <strong className="font-semibold text-zinc-800 dark:text-zinc-100">Nie brałeś udziału</strong> w tym
                terminie — bez zajmowania miejsca w składzie.
              </ActionNotice>
            ) : (
              <>
                <ActionNotice tone="muted">
                  <strong className="font-semibold text-zinc-800 dark:text-zinc-100">Nie bierzesz udziału</strong> w tym
                  terminie — nie zajmujesz miejsca w składzie. Gdy zmienisz zdanie, potwierdź udział i wybierz transport.
                </ActionNotice>
                {free > 0 ? (
                  <Button
                    size="sm"
                    variant="default"
                    className={actionBtnPrimary}
                    title="Potwierdza udział i zajmuje miejsce w składzie"
                    onClick={() => openConfirmFromTentative(m.id)}
                  >
                    <UserPlus className="shrink-0" aria-hidden />
                    <span>
                      <span className="block leading-tight">Zmieniam zdanie — wpadam na mecz</span>
                      <span className="mt-1 block text-[11px] font-normal leading-snug text-emerald-100/95">
                        {freeSubtitle}
                      </span>
                    </span>
                  </Button>
                ) : (
                  <ActionNotice tone="warning">
                    <strong className="font-semibold text-amber-950 dark:text-amber-100">Komplet miejsc.</strong> Nie
                    możesz teraz dołączyć do składu — możesz zostać przy deklaracji rezygnacji albo usunąć zapis.
                  </ActionNotice>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className={actionBtnDanger}
                  title="Usuwasz deklarację rezygnacji z tego terminu"
                  onClick={() => unsubscribe(m.id)}
                >
                  <UserMinus className="shrink-0" aria-hidden />
                  <span>
                    <span className="block leading-tight">Wypisz mnie</span>
                    <span className="mt-1 block text-[11px] font-normal leading-snug text-red-700/90 dark:text-red-300">
                      Usuń zapis z listy
                    </span>
                  </span>
                </Button>
              </>
            )
          ) : past ? (
            <ActionNotice tone="warning">
              Termin tego meczu już minął — w aplikacji nie można się już zapisać na ten dzień.
            </ActionNotice>
          ) : (
            <>
              {free > 0 ? (
                <Button
                  size="sm"
                  variant="default"
                  className={actionBtnPrimary}
                  title={`Zapisuje Cię na listę (${m.signed_up}/${m.max_slots} zapisanych)${ponderAside ? `. ${ponderAside}` : ""}`}
                  onClick={() => openTransportSignup(m.id)}
                >
                  <UserPlus className="shrink-0" aria-hidden />
                  <span>
                    <span className="block leading-tight">Zapisz mnie na ten mecz</span>
                    <span className="mt-1 block text-[11px] font-normal leading-snug text-emerald-100/95">
                      {freeSubtitle}
                    </span>
                  </span>
                </Button>
              ) : (
                <ActionNotice tone="warning">
                  <strong className="font-semibold text-amber-950 dark:text-amber-100">Komplet miejsc.</strong> Skład jest
                  pełny — możesz
                  oznaczyć wstępne zainteresowanie bez zajmowania miejsca.
                </ActionNotice>
              )}
              <Button
                size="sm"
                variant="outline"
                className={actionBtnSecondary}
                disabled={tentativeBusyId === m.id}
                title="Nie zajmuje miejsca w składzie — gdy ustalisz termin, potwierdź udział osobno"
                onClick={() => void signupTentative(m.id)}
              >
                <HelpCircle className="shrink-0 text-amber-700" aria-hidden />
                <span>
                  <span className="block leading-tight text-zinc-900 dark:text-zinc-100">Jeszcze nie wiem</span>
                  <span className="mt-1 block text-[11px] font-normal leading-snug text-zinc-500 dark:text-zinc-400">
                    Wstępne zainteresowanie bez miejsca w składzie
                  </span>
                </span>
              </Button>
              <Button
                size="sm"
                variant="outline"
                className={actionBtnSecondary}
                disabled={tentativeBusyId === m.id}
                title="Zapisuje Cię na liście jako osobę, która w tym terminie nie gra — bez miejsca w składzie"
                onClick={() => void signupDeclined(m.id)}
              >
                <UserMinus className="shrink-0 text-zinc-600 dark:text-zinc-300" aria-hidden />
                <span>
                  <span className="block leading-tight text-zinc-900 dark:text-zinc-100">Nie, nie biorę udziału</span>
                  <span className="mt-1 block text-[11px] font-normal leading-snug text-zinc-500 dark:text-zinc-400">
                    Widoczne na liście zapisanych jako rezygnacja z terminu
                  </span>
                </span>
              </Button>
            </>
          )
        ) : past ? (
          <ActionNotice tone="info">
            Na ten dzień zapisu już nie będzie.{" "}
            <Link
              href="/login"
              className="font-semibold text-emerald-800 underline underline-offset-2 hover:text-emerald-950 dark:text-emerald-300 dark:hover:text-emerald-100"
            >
              Zaloguj się
            </Link>
            , żeby w przyszłości zapisywać się na mecze z terminarza.
          </ActionNotice>
        ) : (
          <Button size="sm" variant="outline" className={actionBtnSecondary} asChild>
            <Link
              href="/login"
              title="Konto jest potrzebne, żeby zapisać się na listę zawodników"
            >
              <LogIn className="shrink-0 text-emerald-700" aria-hidden />
              <span>
                <span className="block leading-tight text-zinc-900 dark:text-zinc-100">Zaloguj się i zapisz na mecz</span>
                <span className="mt-1 block text-[11px] font-normal leading-snug text-zinc-500 dark:text-zinc-400">
                  Bez konta widzisz terminy, ale nie możesz dołączyć do składu
                </span>
              </span>
            </Link>
          </Button>
        )}

        <div className="flex flex-col gap-2 border-t border-zinc-200/80 pt-2.5 dark:border-zinc-600/80 sm:flex-row sm:flex-wrap">
          {!past && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className={actionBtnSecondary}
              title="Wyślij znajomemu — po wejściu zaloguje się i zapisze na ten mecz"
              onClick={() => void copyInviteLink(m.id)}
            >
              <Link2 className="shrink-0 text-emerald-700" aria-hidden />
              <span>
                <span className="block leading-tight text-zinc-900 dark:text-zinc-100">Kopiuj link z zaproszeniem do meczu</span>
                <span className="mt-1 block text-[11px] font-normal leading-snug text-zinc-500 dark:text-zinc-400">
                  Dla udostępnienia poza aplikacją (np. komunikator)
                </span>
              </span>
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            className={actionBtnSecondary}
            title="Pełna lista: imiona, pseudonimy, informacja o opłacie"
            onClick={() => openPlayers(m.id)}
          >
            <Users className="shrink-0 text-emerald-700" aria-hidden />
            <span>
              <span className="block leading-tight text-zinc-900 dark:text-zinc-100">Kto jest zapisany?</span>
              <span className="mt-1 block text-[11px] font-normal leading-snug text-zinc-500 dark:text-zinc-400">
                Otwórz listę zawodników na ten termin
              </span>
            </span>
          </Button>
          {isAdmin && (
            <Button
              size="sm"
              variant="secondary"
              className={actionBtnAdmin}
              title="Po zatwierdzeniu mecz trafia do archiwum rozegranych"
              onClick={() => setPlayed(m.id, true)}
            >
              <ShieldCheck className="shrink-0" aria-hidden />
              <span>
                <span className="block leading-tight">Potwierdź: mecz się odbył</span>
                <span className="mt-1 block text-[11px] font-normal leading-snug text-amber-900/85 dark:text-amber-200/90">
                  Tylko dla administratora — zamyka ten termin
                </span>
              </span>
            </Button>
          )}
        </div>
      </div>
    );
  }

  function archiveActions(m: MatchRow) {
    const canAddStats = isLoggedIn && missingStatsSet.has(m.id);
    return (
      <div className={actionBarClass}>
        {canAddStats && (
          <Button
            size="sm"
            variant="default"
            className={actionBtnPrimary}
            title="Uzupełnij gole, asysty, dystans i obrony — liczą się w statystykach i rankingach"
            onClick={() => openStatsForMatch(m)}
          >
            <Activity className="shrink-0" aria-hidden />
            <span>
              <span className="block leading-tight">Dodaj swoje statystyki z tego meczu</span>
              <span className="mt-1 block text-[11px] font-normal leading-snug text-emerald-100/95">
                Nie wypełniłeś jeszcze formularza po meczu — zrób to tutaj
              </span>
            </span>
          </Button>
        )}
        <Button
          size="sm"
          variant="outline"
          className={actionBtnSecondary}
          title="Zawodnicy zapisani przed meczem — imiona i status opłaty"
          onClick={() => openPlayers(m.id)}
        >
          <Users className="shrink-0 text-emerald-700" aria-hidden />
          <span>
            <span className="block leading-tight text-zinc-900 dark:text-zinc-100">Kto był zapisany?</span>
            <span className="mt-1 block text-[11px] font-normal leading-snug text-zinc-500 dark:text-zinc-400">
              Lista z dnia meczu (archiwum)
            </span>
          </span>
        </Button>
        {isAdmin && (
          <Button
            size="sm"
            variant="default"
            className={cn(actionBtnPrimary, "bg-emerald-700 hover:bg-emerald-800")}
            title="Odejmij wpisowe wszystkim zapisanym (kwota edytowalna)"
            onClick={() => void openSettleDialog(m)}
          >
            <ShieldCheck className="shrink-0" aria-hidden />
            <span>
              <span className="block leading-tight">Rozlicz mecz</span>
              <span className="mt-1 block text-[11px] font-normal leading-snug text-emerald-100/95">
                Odejmij kwotę z portfeli zapisanych zawodników
              </span>
            </span>
          </Button>
        )}
        {isAdmin && (
          <Button
            size="sm"
            variant="secondary"
            className={actionBtnAdmin}
            title="Mecz wróci na listę „do rozegrania” jako nierozegrany"
            onClick={() => setPlayed(m.id, false)}
          >
            <RotateCcw className="shrink-0" aria-hidden />
            <span>
              <span className="block leading-tight">Przywróć jako nierozegrany</span>
              <span className="mt-1 block text-[11px] font-normal leading-snug text-amber-900/85 dark:text-amber-200/90">
                Cofnij status rozegranego meczu
              </span>
            </span>
          </Button>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="awp-card-surface px-4 py-8 sm:px-8">
        <div className="flex flex-col items-center text-center">
          <div className="pitch-rule mx-auto mb-4 w-40 sm:w-48" />
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
            <Image
              src="/soccer-ball.svg"
              alt=""
              width={48}
              height={48}
              className="h-11 w-11 drop-shadow-sm sm:h-12 sm:w-12"
              unoptimized
            />
            <h1
              id="terminarz-page-title"
              className="whitespace-nowrap text-3xl font-bold tracking-tight text-emerald-950 dark:text-emerald-100 sm:text-4xl"
            >
              Terminarz
            </h1>
            <Image
              src="/soccer-ball.svg"
              alt=""
              width={48}
              height={48}
              className="h-11 w-11 scale-x-[-1] drop-shadow-sm sm:h-12 sm:w-12"
              unoptimized
            />
          </div>
          <p className="mt-3 max-w-xl text-sm text-zinc-600 dark:text-zinc-400 sm:text-base">
            Zapisy na mecze, lista terminów i kalendarz — wszystko w jednym miejscu.
          </p>
        </div>

        <div className="mx-auto mt-8 max-w-4xl">
          <div className="flex flex-col gap-4 rounded-2xl border border-emerald-200/50 bg-gradient-to-b from-emerald-50/40 to-white p-4 dark:border-emerald-800/40 dark:from-emerald-950/30 dark:to-zinc-900/80 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-800/70 dark:text-emerald-300/80">
                Widok
              </span>
              <div className="inline-flex rounded-xl bg-white/90 p-1 shadow-sm ring-1 ring-emerald-900/10 dark:bg-zinc-800/90 dark:ring-emerald-800/30">
                <button
                  type="button"
                  onClick={() => setView("list")}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all",
                    view === "list"
                      ? "bg-emerald-800 text-white shadow-md dark:bg-emerald-600"
                      : "text-emerald-900 hover:bg-emerald-50 dark:text-emerald-100 dark:hover:bg-emerald-950/50"
                  )}
                >
                  <List className="h-4 w-4 shrink-0" aria-hidden />
                  Lista meczów
                </button>
                <button
                  type="button"
                  onClick={() => setView("cal")}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all",
                    view === "cal"
                      ? "bg-emerald-800 text-white shadow-md dark:bg-emerald-600"
                      : "text-emerald-900 hover:bg-emerald-50 dark:text-emerald-100 dark:hover:bg-emerald-950/50"
                  )}
                >
                  <CalendarDays className="h-4 w-4 shrink-0" aria-hidden />
                  Kalendarz
                </button>
              </div>
            </div>
            {isAdmin && (
              <Button
                type="button"
                size="default"
                className="w-full sm:w-auto"
                onClick={() => setAddOpen(true)}
              >
                Dodaj mecz
              </Button>
            )}
          </div>
        </div>

        {view === "list" && (
          <div className="mx-auto mt-5 max-w-4xl space-y-4">
            {highlightMatch && !inviteFromShare && (
              <div
                role="status"
                className="rounded-xl border-2 border-emerald-500 bg-emerald-50/95 px-4 py-3 text-sm leading-relaxed text-emerald-950 shadow-sm dark:border-emerald-500 dark:bg-emerald-950/40 dark:text-emerald-50"
              >
                <span className="font-semibold">Z powiadomienia e-mail: </span>
                poniżej <span className="font-medium">zieloną ramką</span> wyróżniony jest mecz, którego dotyczyła
                wiadomość — możesz od razu przejść do zapisu.
              </div>
            )}
            {highlightMatchId && !highlightMatch && (
              <div
                role="status"
                className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-800/60 dark:bg-amber-950/35 dark:text-amber-100"
              >
                Nie znaleziono meczu o tym numerze — mógł zostać usunięty z terminarza.
              </div>
            )}
            <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/80 sm:p-5">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-12 lg:items-end">
                <div className="lg:col-span-4">
                  <Label htmlFor="terminarz-search" className="text-xs text-zinc-600 dark:text-zinc-400">
                    Szukaj miejsca
                  </Label>
                  <div className="relative mt-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                    <Input
                      id="terminarz-search"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="np. boisko, adres…"
                      className="pl-9"
                    />
                  </div>
                </div>
                <div className="lg:col-span-3">
                  <Label className="text-xs text-zinc-600 dark:text-zinc-400">Zakres dat (lista aktywna)</Label>
                  <select
                    className="awp-focus-ring mt-1 w-full rounded-xl border border-emerald-950/15 bg-white/90 px-3 py-2 text-sm font-medium text-emerald-950 shadow-sm shadow-emerald-950/5 dark:border-emerald-100/10 dark:bg-zinc-900/70 dark:text-emerald-100"
                    value={period}
                    onChange={(e) => setPeriod(e.target.value as "all" | "7d" | "month")}
                  >
                    <option value="all">Cały terminarz</option>
                    <option value="7d">Najbliższe 7 dni</option>
                    <option value="month">Bieżący miesiąc</option>
                  </select>
                </div>
                <div className="lg:col-span-3">
                  <Label className="text-xs text-zinc-600 dark:text-zinc-400">Miejsca</Label>
                  <select
                    className="awp-focus-ring mt-1 w-full rounded-xl border border-emerald-950/15 bg-white/90 px-3 py-2 text-sm font-medium text-emerald-950 shadow-sm shadow-emerald-950/5 dark:border-emerald-100/10 dark:bg-zinc-900/70 dark:text-emerald-100"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                  >
                    <option value="all">Wszystkie</option>
                    <option value="free">Są wolne miejsca</option>
                    <option value="full">Pełny skład</option>
                    <option value="future">Data jeszcze nie minęła</option>
                    <option value="past">Data już minęła</option>
                  </select>
                </div>
                <div className="flex flex-wrap gap-2 lg:col-span-2">
                  <select
                    className="awp-focus-ring min-w-[10rem] flex-1 rounded-xl border border-emerald-950/15 bg-white/90 px-3 py-2 text-sm font-medium text-emerald-950 shadow-sm shadow-emerald-950/5 dark:border-emerald-100/10 dark:bg-zinc-900/70 dark:text-emerald-100"
                    value={sortDir}
                    onChange={(e) => setSortDir(e.target.value as "asc" | "desc")}
                  >
                    <option value="asc">Od najbliższych</option>
                    <option value="desc">Od najdalszych</option>
                  </select>
                  <Button
                    type="button"
                    variant={onlyMine ? "default" : "outline"}
                    size="sm"
                    className={cn(
                      onlyMine && "bg-emerald-700 hover:bg-emerald-800",
                      "h-10 shrink-0 px-3"
                    )}
                    onClick={() => setOnlyMine((v) => !v)}
                  >
                    Tylko moje
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 rounded-xl border border-emerald-100 bg-emerald-50/50 px-4 py-3 text-sm dark:border-emerald-900/40 dark:bg-emerald-950/30">
              {listTab === "active" ? (
                <>
                  <span className="text-emerald-900 dark:text-emerald-100">
                    W widoku: <strong>{statsActive.total}</strong> meczów
                  </span>
                  <span className="hidden text-emerald-800/40 dark:text-emerald-700/50 sm:inline">·</span>
                  <span className="text-emerald-800 dark:text-emerald-200">
                    Wolne terminy: <strong>{statsActive.free}</strong>
                  </span>
                  <span className="hidden text-emerald-800/40 dark:text-emerald-700/50 sm:inline">·</span>
                  <span className="text-emerald-800 dark:text-emerald-200">
                    Pełne: <strong>{statsActive.full}</strong>
                  </span>
                  {isLoggedIn && (
                    <>
                      <span className="hidden text-emerald-800/40 dark:text-emerald-700/50 sm:inline">·</span>
                      <span className="text-emerald-800 dark:text-emerald-200">
                        Twoje zapisy tutaj: <strong>{statsActive.mine}</strong>
                      </span>
                    </>
                  )}
                </>
              ) : (
                <span className="text-emerald-900 dark:text-emerald-100">
                  Rozegrane w widoku: <strong>{filteredArchive.length}</strong>
                </span>
              )}
            </div>

            <Tabs value={listTab} onValueChange={(v) => setListTab(v as "active" | "archive")}>
              <TabsList className="grid h-auto w-full grid-cols-2 gap-1 rounded-xl bg-emerald-100/60 p-1 dark:bg-emerald-950/50 sm:inline-flex sm:w-auto">
                <TabsTrigger
                  value="active"
                  className="rounded-lg px-4 py-2.5 data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 dark:data-[state=inactive]:text-emerald-200/90"
                >
                  Mecze do rozegrania
                </TabsTrigger>
                <TabsTrigger
                  value="archive"
                  className="rounded-lg px-4 py-2.5 data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 dark:data-[state=inactive]:text-emerald-200/90"
                >
                  Archiwum (rozegrane)
                </TabsTrigger>
              </TabsList>

              <TabsContent value="active" className="mt-5">
                <div className="space-y-4 md:hidden">
                  {filteredActive.map((m) => {
                    const pct = m.max_slots > 0 ? (m.signed_up / m.max_slots) * 100 : 0;
                    const past = m.match_date < todayISO();
                    return (
                      <div
                        key={m.id}
                        data-mecz-highlight={highlightMatchId === m.id ? m.id : undefined}
                        className={cn(
                          "rounded-2xl border border-zinc-200 p-4 shadow-sm dark:border-zinc-600",
                          rowClass(m.signed_up, m.max_slots),
                          highlightMatchId === m.id &&
                            "relative z-[1] border-emerald-600 ring-2 ring-emerald-600 ring-offset-2"
                        )}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <p className="text-lg font-bold text-emerald-950 dark:text-emerald-100">{m.match_date}</p>
                            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{m.match_time}</p>
                          </div>
                          {past && (
                            <Badge
                              variant="outline"
                              className="border-amber-400 bg-amber-50 text-amber-900 dark:border-amber-600 dark:bg-amber-950/40 dark:text-amber-100"
                            >
                              Termin minął
                            </Badge>
                          )}
                        </div>
                        <div className="mt-3 flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700 dark:text-emerald-400" />
                          <span>{m.location}</span>
                        </div>
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(m.location)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-1 inline-block text-xs font-medium text-emerald-700 underline dark:text-emerald-400"
                        >
                          Otwórz w Mapach
                        </a>
                        <div className="mt-3">
                          <MatchSignupCountsBlock
                            matchId={m.id}
                            signedUp={m.signed_up}
                            maxSlots={m.max_slots}
                            playersData={playersData}
                          />
                          <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-emerald-200/80 dark:bg-emerald-900/80">
                            <div className="h-full bg-emerald-600 transition-all dark:bg-emerald-500" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                        <div className="mt-4 border-t border-zinc-200/80 pt-4 dark:border-zinc-600/80">{activeActions(m)}</div>
                        <details className="mt-3 rounded-xl border border-zinc-200/90 bg-zinc-50/50 dark:border-zinc-600/80 dark:bg-zinc-800/40">
                          <summary className="cursor-pointer list-none px-3 py-2 text-xs font-semibold text-emerald-900 dark:text-emerald-100 [&::-webkit-details-marker]:hidden">
                            Prognoza pogody (10 dni) — rozwiń
                          </summary>
                          <div className="border-t border-zinc-200/70 px-2 pb-2 pt-1 dark:border-zinc-600/60">
                            <MatchLocationWeather location={m.location} className="mt-0 border-t-0 pt-2" />
                          </div>
                        </details>
                      </div>
                    );
                  })}
                  {filteredActive.length === 0 && (
                    <p className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50/80 py-10 text-center text-sm text-zinc-600 dark:border-zinc-600 dark:bg-zinc-800/50 dark:text-zinc-400">
                      Brak meczów spełniających kryteria. Zmień filtry lub zakres dat.
                    </p>
                  )}
                </div>

                <div className="hidden min-w-0 md:block">
                  <PitchTableFrame>
                    <table className="w-full min-w-0 table-fixed text-sm">
                      <colgroup>
                        <col style={{ width: "7rem" }} />
                        <col style={{ width: "5.5rem" }} />
                        <col />
                        <col style={{ width: "11rem" }} />
                        <col style={{ width: "18rem" }} />
                      </colgroup>
                      <thead className="bg-emerald-950 text-white">
                        <tr>
                          <th className="px-3 py-3 text-left font-semibold lg:px-4">Data</th>
                          <th className="px-3 py-3 text-left font-semibold lg:px-4">Godzina</th>
                          <th className="px-3 py-3 text-left font-semibold lg:px-4">Miejsce</th>
                          <th className="px-3 py-3 text-left font-semibold lg:px-4">Zapisy</th>
                          <th className="px-3 py-3 text-left font-semibold lg:px-4">Opcje</th>
                        </tr>
                      </thead>
                        <tbody>
                          {filteredActive.map((m) => {
                            const pct = m.max_slots > 0 ? (m.signed_up / m.max_slots) * 100 : 0;
                            const past = m.match_date < todayISO();
                            const rowCls = rowClass(m.signed_up, m.max_slots);
                            return (
                              <Fragment key={m.id}>
                                <tr
                                  data-mecz-highlight={highlightMatchId === m.id ? m.id : undefined}
                                  className={cn(
                                    "border-b border-zinc-100 dark:border-zinc-700/80",
                                    rowCls,
                                    highlightMatchId === m.id && "shadow-[inset_0_0_0_3px_#059669]"
                                  )}
                                >
                                  <td className="min-w-0 px-3 py-3 align-top lg:px-4">
                                    <div className="font-semibold text-emerald-950 dark:text-emerald-100">{m.match_date}</div>
                                    {past && (
                                      <Badge
                                        variant="outline"
                                        className="mt-1 border-amber-400 bg-amber-50 text-[10px] text-amber-900 dark:border-amber-600 dark:bg-amber-950/40 dark:text-amber-100"
                                      >
                                        Termin minął
                                      </Badge>
                                    )}
                                  </td>
                                  <td className="min-w-0 px-3 py-3 align-top text-zinc-800 dark:text-zinc-300 lg:px-4">
                                    {m.match_time}
                                  </td>
                                  <td className="min-w-0 px-3 py-3 align-top lg:px-4">
                                    <Badge variant="secondary" className="block w-fit max-w-full whitespace-normal break-words font-normal">
                                      {m.location}
                                    </Badge>
                                    <a
                                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(m.location)}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="mt-1 inline-block text-xs font-medium text-emerald-700 underline dark:text-emerald-400"
                                    >
                                      Mapy
                                    </a>
                                  </td>
                                  <td className="min-w-0 px-3 py-3 align-top lg:px-4">
                                    <MatchSignupCountsBlock
                                      matchId={m.id}
                                      signedUp={m.signed_up}
                                      maxSlots={m.max_slots}
                                      playersData={playersData}
                                      variant="table"
                                    />
                                    <div className="mt-1 h-2 w-full max-w-full overflow-hidden rounded-full bg-emerald-200 dark:bg-emerald-900/80">
                                      <div
                                        className="h-full bg-emerald-600 transition-all dark:bg-emerald-500"
                                        style={{ width: `${pct}%` }}
                                      />
                                    </div>
                                  </td>
                                  <td
                                    rowSpan={2}
                                    className="min-w-0 border-l border-emerald-900/25 bg-white/95 px-3 py-3 align-top shadow-[-10px_0_24px_-8px_rgba(15,23,42,0.12)] dark:border-zinc-600 dark:bg-zinc-900/95 dark:shadow-[-10px_0_28px_-8px_rgba(0,0,0,0.45)] lg:px-4"
                                  >
                                    {activeActions(m)}
                                  </td>
                                </tr>
                                <tr
                                  data-mecz-highlight={highlightMatchId === m.id ? m.id : undefined}
                                  className={cn(
                                    "border-b border-zinc-100 dark:border-zinc-700/80",
                                    rowCls,
                                    highlightMatchId === m.id && "shadow-[inset_0_0_0_3px_#059669]"
                                  )}
                                >
                                  <td colSpan={4} className="min-w-0 px-3 pb-3 pt-0 align-top lg:px-4">
                                    <MatchLocationWeather location={m.location} layout="table-subrow" />
                                  </td>
                                </tr>
                              </Fragment>
                            );
                          })}
                          {filteredActive.length === 0 && (
                            <tr>
                              <td colSpan={5} className="px-4 py-12 text-center text-zinc-600 dark:text-zinc-400">
                                Brak meczów spełniających kryteria.
                              </td>
                            </tr>
                          )}
                        </tbody>
                    </table>
                  </PitchTableFrame>
                </div>
              </TabsContent>

              <TabsContent value="archive" className="mt-5">
                <div className="space-y-4 md:hidden">
                  {filteredArchive.map((m) => (
                    <div
                      key={m.id}
                      data-mecz-highlight={highlightMatchId === m.id ? m.id : undefined}
                      className={cn(
                        "rounded-2xl border border-zinc-200 bg-zinc-50/80 p-4 shadow-sm dark:border-zinc-600 dark:bg-zinc-800/60",
                        highlightMatchId === m.id &&
                          "relative z-[1] border-emerald-600 ring-2 ring-emerald-600 ring-offset-2"
                      )}
                    >
                      <p className="text-lg font-bold text-emerald-950 dark:text-emerald-100">{m.match_date}</p>
                      <p className="text-sm text-zinc-700 dark:text-zinc-300">{m.match_time}</p>
                      <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">{m.location}</p>
                      <div className="mt-2">
                        <MatchSignupCountsBlock
                          matchId={m.id}
                          signedUp={m.signed_up}
                          maxSlots={m.max_slots}
                          playersData={playersData}
                          tone="zinc"
                        />
                      </div>
                      <div className="mt-4">{archiveActions(m)}</div>
                      <details className="mt-3 rounded-xl border border-zinc-200/90 bg-zinc-100/50 dark:border-zinc-600/80 dark:bg-zinc-900/50">
                        <summary className="cursor-pointer list-none px-3 py-2 text-xs font-semibold text-zinc-800 dark:text-zinc-100 [&::-webkit-details-marker]:hidden">
                          Prognoza pogody (10 dni) — rozwiń
                        </summary>
                        <div className="border-t border-zinc-200/70 px-2 pb-2 pt-1 dark:border-zinc-600/60">
                          <MatchLocationWeather location={m.location} className="mt-0 border-t-0 pt-2" />
                        </div>
                      </details>
                    </div>
                  ))}
                  {filteredArchive.length === 0 && (
                    <p className="rounded-xl border border-dashed border-zinc-200 py-10 text-center text-sm text-zinc-600 dark:border-zinc-600 dark:text-zinc-400">
                      Brak rozegranych meczów do wyświetlenia.
                    </p>
                  )}
                </div>

                <div className="hidden min-w-0 md:block">
                  <PitchTableFrame>
                    <table className="w-full min-w-0 table-fixed text-sm">
                      <colgroup>
                        <col style={{ width: "7rem" }} />
                        <col style={{ width: "5.5rem" }} />
                        <col />
                        <col style={{ width: "11rem" }} />
                        <col style={{ width: "18rem" }} />
                      </colgroup>
                      <thead className="bg-zinc-800 text-white">
                        <tr>
                          <th className="px-3 py-3 text-left font-semibold lg:px-4">Data</th>
                          <th className="px-3 py-3 text-left font-semibold lg:px-4">Godzina</th>
                          <th className="px-3 py-3 text-left font-semibold lg:px-4">Miejsce</th>
                          <th className="px-3 py-3 text-left font-semibold lg:px-4">Zapisy</th>
                          <th className="px-3 py-3 text-left font-semibold lg:px-4">Opcje</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredArchive.map((m) => (
                          <Fragment key={m.id}>
                            <tr
                              data-mecz-highlight={highlightMatchId === m.id ? m.id : undefined}
                              className={cn(
                                "border-b border-zinc-100 bg-zinc-50/50 dark:border-zinc-700/80 dark:bg-zinc-800/40",
                                highlightMatchId === m.id && "shadow-[inset_0_0_0_3px_#059669]"
                              )}
                            >
                              <td className="min-w-0 px-3 py-3 font-semibold text-emerald-950 dark:text-emerald-100 lg:px-4">
                                {m.match_date}
                              </td>
                              <td className="min-w-0 px-3 py-3 text-zinc-800 dark:text-zinc-300 lg:px-4">{m.match_time}</td>
                              <td className="min-w-0 px-3 py-3 align-top text-zinc-800 dark:text-zinc-300 lg:px-4">
                                <span className="block max-w-full break-words font-medium">{m.location}</span>
                              </td>
                              <td className="min-w-0 px-3 py-3 text-zinc-800 dark:text-zinc-300 lg:px-4">
                                <MatchSignupCountsBlock
                                  matchId={m.id}
                                  signedUp={m.signed_up}
                                  maxSlots={m.max_slots}
                                  playersData={playersData}
                                  variant="table"
                                  tone="zinc"
                                />
                              </td>
                              <td
                                rowSpan={2}
                                className="min-w-0 border-l border-zinc-300/90 bg-zinc-50/95 px-3 py-3 align-top shadow-[-10px_0_24px_-8px_rgba(15,23,42,0.1)] dark:border-zinc-600 dark:bg-zinc-800/95 dark:shadow-[-10px_0_28px_-8px_rgba(0,0,0,0.45)] lg:px-4"
                              >
                                {archiveActions(m)}
                              </td>
                            </tr>
                            <tr
                              data-mecz-highlight={highlightMatchId === m.id ? m.id : undefined}
                              className={cn(
                                "border-b border-zinc-100 bg-zinc-50/50 dark:border-zinc-700/80 dark:bg-zinc-800/40",
                                highlightMatchId === m.id && "shadow-[inset_0_0_0_3px_#059669]"
                              )}
                            >
                              <td colSpan={4} className="min-w-0 px-3 pb-3 pt-0 align-top lg:px-4">
                                <MatchLocationWeather location={m.location} layout="table-subrow" />
                              </td>
                            </tr>
                          </Fragment>
                        ))}
                        {filteredArchive.length === 0 && (
                          <tr>
                            <td colSpan={5} className="px-4 py-12 text-center text-zinc-600 dark:text-zinc-400">
                              Brak rozegranych meczów.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </PitchTableFrame>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}

        {view === "cal" && (
          <CalendarView
            year={calYear}
            month={calMonth}
            matches={allMatches}
            tentativeByMatchId={tentativeByMatchId}
            onPrev={() => {
              if (calMonth === 0) {
                setCalMonth(11);
                setCalYear((y) => y - 1);
              } else setCalMonth((mo) => mo - 1);
            }}
            onNext={() => {
              if (calMonth === 11) {
                setCalMonth(0);
                setCalYear((y) => y + 1);
              } else setCalMonth((mo) => mo + 1);
            }}
            onToday={goCalToday}
            onPick={setCalPopup}
          />
        )}
      </div>

      <Dialog open={Boolean(calPopup)} onOpenChange={(o) => !o && setCalPopup(null)}>
        <DialogContent className="border-emerald-900/15">
          {calPopup && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {calPopup.match_date} · {calPopup.match_time}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-2 text-sm text-zinc-800 dark:text-zinc-200">
                <p className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700 dark:text-emerald-400" />
                  <span>{calPopup.location}</span>
                </p>
                <div>
                  <MatchSignupCountsBlock
                    matchId={calPopup.id}
                    signedUp={calPopup.signed_up}
                    maxSlots={calPopup.max_slots}
                    playersData={playersData}
                  />
                </div>
                <p>Status: {calPopup.played ? "Rozegrany" : "Nierozegrany"}</p>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(calPopup.location)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-block font-medium text-emerald-700 underline dark:text-emerald-400"
                >
                  Google Maps
                </a>
              </div>
              <DialogFooter className="flex-col gap-2 border-t border-zinc-100 pt-4 dark:border-zinc-700 sm:flex-row sm:flex-wrap sm:justify-end">
                {isLoggedIn && calPopup.played === 1 && missingStatsSet.has(calPopup.id) && (
                  <Button
                    type="button"
                    variant="default"
                    className={cn(actionBtnPrimary, "w-full sm:w-auto")}
                    onClick={() => {
                      const m = calPopup;
                      setCalPopup(null);
                      openStatsForMatch(m);
                    }}
                  >
                    <Activity className="shrink-0" aria-hidden />
                    <span className="text-left">
                      <span className="block leading-tight">Dodaj statystyki z tego meczu</span>
                      <span className="mt-0.5 block text-[11px] font-normal text-emerald-100/95">
                        Gole, asysty, dystans, obrony
                      </span>
                    </span>
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  className={cn(actionBtnSecondary, "w-full sm:w-auto")}
                  onClick={() => openPlayers(calPopup.id)}
                >
                  <Users className="shrink-0 text-emerald-700" aria-hidden />
                  <span className="text-left">
                    <span className="block leading-tight">Kto jest zapisany?</span>
                    <span className="mt-0.5 block text-[11px] font-normal text-zinc-500 dark:text-zinc-400">
                      Ta sama lista co w terminarzu
                    </span>
                  </span>
                </Button>
                <Button
                  type="button"
                  variant="default"
                  className="h-auto min-h-9 w-full gap-2 rounded-lg bg-zinc-800 py-2 font-semibold shadow-sm hover:bg-zinc-900 sm:w-auto"
                  onClick={() => setCalPopup(null)}
                >
                  <X className="shrink-0" aria-hidden />
                  Zamknij podgląd
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={playersOpen} onOpenChange={setPlayersOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto border-emerald-900/15">
          <DialogHeader>
            <DialogTitle>
              {selectedData
                ? `Zawodnicy – ${selectedData.date} ${selectedData.time}`
                : "Zawodnicy"}
            </DialogTitle>
          </DialogHeader>
          {selectedData && (
            <>
              <div className="pitch-rule mb-3 w-32 opacity-70" />
              <p className="text-sm font-medium text-emerald-900 dark:text-emerald-200">{selectedData.location}</p>
              {selectedMatchId != null ? (
                <div className="mt-1">
                  <MatchSignupCountsBlock
                    matchId={selectedMatchId}
                    signedUp={allMatches.find((x) => x.id === selectedMatchId)?.signed_up ?? selectedData.players.length}
                    maxSlots={selectedData.max}
                    playersData={playersData}
                  />
                  <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                    Pełna lista zawodników poniżej — «jeszcze nie wiem» i «nie biorę udziału» nie zajmują miejsca w
                    składzie.
                  </p>
                </div>
              ) : null}
              <ul className="mt-3 max-h-[min(24rem,55vh)] space-y-0 overflow-y-auto rounded-xl border border-emerald-900/10 bg-emerald-50/30 dark:border-emerald-800/40 dark:bg-emerald-950/25">
                {selectedData.players.map((p, i) => (
                  <li
                    key={`c-${p.userId}-${i}`}
                    className={`flex flex-wrap items-center gap-2 border-b border-emerald-100/90 px-3 py-2.5 text-sm last:border-b-0 dark:border-emerald-800/50 ${
                      i % 2 === 0 ? "bg-white/60 dark:bg-zinc-900/40" : "bg-emerald-50/40 dark:bg-emerald-950/30"
                    }`}
                  >
                    <PlayerAvatar
                      photoPath={p.profilePhotoPath}
                      firstName={p.firstName}
                      lastName={p.lastName}
                      size="sm"
                      ringClassName="ring-2 ring-emerald-200/90 dark:ring-emerald-700/80"
                    />
                    <div className="min-w-0 flex-1">
                      <PlayerNameStack
                        firstName={p.firstName}
                        lastName={p.lastName}
                        nick={p.zawodnik}
                      />
                    </div>
                    {p.paid ? (
                      <Badge className="border-emerald-200 bg-emerald-100 text-emerald-900 dark:border-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-100">
                        Opłacone
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Do zapłaty</Badge>
                    )}
                  </li>
                ))}
                {selectedData.tentativePlayers.map((p, i) => (
                  <li
                    key={`t-${p.userId}-${i}`}
                    className={`flex flex-wrap items-center gap-2 border-b border-amber-200/80 px-3 py-2.5 text-sm last:border-b-0 dark:border-amber-800/45 ${
                      i % 2 === 0 ? "bg-amber-50/55 dark:bg-amber-950/30" : "bg-amber-100/40 dark:bg-amber-950/40"
                    }`}
                  >
                    <PlayerAvatar
                      photoPath={p.profilePhotoPath}
                      firstName={p.firstName}
                      lastName={p.lastName}
                      size="sm"
                      ringClassName="ring-2 ring-amber-200/90 dark:ring-amber-700/70"
                    />
                    <div className="min-w-0 flex-1">
                      <PlayerNameStack
                        firstName={p.firstName}
                        lastName={p.lastName}
                        nick={p.zawodnik}
                      />
                    </div>
                    <Badge
                      variant="outline"
                      className="border-amber-400 bg-amber-100/90 text-amber-950 dark:border-amber-600 dark:bg-amber-950/50 dark:text-amber-100"
                    >
                      Jeszcze nie wiem
                    </Badge>
                  </li>
                ))}
                {selectedData.declinedPlayers.map((p, i) => (
                  <li
                    key={`d-${p.userId}-${i}`}
                    className={`flex flex-wrap items-center gap-2 border-b border-red-200/70 px-3 py-2.5 text-sm last:border-b-0 dark:border-red-900/45 ${
                      i % 2 === 0 ? "bg-red-50/60 dark:bg-red-950/25" : "bg-red-100/35 dark:bg-red-950/35"
                    }`}
                  >
                    <PlayerAvatar
                      photoPath={p.profilePhotoPath}
                      firstName={p.firstName}
                      lastName={p.lastName}
                      size="sm"
                      ringClassName="ring-2 ring-red-200/90 dark:ring-red-800/70"
                    />
                    <div className="min-w-0 flex-1">
                      <PlayerNameStack
                        firstName={p.firstName}
                        lastName={p.lastName}
                        nick={p.zawodnik}
                      />
                    </div>
                    <Badge
                      variant="outline"
                      className="border-red-300 bg-red-100/90 text-red-950 dark:border-red-700 dark:bg-red-950/50 dark:text-red-100"
                    >
                      Nie biorę udziału
                    </Badge>
                  </li>
                ))}
              </ul>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={settleOpen}
        onOpenChange={(open) => {
          setSettleOpen(open);
          if (!open) {
            setSettleMatch(null);
            setSettleRows([]);
            setSettleAmounts({});
            setSettleDefaultAmount("");
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto border-emerald-900/15 sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Rozlicz mecz</DialogTitle>
            {settleMatch ? (
              <DialogDescription asChild>
                <div className="space-y-1 pt-1 text-sm text-zinc-600">
                  <p>
                    <span className="font-medium text-zinc-800">
                      {settleMatch.match_date} · {settleMatch.match_time}
                    </span>
                  </p>
                  <p className="text-xs text-zinc-500">
                    Domyślnie wpisuje równą kwotę dla wszystkich (z pola „Kwota domyślna”, zwykle `fee_pln`).
                  </p>
                </div>
              </DialogDescription>
            ) : null}
          </DialogHeader>

          {settleLoading ? (
            <div className="flex items-center gap-2 py-4 text-sm text-zinc-600">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Wczytywanie zapisanych zawodników…
            </div>
          ) : (
            <>
              <div className="rounded-xl border border-emerald-900/10 bg-emerald-50/30 px-4 py-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                  <div className="flex-1">
                    <Label htmlFor="settle-default">Kwota domyślna (PLN)</Label>
                    <Input
                      id="settle-default"
                      type="text"
                      inputMode="decimal"
                      placeholder="np. 25"
                      value={settleDefaultAmount}
                      onChange={(e) => setSettleDefaultAmount(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <Button type="button" variant="secondary" onClick={applyDefaultToAll}>
                    Ustaw wszystkim
                  </Button>
                </div>
                <p className="mt-2 text-xs text-zinc-600">
                  Możesz edytować kwotę dla pojedynczych osób poniżej przed zapisaniem.
                </p>
              </div>

              {settleRows.length === 0 ? (
                <p className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50/80 px-4 py-10 text-center text-sm text-zinc-600 dark:border-zinc-600 dark:bg-zinc-800/50 dark:text-zinc-400">
                  Brak zapisanych (potwierdzonych) zawodników do rozliczenia.
                </p>
              ) : (
                <div className="max-h-[50vh] space-y-2 overflow-y-auto pr-1">
                  {settleRows.map((p) => (
                    <div
                      key={p.user_id}
                      className="flex items-center gap-3 rounded-xl border border-emerald-900/10 bg-white px-3 py-2"
                    >
                      <PlayerAvatar
                        photoPath={p.profile_photo_path}
                        firstName={p.first_name}
                        lastName={p.last_name}
                        size="sm"
                        ringClassName="ring-2 ring-emerald-200/90"
                      />
                      <div className="min-w-0 flex-1">
                        <PlayerNameStack firstName={p.first_name} lastName={p.last_name} nick={p.zawodnik} />
                        <p className="mt-0.5 text-xs text-zinc-500">ID: {p.user_id}</p>
                      </div>
                      <div className="w-32">
                        <Label className="sr-only" htmlFor={`settle-${p.user_id}`}>
                          Kwota
                        </Label>
                        <Input
                          id={`settle-${p.user_id}`}
                          type="text"
                          inputMode="decimal"
                          placeholder="0"
                          value={settleAmounts[p.user_id] ?? ""}
                          onChange={(e) =>
                            setSettleAmounts((prev) => ({ ...prev, [p.user_id]: e.target.value }))
                          }
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="rounded-xl border border-amber-200/70 bg-amber-50/70 px-4 py-3 text-xs text-amber-950">
                <p className="font-semibold">Uwaga</p>
                <p className="mt-1">
                  Rozliczenie odejmuje kwoty z portfeli. Jeśli mecz był już częściowo rozliczony, API pominie osoby już
                  rozliczone dla tego meczu.
                </p>
                {settleDefaultAmount.trim() ? (
                  <p className="mt-1">
                    Domyślna kwota: <strong className="tabular-nums">{formatPln(Number(settleDefaultAmount.replace(",", ".")) || 0)}</strong>
                  </p>
                ) : null}
              </div>
            </>
          )}

          <DialogFooter className="gap-2 sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setSettleOpen(false)}>
              Anuluj
            </Button>
            <Button type="button" disabled={settleSubmitting || settleLoading} onClick={() => void submitSettlement()}>
              {settleSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
              Zapisz rozliczenie
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(statsMatch)}
        onOpenChange={(open) => {
          if (!open) {
            setStatsMatch(null);
            setStatsStandaloneSurveyKey(null);
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto border-emerald-900/15">
          <DialogHeader>
            <DialogTitle>Statystyki z meczu</DialogTitle>
            {statsMatch && (
              <DialogDescription asChild>
                <div className="space-y-1 pt-1 text-sm text-zinc-600">
                  <p>
                    <span className="font-medium text-zinc-800">{statsMatch.match_date}</span>
                    <span className="text-zinc-400"> · </span>
                    <span>{statsMatch.match_time}</span>
                  </p>
                  <p className="flex items-start gap-2">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" aria-hidden />
                    {statsMatch.location}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {statsStandaloneSurveyKey ? (
                      <>
                        Wpisz swoje liczby z tego spotkania (mecz spoza terminarza). Możesz zapisać lub później
                        zmienić dane tutaj albo w profilu — bez limitu 7 dni od daty meczu.
                      </>
                    ) : (
                      <>
                        Wpisz swoje liczby z tego spotkania. Możesz to zrobić tylko raz — później zmiany wykona
                        administrator.
                      </>
                    )}
                  </p>
                </div>
              </DialogDescription>
            )}
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div>
              <Label htmlFor="ts-goals">Gole</Label>
              <Input
                id="ts-goals"
                type="number"
                min={0}
                value={statsGoals}
                onChange={(e) => setStatsGoals(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="ts-assists">Asysty</Label>
              <Input
                id="ts-assists"
                type="number"
                min={0}
                value={statsAssists}
                onChange={(e) => setStatsAssists(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="ts-distance">Dystans (km)</Label>
              <Input
                id="ts-distance"
                type="number"
                min={0}
                step={0.1}
                value={statsDistance}
                onChange={(e) => setStatsDistance(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="ts-saves">Obronione strzały</Label>
              <Input
                id="ts-saves"
                type="number"
                min={0}
                value={statsSaves}
                onChange={(e) => setStatsSaves(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setStatsMatch(null)}>
              Anuluj
            </Button>
            <Button type="button" className="bg-emerald-700 hover:bg-emerald-800" onClick={() => void saveMatchStats()}>
              Zapisz statystyki
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AddMatchDialog open={addOpen} onOpenChange={setAddOpen} onDone={() => router.refresh()} />

      {transportSignupMatchId != null && (
        <MatchTransportSignupDialog
          open={transportSignupOpen}
          onOpenChange={(v) => {
            setTransportSignupOpen(v);
            if (!v) setTransportSignupMatchId(null);
          }}
          matchId={transportSignupMatchId}
          intent={transportSignupIntent === "confirm" ? "confirm" : "signup"}
          onCompleted={() => {
            router.refresh();
          }}
        />
      )}

      <Dialog
        open={inviteGateOpen}
        onOpenChange={(open) => {
          setInviteGateOpen(open);
          if (!open) setInviteLoginInline(false);
        }}
      >
        <DialogContent className="max-h-[90dvh] overflow-y-auto border-emerald-900/15 sm:max-w-md">
          {highlightMatch && (
            <div className="space-y-3 rounded-xl border border-emerald-200/90 bg-emerald-50/70 px-4 py-3 text-sm text-emerald-950 dark:border-emerald-800/50 dark:bg-emerald-950/35 dark:text-emerald-50">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800/80 dark:text-emerald-300/85">
                Mecz
              </p>
              <div className="grid gap-2">
                <div>
                  <span className="text-zinc-500 dark:text-zinc-400">Kiedy: </span>
                  <span className="font-medium">
                    {highlightMatch.match_date} · {highlightMatch.match_time}
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700 dark:text-emerald-400" aria-hidden />
                  <div>
                    <span className="text-zinc-500 dark:text-zinc-400">Gdzie: </span>
                    <span className="font-medium">{highlightMatch.location}</span>
                  </div>
                </div>
                <div>
                  <MatchSignupCountsBlock
                    matchId={highlightMatch.id}
                    signedUp={highlightMatch.signed_up}
                    maxSlots={highlightMatch.max_slots}
                    playersData={playersData}
                  />
                  <p className="mt-1 text-xs font-medium text-emerald-900/90 dark:text-emerald-200/90">
                    {highlightMatch.max_slots - highlightMatch.signed_up > 0
                      ? `Wolnych miejsc w składzie: ${highlightMatch.max_slots - highlightMatch.signed_up}.`
                      : "Brak wolnych miejsc w składzie."}
                  </p>
                </div>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(highlightMatch.location)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex w-fit items-center gap-1.5 font-medium text-emerald-800 underline underline-offset-2 hover:text-emerald-950 dark:text-emerald-300 dark:hover:text-emerald-100"
                >
                  Otwórz miejsce w Mapach Google
                </a>
              </div>
            </div>
          )}
          {!inviteLoginInline ? (
            <>
              <DialogHeader>
                <DialogTitle>Zapis na mecz</DialogTitle>
                <DialogDescription className="text-left text-zinc-600 dark:text-zinc-400">
                  Żeby odpowiedzieć na zaproszenie, zaloguj się lub utwórz konto. Po zalogowaniu wybierzesz, czy bierzesz
                  udział: <strong>tak</strong>, <strong>«jeszcze nie wiem»</strong> albo <strong>«nie biorę udziału»</strong>.
                  Dopiero przy „tak” (gdy są wolne miejsca) wybierzesz transport.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="flex-col gap-2 sm:flex-col sm:justify-start sm:gap-2">
                <Button
                  type="button"
                  className="w-full bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500"
                  onClick={() => setInviteLoginInline(true)}
                >
                  Zaloguj się
                </Button>
                <Button variant="outline" className="w-full" asChild>
                  <Link
                    href={
                      highlightMatchId != null
                        ? `/register?next=${encodeURIComponent(terminarzInviteRelativePath(highlightMatchId))}`
                        : "/register"
                    }
                  >
                    Utwórz konto
                  </Link>
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Logowanie</DialogTitle>
                <DialogDescription className="text-left text-zinc-600 dark:text-zinc-400">
                  Wpisz imię, nazwisko i PIN (4–6 cyfr) — tak jak na stronie logowania.
                </DialogDescription>
              </DialogHeader>
              <button
                type="button"
                className="mb-2 text-left text-sm font-medium text-emerald-800 underline-offset-2 hover:underline dark:text-emerald-300"
                onClick={() => setInviteLoginInline(false)}
              >
                ← Wróć
              </button>
              <LoginForm
                nextPath={
                  highlightMatchId != null ? terminarzInviteRelativePath(highlightMatchId) : "/terminarz"
                }
                embedMode
                onAuthenticated={() => {
                  setInviteGateOpen(false);
                  setInviteLoginInline(false);
                }}
              />
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={inviteParticipationOpen} onOpenChange={setInviteParticipationOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto border-emerald-900/15 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Zaproszenie — czy bierzesz udział?</DialogTitle>
            <DialogDescription className="text-left text-zinc-600 dark:text-zinc-400">
              <strong>Tak</strong> — przy wolnych miejscach w składzie potwierdzasz udział i przechodzisz do wyboru
              transportu. <strong>Jeszcze nie wiem</strong> — bez miejsca w składzie; odpowiedź doprecyzujesz później w
              terminarzu. <strong>Nie, nie biorę udziału</strong> — bez miejsca w składzie; działa jak rezygnacja z tego
              terminu w terminarzu.
            </DialogDescription>
          </DialogHeader>
          {highlightMatch && (
            <div className="space-y-3 rounded-xl border border-emerald-200/90 bg-emerald-50/70 px-4 py-3 text-sm text-emerald-950 dark:border-emerald-800/50 dark:bg-emerald-950/35 dark:text-emerald-50">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800/80 dark:text-emerald-300/90">
                Mecz
              </p>
              <div className="grid gap-2">
                <div>
                  <span className="text-zinc-500 dark:text-zinc-400">Kiedy: </span>
                  <span className="font-medium">
                    {highlightMatch.match_date} · {highlightMatch.match_time}
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700 dark:text-emerald-400" aria-hidden />
                  <div>
                    <span className="text-zinc-500 dark:text-zinc-400">Gdzie: </span>
                    <span className="font-medium">{highlightMatch.location}</span>
                  </div>
                </div>
                <div>
                  <MatchSignupCountsBlock
                    matchId={highlightMatch.id}
                    signedUp={highlightMatch.signed_up}
                    maxSlots={highlightMatch.max_slots}
                    playersData={playersData}
                  />
                  <p className="mt-1 text-xs font-medium text-emerald-900/90 dark:text-emerald-200/90">
                    {highlightMatch.max_slots - highlightMatch.signed_up > 0
                      ? `Wolnych miejsc w składzie: ${highlightMatch.max_slots - highlightMatch.signed_up}.`
                      : "Skład pełny — „Tak” nie otworzy pełnego zapisu; możesz wybrać „Jeszcze nie wiem” (bez miejsca)."}
                  </p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="flex-col gap-2 sm:flex-col sm:justify-start sm:gap-2">
            <Button
              type="button"
              className="w-full bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-700"
              onClick={onInviteParticipationTak}
            >
              Tak, biorę udział
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={highlightMatchId != null && tentativeBusyId === highlightMatchId}
              onClick={() => void onInviteParticipationTentativeFromDialog()}
            >
              <HelpCircle className="mr-2 h-4 w-4 shrink-0" aria-hidden />
              Jeszcze nie wiem
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full text-zinc-700 dark:text-zinc-300"
              disabled={highlightMatchId != null && tentativeBusyId === highlightMatchId}
              onClick={() => void onInviteParticipationNie()}
            >
              Nie, nie biorę udziału
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function CalendarView({
  year,
  month,
  matches,
  tentativeByMatchId = {},
  onPrev,
  onNext,
  onToday,
  onPick,
}: {
  year: number;
  month: number;
  matches: MatchRow[];
  tentativeByMatchId?: Record<number, number>;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onPick: (m: MatchRow) => void;
}) {
  const names = [
    "Styczeń",
    "Luty",
    "Marzec",
    "Kwiecień",
    "Maj",
    "Czerwiec",
    "Lipiec",
    "Sierpień",
    "Wrzesień",
    "Październik",
    "Listopad",
    "Grudzień",
  ];
  const dayNames = ["Pn", "Wt", "Śr", "Cz", "Pt", "So", "Nd"];
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
    cells.push(
      <div
        key={`e-${i}`}
        className="min-h-[72px] rounded-lg border border-dashed border-zinc-200 bg-zinc-50/60 dark:border-zinc-600 dark:bg-zinc-800/50"
      />
    );
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const ds = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const list = byDate[ds] ?? [];
    const isToday =
      d === today.getDate() && month === today.getMonth() && year === today.getFullYear();
    cells.push(
      <div
        key={d}
        className={cn(
          "min-h-[104px] rounded-xl border border-zinc-200 bg-white p-2 shadow-sm dark:border-zinc-600 dark:bg-zinc-800/80",
          isToday && "ring-2 ring-emerald-600 ring-offset-2 dark:ring-emerald-500 dark:ring-offset-zinc-900"
        )}
      >
        <div className="text-sm font-bold text-emerald-950 dark:text-emerald-100">{d}</div>
        <div className="mt-1 space-y-1">
          {list.map((m) => {
            const free = m.max_slots - m.signed_up;
            const past = ds < todayStr;
            const tc = tentativeByMatchId[m.id] ?? 0;
            const ponderCal = formatPonderingPlayersPolish(tc);
            const tip = ponderCal
              ? `${m.match_time} · ${m.signed_up}/${m.max_slots} zapisanych. ${ponderCal}`
              : `${m.match_time} · ${m.signed_up}/${m.max_slots} zapisanych`;
            return (
              <button
                key={m.id}
                type="button"
                title={tip}
                onClick={() => onPick(m)}
                className={cn(
                  "block w-full rounded-md px-1.5 py-1 text-left text-[11px] font-medium leading-tight transition-colors",
                  m.played
                    ? "bg-zinc-200 text-zinc-800 dark:bg-zinc-600 dark:text-zinc-100"
                    : free <= 0
                      ? "bg-red-100 text-red-900 dark:bg-red-950/60 dark:text-red-100"
                      : "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/50 dark:text-emerald-100",
                  past && !m.played && "opacity-80"
                )}
              >
                <span className="block truncate">{m.match_time}</span>
                <span className="block truncate opacity-90">{m.location}</span>
                {tc > 0 ? (
                  <span className="mt-0.5 block truncate text-[10px] font-normal leading-tight opacity-95">
                    {ponderCal}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto mt-6 max-w-4xl">
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-600 dark:bg-zinc-900/80 sm:p-6">
        <div className="mb-5 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Button type="button" size="sm" variant="outline" className="gap-1 border-zinc-200 dark:border-zinc-600" onClick={onPrev}>
            <ChevronLeft className="h-4 w-4" />
            Poprzedni
          </Button>
          <div className="flex flex-col items-center gap-2 sm:flex-row">
            <span className="text-center text-base font-bold text-emerald-950 dark:text-emerald-100">
              {names[month]} {year}
            </span>
            <Button type="button" size="sm" variant="secondary" className="text-emerald-900 dark:text-emerald-100" onClick={onToday}>
              Przejdź do dziś
            </Button>
          </div>
          <Button type="button" size="sm" variant="outline" className="gap-1 border-zinc-200 dark:border-zinc-600" onClick={onNext}>
            Następny
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <p className="mb-3 text-center text-xs text-zinc-500 dark:text-zinc-400 sm:text-left">
          Kliknij wpis, by zobaczyć szczegóły. Szare — rozegrane; zielone — wolne miejsca; czerwone — pełny skład. Trzecia
          linijka (gdy jest) — ile osób ma status «jeszcze nie wiem».
        </p>
        <div className="mb-2 grid grid-cols-7 gap-1.5 text-center text-[0.65rem] font-bold uppercase tracking-wide text-emerald-800/80 dark:text-emerald-300/90 sm:gap-2 sm:text-xs">
          {dayNames.map((d) => (
            <div key={d}>{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2">{cells}</div>
      </div>
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
      <DialogContent className="border-emerald-900/15">
        <DialogHeader>
          <DialogTitle className="text-emerald-950 dark:text-emerald-100">Dodaj mecz</DialogTitle>
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
            <Label>Ilość miejsc</Label>
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
