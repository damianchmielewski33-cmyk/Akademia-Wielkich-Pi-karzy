"use client";

import { useEffect, useState, type ComponentType } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Activity,
  CalendarDays,
  ChevronRight,
  LogIn,
  LogOut,
  Radio,
  Shield,
  Trophy,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import { HomeNextMatchCard } from "@/components/home-next-match-card";
import { PitchPageHero } from "@/components/ui/pitch-card";
import { PlayerAvatar } from "@/components/player-avatar";
import { MatchTransportSignupDialog } from "@/components/match-transport-signup-dialog";
import { LogoutConfirmModal } from "@/components/logout-confirm-modal";
import { Button } from "@/components/ui/button";
import { AppModal } from "@/components/ui/app-modal";
import { FormInput } from "@/components/ui/form-field";
import { ModalMatchSummary, modalPanelClass } from "@/components/ui/modal-shared";
import type { MatchRow } from "@/lib/db";
import { cn } from "@/lib/utils";

type Props = {
  nextMatch: MatchRow | null;
  /** Np. „3 osoby się zastanawiają” — pusty gdy brak zapisów «jeszcze nie wiem». */
  nextMatchTentativeLine: string;
  lineupPublicNextMatch: boolean;
  nextMatchSignup: "none" | "tentative" | "confirmed" | "declined";
  /** Kafelek transportu zawsze widoczny po zapisie; link działa w lokalny dzień meczu. */
  transportHomeActive: boolean;
  isLoggedIn: boolean;
  isAdmin: boolean;
  firstName: string;
  lastName: string;
  zawodnik: string;
  profilePhotoPath: string | null;
  /** ID filmu / transmisji YouTube (osadzenie). Brak = brak sekcji na stronie. */
  youtubeLiveVideoId: string | null;
  /** Saldo portfela zalogowanego użytkownika (null gdy niezalogowany). */
  walletBalancePln: number | null;
};

function formatPln(n: number) {
  const v = Math.round(n * 100) / 100;
  return new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN" }).format(v);
}

function HomeWalletBalanceFloat({ balancePln }: { balancePln: number }) {
  const negative = balancePln < 0;
  const positive = balancePln > 0;

  return (
    <Link
      href="/platnosci"
      className="group fixed right-3 top-[4.25rem] z-40 flex max-w-[min(100%,14rem)] items-center gap-2 overflow-hidden rounded-2xl border-2 border-white/35 px-3 py-2 shadow-lg shadow-emerald-950/25 ring-1 ring-emerald-950/15 transition-[transform,box-shadow] motion-safe:hover:-translate-y-0.5 hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 sm:right-5 sm:top-[4.75rem] sm:max-w-none sm:gap-2.5 sm:px-3.5 sm:py-2.5"
      aria-label={`Twoje saldo: ${formatPln(balancePln)}. Przejdź do płatności.`}
    >
      <div className="home-pitch-tile absolute inset-0" aria-hidden />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-0.5 bg-white/45"
        aria-hidden
      />
      <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15 ring-2 ring-white/35 backdrop-blur-[2px] sm:h-11 sm:w-11">
        <Image
          src="/soccer-ball.svg"
          alt=""
          width={44}
          height={44}
          className="h-7 w-7 object-contain drop-shadow sm:h-8 sm:w-8"
          unoptimized
        />
      </div>
      <div className="relative min-w-0 text-left">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-100/85">Saldo</p>
        <p
          className={cn(
            "truncate text-sm font-bold tabular-nums text-white drop-shadow-sm sm:text-base",
            negative && "text-red-200",
            positive && "text-emerald-100"
          )}
        >
          {formatPln(balancePln)}
        </p>
      </div>
      <ChevronRight
        className="relative h-4 w-4 shrink-0 text-white/50 transition-all group-hover:translate-x-0.5 group-hover:text-white/90"
        strokeWidth={2.5}
        aria-hidden
      />
    </Link>
  );
}

