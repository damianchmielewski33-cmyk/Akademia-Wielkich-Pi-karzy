"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "@/lib/app-toast";
import { useHotpayPaymentReturn } from "@/hooks/use-hotpay-payment-return";
import {
  Activity,
  CalendarDays,
  Clock,
  MapPin,
  Medal,
  Shield,
  Trophy,
  Users,
  Wallet,
} from "lucide-react";
import { HomeNextMatchCard } from "@/components/home-next-match-card";
import { HomeTopRankings } from "@/components/home-top-rankings";
import { MarketplacePitchPhoto } from "@/components/marketplace-pitch-photo";
import { MarketplaceSearchForm } from "@/components/marketplace-search-form";
import { MarketplaceVenueCard } from "@/components/marketplace-venue-card";
import { PlayerAvatar } from "@/components/player-avatar";
import { MatchTransportSignupDialog } from "@/components/match-transport-signup-dialog";
import { Button } from "@/components/ui/button";
import { AppModal } from "@/components/ui/app-modal";
import { FormInput } from "@/components/ui/form-field";
import { ModalMatchSummary, modalPanelClass } from "@/components/ui/modal-shared";
import type { MatchRow } from "@/lib/db";
import type { VenueCard } from "@/lib/booking-shared";
import { MARKETPLACE_PITCH_PHOTOS, pitchPhotosFromVenues } from "@/lib/marketplace-photos";
import type { HomeTopPlayer } from "@/lib/rankings-data";
import { cn } from "@/lib/utils";
import { useScreenBlocks } from "@/components/screen-blocks-provider";
import { GymBratCrossLink } from "@/components/gymbrat-cross-link";
import { useSiteMode } from "@/components/site-mode";
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

export function HomeClient(props: Props) {
  const { mode, marketplaceEnabled } = useSiteMode();
  const pageVariant = props.pageVariant ?? "home";

  if (pageVariant === "home" && marketplaceEnabled && mode === "booking") {
    return <BookingHomeView featuredVenues={props.featuredVenues ?? []} />;
  }
  if (pageVariant === "pzu-cup" || mode === "academy") {
    return <AcademyHomeView {...props} />;
  }

  return (
    <div className="relative flex flex-1 flex-col px-4 py-16 text-zinc-900 dark:text-zinc-50">
      <div className="mx-auto max-w-xl text-center">
        <p className="text-sm text-zinc-500">Wybierz, co chcesz zrobić.</p>
      </div>
    </div>
  );
}

