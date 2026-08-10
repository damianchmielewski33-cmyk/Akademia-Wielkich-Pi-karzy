"use client";

import { useEffect, useState, type ComponentType } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "@/lib/app-toast";
import { useHotpayPaymentReturn } from "@/hooks/use-hotpay-payment-return";
import {
  Activity,
  CalendarDays,
  ChevronRight,
  LogIn,
  LogOut,
  Medal,
  Radio,
  Shield,
  Trophy,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import { HomeNextMatchCard } from "@/components/home-next-match-card";
import { HomeTopRankings } from "@/components/home-top-rankings";
import { PlayerAvatar } from "@/components/player-avatar";
import { MatchTransportSignupDialog } from "@/components/match-transport-signup-dialog";
import { LogoutConfirmModal } from "@/components/logout-confirm-modal";
import { Button } from "@/components/ui/button";
import { AppModal } from "@/components/ui/app-modal";
import { FormInput } from "@/components/ui/form-field";
import { ModalMatchSummary, modalPanelClass } from "@/components/ui/modal-shared";
import { AdminCard, AdminToolbar, adminInnerPanelClass } from "@/components/admin-ui";
import { PitchCardDecorations } from "@/components/ui/pitch-card";
import type { MatchRow } from "@/lib/db";
import type { HomeTopPlayer } from "@/lib/rankings-data";
import { cn } from "@/lib/utils";
import { useScreenBlocks } from "@/components/screen-blocks-provider";
import { GymBratCrossLink } from "@/components/gymbrat-cross-link";
import { useHotpayPayment } from "@/hooks/use-hotpay-payment";

type Props = {
  nextMatch: MatchRow | null;
  /** Np. „3 osoby się zastanawiają” — pusty gdy brak zapisów «jeszcze nie wiem». */
  nextMatchTentativeLine: string;
  lineupPublicNextMatch: boolean;
  nextMatchSignup: "none" | "tentative" | "confirmed" | "declined";
  /** Kafelek transportu zawsze widoczny po zapisie; link działa w lokalny dzień meczu. */
  transportHomeActive: boolean;
  hotpayEnabled?: boolean;
  isLoggedIn: boolean;
  isAdmin: boolean;
  firstName: string;
  lastName: string;
  zawodnik: string;
  profilePhotoPath: string | null;
  /** ID filmu / transmisji YouTube (osadzenie). Brak = brak sekcji na stronie. */
  youtubeLiveVideoId: string | null;
  /** Kafelek wejścia do sekcji PZU Cup (tylko na stronie startowej). */
  showPzuCupTile?: boolean;
  pageVariant?: "home" | "pzu-cup";
  topRankedPlayers?: HomeTopPlayer[];
};

export function HomeClient({
  nextMatch,
  nextMatchTentativeLine,
  lineupPublicNextMatch,
  nextMatchSignup,
  transportHomeActive,
  hotpayEnabled,
  isLoggedIn,
  isAdmin,
  firstName,
  lastName,
  zawodnik,
  profilePhotoPath,
  youtubeLiveVideoId,
  showPzuCupTile = false,
  pageVariant = "home",
  topRankedPlayers = [],
}: Props) {
  const router = useRouter();
  const { isHiddenHref } = useScreenBlocks();
  const [transportSignupOpen, setTransportSignupOpen] = useState(false);
  const [transportIntent, setTransportIntent] = useState<"signup" | "confirm">("signup");
  const [tentativeBusy, setTentativeBusy] = useState(false);
  const [signupOpen, setSignupOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const [walletBalancePln, setWalletBalancePln] = useState<number | null>(null);
  const { pay: payDebt, busy: debtBusy } = useHotpayPayment();
  const [pendingMatch, setPendingMatch] = useState<{
    match_id: number;
    date: string;
    time: string;
    location: string;
  } | null>(null);
  const [goals, setGoals] = useState("");
  const [assists, setAssists] = useState("");
  const [distance, setDistance] = useState("");
  const [saves, setSaves] = useState("");

  useEffect(() => {
    fetch("/api/stats/pending")
      .then((r) => r.json())
      .then((data) => {
        if (data.pending) {
          setPendingMatch({
            match_id: data.match_id,
            date: data.date,
            time: data.time,
            location: data.location,
          });
          setStatsOpen(true);
        }
      })
      .catch(() => {});
  }, []);

  function refreshWalletBalance() {
    if (!isLoggedIn || !hotpayEnabled) return;
    fetch("/api/wallet/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { balance_pln?: unknown } | null) => {
        if (d && typeof d.balance_pln === "number") {
          setWalletBalancePln(d.balance_pln);
        }
      })
      .catch(() => {});
  }

  useEffect(() => {
    refreshWalletBalance();
    if (!isLoggedIn || !hotpayEnabled) return;
    const onVisible = () => {
      if (document.visibilityState === "visible") refreshWalletBalance();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") refreshWalletBalance();
    }, 30_000);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
      window.clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, hotpayEnabled]);

  useHotpayPaymentReturn({
    enabled: isLoggedIn && hotpayEnabled,
    onSettled: () => {
      refreshWalletBalance();
      router.refresh();
    },
  });

  function openTransportSignup() {
    if (!nextMatch) return;
    setTransportIntent("signup");
    setTransportSignupOpen(true);
  }

  function openConfirmFromTentative() {
    if (!nextMatch) return;
    setTransportIntent("confirm");
    setTransportSignupOpen(true);
  }

  async function signupTentativeHome() {
    if (!nextMatch) return;
    setTentativeBusy(true);
    try {
      const res = await fetch(`/api/terminarz/signup/${nextMatch.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commitment: "tentative" }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      if (!res.ok) {
        toast.error(typeof data.error === "string" ? data.error : "Nie udało się zapisać");
        return;
      }
      toast.success("Zapisano: jeszcze nie wiem");
      router.refresh();
    } finally {
      setTentativeBusy(false);
    }
  }

  async function signupDeclinedHome() {
    if (!nextMatch) return;
    setTentativeBusy(true);
    try {
      const res = await fetch(`/api/terminarz/signup/${nextMatch.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commitment: "declined" }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      if (!res.ok) {
        toast.error(typeof data.error === "string" ? data.error : "Nie udało się zapisać");
        return;
      }
      toast.success("Zapisano: nie biorę udziału");
      router.refresh();
    } finally {
      setTentativeBusy(false);
    }
  }

  async function saveStats() {
    if (!pendingMatch) return;
    const fd = new FormData();
    fd.set("match_id", String(pendingMatch.match_id));
    const nz = (s: string) => (s.trim() === "" ? "0" : s);
    fd.set("goals", nz(goals));
    fd.set("assists", nz(assists));
    fd.set("distance", nz(distance));
    fd.set("saves", nz(saves));
    const res = await fetch("/api/stats/save", { method: "POST", body: fd });
    const text = await res.text();
    if (text === "OK") {
      setStatsOpen(false);
      setPendingMatch(null);
      toast.success("Statystyki zapisane");
      router.refresh();
    } else {
      let msg = "Błąd zapisu statystyk";
      try {
        const j = JSON.parse(text) as { error?: string };
        if (typeof j.error === "string") msg = j.error;
      } catch {
        /* ignore */
      }
      toast.error(msg);
    }
  }

  const tiles = (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {!isHiddenHref("/terminarz") ? (
        <PitchTile href="/terminarz" icon={CalendarDays} title="Terminarz" desc="Mecze, zapisy, terminy" />
      ) : null}
      {!isHiddenHref("/pilkarze") ? (
        <PitchTile href="/pilkarze" icon={Users} title="Piłkarze" desc="Skład i profile" />
      ) : null}
      {isLoggedIn && (
        <>
          {!isHiddenHref("/platnosci") ? (
            <PitchTile
              href="/platnosci"
              icon={Wallet}
              title="Płatności"
              desc="Zapłać kartą lub Blikiem, opłać mecz koszykiem"
            />
          ) : null}
          {!isHiddenHref("/statystyki") ? (
            <PitchTile href="/statystyki" icon={Activity} title="Statystyki" desc="Twoje liczby z boiska" />
          ) : null}
          {!isHiddenHref("/rankingi") ? (
            <PitchTile href="/rankingi" icon={Trophy} title="Rankingi" desc="Gole, asysty, punkty" variant="gold" />
          ) : null}
          {showPzuCupTile ? (
            <PitchTile
              href="/pzu-cup"
              icon={Medal}
              title="PZU Cup"
              desc="Organizacja turnieju PZU Cup 2026"
              variant="gold"
            />
          ) : null}
          <GymBratCrossLink />
        </>
      )}
      {!isLoggedIn && (
        <>
          <PitchTile href="/login" icon={LogIn} title="Logowanie" desc="Wejdź do szatni" />
          <PitchTile href="/register" icon={UserPlus} title="Rejestracja" desc="Dołącz do drużyny" />
          <GymBratCrossLink />
        </>
      )}
      {isLoggedIn && (
        <>
          <LogoutPitchTile onClick={() => setLogoutOpen(true)} />
          {isAdmin && (
            <PitchTile href="/panel-admina" icon={Shield} title="Panel admina" desc="Zarządzanie akademią" />
          )}
        </>
      )}
    </div>
  );

  const toolbarTitle =
    pageVariant === "pzu-cup"
      ? "Organizacja turnieju"
      : isLoggedIn
        ? "Co dziś na boisku?"
        : "Akademia Wielkich Piłkarzy";

  const toolbarKicker =
    pageVariant === "pzu-cup"
      ? "PZU Cup 2026"
      : isAdmin
        ? "Panel admina"
        : "Akademia Wielkich Piłkarzy";

  const toolbarSubtitle =
    pageVariant === "pzu-cup"
      ? "Panel roboczy turnieju — ta strona startuje jako kopia ekranu głównego; będzie dostosowana do potrzeb PZU Cup."
      : isLoggedIn
        ? "Wybierz sekcję poniżej — terminarz, składy, statystyki i portfel."
        : "Terminarz meczów, zapisy na boisko, statystyki i rankingi — dołącz do drużyny lub zaloguj się.";

  return (
    <div className="relative flex flex-1 flex-col text-white">
      <div className="relative z-10 mx-auto w-full min-w-0 max-w-6xl p-3 xs:p-4 sm:p-6 lg:p-8">
        <AdminToolbar
          title={toolbarTitle}
          kicker={toolbarKicker}
          description={toolbarSubtitle}
          onReload={() => router.refresh()}
          loading={false}
        />

        {isLoggedIn ? (
          <div className={cn(adminInnerPanelClass, "mb-6 flex flex-wrap items-center gap-4")}>
            <PlayerAvatar
              photoPath={profilePhotoPath}
              firstName={firstName}
              lastName={lastName}
              size="lg"
              className="shadow-md ring-2 ring-white/40"
            />
            <div className="min-w-0 text-left">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-100/70">Witaj</p>
              <p className="text-lg font-bold text-white">
                {`${firstName} ${lastName}`.trim() || zawodnik}
              </p>
              {zawodnik && `${firstName} ${lastName}`.trim() ? (
                <p className="text-sm pitch-muted">{zawodnik}</p>
              ) : null}
            </div>
          </div>
        ) : null}

        {nextMatch ? (
          <HomeNextMatchCard
            match={nextMatch}
            tentativeLine={nextMatchTentativeLine}
            lineupPublic={lineupPublicNextMatch}
            signup={nextMatchSignup}
            transportActive={transportHomeActive}
            hotpayEnabled={hotpayEnabled}
            isLoggedIn={isLoggedIn}
            tentativeBusy={tentativeBusy}
            walletBalancePln={walletBalancePln}
            debtBusy={debtBusy}
            onPayDebt={(amount) => void payDebt(amount)}
            onSignup={openTransportSignup}
            onTentative={() => void signupTentativeHome()}
            onDeclined={() => void signupDeclinedHome()}
            onConfirmFromTentative={openConfirmFromTentative}
          />
        ) : null}

        <div className="mt-6">{tiles}</div>

        {pageVariant === "home" ? (
          <HomeTopRankings players={topRankedPlayers} isLoggedIn={isLoggedIn} />
        ) : null}

        {youtubeLiveVideoId ? (
          <AdminCard
            className="mt-6"
            title="Mecz na żywo"
            description="Transmisja z YouTube — oglądaj prosto z Akademii Wielkich Piłkarzy"
            headerExtra={
              <div className="flex items-center gap-2">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-red-600 text-white shadow-sm ring-2 ring-red-500/30">
                  <Radio className="h-4 w-4" strokeWidth={2.5} aria-hidden />
                </span>
                <Button asChild variant="gold" size="sm">
                  <Link
                    href={`https://www.youtube.com/watch?v=${encodeURIComponent(youtubeLiveVideoId)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    YouTube
                  </Link>
                </Button>
              </div>
            }
          >
            <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-white/20 bg-black">
              <iframe
                title="Transmisja meczu na żywo — YouTube"
                className="absolute inset-0 h-full w-full"
                src={`https://www.youtube.com/embed/${encodeURIComponent(youtubeLiveVideoId)}?rel=0`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                loading="lazy"
                referrerPolicy="strict-origin-when-cross-origin"
              />
            </div>
          </AdminCard>
        ) : null}
      </div>

      {nextMatch && (
        <MatchTransportSignupDialog
          open={transportSignupOpen}
          onOpenChange={setTransportSignupOpen}
          matchId={nextMatch.id}
          intent={transportIntent === "confirm" ? "confirm" : "signup"}
          hotpayEnabled={hotpayEnabled}
          onCompleted={() => {
            setSignupOpen(true);
            router.refresh();
          }}
        />
      )}

      <AppModal
        open={signupOpen}
        onOpenChange={setSignupOpen}
        size="md"
        title="Zostałeś zapisany na mecz"
        description="Termin jest w terminarzu — możesz wrócić do szczegółów w każdej chwili."
        footer={
          <Button type="button" variant="gold" onClick={() => setSignupOpen(false)}>
            Zamknij
          </Button>
        }
      >
        {nextMatch ? (
          <>
            <ModalMatchSummary match={nextMatch} />
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(nextMatch.location)}`}
              target="_blank"
              rel="noreferrer"
              className="inline-block text-sm font-medium text-emerald-700 underline underline-offset-2 hover:text-emerald-900 dark:text-emerald-400 dark:hover:text-emerald-300"
            >
              Otwórz miejsce w Mapach Google
            </a>
          </>
        ) : null}
      </AppModal>

      <LogoutConfirmModal open={logoutOpen} onOpenChange={setLogoutOpen} />

      <AppModal
        open={statsOpen}
        onOpenChange={setStatsOpen}
        size="lg"
        scrollable
        title="Uzupełnij statystyki"
        description={pendingMatch ? "Wpisz swoje liczby z ostatniego spotkania." : undefined}
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setStatsOpen(false)}>
              Anuluj
            </Button>
            <Button type="button" variant="gold" onClick={saveStats}>
              Zapisz statystyki
            </Button>
          </>
        }
      >
        {pendingMatch ? (
          <ModalMatchSummary
            match={{
              match_date: pendingMatch.date,
              match_time: pendingMatch.time,
              location: pendingMatch.location,
            }}
          />
        ) : null}
        <div className={cn(modalPanelClass, "grid gap-3 sm:grid-cols-2")}>
          <FormInput label="Gole" type="number" min={0} value={goals} onChange={(e) => setGoals(e.target.value)} />
          <FormInput label="Asysty" type="number" min={0} value={assists} onChange={(e) => setAssists(e.target.value)} />
          <FormInput
            label="Dystans (km)"
            type="number"
            min={0}
            step={0.1}
            value={distance}
            onChange={(e) => setDistance(e.target.value)}
          />
          <FormInput label="Obronione strzały" type="number" min={0} value={saves} onChange={(e) => setSaves(e.target.value)} />
        </div>
      </AppModal>
    </div>
  );
}

type PitchTileProps = {
  href: string;
  icon: ComponentType<{ className?: string; strokeWidth?: number }>;
  title: string;
  desc: string;
  variant?: "pitch" | "gold";
};

function PitchTile({ href, icon: Icon, title, desc, variant = "pitch" }: PitchTileProps) {
  const bgClass = variant === "gold" ? "home-pitch-tile-gold" : "home-pitch-tile";
  const tileFrame =
    variant === "gold"
      ? "shadow-md shadow-amber-950/20 ring-1 ring-amber-950/20 hover:shadow-amber-950/35"
      : "shadow-md shadow-emerald-950/20 ring-1 ring-emerald-950/10 hover:shadow-emerald-950/30";
  const descMuted = variant === "gold" ? "text-amber-50/95" : "text-emerald-100/80";
  return (
    <Link
      href={href}
      className={cn(
        "group awp-focus-ring relative block h-full min-h-[7rem] overflow-hidden rounded-2xl border-2 border-white/30 text-left transition-[transform,box-shadow] motion-safe:hover:-translate-y-0.5 hover:shadow-lg focus-visible:ring-offset-2 focus-visible:ring-offset-transparent",
        tileFrame
      )}
    >
      <div className={cn("absolute inset-0", bgClass)} aria-hidden />
      <PitchCardDecorations />
      <div className="relative flex h-full flex-col justify-between p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white">{title}</p>
            <p className={cn("mt-0.5 text-xs leading-snug", descMuted)}>{desc}</p>
          </div>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15 ring-2 ring-white/30">
            <Icon className="h-5 w-5 text-white" strokeWidth={2.25} />
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-[var(--mundial-gold,#f5c518)]">
            Otwórz
          </span>
          <ChevronRight
            className="h-5 w-5 shrink-0 text-white/50 transition-all group-hover:translate-x-0.5 group-hover:text-white/90"
            strokeWidth={2.5}
            aria-hidden
          />
        </div>
      </div>
    </Link>
  );
}

function LogoutPitchTile({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group awp-focus-ring relative block h-full min-h-[7rem] w-full overflow-hidden rounded-2xl border-2 border-dashed border-white/35 bg-emerald-950/25 text-left shadow-md shadow-emerald-950/10 ring-1 ring-white/15 transition-[transform,box-shadow] motion-safe:hover:-translate-y-0.5 hover:bg-emerald-950/35 hover:shadow-lg focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-80 bg-[repeating-linear-gradient(105deg,transparent,transparent_10px,rgba(255,255,255,0.04)_10px,rgba(255,255,255,0.04)_20px)]"
        aria-hidden
      />
      <div className="relative flex h-full flex-col justify-between p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white">Wyloguj się</p>
            <p className="mt-0.5 text-xs text-emerald-100/80">Zakończ sesję</p>
          </div>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 ring-2 ring-white/25">
            <LogOut className="h-5 w-5 text-white/90" strokeWidth={2.25} />
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-emerald-100/70">Sesja</span>
          <ChevronRight
            className="h-5 w-5 shrink-0 text-white/40 transition-all group-hover:translate-x-0.5 group-hover:text-white/75"
            strokeWidth={2.5}
            aria-hidden
          />
        </div>
      </div>
    </button>
  );
}
