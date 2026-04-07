"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
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
  LogIn,
  MapPin,
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
import { ALL_PLAYERS } from "@/lib/constants";
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
  userSigned: Record<number, boolean>;
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

function addDaysISO(isoDate: string, days: number): string {
  const d = new Date(isoDate + "T12:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function rowClass(signed: number, max: number) {
  if (max <= 0) return "bg-slate-50";
  const p = (signed / max) * 100;
  if (p < 50) return "bg-emerald-50/90 border-l-4 border-l-emerald-500";
  if (p < 80) return "bg-amber-50/90 border-l-4 border-l-amber-500";
  return "bg-red-50/80 border-l-4 border-l-red-500";
}

function PitchTableFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative overflow-hidden rounded-2xl p-[3px] shadow-[0_20px_50px_-18px_rgba(5,55,45,0.55)] ring-1 ring-emerald-950/20">
      <div className="terminarz-stadium-layers pointer-events-none absolute inset-0 rounded-2xl" aria-hidden />
      <div
        className="home-pitch-tile pointer-events-none absolute inset-0 rounded-2xl opacity-[0.22] mix-blend-soft-light"
        aria-hidden
      />
      <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-b from-white/[0.08] via-transparent to-emerald-950/[0.12]" aria-hidden />
      <div className="relative z-[1] overflow-hidden rounded-[0.9rem] border border-white/50 bg-white/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] backdrop-blur-md supports-[backdrop-filter]:bg-white/70">
        {children}
      </div>
    </div>
  );
}

const actionBarClass = "flex flex-col gap-2.5 rounded-xl border border-zinc-200/90 bg-zinc-50/50 p-3";

const actionBtnPrimary =
  "h-auto min-h-9 justify-start gap-2 whitespace-normal rounded-lg bg-emerald-700 py-2 text-left font-semibold shadow-sm hover:bg-emerald-800";

const actionBtnDanger =
  "h-auto min-h-9 justify-start gap-2 whitespace-normal rounded-lg border border-red-200 bg-white py-2 text-left font-semibold text-red-800 shadow-sm hover:bg-red-50";

const actionBtnSecondary =
  "h-auto min-h-9 justify-start gap-2 whitespace-normal rounded-lg border border-zinc-200 bg-white py-2 text-left font-medium text-zinc-800 shadow-sm hover:bg-zinc-100";

const actionBtnAdmin =
  "h-auto min-h-9 justify-start gap-2 whitespace-normal rounded-lg border border-amber-300/80 bg-amber-50 py-2 text-left font-semibold text-amber-950 shadow-sm hover:bg-amber-100";

function ActionNotice({
  tone,
  children,
}: {
  tone: "muted" | "warning" | "info";
  children: React.ReactNode;
}) {
  const toneClass =
    tone === "warning"
      ? "border-amber-200 bg-amber-50/95 text-amber-950"
      : tone === "info"
        ? "border-emerald-200 bg-emerald-50/80 text-emerald-950"
        : "border-zinc-200 bg-white text-zinc-600";
  return <p className={cn("rounded-lg border px-3 py-2.5 text-xs leading-snug", toneClass)}>{children}</p>;
}