function BookingHomeView({ featuredVenues }: { featuredVenues: VenueCard[] }) {
  const heroPhoto = pitchPhotosFromVenues(featuredVenues)[0] ?? MARKETPLACE_PITCH_PHOTOS[0];
  return (
    <div className="relative flex flex-1 flex-col text-zinc-900 dark:text-zinc-50">
      <section className="mp-hero mp-hero--photo relative flex flex-col justify-end overflow-hidden pb-16 pt-16 sm:pb-20 sm:pt-24">
        <MarketplacePitchPhoto src={heroPhoto} priority className="z-0" />
        <div className="absolute inset-0 z-[1] bg-gradient-to-t from-black/75 via-black/40 to-black/20" />
        <div className="relative z-10 mx-auto w-full max-w-6xl px-4">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-white/80">Rezerwacja boisk</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-black tracking-tight text-white sm:text-6xl">
            Gdzie chcesz zagrać?
          </h1>
          <p className="mt-4 max-w-xl text-base text-white/85 sm:text-lg">
            Wybierz miasto, dzień i godzinę. Wolne boiska widać od razu — rezerwacja i płatność online.
          </p>
          <div className="mt-8 max-w-5xl">
            <MarketplaceSearchForm />
          </div>
        </div>
      </section>

      <div className="relative z-10 mx-auto w-full min-w-0 max-w-6xl px-4 py-10 sm:py-12">
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { href: "/obiekty?indoor=1", title: "Boiska halowe", desc: "Kryte obiekty na każdą pogodę" },
            { href: "/obiekty?indoor=0", title: "Boiska otwarte", desc: "Orliki i nawierzchnie zewnętrzne" },
            { href: "/obiekty?surface=sztuczna", title: "Sztuczna trawa", desc: "Piłka nożna na tartanie i orliku" },
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
              <p className="font-semibold">Katalog startuje od Warszawy.</p>
              <p className="mt-2 text-sm">
                Potrzebujemy 5–15 hal w jednym mieście: zdjęcia, cennik, godziny, oświetlenie. Potem kolejne miasto.
              </p>
              <div className="mt-4">
                <Button asChild>
                  <Link href="/dla-obiektow">Zgłoś obiekt</Link>
                </Button>
              </div>
            </div>
          ) : (
            <div className="-mx-4 mt-6 flex gap-4 overflow-x-auto px-4 pb-3 [scrollbar-width:thin]">
              {featuredVenues.map((venue) => (
                <MarketplaceVenueCard key={venue.id} venue={venue} className="w-72 shrink-0" />
              ))}
            </div>
          )}
        </section>

        <section className="mt-14 overflow-hidden rounded-3xl bg-[var(--mp-teal)] px-6 py-10 text-white sm:px-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-xl">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/80">Dla obiektów</p>
              <h2 className="mt-2 text-3xl font-black tracking-tight">Masz halę albo orlik? Wystaw terminy.</h2>
              <p className="mt-3 text-white/90">
                Zgłoś halę na stronie — bez tokenu od znajomych. Po weryfikacji publikujemy obiekt. Gracze rezerwują i
                płacą online, Ty widzisz obrót, prowizję i termin przelewu.
              </p>
            </div>
            <Button asChild variant="secondary" className="h-12 rounded-full bg-white px-8 font-black text-zinc-950 hover:bg-zinc-100">
              <Link href="/dla-obiektow">Dodaj swój obiekt</Link>
            </Button>
          </div>
        </section>

        <section id="jak-to-dziala" className="mt-14 grid gap-4 rounded-3xl bg-white p-6 shadow-sm sm:grid-cols-3 dark:bg-zinc-950">
          {[
            { n: "1", t: "Znajdź obiekt", d: "Filtruj po mieście, nawierzchni i cenie." },
            { n: "2", t: "Wybierz godzinę", d: "Zobacz wolne sloty i zablokuj termin." },
            { n: "3", t: "Opłać online", d: "Potwierdzenie na e-mail — bez PIN-u akademii." },
          ].map((step) => (
            <div key={step.n} className="rounded-2xl bg-zinc-50 p-5 dark:bg-zinc-900">
              <p className="text-3xl font-black text-[var(--mp-teal)]">{step.n}</p>
              <p className="mt-2 font-black">{step.t}</p>
              <p className="mt-1 text-sm text-zinc-500">{step.d}</p>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}

function formatHeroDate(isoDate: string) {
  const [y, m, d] = isoDate.split("-").map(Number);
  if (!y || !m || !d) return isoDate;
  return `${String(d).padStart(2, "0")}.${String(m).padStart(2, "0")}.${y}`;
}

function AcademyHomeView({
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
  const { marketplaceEnabled } = useSiteMode();
  const isAcademyHome = pageVariant === "home";
  const pitchPhotos = pitchPhotosFromVenues(featuredVenues);
  const heroPhoto = pitchPhotos[0] ?? MARKETPLACE_PITCH_PHOTOS[0];
  const [transportSignupOpen, setTransportSignupOpen] = useState(false);
  const [transportIntent, setTransportIntent] = useState<"signup" | "confirm">("signup");
  const [tentativeBusy, setTentativeBusy] = useState(false);
  const [signupOpen, setSignupOpen] = useState(false);
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
    if (!isAcademyHome) return;
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
  }, [isAcademyHome]);

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
    if (!isAcademyHome) return;
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
  }, [isLoggedIn, hotpayEnabled, isAcademyHome]);

  useHotpayPaymentReturn({
    enabled: isLoggedIn && hotpayEnabled && isAcademyHome,
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
    isAdmin ? { href: "/panel-admina", icon: Shield, title: "Zarządzanie akademią", desc: "Panel admina" } : null,
  ].flatMap((item) => (item && !isHiddenHref(item.href) ? [item] : []));

  const quickLinks = [
    { href: "/terminarz", title: "Terminarz", desc: "Mecze, zapisy i najbliższe terminy" },
    { href: "/pilkarze", title: "Piłkarze", desc: "Skład akademii i profile" },
    {
      href: isLoggedIn ? "/rankingi" : "/login?next=/rankingi",
      title: "Rankingi",
      desc: "Gole, asysty i punkty z meczów",
    },
  ].filter((item) => !isHiddenHref(item.href.split("?")[0] ?? item.href));

  const moreLinks = academyLinks.filter(
    (item) => item.href !== "/terminarz" && item.href !== "/pilkarze" && item.href !== "/rankingi"
  );

  return (
    <div className="relative flex flex-1 flex-col text-zinc-900 dark:text-zinc-50">
      {pageVariant === "pzu-cup" ? (
        <section className="mp-hero mp-hero--photo relative flex flex-col justify-end overflow-hidden pb-16 pt-16 sm:pb-20 sm:pt-24">
          <MarketplacePitchPhoto src={heroPhoto} priority className="z-0" />
          <div className="absolute inset-0 z-[1] bg-gradient-to-t from-black/75 via-black/40 to-black/20" />
          <div className="relative z-10 mx-auto w-full max-w-6xl px-4">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-white/80">PZU Cup 2026</p>
            <h1 className="mt-3 max-w-3xl text-4xl font-black tracking-tight text-white sm:text-6xl">
              Organizacja turnieju
            </h1>
          </div>
        </section>
      ) : (
        <section className="mp-hero mp-hero--photo relative flex flex-col justify-end overflow-hidden pb-16 pt-16 sm:pb-20 sm:pt-24">
          <MarketplacePitchPhoto src={heroPhoto} priority className="z-0" />
          <div className="absolute inset-0 z-[1] bg-gradient-to-t from-black/75 via-black/40 to-black/20" />
          <div className="relative z-10 mx-auto w-full max-w-6xl px-4">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-white/80">Akademia</p>
            <h1 className="mt-3 max-w-3xl text-4xl font-black tracking-tight text-white sm:text-6xl">
              Gramy razem.
            </h1>
            <p className="mt-4 max-w-xl text-base text-white/85 sm:text-lg">
              Terminarz meczów, składy i rankingi — osobno od rezerwacji boisk.
            </p>
            <div className="mt-8 max-w-5xl">
              {nextMatch ? (
                <div className="mp-search-pill p-2 md:p-1.5">
                  <div className="min-w-0 px-4 py-2">
                    <span className="block text-[0.65rem] font-bold uppercase tracking-[0.14em] text-zinc-400">
                      Najbliższy mecz
                    </span>
                    <span className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
                      <CalendarDays className="h-4 w-4 shrink-0 text-zinc-400" aria-hidden />
                      {formatHeroDate(nextMatch.match_date)}
                    </span>
                  </div>
                  <div className="min-w-0 px-4 py-2">
                    <span className="block text-[0.65rem] font-bold uppercase tracking-[0.14em] text-zinc-400">
                      Godzina
                    </span>
                    <span className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
                      <Clock className="h-4 w-4 shrink-0 text-zinc-400" aria-hidden />
                      {nextMatch.match_time}
                    </span>
                  </div>
                  <div className="min-w-0 px-4 py-2">
                    <span className="block text-[0.65rem] font-bold uppercase tracking-[0.14em] text-zinc-400">
                      Miejsce
                    </span>
                    <span className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
                      <MapPin className="h-4 w-4 shrink-0 text-zinc-400" aria-hidden />
                      <span className="truncate">{nextMatch.location}</span>
                    </span>
                  </div>
                  <Button asChild className="h-12 rounded-full px-8 text-sm font-black uppercase tracking-[0.12em]">
                    <Link href="/terminarz">Terminarz</Link>
                  </Button>
                </div>
              ) : (
                <div className="mp-search-pill p-2 md:p-1.5">
                  <div className="min-w-0 px-4 py-3 md:col-span-3">
                    <span className="block text-[0.65rem] font-bold uppercase tracking-[0.14em] text-zinc-400">
                      Terminarz
                    </span>
                    <span className="text-sm font-semibold text-zinc-900">
                      Zobacz mecze akademii i zapisz się na termin.
                    </span>
                  </div>
                  <Button asChild className="h-12 rounded-full px-8 text-sm font-black uppercase tracking-[0.12em]">
                    <Link href="/terminarz">Terminarz</Link>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {isAcademyHome && marketplaceEnabled && featuredVenues.length > 0 ? (
        <div className="-mx-4 mt-0 flex gap-4 overflow-x-auto bg-zinc-100 px-4 py-4 [scrollbar-width:thin] dark:bg-zinc-900">
          {featuredVenues.map((venue) => (
            <MarketplaceVenueCard key={venue.id} venue={venue} className="w-72 shrink-0" />
          ))}
        </div>
      ) : isAcademyHome ? (
        <div className="-mx-4 mt-0 flex gap-4 overflow-x-auto bg-zinc-100 px-4 py-4 [scrollbar-width:thin] dark:bg-zinc-900">
          {pitchPhotos.slice(0, 8).map((src) => (
            <div key={src} className="relative h-48 w-72 shrink-0 overflow-hidden rounded-3xl bg-zinc-200">
              <MarketplacePitchPhoto src={src} sizes="288px" />
            </div>
          ))}
        </div>
      ) : null}

      <div className="relative z-10 mx-auto w-full min-w-0 max-w-6xl px-4 py-10 sm:py-12">
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {quickLinks.map((item) => (
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

        {isLoggedIn ? (
          <div className="mt-10 flex flex-wrap items-center gap-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <PlayerAvatar
              photoPath={profilePhotoPath}
              firstName={firstName}
              lastName={lastName}
              size="lg"
              className="shadow-md ring-2 ring-[var(--mp-teal)]/30"
            />
            <div className="min-w-0 text-left">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Witaj</p>
              <p className="text-lg font-black">
                {`${firstName} ${lastName}`.trim() || zawodnik}
              </p>
              {zawodnik && `${firstName} ${lastName}`.trim() ? (
                <p className="text-sm text-zinc-500">{zawodnik}</p>
              ) : null}
            </div>
          </div>
        ) : null}

        {nextMatch ? (
          <section className="mt-12">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--mp-teal-dark)]">Terminarz</p>
                <h2 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">Najbliższy mecz</h2>
              </div>
              <Button asChild variant="outline">
                <Link href="/terminarz">Pełny terminarz</Link>
              </Button>
            </div>
            <div className="mt-6">
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
          </section>
        ) : null}

        {isAcademyHome ? (
          <div className="mt-12">
            <HomeTopRankings players={topRankedPlayers} isLoggedIn={isLoggedIn} />
          </div>
        ) : null}

        {moreLinks.length > 0 ? (
          <section className="mt-12">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--mp-teal-dark)]">Akademia</p>
                <h2 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">Więcej w akademii</h2>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {moreLinks.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-start justify-between gap-3 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950"
                  >
                    <div>
                      <p className="font-black text-zinc-950 dark:text-white">{item.title}</p>
                      <p className="mt-1 text-sm text-zinc-500">{item.desc}</p>
                    </div>
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--mp-teal)]/12 text-[var(--mp-teal-dark)]">
                      <Icon className="h-5 w-5" />
                    </span>
                  </Link>
                );
              })}
              <GymBratCrossLink />
            </div>
          </section>
        ) : null}

        <section className="mt-14 overflow-hidden rounded-3xl bg-[var(--mp-teal)] px-6 py-10 text-white sm:px-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-xl">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/80">Akademia</p>
              <h2 className="mt-2 text-3xl font-black tracking-tight">
                {isLoggedIn ? "Kolejny mecz czeka w terminarzu." : "Chcesz grać z nami?"}
              </h2>
              <p className="mt-3 text-white/90">
                {isLoggedIn
                  ? "Zapisy, składy i statystyki są w jednym miejscu — osobno od rezerwacji boisk."
                  : "Dołącz do akademii: terminarz, składy, portfel i rankingi po zalogowaniu."}
              </p>
            </div>
            <Button asChild variant="secondary" className="h-12 rounded-full bg-white px-8 font-black text-zinc-950 hover:bg-zinc-100">
              <Link href={isLoggedIn ? "/terminarz" : "/register"}>
                {isLoggedIn ? "Otwórz terminarz" : "Dołącz do akademii"}
              </Link>
            </Button>
          </div>
        </section>

        <section className="mt-14 grid gap-4 rounded-3xl bg-white p-6 shadow-sm sm:grid-cols-3 dark:bg-zinc-950">
          {[
            { n: "1", t: "Zobacz terminarz", d: "Najbliższe mecze akademii i wolne miejsca." },
            { n: "2", t: "Zapisz się", d: "Potwierdź udział albo zaznacz, że jeszcze nie wiesz." },
            { n: "3", t: "Graj i licz punkty", d: "Statystyki i rankingi po każdym spotkaniu." },
          ].map((step) => (
            <div key={step.n} className="rounded-2xl bg-zinc-50 p-5 dark:bg-zinc-900">
              <p className="text-3xl font-black text-[var(--mp-teal)]">{step.n}</p>
              <p className="mt-2 font-black">{step.t}</p>
              <p className="mt-1 text-sm text-zinc-500">{step.d}</p>
            </div>
          ))}
        </section>

        {youtubeLiveVideoId ? (
          <section className="mt-14 overflow-hidden rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <div className="mb-4 flex items-end justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--mp-teal-dark)]">Na żywo</p>
                <h2 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">Mecz na YouTube</h2>
              </div>
              <Button asChild variant="outline">
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

      {nextMatch ? (
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
      ) : null}

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