export function HomeClient({
  nextMatch,
  nextMatchTentativeLine,
  lineupPublicNextMatch,
  nextMatchSignup,
  transportHomeActive,
  isLoggedIn,
  isAdmin,
  firstName,
  lastName,
  zawodnik,
  profilePhotoPath,
  youtubeLiveVideoId,
  walletBalancePln,
}: Props) {
  const router = useRouter();
  const [transportSignupOpen, setTransportSignupOpen] = useState(false);
  const [transportIntent, setTransportIntent] = useState<"signup" | "confirm">("signup");
  const [tentativeBusy, setTentativeBusy] = useState(false);
  const [signupOpen, setSignupOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
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
    <div className="mx-auto grid max-w-3xl grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-3">
      <PitchTile href="/terminarz" icon={CalendarDays} title="Terminarz" desc="Mecze, zapisy, terminy" />
      <PitchTile href="/pilkarze" icon={Users} title="Piłkarze" desc="Skład i profile" />
      {isLoggedIn && (
        <>
          <PitchTile href="/platnosci" icon={Wallet} title="Płatności" desc="BLIK i status wpłaty za mecz" />
          <PitchTile href="/statystyki" icon={Activity} title="Statystyki" desc="Twoje liczby z boiska" />
          <PitchTile href="/rankingi" icon={Trophy} title="Rankingi" desc="Gole, asysty, punkty" variant="gold" />
        </>
      )}
      {!isLoggedIn && (
        <>
          <PitchTile href="/login" icon={LogIn} title="Logowanie" desc="Wejdź do szatni" />
          <PitchTile href="/register" icon={UserPlus} title="Rejestracja" desc="Dołącz do drużyny" />
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

  return (
    <div className="flex flex-1 flex-col">
      {isLoggedIn && walletBalancePln != null ? (
        <HomeWalletBalanceFloat balancePln={walletBalancePln} />
      ) : null}
      <div className="container mx-auto max-w-5xl flex-1 px-4 py-8 text-center sm:py-10">
        {isLoggedIn && (
          <div className="mb-8 flex items-center justify-center gap-4">
            <PlayerAvatar
              photoPath={profilePhotoPath}
              firstName={firstName}
              lastName={lastName}
              size="lg"
              className="shadow-md ring-2 ring-white/40"
            />
            <div className="text-left">
              <h2 className="text-2xl font-bold tracking-tight text-white drop-shadow-sm">Witaj!</h2>
              <p className="text-lg font-semibold text-emerald-100">
                {`${firstName} ${lastName}`.trim() || zawodnik}
              </p>
              {zawodnik && `${firstName} ${lastName}`.trim() ? (
                <p className="text-sm text-emerald-100/80">{zawodnik}</p>
              ) : null}
            </div>
          </div>
        )}

        <PitchPageHero
          title="Zostań gwiazdą boiska"
          subtitle={
            isLoggedIn
              ? "Wybierz, co chcesz zrobić"
              : "Zaloguj się lub załóż konto — zapisy na mecze, statystyki, rankingi i komunikacja w drużynie"
          }
        />

        {youtubeLiveVideoId ? (
          <section
            className="mx-auto mt-10 max-w-3xl text-left"
            aria-labelledby="home-live-heading"
          >
            <div className="overflow-hidden rounded-2xl border-2 border-emerald-200/80 bg-emerald-950/[0.03] shadow-lg shadow-emerald-950/10 ring-1 ring-emerald-900/10 dark:border-emerald-800/60 dark:bg-emerald-950/30 dark:ring-emerald-500/10">
              <div className="border-b border-emerald-200/60 bg-gradient-to-r from-emerald-800/10 to-emerald-600/5 px-4 py-3 dark:border-emerald-800/50 dark:from-emerald-900/40 dark:to-emerald-950/20 sm:px-5">
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-red-600 text-white shadow-sm ring-2 ring-red-500/30">
                    <Radio className="h-4 w-4" strokeWidth={2.5} aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2
                      id="home-live-heading"
                      className="text-lg font-bold tracking-tight text-emerald-950 dark:text-emerald-100 sm:text-xl"
                    >
                      Mecz na żywo
                    </h2>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      Transmisja z YouTube — oglądaj prosto z Akademii Wielkich Piłkarzy
                    </p>
                  </div>
                  <Link
                    href={`https://www.youtube.com/watch?v=${encodeURIComponent(youtubeLiveVideoId)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 text-sm font-semibold text-emerald-800 underline decoration-emerald-800/30 underline-offset-2 hover:text-emerald-950 dark:text-emerald-300 dark:decoration-emerald-400/40 dark:hover:text-emerald-200"
                  >
                    Otwórz w YouTube
                  </Link>
                </div>
              </div>
              <div className="relative aspect-video w-full bg-black">
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
            </div>
          </section>
        ) : null}

        <div className="mt-8">{tiles}</div>

        {nextMatch ? (
          <HomeNextMatchCard
            match={nextMatch}
            tentativeLine={nextMatchTentativeLine}
            lineupPublic={lineupPublicNextMatch}
            signup={nextMatchSignup}
            transportActive={transportHomeActive}
            isLoggedIn={isLoggedIn}
            tentativeBusy={tentativeBusy}
            onSignup={openTransportSignup}
            onTentative={() => void signupTentativeHome()}
            onDeclined={() => void signupDeclinedHome()}
            onConfirmFromTentative={openConfirmFromTentative}
          />
        ) : null}
      </div>

      {nextMatch && (
        <MatchTransportSignupDialog
          open={transportSignupOpen}
          onOpenChange={setTransportSignupOpen}
          matchId={nextMatch.id}
          intent={transportIntent === "confirm" ? "confirm" : "signup"}
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
          <Button type="button" variant="pitch" onClick={() => setSignupOpen(false)}>
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
            <Button type="button" variant="pitch" onClick={saveStats}>
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
      : "shadow-md shadow-emerald-950/12 ring-1 ring-emerald-950/10 hover:shadow-emerald-950/22";
  const descMuted = variant === "gold" ? "text-amber-50/95" : "text-emerald-50/90";
  return (
    <Link
      href={href}
      className={`group relative block h-full min-h-[5.5rem] overflow-hidden rounded-2xl border-2 border-white/30 transition-[transform,box-shadow] motion-safe:hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 ${tileFrame}`}
    >
      <div className={`absolute inset-0 ${bgClass}`} aria-hidden />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-0.5 bg-white/45"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute left-0 top-0 h-7 w-7 rounded-br-md border-b-2 border-r-2 border-white/40"
        aria-hidden
      />
      <div className="relative flex h-full items-center gap-3 px-4 py-3.5 text-left sm:gap-4 sm:px-4 sm:py-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/15 ring-2 ring-white/35 backdrop-blur-[2px] sm:h-12 sm:w-12">
          <Icon className="h-5 w-5 text-white sm:h-6 sm:w-6" strokeWidth={2.25} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-base font-bold tracking-tight text-white drop-shadow-sm sm:text-[1.05rem]">{title}</p>
          <p className={`mt-0.5 text-xs leading-snug sm:text-sm ${descMuted}`}>{desc}</p>
        </div>
        <ChevronRight
          className="h-5 w-5 shrink-0 text-white/50 transition-all group-hover:translate-x-0.5 group-hover:text-white/90"
          strokeWidth={2.5}
          aria-hidden
        />
      </div>
    </Link>
  );
}

function LogoutPitchTile({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative block h-full min-h-[5.5rem] w-full overflow-hidden rounded-2xl border-2 border-dashed border-white/35 bg-emerald-950/25 text-left shadow-md shadow-emerald-950/10 ring-1 ring-white/15 transition-[transform,box-shadow] motion-safe:hover:-translate-y-0.5 hover:bg-emerald-950/35 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-80 bg-[repeating-linear-gradient(105deg,transparent,transparent_10px,rgba(255,255,255,0.04)_10px,rgba(255,255,255,0.04)_20px)]"
        aria-hidden
      />
      <div className="relative flex h-full items-center gap-3 px-4 py-3.5 sm:gap-4 sm:px-4 sm:py-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10 ring-2 ring-white/25 sm:h-12 sm:w-12">
          <LogOut className="h-5 w-5 text-white/90 sm:h-6 sm:w-6" strokeWidth={2.25} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-base font-bold tracking-tight text-white sm:text-[1.05rem]">Wyloguj się</p>
          <p className="mt-0.5 text-xs text-emerald-100/80 sm:text-sm">Zakończ sesję</p>
        </div>
        <ChevronRight
          className="h-5 w-5 shrink-0 text-white/40 transition-all group-hover:translate-x-0.5 group-hover:text-white/75"
          strokeWidth={2.5}
          aria-hidden
        />
      </div>
    </button>
  );
}
