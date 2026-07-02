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
  List,
  Loader2,
  LogIn,
  HelpCircle,
  Plus,
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
import { nativeSelectClasses } from "@/lib/field-styles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InviteShareLanding } from "@/components/invite-share-landing";
import { MatchTransportSignupDialog } from "@/components/match-transport-signup-dialog";
import { MatchManageDialog } from "@/components/match-manage-dialog";
import { MatchAddGuestDialog } from "@/components/match-add-guest-dialog";
import { AppModal } from "@/components/ui/app-modal";
import {
  ModalAlert,
  ModalLoadingRow,
  ModalMatchSummary,
  modalEmptyStateClass,
  modalListClass,
  modalPanelClass,
} from "@/components/ui/modal-shared";
import { FormInput } from "@/components/ui/form-field";
import { formSchemas, useValidatedForm } from "@/lib/form-validation";
import { z } from "zod";
import { TerminarzMatchCard } from "@/components/terminarz-match-card";
import { MatchSignupCountsBlock } from "@/components/terminarz-match-counts";
import { appendShareSessionQuery, terminarzInviteRelativePath } from "@/lib/share-link";
import {
  getStandaloneSurveyMatchRow,
  PARTICIPATION_SURVEY_KEY,
} from "@/lib/match-participation-survey";
import { hasMatchTimePassed } from "@/lib/transport";

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
  /** Z URL (?obecnosc=1 wraz z ?mecz=) — otwiera dialog obecności (admin). */
  openAttendanceFromUrl?: boolean;
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