export function TerminarzClient({
  upcoming,
  playedConfirmed,
  allMatches,
  playersData,
  userSigned,
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
  const [inviteGateOpen, setInviteGateOpen] = useState(false);
  const [inviteLoginInline, setInviteLoginInline] = useState(false);
  const inviteGateOpenedRef = useRef(false);
  const inviteTransportOpenedRef = useRef(false);
  const statsOpenedFromUrlRef = useRef(false);
  const standaloneStatsOpenedFromUrlRef = useRef(false);

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
      if (onlyMine && !userSigned[m.id]) return false;
      return true;
    });
    rows.sort((a, b) => {
      const da = `${a.match_date} ${a.match_time}`;
      const db = `${b.match_date} ${b.match_time}`;
      return sortDir === "asc" ? da.localeCompare(db) : db.localeCompare(da);
    });
    return rows;
  }, [upcoming, filter, sortDir, onlyMine, userSigned, search, period]);

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
    setTransportSignupMatchId(id);
    setTransportSignupOpen(true);
  }, []);

  useEffect(() => {
    if (!inviteFromShare || !isLoggedIn) return;
    if (inviteTransportOpenedRef.current) return;
    if (highlightMatchId == null) return;
    const m = allMatches.find((x) => x.id === highlightMatchId);
    if (!m || m.match_date < todayISO()) return;
    inviteTransportOpenedRef.current = true;
    const free = m.max_slots - m.signed_up;
    if (userSigned[highlightMatchId]) {
      toast.info("Jesteś już zapisany na ten mecz.");
      return;
    }
    if (free <= 0) {
      toast.warning("Brak wolnych miejsc na ten mecz.");
      return;
    }
    openTransportSignup(highlightMatchId);
  }, [inviteFromShare, isLoggedIn, highlightMatchId, allMatches, userSigned, openTransportSignup]);

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
      if (userSigned[m.id]) mine++;
    }
    return { total, free, full, mine };
  }, [filteredActive, userSigned]);

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
    const freeSubtitle =
      free === 1
        ? "Jeszcze jedno wolne miejsce w składzie"
        : free >= 2 && free <= 4
          ? `Zostały ${free} wolne miejsca w składzie`
          : `Zostało ${free} wolnych miejsc w składzie`;

    return (
      <div className={actionBarClass}>
        {isLoggedIn ? (
          userSigned[m.id] ? (
            past ? (
              <ActionNotice tone="muted">
                <strong className="font-semibold text-zinc-800">Jesteś na liście zapisanych.</strong> Po upływie
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
                  <span className="mt-1 block text-[11px] font-normal leading-snug text-red-700/90">
                    Zwolnisz miejsce w składzie na ten termin
                  </span>
                </span>
              </Button>
            )
          ) : past ? (
            <ActionNotice tone="warning">
              Termin tego meczu już minął — w aplikacji nie można się już zapisać na ten dzień.
            </ActionNotice>
          ) : free > 0 ? (
            <Button
              size="sm"
              variant="default"
              className={actionBtnPrimary}
              title={`Zapisuje Cię na listę (${m.signed_up}/${m.max_slots} zajętych)`}
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
              <strong className="font-semibold text-amber-950">Komplet miejsc.</strong> Skład na ten termin jest pełny —
              nie można dołączyć przez aplikację.
            </ActionNotice>
          )
        ) : past ? (
          <ActionNotice tone="info">
            Na ten dzień zapisu już nie będzie.{" "}
            <Link href="/login" className="font-semibold text-emerald-800 underline underline-offset-2 hover:text-emerald-950">
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
                <span className="block leading-tight text-zinc-900">Zaloguj się i zapisz na mecz</span>
                <span className="mt-1 block text-[11px] font-normal leading-snug text-zinc-500">
                  Bez konta widzisz terminy, ale nie możesz dołączyć do składu
                </span>
              </span>
            </Link>
          </Button>
        )}

        <div className="flex flex-col gap-2 border-t border-zinc-200/80 pt-2.5 sm:flex-row sm:flex-wrap">
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
                <span className="block leading-tight text-zinc-900">Kopiuj link z zaproszeniem do meczu</span>
                <span className="mt-1 block text-[11px] font-normal leading-snug text-zinc-500">
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
              <span className="block leading-tight text-zinc-900">Kto jest zapisany?</span>
              <span className="mt-1 block text-[11px] font-normal leading-snug text-zinc-500">
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
                <span className="mt-1 block text-[11px] font-normal leading-snug text-amber-900/85">
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
            <span className="block leading-tight text-zinc-900">Kto był zapisany?</span>
            <span className="mt-1 block text-[11px] font-normal leading-snug text-zinc-500">
              Lista z dnia meczu (archiwum)
            </span>
          </span>
        </Button>
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
              <span className="mt-1 block text-[11px] font-normal leading-snug text-amber-900/85">
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
      <div className="rounded-2xl border border-zinc-200/80 bg-white/95 px-4 py-8 shadow-sm sm:px-8">
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
              className="whitespace-nowrap text-3xl font-bold tracking-tight text-emerald-950 sm:text-4xl"
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
          <p className="mt-3 max-w-xl text-sm text-zinc-600 sm:text-base">
            Zapisy na mecze, lista terminów i kalendarz — wszystko w jednym miejscu.
          </p>
        </div>

        <div className="mx-auto mt-8 max-w-4xl">
          <div className="flex flex-col gap-4 rounded-2xl border border-emerald-200/50 bg-gradient-to-b from-emerald-50/40 to-white p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-800/70">Widok</span>
              <div className="inline-flex rounded-xl bg-white/90 p-1 shadow-sm ring-1 ring-emerald-900/10">
                <button
                  type="button"
                  onClick={() => setView("list")}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all",
                    view === "list"
                      ? "bg-emerald-800 text-white shadow-md"
                      : "text-emerald-900 hover:bg-emerald-50"
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
                      ? "bg-emerald-800 text-white shadow-md"
                      : "text-emerald-900 hover:bg-emerald-50"
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
                className="w-full border-0 bg-emerald-800 font-semibold hover:bg-emerald-900 sm:w-auto"
                onClick={() => setAddOpen(true)}
              >
                Dodaj mecz
              </Button>
            )}
          </div>
        </div>

        {view === "list" && (
          <div className="mx-auto mt-5 max-w-4xl space-y-4">
            {highlightMatch && (
              <div
                role="status"
                className="rounded-xl border-2 border-emerald-500 bg-emerald-50/95 px-4 py-3 text-sm leading-relaxed text-emerald-950 shadow-sm"
              >
                {inviteFromShare ? (
                  <>
                    <span className="font-semibold">Link z zaproszeniem: </span>
                    poniżej <span className="font-medium">zieloną ramką</span> wyróżniony jest ten mecz — po zalogowaniu
                    otworzy się zapis i wybór transportu.
                  </>
                ) : (
                  <>
                    <span className="font-semibold">Z powiadomienia e-mail: </span>
                    poniżej <span className="font-medium">zieloną ramką</span> wyróżniony jest mecz, którego dotyczyła
                    wiadomość — możesz od razu przejść do zapisu.
                  </>
                )}
              </div>
            )}
            {highlightMatchId && !highlightMatch && (
              <div
                role="status"
                className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
              >
                Nie znaleziono meczu o tym numerze — mógł zostać usunięty z terminarza.
              </div>
            )}
            <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-12 lg:items-end">
                <div className="lg:col-span-4">
                  <Label htmlFor="terminarz-search" className="text-xs text-zinc-600">
                    Szukaj miejsca
                  </Label>
                  <div className="relative mt-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                    <Input
                      id="terminarz-search"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="np. boisko, adres…"
                      className="border-zinc-200 pl-9"
                    />
                  </div>
                </div>
                <div className="lg:col-span-3">
                  <Label className="text-xs text-zinc-600">Zakres dat (lista aktywna)</Label>
                  <select
                    className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-emerald-950 shadow-sm"
                    value={period}
                    onChange={(e) => setPeriod(e.target.value as "all" | "7d" | "month")}
                  >
                    <option value="all">Cały terminarz</option>
                    <option value="7d">Najbliższe 7 dni</option>
                    <option value="month">Bieżący miesiąc</option>
                  </select>
                </div>
                <div className="lg:col-span-3">
                  <Label className="text-xs text-zinc-600">Miejsca</Label>
                  <select
                    className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-emerald-950 shadow-sm"
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
                    className="min-w-[10rem] flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-emerald-950 shadow-sm"
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
                      onlyMine && "border-0 bg-emerald-800 hover:bg-emerald-900",
                      "h-10 shrink-0 px-3"
                    )}
                    onClick={() => setOnlyMine((v) => !v)}
                  >
                    Tylko moje
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 rounded-xl border border-emerald-100 bg-emerald-50/50 px-4 py-3 text-sm">
              {listTab === "active" ? (
                <>
                  <span className="text-emerald-900">
                    W widoku: <strong>{statsActive.total}</strong> meczów
                  </span>
                  <span className="hidden text-emerald-800/40 sm:inline">·</span>
                  <span className="text-emerald-800">
                    Wolne terminy: <strong>{statsActive.free}</strong>
                  </span>
                  <span className="hidden text-emerald-800/40 sm:inline">·</span>
                  <span className="text-emerald-800">
                    Pełne: <strong>{statsActive.full}</strong>
                  </span>
                  {isLoggedIn && (
                    <>
                      <span className="hidden text-emerald-800/40 sm:inline">·</span>
                      <span className="text-emerald-800">
                        Twoje zapisy tutaj: <strong>{statsActive.mine}</strong>
                      </span>
                    </>
                  )}
                </>
              ) : (
                <span className="text-emerald-900">
                  Rozegrane w widoku: <strong>{filteredArchive.length}</strong>
                </span>
              )}
            </div>

            <Tabs value={listTab} onValueChange={(v) => setListTab(v as "active" | "archive")}>
              <TabsList className="grid h-auto w-full grid-cols-2 gap-1 rounded-xl bg-emerald-100/60 p-1 sm:inline-flex sm:w-auto">
                <TabsTrigger value="active" className="rounded-lg px-4 py-2.5 data-[state=active]:bg-white">
                  Mecze do rozegrania
                </TabsTrigger>
                <TabsTrigger value="archive" className="rounded-lg px-4 py-2.5 data-[state=active]:bg-white">
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
                          "rounded-2xl border border-zinc-200 p-4 shadow-sm",
                          rowClass(m.signed_up, m.max_slots),
                          highlightMatchId === m.id &&
                            "relative z-[1] border-emerald-600 ring-2 ring-emerald-600 ring-offset-2"
                        )}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <p className="text-lg font-bold text-emerald-950">{m.match_date}</p>
                            <p className="text-sm font-medium text-zinc-700">{m.match_time}</p>
                          </div>
                          {past && (
                            <Badge variant="outline" className="border-amber-400 bg-amber-50 text-amber-900">
                              Termin minął
                            </Badge>
                          )}
                        </div>
                        <div className="mt-3 flex items-start gap-2 text-sm text-zinc-700">
                          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
                          <span>{m.location}</span>
                        </div>
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(m.location)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-1 inline-block text-xs font-medium text-emerald-700 underline"
                        >
                          Otwórz w Mapach
                        </a>
                        <div className="mt-3">
                          <p className="text-sm font-semibold text-emerald-950">
                            Zapisy: {m.signed_up}/{m.max_slots}
                          </p>
                          <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-emerald-200/80">
                            <div className="h-full bg-emerald-600 transition-all" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                        <div className="mt-4 border-t border-zinc-200/80 pt-4">{activeActions(m)}</div>
                      </div>
                    );
                  })}
                  {filteredActive.length === 0 && (
                    <p className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50/80 py-10 text-center text-sm text-zinc-600">
                      Brak meczów spełniających kryteria. Zmień filtry lub zakres dat.
                    </p>
                  )}
                </div>

                <div className="hidden md:block">
                  <PitchTableFrame>
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[720px] text-sm">
                        <thead className="bg-emerald-950 text-white">
                          <tr>
                            <th className="px-4 py-3 text-left font-semibold">Data</th>
                            <th className="px-4 py-3 text-left font-semibold">Godzina</th>
                            <th className="px-4 py-3 text-left font-semibold">Miejsce</th>
                            <th className="px-4 py-3 text-left font-semibold">Zapisy</th>
                            <th className="px-4 py-3 text-left font-semibold">Opcje</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredActive.map((m) => {
                            const pct = m.max_slots > 0 ? (m.signed_up / m.max_slots) * 100 : 0;
                            const past = m.match_date < todayISO();
                            return (
                              <tr
                                key={m.id}
                                data-mecz-highlight={highlightMatchId === m.id ? m.id : undefined}
                                className={cn(
                                  "border-b border-zinc-100",
                                  rowClass(m.signed_up, m.max_slots),
                                  highlightMatchId === m.id && "shadow-[inset_0_0_0_3px_#059669]"
                                )}
                              >
                                <td className="px-4 py-3 align-top">
                                  <div className="font-semibold text-emerald-950">{m.match_date}</div>
                                  {past && (
                                    <Badge variant="outline" className="mt-1 border-amber-400 bg-amber-50 text-[10px] text-amber-900">
                                      Termin minął
                                    </Badge>
                                  )}
                                </td>
                                <td className="px-4 py-3 align-top text-zinc-800">{m.match_time}</td>
                                <td className="px-4 py-3 align-top">
                                  <Badge variant="secondary" className="font-normal">
                                    {m.location}
                                  </Badge>
                                  <a
                                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(m.location)}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="ml-2 text-xs font-medium text-emerald-700 underline"
                                  >
                                    Mapy
                                  </a>
                                </td>
                                <td className="px-4 py-3 align-top">
                                  <div className="font-bold text-emerald-950">
                                    {m.signed_up}/{m.max_slots}
                                  </div>
                                  <div className="mt-1 h-2 w-full max-w-[180px] overflow-hidden rounded-full bg-emerald-200">
                                    <div className="h-full bg-emerald-600 transition-all" style={{ width: `${pct}%` }} />
                                  </div>
                                </td>
                                <td className="px-4 py-3 align-top">{activeActions(m)}</td>
                              </tr>
                            );
                          })}
                          {filteredActive.length === 0 && (
                            <tr>
                              <td colSpan={5} className="px-4 py-12 text-center text-zinc-600">
                                Brak meczów spełniających kryteria.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
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
                        "rounded-2xl border border-zinc-200 bg-zinc-50/80 p-4 shadow-sm",
                        highlightMatchId === m.id &&
                          "relative z-[1] border-emerald-600 ring-2 ring-emerald-600 ring-offset-2"
                      )}
                    >
                      <p className="text-lg font-bold text-emerald-950">{m.match_date}</p>
                      <p className="text-sm text-zinc-700">{m.match_time}</p>
                      <p className="mt-2 text-sm text-zinc-700">{m.location}</p>
                      <p className="mt-2 text-sm font-medium text-zinc-800">
                        Było zapisanych: {m.signed_up}/{m.max_slots}
                      </p>
                      <div className="mt-4">{archiveActions(m)}</div>
                    </div>
                  ))}
                  {filteredArchive.length === 0 && (
                    <p className="rounded-xl border border-dashed border-zinc-200 py-10 text-center text-sm text-zinc-600">
                      Brak rozegranych meczów do wyświetlenia.
                    </p>
                  )}
                </div>

                <div className="hidden md:block">
                  <PitchTableFrame>
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[640px] text-sm">
                        <thead className="bg-zinc-800 text-white">
                          <tr>
                            <th className="px-4 py-3 text-left font-semibold">Data</th>
                            <th className="px-4 py-3 text-left font-semibold">Godzina</th>
                            <th className="px-4 py-3 text-left font-semibold">Miejsce</th>
                            <th className="px-4 py-3 text-left font-semibold">Zapisy</th>
                            <th className="px-4 py-3 text-left font-semibold">Opcje</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredArchive.map((m) => (
                            <tr
                              key={m.id}
                              data-mecz-highlight={highlightMatchId === m.id ? m.id : undefined}
                              className={cn(
                                "border-b border-zinc-100 bg-zinc-50/50",
                                highlightMatchId === m.id && "shadow-[inset_0_0_0_3px_#059669]"
                              )}
                            >
                              <td className="px-4 py-3 font-semibold text-emerald-950">{m.match_date}</td>
                              <td className="px-4 py-3 text-zinc-800">{m.match_time}</td>
                              <td className="px-4 py-3 text-zinc-800">{m.location}</td>
                              <td className="px-4 py-3 text-zinc-800">
                                {m.signed_up}/{m.max_slots}
                              </td>
                              <td className="px-4 py-3">{archiveActions(m)}</td>
                            </tr>
                          ))}
                          {filteredArchive.length === 0 && (
                            <tr>
                              <td colSpan={5} className="px-4 py-12 text-center text-zinc-600">
                                Brak rozegranych meczów.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
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
              <div className="space-y-2 text-sm">
                <p className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
                  <span>{calPopup.location}</span>
                </p>
                <p>
                  Zapisy:{" "}
                  <strong>
                    {calPopup.signed_up}/{calPopup.max_slots}
                  </strong>
                </p>
                <p>Status: {calPopup.played ? "Rozegrany" : "Nierozegrany"}</p>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(calPopup.location)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-block font-medium text-emerald-700 underline"
                >
                  Google Maps
                </a>
              </div>
              <DialogFooter className="flex-col gap-2 border-t border-zinc-100 pt-4 sm:flex-row sm:flex-wrap sm:justify-end">
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
                    <span className="mt-0.5 block text-[11px] font-normal text-zinc-500">Ta sama lista co w terminarzu</span>
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
              <p className="text-sm font-medium text-emerald-900">{selectedData.location}</p>
              <p className="text-sm text-emerald-800">
                Zapisani: {selectedData.players.length}/{selectedData.max}
              </p>
              <ul className="mt-3 max-h-64 space-y-0 overflow-y-auto rounded-xl border border-emerald-900/10 bg-emerald-50/30">
                {selectedData.players.map((p, i) => (
                  <li
                    key={`${p.userId}-${i}`}
                    className={`flex flex-wrap items-center gap-2 border-b border-emerald-100/90 px-3 py-2.5 text-sm last:border-b-0 ${
                      i % 2 === 0 ? "bg-white/60" : "bg-emerald-50/40"
                    }`}
                  >
                    <PlayerAvatar
                      photoPath={p.profilePhotoPath}
                      firstName={p.firstName}
                      lastName={p.lastName}
                      size="sm"
                      ringClassName="ring-2 ring-emerald-200/90"
                    />
                    <div className="min-w-0 flex-1">
                      <PlayerNameStack
                        firstName={p.firstName}
                        lastName={p.lastName}
                        nick={p.zawodnik}
                      />
                    </div>
                    {p.paid ? (
                      <Badge className="border-emerald-200 bg-emerald-100 text-emerald-900">Opłacone</Badge>
                    ) : (
                      <Badge variant="secondary">Do zapłaty</Badge>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}
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
          intent="signup"
          onCompleted={() => {
            toast.success("Zapisano");
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
            <div className="space-y-3 rounded-xl border border-emerald-200/90 bg-emerald-50/70 px-4 py-3 text-sm text-emerald-950">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800/80">Mecz</p>
              <div className="grid gap-2">
                <div>
                  <span className="text-zinc-500">Kiedy: </span>
                  <span className="font-medium">
                    {highlightMatch.match_date} · {highlightMatch.match_time}
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" aria-hidden />
                  <div>
                    <span className="text-zinc-500">Gdzie: </span>
                    <span className="font-medium">{highlightMatch.location}</span>
                  </div>
                </div>
                <div>
                  <span className="text-zinc-500">Zapisy: </span>
                  <span className="font-medium">
                    {highlightMatch.signed_up}/{highlightMatch.max_slots}{" "}
                    {highlightMatch.max_slots - highlightMatch.signed_up > 0
                      ? `(wolne: ${highlightMatch.max_slots - highlightMatch.signed_up})`
                      : "(brak wolnych miejsc)"}
                  </span>
                </div>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(highlightMatch.location)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex w-fit items-center gap-1.5 font-medium text-emerald-800 underline underline-offset-2 hover:text-emerald-950"
                >
                  Otwórz miejsce w Mapach Google
                </a>
              </div>
            </div>
          )}
          {!inviteLoginInline ? (
            <>
              <DialogHeader>
                <DialogTitle className="text-emerald-950">Zapis na mecz</DialogTitle>
                <DialogDescription className="text-left text-zinc-600">
                  Żeby zapisać się na ten termin, zaloguj się na istniejące konto lub utwórz nowe. Po zalogowaniu otworzy
                  się wybór transportu.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="flex-col gap-2 sm:justify-stretch">
                <Button
                  type="button"
                  className="w-full bg-emerald-700 hover:bg-emerald-800"
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
                <DialogTitle className="text-emerald-950">Logowanie</DialogTitle>
                <DialogDescription className="text-left text-zinc-600">
                  Wpisz imię, nazwisko i PIN (4–6 cyfr) — tak jak na stronie logowania.
                </DialogDescription>
              </DialogHeader>
              <button
                type="button"
                className="mb-2 text-left text-sm font-medium text-emerald-800 underline-offset-2 hover:underline"
                onClick={() => setInviteLoginInline(false)}
              >
                ← Wróć
              </button>
              <LoginForm
                aliases={ALL_PLAYERS}
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
    </>
  );
}

function CalendarView({
  year,
  month,
  matches,
  onPrev,
  onNext,
  onToday,
  onPick,
}: {
  year: number;
  month: number;
  matches: MatchRow[];
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
      <div key={`e-${i}`} className="min-h-[72px] rounded-lg border border-dashed border-zinc-200 bg-zinc-50/60" />
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
          "min-h-[104px] rounded-xl border border-zinc-200 bg-white p-2 shadow-sm",
          isToday && "ring-2 ring-emerald-600 ring-offset-2"
        )}
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
                className={cn(
                  "block w-full rounded-md px-1.5 py-1 text-left text-[11px] font-medium leading-tight transition-colors",
                  m.played
                    ? "bg-zinc-200 text-zinc-800"
                    : free <= 0
                      ? "bg-red-100 text-red-900"
                      : "bg-emerald-100 text-emerald-900",
                  past && !m.played && "opacity-80"
                )}
              >
                <span className="block truncate">{m.match_time}</span>
                <span className="block truncate opacity-90">{m.location}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto mt-6 max-w-4xl">
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="mb-5 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Button type="button" size="sm" variant="outline" className="gap-1 border-zinc-200" onClick={onPrev}>
            <ChevronLeft className="h-4 w-4" />
            Poprzedni
          </Button>
          <div className="flex flex-col items-center gap-2 sm:flex-row">
            <span className="text-center text-base font-bold text-emerald-950">
              {names[month]} {year}
            </span>
            <Button type="button" size="sm" variant="secondary" className="text-emerald-900" onClick={onToday}>
              Przejdź do dziś
            </Button>
          </div>
          <Button type="button" size="sm" variant="outline" className="gap-1 border-zinc-200" onClick={onNext}>
            Następny
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <p className="mb-3 text-center text-xs text-zinc-500 sm:text-left">
          Kliknij wpis, by zobaczyć szczegóły. Szare — rozegrane; zielone — wolne miejsca; czerwone — pełny skład.
        </p>
        <div className="mb-2 grid grid-cols-7 gap-1.5 text-center text-[0.65rem] font-bold uppercase tracking-wide text-emerald-800/80 sm:gap-2 sm:text-xs">
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
          <DialogTitle className="text-emerald-950">Dodaj mecz</DialogTitle>
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
