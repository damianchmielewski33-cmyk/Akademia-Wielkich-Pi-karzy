"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "@/lib/app-toast";
import { useHotpayPaymentReturn } from "@/hooks/use-hotpay-payment-return";
import {
  Activity,
  CalendarDays,
  LogIn,
  LogOut,
  Medal,
  Shield,
  Trophy,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import { HomeNextMatchCard } from "@/components/home-next-match-card";
import { HomeTopRankings } from "@/components/home-top-rankings";
import { MarketplaceSearchForm } from "@/components/marketplace-search-form";
import { MarketplaceVenueCard } from "@/components/marketplace-venue-card";
import { PlayerAvatar } from "@/components/player-avatar";
import { MatchTransportSignupDialog } from "@/components/match-transport-signup-dialog";
import { LogoutConfirmModal } from "@/components/logout-confirm-modal";
import { Button } from "@/components/ui/button";
import { AppModal } from "@/components/ui/app-modal";
import { FormInput } from "@/components/ui/form-field";
import { ModalMatchSummary, modalPanelClass } from "@/components/ui/modal-shared";
import type { MatchRow } from "@/lib/db";
import type { VenueCard } from "@/lib/booking";
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
  featuredVenues?: VenueCard[];
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
  featuredVenues = [],
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

  const academyLinks = [
    { href: "/terminarz", icon: CalendarDays, title: "Terminarz akademii", desc: "Mecze, zapisy, terminy" },
    { href: "/pilkarze", icon: Users, title: "Piłkarze", desc: "Skład i profile" },
    isLoggedIn ? { href: "/platnosci", icon: Wallet, title: "Płatności", desc: "Portfel i opłaty za mecze" } : null,
    isLoggedIn ? { href: "/statystyki", icon: Activity, title: "Statystyki", desc: "Twoje liczby z boiska" } : null,
    isLoggedIn ? { href: "/rankingi", icon: Trophy, title: "Rankingi", desc: "Gole, asysty, punkty" } : null,
    showPzuCupTile ? { href: "/pzu-cup", icon: Medal, title: "PZU Cup", desc: "Organizacja turnieju" } : null,
    isAdmin ? { href: "/panel-admina", icon: Shield, title: "Panel admina", desc: "Zarządzanie akademią" } : null,
    !isLoggedIn ? { href: "/login", icon: LogIn, title: "Logowanie", desc: "Wejdź na konto" } : null,
    !isLoggedIn ? { href: "/register", icon: UserPlus, title: "Rejestracja", desc: "Dołącz do akademii" } : null,
  ].flatMap((item) => (item && !isHiddenHref(item.href) ? [item] : []));

  const isMarketplaceHome = pageVariant === "home";

  return (
    <div className="relative flex flex-1 flex-col text-zinc-900 dark:text-zinc-50">
      {isMarketplaceHome ? (
        <section className="mp-hero relative flex flex-col justify-end overflow-hidden pb-16 pt-16 sm:pb-20 sm:pt-24">
          <div className="relative z-10 mx-auto w-full max-w-6xl px-4">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-white/80">Rezerwacja boisk</p>
            <h1 className="mt-3 max-w-3xl text-4xl font-black tracking-tight text-white sm:text-6xl">
              W co chcesz zagrać?
            </h1>
            <p className="mt-4 max-w-xl text-base text-white/85 sm:text-lg">
              Znajdź obiekt, wybierz godzinę i zarezerwuj boisko online. Terminarz akademii zostaje osobnym modułem.
            </p>
            <div className="mt-8 max-w-5xl">
              <MarketplaceSearchForm />
            </div>
          </div>
        </section>
      ) : (
        <section className="border-b border-zinc-200 bg-white px-4 py-10 dark:border-zinc-800 dark:bg-zinc-950">
          <div className="mx-auto max-w-6xl">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--mp-teal-dark)]">PZU Cup 2026</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-5xl">Organizacja turnieju</h1>
          </div>
        </section>
      )}

      <div className="relative z-10 mx-auto w-full min-w-0 max-w-6xl px-4 py-10 sm:py-12">
        {isMarketplaceHome ? (
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { href: "/obiekty?indoor=1", title: "Boiska halowe", desc: "Kryte obiekty na każdą pogodę" },
              { href: "/obiekty?indoor=0", title: "Boiska otwarte", desc: "Orliki i nawierzchnie zewnętrzne" },
              { href: "/obiekty?surface=sztuczna", title: "Sztuczna trawa", desc: "Piłka nożna na tartanie i orliku" },
              { href: "/terminarz", title: "Akademia", desc: "Mecze, zapisy i składy drużyny" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950"
              >
                <p className="font-black text-zinc-950 dark:text-white">{item.title}</p>
                <p className="mt-1 text-sm text-zinc-500">{item.desc}</p>
              </Link>
            ))}
          </section>
        ) : null}

        {isMarketplaceHome ? (
          <section className="mt-12">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--mp-teal-dark)]">Obiekty</p>
                <h2 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">Wybierz boisko i zarezerwuj</h2>
              </div>
              <Button asChild variant="outline">
                <Link href="/obiekty">Wszystkie obiekty</Link>
              </Button>
            </div>
            {featuredVenues.length === 0 ? (
              <div className="mt-6 rounded-3xl border border-dashed border-zinc-300 bg-white p-8 text-center text-zinc-600 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300">
                Brak opublikowanych obiektów. Dodaj pierwszy obiekt w panelu admina.
              </div>
            ) : (
              <div className="-mx-4 mt-6 flex gap-4 overflow-x-auto px-4 pb-3 [scrollbar-width:thin]">
                {featuredVenues.map((venue) => (
                  <MarketplaceVenueCard key={venue.id} venue={venue} className="w-72 shrink-0" />
                ))}
              </div>
            )}
          </section>
        ) : null}

        {isMarketplaceHome ? (
          <section id="jak-to-dziala" className="mt-14 grid gap-4 rounded-3xl bg-white p-6 shadow-sm sm:grid-cols-3 dark:bg-zinc-950">
            {[
              { n: "1", t: "Znajdź obiekt", d: "Filtruj po mieście, nawierzchni i cenie." },
              { n: "2", t: "Wybierz godzinę", d: "Zobacz wolne sloty i zablokuj termin." },
              { n: "3", t: "Opłać online", d: "Potwierdzenie rezerwacji przychodzi od razu." },
            ].map((step) => (
              <div key={step.n} className="rounded-2xl bg-zinc-50 p-5 dark:bg-zinc-900">
                <p className="text-3xl font-black text-[var(--mp-teal)]">{step.n}</p>
                <p className="mt-2 font-black">{step.t}</p>
                <p className="mt-1 text-sm text-zinc-500">{step.d}</p>
              </div>
            ))}
          </section>
        ) : null}

        {isLoggedIn ? (
          <div className="mt-10 flex flex-wrap items-center gap-4 rounded-3xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
            <PlayerAvatar
              photoPath={profilePhotoPath}
              firstName={firstName}
              lastName={lastName}
              size="lg"
              className="shadow-md ring-2 ring-[var(--mp-teal)]/30"
            />
            <div className="min-w-0 text-left">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Witaj</p>
              <p className="text-lg font-bold">
                {`${firstName} ${lastName}`.trim() || zawodnik}
              </p>
              {zawodnik && `${firstName} ${lastName}`.trim() ? (
                <p className="text-sm text-zinc-500">{zawodnik}</p>
              ) : null}
            </div>
          </div>
        ) : null}

        {nextMatch ? (
          <div className="mt-8">
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
          </div>
        ) : null}

        <section className="mt-12">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--mp-teal-dark)]">Akademia</p>
              <h2 className="mt-1 text-2xl font-black tracking-tight">Moduły drużyny</h2>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {academyLinks.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-start justify-between gap-3 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950"
                >
                  <div>
                    <p className="font-black">{item.title}</p>
                    <p className="mt-1 text-sm text-zinc-500">{item.desc}</p>
                  </div>
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--mp-teal)]/12 text-[var(--mp-teal-dark)]">
                    <Icon className="h-5 w-5" />
                  </span>
                </Link>
              );
            })}
            {isLoggedIn ? (
              <button
                type="button"
                onClick={() => setLogoutOpen(true)}
                className="flex items-start justify-between gap-3 rounded-2xl border border-dashed border-zinc-300 bg-white p-5 text-left dark:border-zinc-700 dark:bg-zinc-950"
              >
                <div>
                  <p className="font-black">Wyloguj się</p>
                  <p className="mt-1 text-sm text-zinc-500">Zakończ sesję</p>
                </div>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                  <LogOut className="h-5 w-5" />
                </span>
              </button>
            ) : null}
            <GymBratCrossLink />
          </div>
        </section>

        {pageVariant === "home" ? (
          <div className="mt-10">
            <HomeTopRankings players={topRankedPlayers} isLoggedIn={isLoggedIn} />
          </div>
        ) : null}

        {youtubeLiveVideoId ? (
          <section className="mt-10 overflow-hidden rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-red-500">Na żywo</p>
                <h2 className="mt-1 text-xl font-black">Mecz na YouTube</h2>
              </div>
              <Button asChild>
                <Link
                  href={`https://www.youtube.com/watch?v=${encodeURIComponent(youtubeLiveVideoId)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  YouTube
                </Link>
              </Button>
            </div>
            <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-black">
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
          </section>
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
          <Button type="button" onClick={() => setSignupOpen(false)}>
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
              className="inline-block text-sm font-medium text-[var(--mp-teal-dark)] underline underline-offset-2"
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
            <Button type="button" onClick={saveStats}>
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