function addDaysISO(isoDate: string, days: number): string {
  const d = new Date(isoDate + "T12:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

const actionBarClass =
  "awp-match-action-bar flex flex-col gap-2.5 rounded-2xl p-3";

const actionBtnBase =
  "awp-match-btn h-auto min-h-9 justify-start gap-2 whitespace-normal py-2 text-left";

const actionBtnPrimary = cn(actionBtnBase, "awp-match-btn--primary font-semibold");

const actionBtnDanger = cn(actionBtnBase, "awp-match-btn--danger font-semibold");

const actionBtnSecondary = cn(actionBtnBase, "awp-match-btn--secondary font-medium");

const actionBtnAdmin = cn(actionBtnBase, "awp-match-btn--admin font-semibold");

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
  openAttendanceFromUrl = false,
}: Props) {
  const router = useRouter();
  const [view, setView] = useState<"list" | "cal">("list");
  const [listTab, setListTab] = useState<"active" | "archive">("active");
  const [filter, setFilter] = useState("all");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [onlyMine, setOnlyMine] = useState(false);
  const [period, setPeriod] = useState<"all" | "7d" | "month">("all");
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
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
  const [inviteLoginInline, setInviteLoginInline] = useState(false);
  const statsOpenedFromUrlRef = useRef(false);
  const standaloneStatsOpenedFromUrlRef = useRef(false);
  const attendanceOpenedFromUrlRef = useRef(false);
  const [settleOpen, setSettleOpen] = useState(false);
  const [settleMatch, setSettleMatch] = useState<MatchRow | null>(null);
  const [settleLoading, setSettleLoading] = useState(false);
  const [settleRows, setSettleRows] = useState<AdminMatchSignupRow[]>([]);
  const [settleDefaultAmount, setSettleDefaultAmount] = useState("");
  const [settleAmounts, setSettleAmounts] = useState<Record<number, string>>({});
  const [settleSubmitting, setSettleSubmitting] = useState(false);

  const [attendanceOpen, setAttendanceOpen] = useState(false);
  const [attendanceMatch, setAttendanceMatch] = useState<MatchRow | null>(null);
  const [attendanceRows, setAttendanceRows] = useState<AdminMatchSignupRow[]>([]);
  const [attendancePresent, setAttendancePresent] = useState<Set<number>>(new Set());
  const [attendanceBusy, setAttendanceBusy] = useState(false);

  const [manageMatchOpen, setManageMatchOpen] = useState(false);
  const [manageMatch, setManageMatch] = useState<MatchRow | null>(null);
  const [manageInitialTab, setManageInitialTab] = useState<"edit" | "guest" | "signups" | "cancel">("edit");
  const [addGuestMatch, setAddGuestMatch] = useState<MatchRow | null>(null);
  const [addGuestOpen, setAddGuestOpen] = useState(false);

  const cancelledMatchShownRef = useRef(false);

  const missingStatsSet = useMemo(() => new Set(playedMissingStatsMatchIds), [playedMissingStatsMatchIds]);

  const highlightMatch = useMemo(
    () => (highlightMatchId ? allMatches.find((m) => m.id === highlightMatchId) : undefined),
    [highlightMatchId, allMatches]
  );

  const openAttendanceDialog = useCallback(async (m: MatchRow) => {
    if (!isAdmin) return;
    setAttendanceBusy(true);
    setAttendanceMatch(m);
    try {
      const signupsR = await fetchJson<{ signups: AdminMatchSignupRow[] }>(`/api/admin/match/${m.id}/signups`);
      if (!signupsR.ok) {
        toast.error(signupsR.error);
        return;
      }
      const confirmed = (signupsR.data.signups ?? []).filter((s) => Number(s.commitment ?? 1) === 1);
      setAttendanceRows(confirmed);

      const attR = await fetchJson<{ present_user_ids: number[] }>(`/api/admin/match/${m.id}/attendance`);
      if (!attR.ok) {
        toast.error(attR.error);
        return;
      }
      setAttendancePresent(new Set((attR.data.present_user_ids ?? []).map((x) => Number(x)).filter(Number.isFinite)));
      setAttendanceOpen(true);
    } finally {
      setAttendanceBusy(false);
    }
  }, [isAdmin]);

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
      return db.localeCompare(da);
    });
    return rows;
  }, [playedConfirmed, search]);

  useEffect(() => {
    if (!highlightMatchId || view !== "list") return;
    const t = window.setTimeout(() => {
      document
        .querySelector(`[data-mecz-highlight="${highlightMatchId}"]`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 180);
    return () => window.clearTimeout(t);
  }, [highlightMatchId, view, listTab, filteredActive, filteredArchive]);

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
    openTransportSignup(highlightMatchId);
  }

  async function onInviteParticipationTentativeFromDialog() {
    if (highlightMatchId == null) return;
    await signupTentative(highlightMatchId);
  }

  async function onInviteParticipationNie() {
    if (highlightMatchId == null) return;
    await signupDeclined(highlightMatchId);
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
    if (played) {
      const m = allMatches.find((x) => x.id === id);
      if (m) void openAttendanceDialog(m);
    }
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
      const [signupsR, attR] = await Promise.all([
        fetchJson<{ signups: AdminMatchSignupRow[] }>(`/api/admin/match/${m.id}/signups`),
        fetchJson<{ present_user_ids: number[] }>(`/api/admin/match/${m.id}/attendance`),
      ]);
      if (!signupsR.ok) {
        toast.error(signupsR.error);
        return;
      }
      const present = new Set((attR.ok ? attR.data.present_user_ids : []).map((x) => Number(x)));
      let confirmed = (signupsR.data.signups ?? []).filter((s) => Number(s.commitment ?? 1) === 1);
      if (present.size > 0) {
        confirmed = confirmed.filter((s) => present.has(s.user_id));
      }
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

  useEffect(() => {
    if (!openAttendanceFromUrl || highlightMatchId == null || !isAdmin) return;
    if (attendanceOpenedFromUrlRef.current) return;
    const m = allMatches.find((x) => x.id === highlightMatchId);
    if (!m) return;
    attendanceOpenedFromUrlRef.current = true;
    setView("list");
    if (playedConfirmed.some((p) => p.id === m.id)) setListTab("archive");
    else setListTab("active");
    void openAttendanceDialog(m);
    if (typeof window !== "undefined") {
      const u = new URL(window.location.href);
      u.searchParams.delete("obecnosc");
      router.replace(u.pathname + u.search, { scroll: false });
    }
  }, [openAttendanceFromUrl, highlightMatchId, isAdmin, allMatches, playedConfirmed, router, openAttendanceDialog]);

  useEffect(() => {
    // Szukaj anulowanego meczu w liście
    if (cancelledMatchShownRef.current) return;
    
    const cancelled = allMatches.find((m) => m.cancelled && m.cancelled === 1);
    if (!cancelled) return;

    // Znaleziony anulowany mecz - pokaż pop-up
    // TODO: Implementacja powiadomienia o anulacji meczu
  }, [allMatches]);

  async function saveAttendance() {
    if (!attendanceMatch) return;
    setAttendanceBusy(true);
    try {
      const ids = Array.from(attendancePresent.values());
      const r = await fetchJson<{ ok: true; present_count: number }>(
        `/api/admin/match/${attendanceMatch.id}/attendance`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ present_user_ids: ids }),
        }
      );
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success(`Zapisano obecność (${r.data.present_count})`);
      setAttendanceOpen(false);
      setAttendanceMatch(null);
      setAttendanceRows([]);
      setAttendancePresent(new Set());
    } finally {
      setAttendanceBusy(false);
    }
  }

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

  function openManageMatch(m: MatchRow, tab: "edit" | "guest" | "signups" | "cancel" = "edit") {
    setManageMatch(m);
    setManageInitialTab(tab);
    setManageMatchOpen(true);
  }

  function openAddGuestDialog(m: MatchRow) {
    setAddGuestMatch(m);
    setAddGuestOpen(true);
  }

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
          <>
          {kind === "confirmed" ? (
            past ? (
              <ActionNotice tone="muted">
                <strong className="font-semibold text-zinc-800 dark:text-zinc-100">Jesteś na liście zapisanych.</strong>{" "}
                Po upływie
                terminu meczu wypisu z poziomu aplikacji nie ma — w razie potrzeby napisz do administratora.
              </ActionNotice>
            ) : (
              <Button
                size="sm"
                variant="ghost"
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
                    variant="ghost"
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
                  variant="ghost"
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
                    variant="ghost"
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
                  variant="ghost"
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
                  variant="ghost"
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
                variant="ghost"
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
                variant="ghost"
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
          )}
          {!past && m.cancelled !== 1 && free > 0 && (
            <Button
              size="sm"
              variant="ghost"
              className={actionBtnSecondary}
              title="Dopisz osobę grającą jednorazowo — zajmuje miejsce w składzie"
              onClick={() => openAddGuestDialog(m)}
            >
              <UserPlus className="shrink-0 text-amber-700 dark:text-amber-300" aria-hidden />
              <span>
                <span className="block leading-tight text-zinc-900 dark:text-zinc-100">Dodaj gościa na mecz</span>
                <span className="mt-1 block text-[11px] font-normal leading-snug text-zinc-500 dark:text-zinc-400">
                  Tymczasowe konto — po rozliczeniu płatności znika z bazy
                </span>
              </span>
            </Button>
          )}
          </>
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
          <Button size="sm" variant="ghost" className={actionBtnSecondary} asChild>
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

        {isAdmin && m.cancelled !== 1 && (
        <div className="flex flex-col gap-2 border-t border-zinc-200/80 pt-2.5 dark:border-zinc-600/80 sm:flex-row sm:flex-wrap">
          {hasMatchTimePassed(m) && (
            <Button
              size="sm"
              variant="ghost"
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
          {!hasMatchTimePassed(m) && (
            <Button
              size="sm"
              variant="ghost"
              className={actionBtnDanger}
              title="Odwołaj termin przed rozpoczęciem meczu — zapisani zawodnicy dostaną powiadomienie"
              onClick={() => openManageMatch(m, "cancel")}
            >
              <X className="shrink-0" aria-hidden />
              <span>
                <span className="block leading-tight">Anuluj</span>
                <span className="mt-1 block text-[11px] font-normal leading-snug text-red-700/90 dark:text-red-300">
                  Odwołaj mecz przed jego rozpoczęciem
                </span>
              </span>
            </Button>
          )}
        </div>
        )}
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
            variant="ghost"
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
        {isAdmin && (
          <Button
            size="sm"
            variant="ghost"
            className={actionBtnAdmin}
            title="Zaznacz kto był na boisku — przed rozliczeniem portfeli"
            onClick={() => void openAttendanceDialog(m)}
          >
            <ShieldCheck className="shrink-0" aria-hidden />
            <span className="block leading-tight">Obecność</span>
          </Button>
        )}
        {isAdmin && (
          <Button
            size="sm"
            variant="ghost"
            className={actionBtnPrimary}
            title="Równo nalicz dług zawodnikom obecnym na meczu"
            onClick={() => void openSettleDialog(m)}
          >
            <ShieldCheck className="shrink-0" aria-hidden />
            <span className="block leading-tight">Rozlicz portfele</span>
          </Button>
        )}
        {isAdmin && (
          <Button
            size="sm"
            variant="ghost"
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

  if (inviteFromShare && highlightMatchId != null) {
    return (
      <>
        <InviteShareLanding
          highlightMatchId={highlightMatchId}
          match={highlightMatch ?? null}
          playersData={playersData}
          isLoggedIn={isLoggedIn}
          userSignupKind={userSignupKind}
          inviteLoginInline={inviteLoginInline}
          setInviteLoginInline={setInviteLoginInline}
          tentativeBusy={tentativeBusyId === highlightMatchId}
          onParticipationTak={onInviteParticipationTak}
          onParticipationTentative={onInviteParticipationTentativeFromDialog}
          onParticipationNie={onInviteParticipationNie}
          onAuthenticated={() => setInviteLoginInline(false)}
        />
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
      </>
    );
  }

  return (
    <>
      <div className="awp-card-surface mundial-page-accent px-4 py-8 sm:px-8">
        <div className="flex flex-col items-center text-center">
          <div className="pitch-rule mx-auto mb-4 w-40 sm:w-48" />
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
            <Image
              src="/mundial-2026-logo.svg"
              alt="Mundial 2026"
              width={56}
              height={56}
              className="h-14 w-14 drop-shadow-md sm:h-16 sm:w-16"
              unoptimized
            />
            <h1
              id="terminarz-page-title"
              className="whitespace-nowrap text-3xl font-bold tracking-tight text-[var(--mundial-navy,#1a2d5a)] dark:text-[var(--mundial-gold,#f5c518)] sm:text-4xl"
            >
              Terminarz
            </h1>
          </div>
          <p className="mt-3 max-w-xl text-sm text-zinc-600 dark:text-zinc-400 sm:text-base">
            Mecze Akademii — zapisz się na boisko, sprawdź skład i terminy w stylu Mundialu 2026.
          </p>
        </div>

        <div className="mx-auto mt-8 max-w-4xl">
          <div className="relative overflow-hidden rounded-2xl border-2 border-white/35 text-white shadow-lg shadow-emerald-950/20 ring-1 ring-emerald-950/15">
            <div className="home-pitch-tile absolute inset-0" aria-hidden />
            <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-white/40" aria-hidden />
            <div
              className="pointer-events-none absolute bottom-0 left-0 h-10 w-10 rounded-tr-full border-t-2 border-r-2 border-white/45"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute bottom-0 right-0 h-10 w-10 rounded-tl-full border-t-2 border-l-2 border-white/45"
              aria-hidden
            />

            <div className="relative flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
              <div className="flex flex-col gap-2.5">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--mundial-gold,#f5c518)]">
                  Widok terminarza
                </span>
                <div className="inline-flex rounded-xl border border-white/25 bg-black/10 p-1 backdrop-blur-sm">
                  <button
                    type="button"
                    onClick={() => setView("list")}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all",
                      view === "list"
                        ? "bg-emerald-100 text-emerald-950 shadow-md shadow-emerald-950/20"
                        : "text-white/90 hover:bg-white/10"
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
                        ? "bg-emerald-100 text-emerald-950 shadow-md shadow-emerald-950/20"
                        : "text-white/90 hover:bg-white/10"
                    )}
                  >
                    <CalendarDays className="h-4 w-4 shrink-0" aria-hidden />
                    Kalendarz
                  </button>
                </div>
              </div>

              {isAdmin && (
                <div className="flex flex-col gap-1.5 sm:items-end">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--mundial-gold,#f5c518)] sm:text-right">
                    Administrator
                  </span>
                  <Button
                    type="button"
                    variant="pitch"
                    size="lg"
                    className="w-full sm:w-auto"
                    onClick={() => setAddOpen(true)}
                  >
                    <Plus className="h-4 w-4 shrink-0" aria-hidden />
                    Dodaj mecz
                  </Button>
                </div>
              )}
            </div>
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
              <Button
                type="button"
                variant={searchOpen || search.trim() ? "secondary" : "outline"}
                className="gap-2"
                onClick={() => setSearchOpen((open) => !open)}
                aria-expanded={searchOpen}
                aria-controls="terminarz-search-panel"
              >
                <Search className="h-4 w-4 shrink-0" aria-hidden />
                Wyszukaj mecz
                {search.trim() ? (
                  <span className="max-w-[12rem] truncate text-xs font-normal text-zinc-600 dark:text-zinc-400">
                    · {search.trim()}
                  </span>
                ) : null}
              </Button>

              {searchOpen ? (
                <div id="terminarz-search-panel" className="mt-3 max-w-md">
                  <Label htmlFor="terminarz-search" className="text-xs text-zinc-600 dark:text-zinc-400">
                    Szukaj miejsca
                  </Label>
                  <div className="relative mt-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                    <Input
                      id="terminarz-search"
                      type="search"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="np. boisko, adres…"
                      className="pl-9"
                      autoFocus
                    />
                  </div>
                </div>
              ) : null}

              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 lg:items-end">
                <div>
                  <Label className="text-xs text-zinc-600 dark:text-zinc-400">Zakres dat (lista aktywna)</Label>
                  <select
                    className={cn(nativeSelectClasses, "mt-1 w-full")}
                    value={period}
                    onChange={(e) => setPeriod(e.target.value as "all" | "7d" | "month")}
                  >
                    <option value="all">Cały terminarz</option>
                    <option value="7d">Najbliższe 7 dni</option>
                    <option value="month">Bieżący miesiąc</option>
                  </select>
                </div>
                <div>
                  <Label className="text-xs text-zinc-600 dark:text-zinc-400">Miejsca</Label>
                  <select
                    className={cn(nativeSelectClasses, "mt-1 w-full")}
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
                <div className="flex flex-wrap gap-2">
                  <select
                    className={cn(nativeSelectClasses, "min-w-[10rem] flex-1")}
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
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {filteredActive.map((m) => {
                    const past = m.match_date < todayISO();
                    return (
                      <TerminarzMatchCard
                        key={m.id}
                        match={m}
                        highlight={highlightMatchId === m.id}
                        past={past}
                        playersData={playersData}
                        isAdmin={isAdmin}
                        onManage={() => openManageMatch(m)}
                        onCopyInvite={() => void copyInviteLink(m.id)}
                        onOpenPlayers={() => openPlayers(m.id)}
                        actions={activeActions(m)}
                      />
                    );
                  })}
                </div>
                {filteredActive.length === 0 && (
                  <p className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50/80 py-10 text-center text-sm text-zinc-600 dark:border-zinc-600 dark:bg-zinc-800/50 dark:text-zinc-400">
                    Brak meczów spełniających kryteria. Zmień filtry lub zakres dat.
                  </p>
                )}
              </TabsContent>

              <TabsContent value="archive" className="mt-5">
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {filteredArchive.map((m) => (
                    <TerminarzMatchCard
                      key={m.id}
                      match={m}
                      highlight={highlightMatchId === m.id}
                      archive
                      playersData={playersData}
                      isAdmin={isAdmin}
                      onManage={() => openManageMatch(m)}
                      onOpenPlayers={() => openPlayers(m.id)}
                      actions={archiveActions(m)}
                    />
                  ))}
                </div>
                {filteredArchive.length === 0 && (
                  <p className="rounded-xl border border-dashed border-zinc-200 py-10 text-center text-sm text-zinc-600 dark:border-zinc-600 dark:text-zinc-400">
                    Brak rozegranych meczów do wyświetlenia.
                  </p>
                )}
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

      <AppModal
        open={Boolean(calPopup)}
        onOpenChange={(o) => !o && setCalPopup(null)}
        size="md"
        title="Podgląd meczu"
        footer={
          calPopup ? (
            <>
              {isLoggedIn && calPopup.played === 1 && missingStatsSet.has(calPopup.id) && (
                <Button
                  type="button"
                  variant="pitch"
                  className="h-auto min-h-9 w-full gap-2 whitespace-normal py-2 text-left sm:w-auto"
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
              {isLoggedIn &&
                calPopup.played !== 1 &&
                calPopup.cancelled !== 1 &&
                calPopup.match_date >= todayISO() &&
                calPopup.signed_up < calPopup.max_slots && (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-auto min-h-9 w-full gap-2 whitespace-normal py-2 text-left sm:w-auto"
                    onClick={() => {
                      const m = calPopup;
                      setCalPopup(null);
                      openAddGuestDialog(m);
                    }}
                  >
                    <UserPlus className="shrink-0 text-amber-700 dark:text-amber-300" aria-hidden />
                    <span className="text-left">
                      <span className="block leading-tight">Dodaj gościa na mecz</span>
                      <span className="mt-0.5 block text-[11px] font-normal text-zinc-500 dark:text-zinc-400">
                        Tymczasowe konto jednorazowe
                      </span>
                    </span>
                  </Button>
                )}
              <Button
                type="button"
                variant="outline"
                className="h-auto min-h-9 w-full gap-2 whitespace-normal py-2 text-left sm:w-auto"
                onClick={() => openPlayers(calPopup.id)}
              >
                <Users className="shrink-0 text-emerald-700 dark:text-emerald-400" aria-hidden />
                <span className="text-left">
                  <span className="block leading-tight">Kto jest zapisany?</span>
                  <span className="mt-0.5 block text-[11px] font-normal text-zinc-500 dark:text-zinc-400">
                    Ta sama lista co w terminarzu
                  </span>
                </span>
              </Button>
              <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => setCalPopup(null)}>
                <X className="shrink-0" aria-hidden />
                Zamknij podgląd
              </Button>
            </>
          ) : null
        }
        footerClassName="flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end"
      >
        {calPopup ? (
          <>
            <ModalMatchSummary match={calPopup} />
            <div>
              <MatchSignupCountsBlock
                matchId={calPopup.id}
                signedUp={calPopup.signed_up}
                maxSlots={calPopup.max_slots}
                playersData={playersData}
              />
            </div>
            <p className="text-sm text-zinc-700 dark:text-zinc-300">
              Status: {calPopup.played ? "Rozegrany" : "Nierozegrany"}
            </p>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(calPopup.location)}`}
              target="_blank"
              rel="noreferrer"
              className="inline-block text-sm font-medium text-emerald-700 underline underline-offset-2 hover:text-emerald-900 dark:text-emerald-400 dark:hover:text-emerald-300"
            >
              Otwórz miejsce w Mapach Google
            </a>
          </>
        ) : null}
      </AppModal>

      <AppModal
        open={playersOpen}
        onOpenChange={setPlayersOpen}
        size="lg"
        scrollable
        title={
          selectedData ? `Zawodnicy – ${selectedData.date} ${selectedData.time}` : "Zawodnicy"
        }
        contentClassName="space-y-3"
      >
        {selectedData && (
          <>
            {selectedMatchId != null ? (
              <ModalMatchSummary
                match={{
                  match_date: selectedData.date,
                  match_time: selectedData.time,
                  location: selectedData.location,
                  signed_up:
                    allMatches.find((x) => x.id === selectedMatchId)?.signed_up ?? selectedData.players.length,
                  max_slots: selectedData.max,
                }}
              />
            ) : (
              <p className="text-sm font-medium text-emerald-900 dark:text-emerald-200">{selectedData.location}</p>
            )}
            {selectedMatchId != null ? (
              <div>
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
            <ul className={cn(modalListClass, "max-h-[min(24rem,55vh)]")}>
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
      </AppModal>

    <AppModal
      open={attendanceOpen}
      onOpenChange={(open) => {
        setAttendanceOpen(open);
        if (!open) {
          setAttendanceMatch(null);
          setAttendanceRows([]);
          setAttendancePresent(new Set());
        }
      }}
      size="lg"
      scrollable
      title="Obecność na meczu"
      description="Zaznacz osoby, które faktycznie brały udział w meczu."
      footer={
        <>
          <Button type="button" variant="outline" disabled={attendanceBusy} onClick={() => setAttendanceOpen(false)}>
            Anuluj
          </Button>
          <Button
            type="button"
            variant="pitch"
            disabled={attendanceBusy || !attendanceMatch}
            onClick={() => void saveAttendance()}
          >
            {attendanceBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
            Zapisz obecność
          </Button>
        </>
      }
      contentClassName="space-y-3"
    >
      {attendanceMatch ? <ModalMatchSummary match={attendanceMatch} /> : null}

      {attendanceBusy ? <ModalLoadingRow /> : null}

      {attendanceRows.length === 0 ? (
        <p className={modalEmptyStateClass}>Brak zapisanych (potwierdzonych) zawodników do zaznaczenia.</p>
      ) : (
        <div className={cn(modalListClass, "max-h-[55vh] space-y-2 p-1")}>
          {attendanceRows.map((p) => {
            const checked = attendancePresent.has(p.user_id);
            return (
              <label
                key={p.user_id}
                className="flex cursor-pointer items-center gap-3 rounded-xl border border-emerald-900/10 bg-white px-3 py-2 dark:bg-zinc-900"
              >
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-emerald-700"
                  checked={checked}
                  onChange={(e) => {
                    const on = e.target.checked;
                    setAttendancePresent((prev) => {
                      const next = new Set(prev);
                      if (on) next.add(p.user_id);
                      else next.delete(p.user_id);
                      return next;
                    });
                  }}
                />
                <PlayerAvatar
                  photoPath={p.profile_photo_path}
                  firstName={p.first_name}
                  lastName={p.last_name}
                  size="sm"
                  ringClassName={checked ? "ring-2 ring-emerald-200/90" : "ring-2 ring-zinc-200/80"}
                />
                <div className="min-w-0 flex-1">
                  <PlayerNameStack firstName={p.first_name} lastName={p.last_name} nick={p.zawodnik} />
                  <p className="mt-0.5 text-xs text-zinc-500">ID: {p.user_id}</p>
                </div>
                <Badge
                  variant="outline"
                  className={
                    checked
                      ? "border-emerald-300 bg-emerald-50 text-emerald-950 dark:border-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-100"
                      : "border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-600 dark:bg-zinc-800/50 dark:text-zinc-300"
                  }
                >
                  {checked ? "Obecny" : "Nieobecny"}
                </Badge>
              </label>
            );
          })}
        </div>
      )}
    </AppModal>

      <AppModal
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
        size="lg"
        scrollable
        title="Rozlicz mecz"
        description="Domyślnie wpisuje równą kwotę dla wszystkich (z pola „Kwota domyślna”, zwykle `fee_pln`)."
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setSettleOpen(false)}>
              Anuluj
            </Button>
            <Button
              type="button"
              variant="pitch"
              disabled={settleSubmitting || settleLoading}
              onClick={() => void submitSettlement()}
            >
              {settleSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
              Zapisz rozliczenie
            </Button>
          </>
        }
        contentClassName="space-y-3"
      >
        {settleMatch ? <ModalMatchSummary match={settleMatch} /> : null}

        {settleLoading ? (
          <ModalLoadingRow label="Wczytywanie zapisanych zawodników…" />
        ) : (
          <>
            <div className={cn(modalPanelClass, "space-y-3")}>
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
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                Możesz edytować kwotę dla pojedynczych osób poniżej przed zapisaniem.
              </p>
            </div>

            {settleRows.length === 0 ? (
              <p className={modalEmptyStateClass}>Brak zapisanych (potwierdzonych) zawodników do rozliczenia.</p>
            ) : (
              <div className={cn(modalListClass, "max-h-[50vh] space-y-2 p-1")}>
                {settleRows.map((p) => (
                  <div
                    key={p.user_id}
                    className="flex items-center gap-3 rounded-xl border border-emerald-900/10 bg-white px-3 py-2 dark:bg-zinc-900"
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

            <ModalAlert tone="warning" title="Uwaga">
              Rozliczenie odejmuje kwoty z portfeli. Jeśli mecz był już częściowo rozliczony, API pominie osoby już
              rozliczone dla tego meczu.
              {settleDefaultAmount.trim() ? (
                <p className="mt-1">
                  Domyślna kwota:{" "}
                  <strong className="tabular-nums">
                    {formatPln(Number(settleDefaultAmount.replace(",", ".")) || 0)}
                  </strong>
                </p>
              ) : null}
            </ModalAlert>
          </>
        )}
      </AppModal>

      <AppModal
        open={Boolean(statsMatch)}
        onOpenChange={(open) => {
          if (!open) {
            setStatsMatch(null);
            setStatsStandaloneSurveyKey(null);
          }
        }}
        size="lg"
        scrollable
        title="Statystyki z meczu"
        description={
          statsMatch
            ? statsStandaloneSurveyKey
              ? "Wpisz swoje liczby z tego spotkania (mecz spoza terminarza). Możesz zapisać lub później zmienić dane tutaj albo w profilu — bez limitu 7 dni od daty meczu."
              : "Wpisz swoje liczby z tego spotkania. Możesz to zrobić tylko raz — później zmiany wykona administrator."
            : undefined
        }
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setStatsMatch(null)}>
              Anuluj
            </Button>
            <Button type="button" variant="pitch" onClick={() => void saveMatchStats()}>
              Zapisz statystyki
            </Button>
          </>
        }
        contentClassName="space-y-3"
      >
        {statsMatch ? <ModalMatchSummary match={statsMatch} /> : null}
        <div className={cn(modalPanelClass, "grid gap-3 sm:grid-cols-2")}>
          <FormInput
            id="ts-goals"
            label="Gole"
            type="number"
            min={0}
            value={statsGoals}
            onChange={(e) => setStatsGoals(e.target.value)}
          />
          <FormInput
            id="ts-assists"
            label="Asysty"
            type="number"
            min={0}
            value={statsAssists}
            onChange={(e) => setStatsAssists(e.target.value)}
          />
          <FormInput
            id="ts-distance"
            label="Dystans (km)"
            type="number"
            min={0}
            step={0.1}
            value={statsDistance}
            onChange={(e) => setStatsDistance(e.target.value)}
          />
          <FormInput
            id="ts-saves"
            label="Obronione strzały"
            type="number"
            min={0}
            value={statsSaves}
            onChange={(e) => setStatsSaves(e.target.value)}
          />
        </div>
      </AppModal>

      <AddMatchDialog open={addOpen} onOpenChange={setAddOpen} onDone={() => router.refresh()} />

      <MatchManageDialog
        match={manageMatch}
        open={manageMatchOpen}
        onOpenChange={setManageMatchOpen}
        onDone={() => router.refresh()}
        initialTab={manageInitialTab}
      />

      <MatchAddGuestDialog
        match={addGuestMatch}
        open={addGuestOpen}
        onOpenChange={setAddGuestOpen}
        onDone={() => router.refresh()}
      />

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
                  "awp-cal-match-btn block w-full rounded-md px-1.5 py-1 text-left text-[11px] font-medium leading-tight",
                  m.played
                    ? "awp-cal-match-btn--played"
                    : free <= 0
                      ? "awp-cal-match-btn--full"
                      : "awp-cal-match-btn--open",
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

const addMatchSchema = z.object({
  location: formSchemas.matchLocation,
  date: formSchemas.matchDate,
  time: formSchemas.matchTime,
  maxSlots: formSchemas.maxSlots,
  gatePin: formSchemas.gatePin,
});

function AddMatchDialog({
  open,
  onOpenChange,
  onDone,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onDone: () => void;
}) {
  const form = useValidatedForm({
    initialValues: { location: "", date: "", time: "", maxSlots: 10, gatePin: "" },
    schema: addMatchSchema,
  });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.validate()) return;
    const { location, date, time, maxSlots, gatePin } = form.values;
    const res = await fetch("/api/terminarz/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: location.trim(),
        date,
        time,
        max_slots: maxSlots,
        gate_pin: gatePin.trim(),
      }),
    });
    if (!res.ok) {
      toast.error("Nie dodano meczu");
      return;
    }
    form.reset();
    onOpenChange(false);
    onDone();
    toast.success("Mecz dodany");
  }

  return (
    <AppModal
      open={open}
      onOpenChange={(v) => {
        if (!v) form.reset();
        onOpenChange(v);
      }}
      title="Dodaj mecz"
      footer={
        <>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Anuluj
          </Button>
          <Button type="submit" form="add-match-form" variant="pitch">
            Zapisz mecz
          </Button>
        </>
      }
    >
      <form id="add-match-form" onSubmit={onSubmit} className="space-y-3">
        <FormInput
          label="Lokalizacja"
          required
          value={form.values.location}
          onChange={(e) => form.setValue("location", e.target.value)}
          onBlur={() => form.setFieldTouched("location")}
          error={form.errors.location}
        />
        <FormInput
          label="Data"
          required
          type="date"
          value={form.values.date}
          onChange={(e) => form.setValue("date", e.target.value)}
          onBlur={() => form.setFieldTouched("date")}
          error={form.errors.date}
        />
        <FormInput
          label="Godzina"
          required
          type="time"
          value={form.values.time}
          onChange={(e) => form.setValue("time", e.target.value)}
          onBlur={() => form.setFieldTouched("time")}
          error={form.errors.time}
        />
        <FormInput
          label="Ilość miejsc"
          required
          type="number"
          min={1}
          value={String(form.values.maxSlots)}
          onChange={(e) => form.setValue("maxSlots", Number(e.target.value) || 0)}
          onBlur={() => form.setFieldTouched("maxSlots")}
          error={form.errors.maxSlots}
        />
        <FormInput
          label="PIN do bramy"
          required
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="4–6 cyfr"
          value={form.values.gatePin}
          onChange={(e) => form.setValue("gatePin", e.target.value.replace(/\D/g, "").slice(0, 6))}
          onBlur={() => form.setFieldTouched("gatePin")}
          error={form.errors.gatePin}
          hint="Kod na bramę boiska — gracze zobaczą go na stronie głównej przy najbliższym meczu."
        />
      </form>
    </AppModal>
  );
}
